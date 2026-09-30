import "server-only";

import { createHash } from "node:crypto";
import { Chess } from "chess.js";
import { getDecision, resultLabel } from "@/lib/blunder-engine";
import {
  BLUNDER_CHANNEL_ADDRESS,
  explorerTransactionUrl,
  getMainnetConnection,
  parseMoodTransaction,
  SOLANA_NETWORK,
} from "@/lib/solana-mainnet";
import type { ChainEvent, GlobalGameState, Mood, MoveRecord } from "@/lib/types";

export const MOVE_INTERVAL_SLOTS = 20;
export const ROUND_LENGTH_SLOTS = 2_400;
const MAX_EVENTS_PER_ROUND = 100;

function checkpoint(payload: string) {
  return createHash("sha256").update(payload).digest("hex");
}

async function getRoundEvents(roundStartSlot: number, finalizedSlot: number) {
  const connection = getMainnetConnection();
  const signatures = await connection.getSignaturesForAddress(
    BLUNDER_CHANNEL_ADDRESS,
    { limit: MAX_EVENTS_PER_ROUND },
    "finalized",
  );
  const inRound = signatures.filter(
    (entry) => entry.slot >= roundStartSlot && entry.slot <= finalizedSlot && !entry.err,
  );
  if (!inRound.length) return [];

  const transactions = await connection.getParsedTransactions(
    inRound.map((entry) => entry.signature),
    { commitment: "finalized", maxSupportedTransactionVersion: 0 },
  );

  const events: ChainEvent[] = [];
  for (let index = 0; index < transactions.length; index += 1) {
    const transaction = transactions[index];
    const signatureInfo = inRound[index];
    if (!transaction || !signatureInfo) continue;
    try {
      const parsed = parseMoodTransaction(transaction);
      events.push({
        id: `chain-${signatureInfo.signature}`,
        signature: signatureInfo.signature,
        mood: parsed.mood,
        lamports: parsed.lamports,
        slot: signatureInfo.slot,
        timestamp: (signatureInfo.blockTime || 0) * 1_000,
        verified: true,
        source: "mainnet",
        explorerUrl: explorerTransactionUrl(signatureInfo.signature),
      });
    } catch {
      // The channel is public. Ignore transactions that do not match the exact protocol.
    }
  }

  return events.sort((a, b) => a.slot - b.slot || a.signature.localeCompare(b.signature));
}

function buildState(finalizedSlot: number, events: ChainEvent[]): GlobalGameState {
  const roundNumber = Math.floor(finalizedSlot / ROUND_LENGTH_SLOTS);
  const roundStartSlot = roundNumber * ROUND_LENGTH_SLOTS;
  const elapsedTicks = Math.floor((finalizedSlot - roundStartSlot) / MOVE_INTERVAL_SLOTS);
  const game = new Chess();
  let matchNumber = 1;
  let gameStartedAtSlot = roundStartSlot;
  let moves: MoveRecord[] = [];
  let mood: Mood = "calm";
  let moodMovesLeft = 0;
  let eventIndex = 0;
  let pendingEvent: ChainEvent | undefined;

  for (let tick = 1; tick <= elapsedTicks; tick += 1) {
    const moveSlot = roundStartSlot + tick * MOVE_INTERVAL_SLOTS;

    if (game.isGameOver()) {
      game.reset();
      moves = [];
      matchNumber += 1;
      gameStartedAtSlot = moveSlot;
    }

    while (eventIndex < events.length && events[eventIndex].slot <= moveSlot) {
      const event = events[eventIndex];
      mood = event.mood;
      moodMovesLeft = event.mood === "calm" ? 2 : 3;
      pendingEvent = event;
      eventIndex += 1;
    }

    const actor = game.turn() === "w" ? "blunder" : "opponent";
    const activeMood = actor === "blunder" ? mood : "calm";
    const decision = getDecision(game, activeMood);
    const fenBefore = game.fen();
    const move = game.move(decision.selected);
    const fenAfter = game.fen();
    const ply = game.history().length;
    const trigger = actor === "blunder" ? pendingEvent : undefined;
    if (trigger) pendingEvent = undefined;
    const gameId = `BLD-${roundNumber.toString(36).toUpperCase()}-${String(matchNumber).padStart(2, "0")}`;

    moves.push({
      id: `${gameId}-${ply}-${move.from}${move.to}`,
      ply,
      actor,
      color: move.color === "w" ? "white" : "black",
      san: move.san,
      from: move.from,
      to: move.to,
      fenBefore,
      fenAfter,
      evaluation: decision.evaluation,
      mood: activeMood,
      candidates: decision.candidates,
      reason: actor === "blunder"
        ? decision.reason
        : "THE HOUSE returned to the engine's driest line.",
      timestamp: moveSlot,
      trigger,
      stateHash: checkpoint(`${gameId}|${moveSlot}|${fenAfter}|${trigger?.signature || "chain-clock"}`),
    });

    if (actor === "blunder" && moodMovesLeft > 0) {
      moodMovesLeft -= 1;
      if (moodMovesLeft === 0) mood = "calm";
    }
  }

  const gameId = `BLD-${roundNumber.toString(36).toUpperCase()}-${String(matchNumber).padStart(2, "0")}`;
  const candidateNextMoveSlot = roundStartSlot + (elapsedTicks + 1) * MOVE_INTERVAL_SLOTS;
  const nextMoveSlot = candidateNextMoveSlot >= roundStartSlot + ROUND_LENGTH_SLOTS
    ? roundStartSlot + ROUND_LENGTH_SLOTS + MOVE_INTERVAL_SLOTS
    : candidateNextMoveSlot;

  return {
    network: SOLANA_NETWORK,
    channelAddress: BLUNDER_CHANNEL_ADDRESS.toBase58(),
    finalizedSlot,
    roundStartSlot,
    nextMoveSlot,
    slotsUntilNextMove: Math.max(0, nextMoveSlot - finalizedSlot),
    moveIntervalSlots: MOVE_INTERVAL_SLOTS,
    gameId,
    startedAtSlot: gameStartedAtSlot,
    fen: game.fen(),
    moves,
    events: [...events].reverse(),
    mood,
    moodMovesLeft,
    result: resultLabel(game),
    synchronizedAt: Date.now(),
  };
}

export async function getGlobalGameState() {
  const connection = getMainnetConnection();
  const finalizedSlot = await connection.getSlot("finalized");
  const roundStartSlot = Math.floor(finalizedSlot / ROUND_LENGTH_SLOTS) * ROUND_LENGTH_SLOTS;
  const events = await getRoundEvents(roundStartSlot, finalizedSlot);
  return buildState(finalizedSlot, events);
}

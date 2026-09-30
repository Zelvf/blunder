"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Chess } from "chess.js";
import { SiteHeader } from "@/components/site-header";
import { ChessBoard } from "@/components/chess-board";
import { MoodPanel } from "@/components/mood-panel";
import { EventRail } from "@/components/event-rail";
import { MoveCard } from "@/components/move-card";
import { ChainActions } from "@/components/chain-actions";
import { getDecision, resultLabel } from "@/lib/blunder-engine";
import { makeStateHash } from "@/lib/state-hash";
import type { ChainEvent, Mood, MoveRecord, SavedGame } from "@/lib/types";

const INITIAL_EVENT: ChainEvent = {
  id: "genesis",
  signature: "GENESIS-READY",
  mood: "calm",
  lamports: 1_000,
  timestamp: 0,
  verified: false,
  source: "simulation",
};

export function Arena() {
  const gameRef = useRef<Chess>(new Chess());
  const moodRef = useRef<Mood>("calm");
  const moodMovesRef = useRef(0);
  const pendingEventRef = useRef<ChainEvent | undefined>(undefined);
  const usedSignaturesRef = useRef(new Set<string>());
  const [fen, setFen] = useState(() => new Chess().fen());
  const [moves, setMoves] = useState<MoveRecord[]>([]);
  const [events, setEvents] = useState<ChainEvent[]>([INITIAL_EVENT]);
  const [mood, setMood] = useState<Mood>("calm");
  const [moodMovesLeft, setMoodMovesLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [gameId, setGameId] = useState("BLD-0001");
  const [startedAt, setStartedAt] = useState(0);
  const [speed, setSpeed] = useState<"slow" | "fast">("slow");
  const [gameResult, setGameResult] = useState("LIVE");

  const latestMove = moves.at(-1);
  const latestBotMove = moves.findLast((move) => move.actor === "blunder");
  const playNextMove = useCallback(async () => {
    const game = gameRef.current;
    if (game.isGameOver()) {
      setRunning(false);
      return;
    }

    const actor = game.turn() === "w" ? "blunder" : "opponent";
    const activeMood = actor === "blunder" ? moodRef.current : "calm";
    const decision = getDecision(game, activeMood);
    const fenBefore = game.fen();
    const move = game.move(decision.selected);
    const fenAfter = game.fen();
    const ply = game.history().length;
    const trigger = actor === "blunder" ? pendingEventRef.current : undefined;
    if (trigger) pendingEventRef.current = undefined;
    const stateHash = ply % 4 === 0
      ? await makeStateHash(`${gameId}|${ply}|${fenAfter}|${trigger?.signature || "no-event"}`)
      : undefined;

    const record: MoveRecord = {
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
      reason: actor === "blunder" ? decision.reason : "THE HOUSE returned to the engine's driest line.",
      timestamp: Date.now(),
      trigger,
      stateHash,
    };

    setFen(fenAfter);
    setGameResult(resultLabel(game));
    setMoves((current) => [...current, record]);

    if (actor === "blunder" && moodMovesRef.current > 0) {
      moodMovesRef.current -= 1;
      setMoodMovesLeft(moodMovesRef.current);
      if (moodMovesRef.current === 0) {
        moodRef.current = "calm";
        setMood("calm");
      }
    }
  }, [gameId]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => void playNextMove(), speed === "fast" ? 700 : 2_100);
    return () => window.clearTimeout(timer);
  }, [playNextMove, running, speed, moves.length]);

  useEffect(() => {
    if (!startedAt) return;
    const snapshot: SavedGame = {
      version: 1,
      gameId,
      startedAt,
      moves,
      events,
      result: gameResult,
    };
    localStorage.setItem("blunder:last-game", JSON.stringify(snapshot));
  }, [events, gameId, gameResult, moves, startedAt]);

  function startOrPause() {
    if (!startedAt) setStartedAt(Date.now());
    setRunning((current) => !current);
  }

  function resetGame() {
    gameRef.current = new Chess();
    moodRef.current = "calm";
    moodMovesRef.current = 0;
    pendingEventRef.current = undefined;
    usedSignaturesRef.current.clear();
    setFen(gameRef.current.fen());
    setMoves([]);
    setEvents([INITIAL_EVENT]);
    setMood("calm");
    setMoodMovesLeft(0);
    setRunning(false);
    setStartedAt(Date.now());
    setGameResult("LIVE");
    setGameId(`BLD-${String(Math.floor(Math.random() * 9_999) + 1).padStart(4, "0")}`);
  }

  function applyEvent(event: ChainEvent) {
    if (event.source === "mainnet" && usedSignaturesRef.current.has(event.signature)) return;
    if (event.source === "mainnet") usedSignaturesRef.current.add(event.signature);
    setEvents((current) => [event, ...current].slice(0, 12));
    moodRef.current = event.mood;
    moodMovesRef.current = event.mood === "calm" ? 2 : 3;
    pendingEventRef.current = event;
    setMood(event.mood);
    setMoodMovesLeft(moodMovesRef.current);
  }

  return (
    <main>
      <SiteHeader />
      <section className="hero-grid">
        <div className="hero-copy">
          <p className="hero-kicker"><span /> ONCHAIN CHESS EXPERIMENT · MAINNET</p>
          <h1>Every move is<br /><em>a state of mind.</em></h1>
          <p className="hero-lede">BLUNDER is a public chess brain. Verified Solana events make it calmer, greedier, or catastrophically overconfident—then it has to live with the move.</p>
          <div className="hero-actions">
            <a className="primary-button" href="#arena">Watch the game <span>↓</span></a>
            <a className="ghost-button" href="#interact">Change its mood <span>⚡</span></a>
          </div>
          <div className="hero-proof">
            <span><b>01</b> event arrives</span><i>→</i><span><b>02</b> mood shifts</span><i>→</i><span><b>03</b> move proven</span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="sun-disc" />
          <div className="hero-knight">♞</div>
          <span className="orbit orbit--one">CALM</span>
          <span className="orbit orbit--two">GREEDY</span>
          <span className="orbit orbit--three">TILTED</span>
          <span className="scribble">what could<br />go wrong?</span>
        </div>
      </section>

      <section className="arena-section" id="arena">
        <div className="arena-titlebar">
          <div>
            <p className="eyebrow">LIVE GAME · {gameId}</p>
            <h2>BLUNDER <span>vs.</span> THE HOUSE</h2>
          </div>
          <div className="game-controls">
            <label>PACE
              <select value={speed} onChange={(event) => setSpeed(event.target.value as "slow" | "fast")}>
                <option value="slow">THOUGHTFUL</option>
                <option value="fast">UNHINGED</option>
              </select>
            </label>
            <button type="button" className="outline-button" onClick={resetGame}>New game</button>
            <button type="button" className="primary-button" disabled={gameResult !== "LIVE"} onClick={startOrPause}>
              {gameResult !== "LIVE" ? gameResult : running ? "Pause clock" : moves.length ? "Resume clock" : "Start clock"}
            </button>
          </div>
        </div>

        <div className="arena-layout">
          <div className="board-column">
            <div className="player-row player-row--top"><span className="player-avatar">H</span><strong>THE HOUSE</strong><small>ENGINE · CALM</small></div>
            <ChessBoard fen={fen} lastMove={latestMove ? { from: latestMove.from, to: latestMove.to } : undefined} />
            <div className="player-row"><span className="player-avatar player-avatar--bot">♞</span><strong>BLUNDER</strong><small>PUBLIC BRAIN · {mood.toUpperCase()}</small></div>
            <div className="manual-control">
              <button type="button" disabled={running || gameResult !== "LIVE"} onClick={() => void playNextMove()}>Play one move</button>
              <span>{moves.length ? `${moves.length} plies recorded` : "Awaiting first move"}</span>
            </div>
          </div>
          <div className="intel-column">
            <MoodPanel mood={mood} movesLeft={moodMovesLeft} />
            <MoveCard move={latestBotMove} focused />
            <EventRail events={events} />
          </div>
        </div>
      </section>

      <ChainActions onEvent={applyEvent} />

      <section className="proof-loop" id="proof">
        <div className="proof-copy">
          <p className="eyebrow">THE PUBLIC PROOF LOOP</p>
          <h2>No smoke.<br />No mirrors.<br /><em>Just receipts.</em></h2>
          <p>Every decision preserves the input event, exact position, scored candidates, chosen move, and a periodic SHA-256 state checkpoint.</p>
          <Link className="outline-button" href="/replay">Open the replay room →</Link>
        </div>
        <ol className="proof-steps">
          <li><span>01</span><div><strong>ONCHAIN ACTION</strong><p>A mainnet signature is verified server-side.</p></div><b>◎</b></li>
          <li><span>02</span><div><strong>MOOD REDUCER</strong><p>A bounded, public rule changes risk appetite.</p></div><b>◉</b></li>
          <li><span>03</span><div><strong>LEGAL CANDIDATES</strong><p>chess.js validates every possible continuation.</p></div><b>♙</b></li>
          <li><span>04</span><div><strong>PUBLIC MOVE</strong><p>Reasoning, FEN, eval, and proof ship together.</p></div><b>↗</b></li>
        </ol>
      </section>

      <footer>
        <div className="wordmark"><span className="wordmark-mark">♞</span><span>BLUNDER</span></div>
        <p>A spectator experiment on Solana mainnet. Actions pay a network fee, never a wager. No pooled funds, payouts, or promises of value.</p>
        <span>BUILT TO MAKE BAD IDEAS AUDITABLE.</span>
      </footer>
    </main>
  );
}

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
import type { GlobalGameState } from "@/lib/types";

const EMPTY_FEN = new Chess().fen();

export function Arena() {
  const requestPending = useRef(false);
  const [game, setGame] = useState<GlobalGameState>();
  const [syncing, setSyncing] = useState(true);
  const [syncError, setSyncError] = useState("");

  const refreshGame = useCallback(async () => {
    if (requestPending.current) return;
    requestPending.current = true;
    setSyncing(true);
    try {
      const response = await fetch("/api/game/state", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The shared game could not be synchronized.");
      setGame(result as GlobalGameState);
      setSyncError("");
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "The shared game could not be synchronized.");
    } finally {
      requestPending.current = false;
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void refreshGame(), 0);
    const timer = window.setInterval(() => void refreshGame(), 4_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [refreshGame]);

  const moves = game?.moves || [];
  const latestMove = moves.at(-1);
  const latestBotMove = moves.findLast((move) => move.actor === "blunder");
  const secondsToMove = Math.max(1, Math.ceil((game?.slotsUntilNextMove || 1) * 0.4));

  return (
    <main>
      <SiteHeader />
      <section className="hero-grid">
        <div className="hero-copy">
          <p className="hero-kicker"><span /> ONE GAME · EVERY SCREEN · SOLANA MAINNET</p>
          <h1>Every move is<br /><em>a state of mind.</em></h1>
          <p className="hero-lede">BLUNDER is a public chess brain that never sleeps. Finalized Solana slots advance one canonical match, while verified on-chain signals make it calmer, greedier, or catastrophically overconfident.</p>
          <div className="hero-actions">
            <a className="primary-button" href="#arena">Watch the live game <span>↓</span></a>
            <a className="ghost-button" href="#interact">Change its mood <span>⚡</span></a>
          </div>
          <div className="hero-proof">
            <span><b>01</b> slot finalizes</span><i>→</i><span><b>02</b> global state replays</span><i>→</i><span><b>03</b> everyone sees it</span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="sun-disc" />
          <div className="hero-knight">♞</div>
          <span className="orbit orbit--one">24 / 7</span>
          <span className="orbit orbit--two">FINALIZED</span>
          <span className="orbit orbit--three">GLOBAL</span>
          <span className="scribble">one board.<br />no pause button.</span>
        </div>
      </section>

      <section className="arena-section" id="arena">
        <div className="arena-titlebar">
          <div>
            <p className="eyebrow">LIVE GLOBAL GAME · {game?.gameId || "SYNCHRONIZING"}</p>
            <h2>BLUNDER <span>vs.</span> THE HOUSE</h2>
          </div>
          <div className="chain-clock" aria-live="polite">
            <div><span>FINALIZED SLOT</span><strong>{game ? game.finalizedSlot.toLocaleString() : "—"}</strong></div>
            <div><span>NEXT MOVE</span><strong>{game ? `≈ ${secondsToMove}s` : "—"}</strong></div>
            <button type="button" className="outline-button" disabled={syncing} onClick={() => void refreshGame()}>
              {syncing ? "Syncing…" : "Sync now"}
            </button>
          </div>
        </div>

        {syncError ? <p className="sync-error" role="alert">{syncError} Retrying automatically…</p> : null}

        <div className="arena-layout">
          <div className="board-column">
            <div className="player-row player-row--top"><span className="player-avatar">H</span><strong>THE HOUSE</strong><small>ENGINE · CALM</small></div>
            <ChessBoard fen={game?.fen || EMPTY_FEN} lastMove={latestMove ? { from: latestMove.from, to: latestMove.to } : undefined} />
            <div className="player-row"><span className="player-avatar player-avatar--bot">♞</span><strong>BLUNDER</strong><small>PUBLIC BRAIN · {(game?.mood || "calm").toUpperCase()}</small></div>
            <div className="manual-control">
              <span className="always-on-dot"><i /> AUTOPLAY LOCKED TO SOLANA</span>
              <span>{moves.length ? `${moves.length} canonical plies` : "Awaiting the next finalized tick"}</span>
            </div>
          </div>
          <div className="intel-column">
            <MoodPanel mood={game?.mood || "calm"} movesLeft={game?.moodMovesLeft || 0} />
            <MoveCard move={latestBotMove} focused />
            <EventRail events={game?.events || []} />
          </div>
        </div>
      </section>

      <ChainActions onConfirmed={refreshGame} />

      <section className="proof-loop" id="proof">
        <div className="proof-copy">
          <p className="eyebrow">THE CANONICAL PROOF LOOP</p>
          <h2>No host clock.<br />No private game.<br /><em>Just one timeline.</em></h2>
          <p>The board is reconstructed from finalized Solana slots and channel transactions. Open it on two devices and both derive the same game ID, move list, FEN, mood, and state proofs.</p>
          <Link className="outline-button" href="/replay">Inspect the current replay →</Link>
        </div>
        <ol className="proof-steps">
          <li><span>01</span><div><strong>FINALIZED SLOT CLOCK</strong><p>Every 20 finalized slots unlock exactly one legal ply.</p></div><b>◎</b></li>
          <li><span>02</span><div><strong>PUBLIC SIGNAL CHANNEL</strong><p>Zero-lamport references make valid mood actions globally discoverable.</p></div><b>◉</b></li>
          <li><span>03</span><div><strong>DETERMINISTIC ENGINE</strong><p>The same ordered inputs always produce the same legal continuation.</p></div><b>♙</b></li>
          <li><span>04</span><div><strong>STATE CHECKPOINT</strong><p>Each move binds its slot, FEN, and trigger into a SHA-256 proof.</p></div><b>↗</b></li>
        </ol>
      </section>

      <footer>
        <div className="wordmark"><span className="wordmark-mark">♞</span><span>BLUNDER</span></div>
        <p>A continuous spectator experiment on Solana mainnet. Signals pay a network fee, never a wager. No pooled funds, payouts, or promises of value.</p>
        <span>ONE CHAIN. ONE BOARD. ALWAYS MOVING.</span>
      </footer>
    </main>
  );
}

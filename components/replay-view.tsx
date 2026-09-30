"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Chess } from "chess.js";
import { SiteHeader } from "@/components/site-header";
import { ChessBoard } from "@/components/chess-board";
import { MoveCard } from "@/components/move-card";
import type { GlobalGameState } from "@/lib/types";

export function ReplayView() {
  const [game, setGame] = useState<GlobalGameState>();
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadReplay = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/game/state", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The global replay is unavailable.");
      const nextGame = result as GlobalGameState;
      setGame(nextGame);
      setIndex(Math.max(0, nextGame.moves.length - 1));
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "The global replay is unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadReplay(), 0);
    return () => window.clearTimeout(timer);
  }, [loadReplay]);

  const move = game?.moves[index];
  const fen = move?.fenAfter || game?.fen || new Chess().fen();

  return (
    <main className="replay-page">
      <SiteHeader active="replay" compact />
      <section className="replay-hero">
        <div>
          <p className="eyebrow">CANONICAL GAME REPLAY</p>
          <h1>One public game,<br /><em>perfectly preserved.</em></h1>
        </div>
        <div className="replay-hero-copy">
          <p>Select a move to inspect the exact board, mood, candidate set, engine evaluation, slot trigger, and checkpoint seen by every viewer.</p>
          <button className="outline-button" type="button" disabled={loading} onClick={() => void loadReplay()}>{loading ? "Syncing…" : "Sync latest"}</button>
        </div>
      </section>

      {error ? (
        <section className="empty-replay">
          <span>♞</span>
          <h2>Replay temporarily unavailable.</h2>
          <p>{error}</p>
          <button className="primary-button" type="button" onClick={() => void loadReplay()}>Try again</button>
        </section>
      ) : !game?.moves.length ? (
        <section className="empty-replay">
          <span>♞</span>
          <h2>The next chain tick is on its way.</h2>
          <p>This round has just begun. Moves appear automatically as Solana slots finalize.</p>
          <Link className="primary-button" href="/">Watch the live arena →</Link>
        </section>
      ) : (
        <section className="replay-layout">
          <div className="replay-board">
            <div className="replay-meta">
              <div><span>GAME</span><strong>{game.gameId}</strong></div>
              <div><span>RESULT</span><strong>{game.result}</strong></div>
              <div><span>RECORD</span><strong>{game.moves.length} PLIES</strong></div>
            </div>
            <ChessBoard fen={fen} lastMove={move ? { from: move.from, to: move.to } : undefined} />
            <div className="replay-controls">
              <button type="button" disabled={index === 0} onClick={() => setIndex(0)}>«</button>
              <button type="button" disabled={index === 0} onClick={() => setIndex((current) => current - 1)}>←</button>
              <span>MOVE {index + 1} / {game.moves.length}</span>
              <button type="button" disabled={index === game.moves.length - 1} onClick={() => setIndex((current) => current + 1)}>→</button>
              <button type="button" disabled={index === game.moves.length - 1} onClick={() => setIndex(game.moves.length - 1)}>»</button>
            </div>
          </div>
          <div className="replay-log">
            <MoveCard move={move} focused />
            <div className="notation-list">
              <div className="candidate-heading"><span>MOVE LOG</span><span>EVAL</span></div>
              {game.moves.map((item, moveIndex) => (
                <button className={moveIndex === index ? "is-active" : ""} type="button" key={item.id} onClick={() => setIndex(moveIndex)}>
                  <span>{item.ply}. {item.san}</span>
                  <span className={`mood-tag mood-tag--${item.mood}`}>{item.mood}</span>
                  <code>{item.evaluation > 0 ? "+" : ""}{item.evaluation.toFixed(2)}</code>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Chess } from "chess.js";
import { SiteHeader } from "@/components/site-header";
import { ChessBoard } from "@/components/chess-board";
import { MoveCard } from "@/components/move-card";
import type { SavedGame } from "@/lib/types";

export function ReplayView() {
  const [game, setGame] = useState<SavedGame>();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const raw = localStorage.getItem("blunder:last-game");
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as SavedGame;
        setGame(parsed);
        setIndex(Math.max(0, parsed.moves.length - 1));
      } catch {
        localStorage.removeItem("blunder:last-game");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const move = game?.moves[index];
  const fen = move?.fenAfter || new Chess().fen();

  return (
    <main className="replay-page">
      <SiteHeader active="replay" compact />
      <section className="replay-hero">
        <div>
          <p className="eyebrow">PUBLIC GAME ARCHIVE</p>
          <h1>Every bad idea,<br /><em>perfectly preserved.</em></h1>
        </div>
        <p>Select a move to inspect the exact board, mood, candidate set, engine evaluation, and checkpoint that produced it.</p>
      </section>

      {!game?.moves.length ? (
        <section className="empty-replay">
          <span>♞</span>
          <h2>No moves on the record—yet.</h2>
          <p>Start a game in the live arena, play at least one move, then come back here.</p>
          <Link className="primary-button" href="/">Go to the live arena →</Link>
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

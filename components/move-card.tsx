import type { MoveRecord } from "@/lib/types";

export function MoveCard({ move, focused = false }: { move?: MoveRecord; focused?: boolean }) {
  if (!move) {
    return (
      <section className="move-card move-card--empty">
        <span className="big-knight" aria-hidden="true">♞</span>
        <p>The chain clock is warming up. The first finalized move will appear automatically.</p>
      </section>
    );
  }

  return (
    <section className={`move-card ${focused ? "move-card--focused" : ""}`}>
      <div className="move-card-header">
        <div>
          <p className="eyebrow">MOVE {Math.ceil(move.ply / 2)} · {move.actor === "blunder" ? "BLUNDER" : "THE HOUSE"}</p>
          <h2>{move.san}</h2>
        </div>
        <span className={`mood-tag mood-tag--${move.mood}`}>{move.mood}</span>
      </div>
      <p className="move-reason">“{move.reason}”</p>
      <div className="candidate-heading">
        <span>CANDIDATE</span><span>ENGINE EVAL</span>
      </div>
      <ol className="candidate-list">
        {move.candidates.slice(0, 4).map((candidate) => (
          <li className={candidate.san === move.san ? "is-selected" : ""} key={`${candidate.from}-${candidate.to}-${candidate.san}`}>
            <span>{candidate.san === move.san ? "→" : ""} {candidate.san}</span>
            <span>{candidate.score > 0 ? "+" : ""}{candidate.score.toFixed(2)}</span>
          </li>
        ))}
      </ol>
      <div className="proof-strip">
        <div><span>FEN</span><code title={move.fenAfter}>{move.fenAfter.slice(0, 22)}…</code></div>
        <div><span>STATE PROOF</span><code>{move.stateHash ? `${move.stateHash.slice(0, 14)}…` : "checkpoint pending"}</code></div>
      </div>
    </section>
  );
}

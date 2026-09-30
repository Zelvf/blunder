import type { ChainEvent, Mood } from "@/lib/types";

const MOOD_LABELS: Record<Mood, string> = {
  calm: "Nerves steadied",
  greedy: "Greed injected",
  tilted: "Tilt unlocked",
};

function shortSignature(signature: string) {
  if (signature.length < 14) return signature;
  return `${signature.slice(0, 6)}…${signature.slice(-5)}`;
}

export function EventRail({ events }: { events: ChainEvent[] }) {
  return (
    <section className="event-rail">
      <div className="section-heading">
        <div>
          <p className="eyebrow">SOLANA EVENT RAIL</p>
          <h2>What just got into it?</h2>
        </div>
        <span className="network-pill"><i /> MAINNET</span>
      </div>
      <div className="event-list" aria-live="polite">
        {!events.length ? (
          <div className="event-empty">
            <strong>No global signals this round.</strong>
            <span>The finalized slot clock is still advancing the game.</span>
          </div>
        ) : null}
        {events.slice(0, 4).map((event, index) => (
          <article className="event-row" key={event.id}>
            <span className={`event-glyph event-glyph--${event.mood}`}>{event.mood === "tilted" ? "⚡" : event.mood === "greedy" ? "◆" : "◉"}</span>
            <div className="event-copy">
              <strong>{MOOD_LABELS[event.mood]}</strong>
              <span>{event.lamports.toLocaleString()} lamports · {event.source}</span>
            </div>
            <div className="event-proof">
              {event.explorerUrl ? (
                <a href={event.explorerUrl} target="_blank" rel="noreferrer">{shortSignature(event.signature)} ↗</a>
              ) : (
                <span>{shortSignature(event.signature)}</span>
              )}
              <small>{index === 0 ? "latest" : `slot ${event.slot.toLocaleString()}`}</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

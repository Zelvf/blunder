import type { Mood } from "@/lib/types";

const MOOD_COPY: Record<Mood, { icon: string; title: string; subtitle: string; meter: number }> = {
  calm: { icon: "◉", title: "CALM", subtitle: "Clinical. Patient. Almost suspiciously sane.", meter: 32 },
  greedy: { icon: "◆", title: "GREEDY", subtitle: "Material is calling. Strategy can wait.", meter: 68 },
  tilted: { icon: "⚡", title: "TILTED", subtitle: "Confidence: infinite. Consequences: pending.", meter: 96 },
};

export function MoodPanel({ mood, movesLeft }: { mood: Mood; movesLeft: number }) {
  const copy = MOOD_COPY[mood];

  return (
    <section className={`mood-panel mood-panel--${mood}`} aria-label={`BLUNDER is ${mood}`}>
      <div className="eyebrow-row">
        <p className="eyebrow">CURRENT MENTAL STATE</p>
        <span className="live-pulse">LIVE</span>
      </div>
      <div className="mood-main">
        <span className="mood-icon" aria-hidden="true">{copy.icon}</span>
        <div>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
      </div>
      <div className="mood-scale" aria-label={`${copy.meter}% risk appetite`}>
        <span style={{ width: `${copy.meter}%` }} />
      </div>
      <div className="mood-footer">
        <span>risk appetite</span>
        <strong>{mood === "calm" ? "LOW" : mood === "greedy" ? "ELEVATED" : "CATASTROPHIC"}</strong>
        <span>{movesLeft > 0 ? `${movesLeft} bot move${movesLeft === 1 ? "" : "s"} left` : "baseline"}</span>
      </div>
    </section>
  );
}

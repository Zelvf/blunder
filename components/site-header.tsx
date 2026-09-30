import Link from "next/link";

type SiteHeaderProps = {
  active?: "arena" | "replay";
  compact?: boolean;
};

export function SiteHeader({ active = "arena", compact = false }: SiteHeaderProps) {
  const githubUrl = process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com/Zelvf/blunder";

  return (
    <header className={`site-header ${compact ? "site-header--compact" : ""}`}>
      <Link className="wordmark" href="/" aria-label="BLUNDER home">
        <span className="wordmark-mark" aria-hidden="true">♞</span>
        <span>BLUNDER</span>
        <span className="beta">BETA</span>
      </Link>
      <nav className="main-nav" aria-label="Main navigation">
        <Link className={active === "arena" ? "is-active" : ""} href="/">Live arena</Link>
        <Link className={active === "replay" ? "is-active" : ""} href="/replay">Replay</Link>
        <Link href="/#proof">How it works</Link>
      </nav>
      <a className="outline-button header-github" href={githubUrl} target="_blank" rel="noreferrer">
        GitHub <span aria-hidden="true">↗</span>
      </a>
    </header>
  );
}

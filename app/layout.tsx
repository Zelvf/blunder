import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BLUNDER — The onchain chess brain",
  description:
    "Watch a public chess bot get calmer, greedier, or catastrophically overconfident as verified Solana events arrive.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://blunder-eta.vercel.app"),
  openGraph: {
    title: "BLUNDER — The onchain chess brain",
    description: "Every onchain event changes the way it plays.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}

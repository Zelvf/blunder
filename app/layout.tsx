import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BLUNDER — The onchain chess brain",
  description:
    "Watch one continuous public chess game advance from finalized Solana slots and react to verified mainnet signals.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://blunder-eta.vercel.app"),
  openGraph: {
    title: "BLUNDER — The onchain chess brain",
    description: "One chain, one board, always moving.",
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

export function GET() {
  return Response.json({
    ok: true,
    service: "blunder-arena",
    network: "solana-devnet",
    timestamp: new Date().toISOString(),
  });
}

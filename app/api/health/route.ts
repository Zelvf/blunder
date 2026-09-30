export function GET() {
  return Response.json({
    ok: true,
    service: "blunder-arena",
    network: "solana-mainnet-beta",
    timestamp: new Date().toISOString(),
  });
}

import {
  BLUNDER_CHANNEL_ADDRESS,
  getMainnetConnection,
  SOLANA_NETWORK,
} from "@/lib/solana-mainnet";

export async function GET() {
  try {
    const connection = getMainnetConnection();
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    return Response.json({
      network: SOLANA_NETWORK,
      blockhash,
      lastValidBlockHeight,
      channelAddress: BLUNDER_CHANNEL_ADDRESS.toBase58(),
    });
  } catch (error) {
    console.error("Mainnet configuration failed", error);
    return Response.json(
      { error: "Solana mainnet is temporarily unavailable. No transaction was created." },
      { status: 503 },
    );
  }
}

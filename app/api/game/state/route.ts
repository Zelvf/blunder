import { getGlobalGameState } from "@/lib/global-game";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await getGlobalGameState();
    return Response.json(state, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("Global game synchronization failed", error);
    return Response.json(
      { error: "The finalized Solana game state is temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}

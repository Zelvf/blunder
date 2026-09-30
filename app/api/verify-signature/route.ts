import { verifyMoodSignature } from "@/lib/solana-mainnet";

const SIGNATURE_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{80,90}$/;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { signature?: unknown };
    const signature = typeof body.signature === "string" ? body.signature.trim() : "";

    if (!SIGNATURE_PATTERN.test(signature)) {
      return Response.json({ error: "Enter a valid Solana transaction signature." }, { status: 400 });
    }

    return Response.json(await verifyMoodSignature(signature));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mainnet verification failed.";
    console.warn("Signature verification rejected:", message);
    return Response.json(
      { error: message },
      { status: 422 },
    );
  }
}

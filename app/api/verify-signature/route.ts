import {
  clusterApiUrl,
  Connection,
  ParsedInstruction,
  PartiallyDecodedInstruction,
} from "@solana/web3.js";

const SIGNATURE_PATTERN = /^[1-9A-HJ-NP-Za-km-z]{80,90}$/;

function moodFromLamports(lamports: number) {
  const marker = lamports % 10_000;
  if (marker === 2_000) return "greedy" as const;
  if (marker === 3_000) return "tilted" as const;
  return "calm" as const;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { signature?: unknown };
    const signature = typeof body.signature === "string" ? body.signature.trim() : "";

    if (!SIGNATURE_PATTERN.test(signature)) {
      return Response.json({ error: "Enter a valid Solana transaction signature." }, { status: 400 });
    }

    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("devnet");
    const connection = new Connection(rpcUrl, "confirmed");
    const transaction = await connection.getParsedTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });

    if (!transaction) {
      return Response.json(
        { error: "That signature was not found on the configured devnet RPC." },
        { status: 404 },
      );
    }

    if (transaction.meta?.err) {
      return Response.json({ error: "The transaction exists but did not succeed." }, { status: 422 });
    }

    const instructions = transaction.transaction.message.instructions as (
      | ParsedInstruction
      | PartiallyDecodedInstruction
    )[];
    const transfer = instructions.find(
      (instruction): instruction is ParsedInstruction =>
        "parsed" in instruction && instruction.parsed?.type === "transfer",
    );
    const lamports = Number(transfer?.parsed?.info?.lamports ?? 1_000);
    const mood = moodFromLamports(lamports);

    return Response.json({
      verified: true,
      signature,
      mood,
      lamports,
      slot: transaction.slot,
      blockTime: transaction.blockTime,
      explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
    });
  } catch (error) {
    console.error("Signature verification failed", error);
    return Response.json(
      { error: "The devnet RPC could not verify that signature. Try again shortly." },
      { status: 502 },
    );
  }
}

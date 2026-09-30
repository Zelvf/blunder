import { Transaction } from "@solana/web3.js";
import {
  explorerTransactionUrl,
  getMainnetConnection,
  validateSignedMoodTransaction,
  verifyMoodSignature,
} from "@/lib/solana-mainnet";

const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { transaction?: unknown };
    const encoded = typeof body.transaction === "string" ? body.transaction : "";
    if (!encoded || encoded.length > 4_000 || !BASE64_PATTERN.test(encoded)) {
      return Response.json({ error: "The signed transaction payload is invalid." }, { status: 400 });
    }

    const bytes = Buffer.from(encoded, "base64");
    const transaction = Transaction.from(bytes);
    const expected = validateSignedMoodTransaction(transaction);
    const connection = getMainnetConnection();
    const signature = await connection.sendRawTransaction(bytes, {
      maxRetries: 3,
      skipPreflight: false,
    });
    await connection.confirmTransaction(signature, "finalized");
    const verified = await verifyMoodSignature(signature);

    if (verified.signer !== expected.signer || verified.lamports !== expected.lamports) {
      throw new Error("Confirmed transaction did not match the signed mood action.");
    }

    return Response.json({ ...verified, explorerUrl: explorerTransactionUrl(signature) });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "Mainnet submission failed.";
    const message = rawMessage.includes("Simulation failed")
      ? "Mainnet preflight rejected the transaction. Make sure the wallet has enough SOL for the network fee."
      : rawMessage;
    console.warn("Mainnet mood transaction rejected:", message);
    return Response.json(
      { error: `${message} No global mood change was applied.` },
      { status: 422 },
    );
  }
}

import {
  Connection,
  ParsedInstruction,
  PartiallyDecodedInstruction,
  PublicKey,
  SystemInstruction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import type { Mood } from "@/lib/types";

export const SOLANA_NETWORK = "mainnet-beta" as const;
export const DEFAULT_MAINNET_RPC = "https://api.mainnet.solana.com";
export const ALLOWED_MOOD_LAMPORTS = new Map<number, Mood>([
  [1_000, "calm"],
  [2_000, "greedy"],
  [3_000, "tilted"],
]);

export function getMainnetConnection() {
  return new Connection(process.env.SOLANA_RPC_URL || DEFAULT_MAINNET_RPC, "confirmed");
}

export function explorerTransactionUrl(signature: string) {
  return `https://explorer.solana.com/tx/${signature}`;
}

export function validateSignedMoodTransaction(transaction: Transaction) {
  if (!transaction.feePayer) throw new Error("The transaction has no fee payer.");
  if (transaction.instructions.length !== 1) {
    throw new Error("A mood transaction must contain exactly one instruction.");
  }

  const instruction = transaction.instructions[0];
  if (!instruction.programId.equals(SystemProgram.programId)) {
    throw new Error("Only a native SOL self-transfer is accepted.");
  }

  const decoded = SystemInstruction.decodeTransfer(instruction);
  const lamports = Number(decoded.lamports);
  const mood = ALLOWED_MOOD_LAMPORTS.get(lamports);
  if (!mood) throw new Error("The transfer amount is not a valid mood marker.");
  if (!decoded.fromPubkey.equals(decoded.toPubkey)) {
    throw new Error("The transfer must return to the signing wallet.");
  }
  if (!transaction.feePayer.equals(decoded.fromPubkey)) {
    throw new Error("The signing wallet must also pay the network fee.");
  }
  if (!transaction.verifySignatures()) {
    throw new Error("The transaction signature is invalid.");
  }

  return { signer: decoded.fromPubkey.toBase58(), lamports, mood };
}

export async function verifyMoodSignature(signature: string) {
  const connection = getMainnetConnection();
  let transaction = null;
  for (let attempt = 0; attempt < 3 && !transaction; attempt += 1) {
    transaction = await connection.getParsedTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    if (!transaction && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    }
  }

  if (!transaction) throw new Error("That signature was not found on Solana mainnet.");
  if (transaction.meta?.err) throw new Error("The transaction exists but did not succeed.");

  const instructions = transaction.transaction.message.instructions as (
    | ParsedInstruction
    | PartiallyDecodedInstruction
  )[];
  if (instructions.length !== 1) {
    throw new Error("A BLUNDER mood transaction must contain exactly one instruction.");
  }
  const transfer = instructions.find(
    (instruction): instruction is ParsedInstruction =>
      "parsed" in instruction &&
      instruction.program === "system" &&
      instruction.parsed?.type === "transfer",
  );
  if (!transfer) throw new Error("No native SOL transfer was found in that transaction.");

  const source = String(transfer.parsed.info?.source || "");
  const destination = String(transfer.parsed.info?.destination || "");
  const lamports = Number(transfer.parsed.info?.lamports);
  const mood = ALLOWED_MOOD_LAMPORTS.get(lamports);
  if (!source || source !== destination) {
    throw new Error("The transaction is not a BLUNDER self-transfer.");
  }
  if (!mood) throw new Error("The transfer amount is not a BLUNDER mood marker.");

  const signer = transaction.transaction.message.accountKeys.find(
    (account) => account.signer && account.pubkey.equals(new PublicKey(source)),
  );
  if (!signer) throw new Error("The transfer source did not sign the transaction.");

  const now = Math.floor(Date.now() / 1_000);
  if (!transaction.blockTime || now - transaction.blockTime > 15 * 60) {
    throw new Error("That transaction is older than the 15-minute event window.");
  }

  return {
    verified: true,
    signature,
    signer: source,
    mood,
    lamports,
    slot: transaction.slot,
    blockTime: transaction.blockTime,
    network: SOLANA_NETWORK,
    explorerUrl: explorerTransactionUrl(signature),
  };
}

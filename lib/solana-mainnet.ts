import {
  Connection,
  ParsedInstruction,
  ParsedTransactionWithMeta,
  PartiallyDecodedInstruction,
  PublicKey,
  SystemInstruction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import type { Mood } from "@/lib/types";

export const SOLANA_NETWORK = "mainnet-beta" as const;
export const DEFAULT_MAINNET_RPC = "https://api.mainnet.solana.com";
export const BLUNDER_CHANNEL_ADDRESS = new PublicKey("6xmKJsDZ6PTPHpMmbZEtyXPJsTCqLQDCkRg81GiyHj2o");
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
  if (transaction.instructions.length !== 2) {
    throw new Error("A mood transaction must contain exactly two bounded instructions.");
  }

  if (transaction.instructions.some((instruction) => !instruction.programId.equals(SystemProgram.programId))) {
    throw new Error("Only native SOL transfer instructions are accepted.");
  }

  const transfers = transaction.instructions.map((instruction) => SystemInstruction.decodeTransfer(instruction));
  const marker = transfers.find((transfer) => transfer.fromPubkey.equals(transfer.toPubkey));
  const channelReference = transfers.find(
    (transfer) => transfer.toPubkey.equals(BLUNDER_CHANNEL_ADDRESS) && Number(transfer.lamports) === 0,
  );
  if (!marker || !channelReference || !marker.fromPubkey.equals(channelReference.fromPubkey)) {
    throw new Error("The transaction is not a canonical BLUNDER mood signal.");
  }

  const lamports = Number(marker.lamports);
  const mood = ALLOWED_MOOD_LAMPORTS.get(lamports);
  if (!mood) throw new Error("The transfer amount is not a valid mood marker.");
  if (!transaction.feePayer.equals(marker.fromPubkey)) {
    throw new Error("The signing wallet must also pay the network fee.");
  }
  if (!transaction.verifySignatures()) {
    throw new Error("The transaction signature is invalid.");
  }

  return { signer: marker.fromPubkey.toBase58(), lamports, mood };
}

export function parseMoodTransaction(transaction: ParsedTransactionWithMeta) {
  if (transaction.meta?.err) throw new Error("The transaction exists but did not succeed.");

  const instructions = transaction.transaction.message.instructions as (
    | ParsedInstruction
    | PartiallyDecodedInstruction
  )[];
  if (instructions.length !== 2) {
    throw new Error("A BLUNDER mood transaction must contain exactly two instructions.");
  }

  const transfers = instructions.filter(
    (instruction): instruction is ParsedInstruction =>
      "parsed" in instruction &&
      instruction.program === "system" &&
      instruction.parsed?.type === "transfer",
  );
  if (transfers.length !== 2) throw new Error("The transaction contains an unsupported instruction.");

  const parsedTransfers = transfers.map((instruction) => ({
    source: String(instruction.parsed.info?.source || ""),
    destination: String(instruction.parsed.info?.destination || ""),
    lamports: Number(instruction.parsed.info?.lamports),
  }));
  const marker = parsedTransfers.find((transfer) => transfer.source === transfer.destination);
  const channelReference = parsedTransfers.find(
    (transfer) =>
      transfer.destination === BLUNDER_CHANNEL_ADDRESS.toBase58() && transfer.lamports === 0,
  );
  const mood = marker ? ALLOWED_MOOD_LAMPORTS.get(marker.lamports) : undefined;
  if (!marker || !channelReference || marker.source !== channelReference.source || !mood) {
    throw new Error("The transaction is not a canonical BLUNDER mood signal.");
  }

  const signer = transaction.transaction.message.accountKeys.find(
    (account) => account.signer && account.pubkey.equals(new PublicKey(marker.source)),
  );
  if (!signer) throw new Error("The transfer source did not sign the transaction.");

  return { signer: marker.source, lamports: marker.lamports, mood };
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
  const { signer, lamports, mood } = parseMoodTransaction(transaction);

  const now = Math.floor(Date.now() / 1_000);
  if (!transaction.blockTime || now - transaction.blockTime > 15 * 60) {
    throw new Error("That transaction is older than the 15-minute event window.");
  }

  return {
    verified: true,
    signature,
    signer,
    mood,
    lamports,
    slot: transaction.slot,
    blockTime: transaction.blockTime,
    network: SOLANA_NETWORK,
    explorerUrl: explorerTransactionUrl(signature),
  };
}

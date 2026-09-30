"use client";

import { useState } from "react";
import type { ChainEvent, Mood } from "@/lib/types";

type WalletProvider = {
  isPhantom?: boolean;
  publicKey?: { toString(): string };
  connect(): Promise<{ publicKey: { toString(): string } }>;
  signTransaction<T>(transaction: T): Promise<T>;
};

declare global {
  interface Window {
    solana?: WalletProvider;
  }
}

const ACTIONS: { mood: Mood; lamports: number; label: string }[] = [
  { mood: "calm", lamports: 1_000, label: "Steady it" },
  { mood: "greedy", lamports: 2_000, label: "Tempt it" },
  { mood: "tilted", lamports: 3_000, label: "Tilt it" },
];

export function ChainActions({ onEvent }: { onEvent(event: ChainEvent): void }) {
  const [wallet, setWallet] = useState("");
  const [signature, setSignature] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function connectWallet() {
    if (!window.solana?.isPhantom) {
      setStatus("Phantom was not found. You can still use simulation mode.");
      return;
    }
    try {
      const response = await window.solana.connect();
      setWallet(response.publicKey.toString());
      setStatus("Devnet wallet connected.");
    } catch {
      setStatus("Wallet connection was cancelled.");
    }
  }

  function simulate(mood: Mood, lamports: number) {
    const id = crypto.randomUUID();
    onEvent({
      id,
      signature: `SIM-${id.replaceAll("-", "").slice(0, 18)}`,
      mood,
      lamports,
      timestamp: Date.now(),
      verified: false,
      source: "simulation",
    });
    setStatus(`${mood.toUpperCase()} event queued for BLUNDER's next move.`);
  }

  async function sendDevnetAction(mood: Mood, lamports: number) {
    if (!window.solana?.publicKey) {
      await connectWallet();
      setStatus("Wallet connected. Press the action once more to sign.");
      return;
    }

    setBusy(true);
    setStatus("Waiting for a devnet signature…");
    try {
      const { Connection, PublicKey, SystemProgram, Transaction, clusterApiUrl } = await import("@solana/web3.js");
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl("devnet");
      const connection = new Connection(rpcUrl, "confirmed");
      const publicKey = new PublicKey(window.solana.publicKey.toString());
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      const transaction = new Transaction({ blockhash, lastValidBlockHeight, feePayer: publicKey }).add(
        SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: publicKey, lamports }),
      );
      const signed = await window.solana.signTransaction(transaction);
      const raw = "serialize" in (signed as object)
        ? (signed as unknown as { serialize(): Uint8Array }).serialize()
        : new Uint8Array();
      const txSignature = await connection.sendRawTransaction(raw);
      await connection.confirmTransaction({ signature: txSignature, blockhash, lastValidBlockHeight }, "confirmed");
      setSignature(txSignature);
      await verifySignature(txSignature);
    } catch (error) {
      console.error(error);
      setStatus("The devnet action did not complete. Check the wallet network and balance.");
    } finally {
      setBusy(false);
    }
  }

  async function verifySignature(value = signature) {
    if (!value.trim()) return;
    setBusy(true);
    setStatus("Verifying against Solana devnet…");
    try {
      const response = await fetch("/api/verify-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature: value.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Verification failed");
      onEvent({
        id: `chain-${result.signature}`,
        signature: result.signature,
        mood: result.mood,
        lamports: result.lamports,
        timestamp: (result.blockTime || Math.floor(Date.now() / 1000)) * 1000,
        verified: true,
        source: "devnet",
        explorerUrl: result.explorerUrl,
      });
      setStatus(`Verified at slot ${result.slot.toLocaleString()}. Mood updated.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="chain-actions" id="interact">
      <div className="section-heading">
        <div>
          <p className="eyebrow">INTERRUPT THE BRAIN</p>
          <h2>Send a mood signal</h2>
        </div>
        <button className="text-button" type="button" onClick={connectWallet}>
          {wallet ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}` : "Connect wallet"}
        </button>
      </div>
      <p className="section-intro">Use instant simulation, or connect Phantom and write a transparent self-transfer to devnet. No stake. No payout. Just bad chess.</p>
      <div className="action-grid">
        {ACTIONS.map((action) => (
          <div className={`action-card action-card--${action.mood}`} key={action.mood}>
            <strong>{action.label}</strong>
            <span>{action.lamports.toLocaleString()} lamports</span>
            <div>
              <button type="button" onClick={() => simulate(action.mood, action.lamports)}>Simulate</button>
              <button type="button" disabled={busy} onClick={() => sendDevnetAction(action.mood, action.lamports)}>Devnet</button>
            </div>
          </div>
        ))}
      </div>
      <div className="verify-form">
        <label htmlFor="signature">Already have a devnet signature?</label>
        <div>
          <input id="signature" value={signature} onChange={(event) => setSignature(event.target.value)} placeholder="Paste transaction signature" />
          <button type="button" disabled={busy || !signature.trim()} onClick={() => verifySignature()}>{busy ? "Checking…" : "Verify"}</button>
        </div>
      </div>
      <p className="action-status" role="status">{status || "Simulation mode is ready."}</p>
    </section>
  );
}

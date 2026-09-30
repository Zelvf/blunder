"use client";

import { useState } from "react";
import type { Mood } from "@/lib/types";

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

export function ChainActions({ onConfirmed }: { onConfirmed(): void | Promise<void> }) {
  const [wallet, setWallet] = useState("");
  const [signature, setSignature] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [mainnetAccepted, setMainnetAccepted] = useState(false);

  async function connectWallet() {
    if (!window.solana?.isPhantom) {
      setStatus("Phantom was not found. Install or enable Phantom to send a global signal.");
      return;
    }
    try {
      const response = await window.solana.connect();
      setWallet(response.publicKey.toString());
      setStatus("Wallet connected. Mainnet actions require your explicit signature.");
    } catch {
      setStatus("Wallet connection was cancelled.");
    }
  }

  async function sendMainnetAction(mood: Mood, lamports: number) {
    if (!mainnetAccepted) {
      setStatus("Acknowledge the real mainnet network fee before continuing.");
      return;
    }
    if (!window.solana?.publicKey) {
      await connectWallet();
      setStatus("Wallet connected. Press the action once more to sign.");
      return;
    }

    setBusy(true);
    setStatus("Preparing a globally discoverable Solana mainnet signal…");
    try {
      const configResponse = await fetch("/api/solana/config", { cache: "no-store" });
      const config = await configResponse.json();
      if (!configResponse.ok) throw new Error(config.error || "Mainnet is unavailable.");

      const { PublicKey, SystemProgram, Transaction } = await import("@solana/web3.js");
      const publicKey = new PublicKey(window.solana.publicKey.toString());
      const channelAddress = new PublicKey(config.channelAddress);
      const transaction = new Transaction({
        blockhash: config.blockhash,
        lastValidBlockHeight: config.lastValidBlockHeight,
        feePayer: publicKey,
      }).add(
        SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: publicKey, lamports }),
        SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: channelAddress, lamports: 0 }),
      );
      const signed = await window.solana.signTransaction(transaction);
      const raw = "serialize" in (signed as object)
        ? (signed as unknown as { serialize(): Uint8Array }).serialize()
        : new Uint8Array();
      let binary = "";
      for (const byte of raw) binary += String.fromCharCode(byte);
      const response = await fetch("/api/solana/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction: btoa(binary) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Mainnet submission failed.");

      setSignature(result.signature);
      setStatus(`Finalized at slot ${result.slot.toLocaleString()}. Every viewer will apply it on BLUNDER's next move.`);
      await onConfirmed();
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : "The mainnet action did not complete.");
    } finally {
      setBusy(false);
    }
  }

  async function verifySignature(value = signature) {
    if (!value.trim()) return;
    setBusy(true);
    setStatus("Verifying the shared signal against Solana mainnet…");
    try {
      const response = await fetch("/api/verify-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature: value.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Verification failed");
      setStatus(`Verified at slot ${result.slot.toLocaleString()}. The canonical game will pick it up automatically.`);
      await onConfirmed();
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
          <p className="eyebrow">INTERRUPT THE SHARED BRAIN · MAINNET</p>
          <h2>Send a global mood signal</h2>
        </div>
        <button className="text-button" type="button" onClick={connectWallet}>
          {wallet ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}` : "Connect wallet"}
        </button>
      </div>
      <p className="section-intro">Every signal is a signed self-transfer plus a zero-lamport reference to BLUNDER&apos;s public channel. The reference makes the event discoverable by every viewer; only the real network fee leaves your wallet.</p>
      <label className="mainnet-consent">
        <input
          type="checkbox"
          checked={mainnetAccepted}
          onChange={(event) => setMainnetAccepted(event.target.checked)}
        />
        <span><strong>I understand this is Solana mainnet.</strong> Phantom will ask me to approve a real network fee. The 1,000–3,000 lamport marker returns to my wallet.</span>
      </label>
      <div className="action-grid">
        {ACTIONS.map((action) => (
          <div className={`action-card action-card--${action.mood}`} key={action.mood}>
            <strong>{action.label}</strong>
            <span>{action.lamports.toLocaleString()} lamport marker</span>
            <div>
              <button type="button" disabled={busy || !mainnetAccepted} onClick={() => sendMainnetAction(action.mood, action.lamports)}>
                {busy ? "Working…" : "Send onchain"}
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="verify-form">
        <label htmlFor="signature">Verify a BLUNDER channel signature</label>
        <div>
          <input id="signature" value={signature} onChange={(event) => setSignature(event.target.value)} placeholder="Paste transaction signature" />
          <button type="button" disabled={busy || !signature.trim()} onClick={() => verifySignature()}>{busy ? "Checking…" : "Verify"}</button>
        </div>
      </div>
      <p className="action-status" role="status">{status || "The global signal channel is ready."}</p>
    </section>
  );
}

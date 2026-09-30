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
  const [mainnetAccepted, setMainnetAccepted] = useState(false);

  async function connectWallet() {
    if (!window.solana?.isPhantom) {
      setStatus("Phantom was not found. You can still use simulation mode.");
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

  function simulate(mood: Mood, lamports: number, timestamp: number) {
    const id = crypto.randomUUID();
    onEvent({
      id,
      signature: `SIM-${id.replaceAll("-", "").slice(0, 18)}`,
      mood,
      lamports,
      timestamp,
      verified: false,
      source: "simulation",
    });
    setStatus(`${mood.toUpperCase()} event queued for BLUNDER's next move.`);
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
    setStatus("Preparing a bounded Solana mainnet transaction…");
    try {
      const configResponse = await fetch("/api/solana/config", { cache: "no-store" });
      const config = await configResponse.json();
      if (!configResponse.ok) throw new Error(config.error || "Mainnet is unavailable.");

      const { PublicKey, SystemProgram, Transaction } = await import("@solana/web3.js");
      const publicKey = new PublicKey(window.solana.publicKey.toString());
      const transaction = new Transaction({
        blockhash: config.blockhash,
        lastValidBlockHeight: config.lastValidBlockHeight,
        feePayer: publicKey,
      }).add(
        SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: publicKey, lamports }),
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
      onEvent({
        id: `chain-${result.signature}`,
        signature: result.signature,
        mood: result.mood,
        lamports: result.lamports,
        timestamp: result.blockTime * 1000,
        verified: true,
        source: "mainnet",
        explorerUrl: result.explorerUrl,
      });
      setStatus(`Confirmed on mainnet at slot ${result.slot.toLocaleString()}. Mood updated.`);
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
    setStatus("Verifying against Solana mainnet…");
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
        source: "mainnet",
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
          <p className="eyebrow">INTERRUPT THE BRAIN · MAINNET</p>
          <h2>Send a mood signal</h2>
        </div>
        <button className="text-button" type="button" onClick={connectWallet}>
          {wallet ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}` : "Connect wallet"}
        </button>
      </div>
      <p className="section-intro">Use instant simulation, or connect Phantom and sign a transparent mainnet self-transfer. The principal returns to your wallet; you pay the real network fee. No stake. No payout. Just bad chess.</p>
      <label className="mainnet-consent">
        <input
          type="checkbox"
          checked={mainnetAccepted}
          onChange={(event) => setMainnetAccepted(event.target.checked)}
        />
        <span><strong>I understand this is Solana mainnet.</strong> Phantom will ask me to approve a real network fee before anything is submitted.</span>
      </label>
      <div className="action-grid">
        {ACTIONS.map((action) => (
          <div className={`action-card action-card--${action.mood}`} key={action.mood}>
            <strong>{action.label}</strong>
            <span>{action.lamports.toLocaleString()} lamports</span>
            <div>
              <button type="button" onClick={() => simulate(action.mood, action.lamports, Date.now())}>Simulate</button>
              <button type="button" disabled={busy || !mainnetAccepted} onClick={() => sendMainnetAction(action.mood, action.lamports)}>Mainnet</button>
            </div>
          </div>
        ))}
      </div>
      <div className="verify-form">
        <label htmlFor="signature">Already have a fresh mainnet signature?</label>
        <div>
          <input id="signature" value={signature} onChange={(event) => setSignature(event.target.value)} placeholder="Paste transaction signature" />
          <button type="button" disabled={busy || !signature.trim()} onClick={() => verifySignature()}>{busy ? "Checking…" : "Verify"}</button>
        </div>
      </div>
      <p className="action-status" role="status">{status || "Simulation mode is ready."}</p>
    </section>
  );
}

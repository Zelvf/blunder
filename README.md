# BLUNDER — the always-on onchain chess brain

BLUNDER is one continuous public chess game driven by Solana mainnet. Every viewer derives the same board from the same finalized slot clock and the same ordered mood signals. There is no browser-specific start button, pause button, random reset, or local simulation.

The public proof loop is:

`finalized Solana slots → canonical move tick → verified mood signals → legal move → FEN + state hash`

## What is live

- One global game state for every browser
- Automatic play 24/7, with one ply unlocked every 20 finalized Solana slots
- Deterministic legal chess powered by `chess.js`
- Automatic new matches when a game ends, plus deterministic round boundaries
- Calm, greedy, and tilted selection policies
- A public Solana signal channel that every server instance can discover
- Phantom signing for bounded mainnet mood actions
- Server-side transaction validation and finalization
- Global replay, FEN snapshots, candidate moves, evaluations, and SHA-256 checkpoints
- Responsive, accessible Next.js interface deployed on Vercel

## How Solana controls the game

Solana is the shared clock and event ledger. The server reads the latest **finalized slot**. Every 20 finalized slots unlocks one chess ply, so closing the website does not pause the game. When the site is opened again, the server deterministically replays the current round to the latest finalized tick.

Mood actions are normal signed Solana transactions with exactly two bounded instructions:

1. A 1,000, 2,000, or 3,000 lamport self-transfer encodes calm, greedy, or tilted. The marker amount returns to the signer.
2. A zero-lamport transfer references BLUNDER's fixed public channel address. This makes the transaction discoverable through standard Solana RPC without moving funds to the channel.

The server scans that channel, ignores transactions that do not match the exact protocol, orders valid actions by finalized slot, and applies them to the next eligible BLUNDER moves. Given the same finalized slot, events, and source code, every server and browser produces the same FEN and move log.

The chess engine itself runs deterministically off-chain on Vercel; this is not a custom Solana program storing every board square. Solana provides canonical time, event ordering, signatures, and public evidence, while the open-source engine computes the legal chess state.

## Run locally

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The site works without environment variables by falling back to Solana's rate-limited public mainnet RPC. For production reliability, set a private server-side endpoint:

```env
SOLANA_RPC_URL=https://your-private-mainnet-rpc.example
NEXT_PUBLIC_GITHUB_URL=https://github.com/your-name/blunder
```

## Mainnet signal markers

| Lamports | Mood | Duration |
| ---: | --- | ---: |
| 1,000 | calm | 2 BLUNDER moves |
| 2,000 | greedy | 3 BLUNDER moves |
| 3,000 | tilted | 3 BLUNDER moves |

Only the normal Solana network fee leaves the wallet. There are no wagers, pooled funds, odds, payouts, or claims of value.

## Commands

```bash
npm run dev        # start the local app
npm run lint       # lint source files
npm run typecheck  # check TypeScript
npm run build      # production build
```

## API

- `GET /api/health` — deployment and network health
- `GET /api/game/state` — canonical finalized game state for all viewers
- `GET /api/solana/config` — fresh mainnet blockhash and channel address
- `POST /api/solana/submit` — validate, submit, finalize, and re-verify a mood action
- `POST /api/verify-signature` — verify a fresh canonical channel signature

## Security boundaries

The server accepts only a signed self-transfer marker plus a zero-lamport reference to the fixed channel. It rejects extra instructions, unsupported amounts, mismatched signers, non-finalized failures, and old pasted signatures. Private keys never reach the application; Phantom signs locally and the server receives only serialized signed transaction bytes.

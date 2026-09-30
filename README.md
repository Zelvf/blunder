# BLUNDER — the onchain chess brain

BLUNDER is a working spectator chess experiment. An autonomous bot plays legal games while public mood signals change how it selects from its candidate moves. Calm chooses the clean line, greedy overweights captures, and tilted chooses from a wider risky set.

The entire proof loop is visible:

`Solana action → verified event → bounded mood → legal candidates → public move → replay + state hash`

## Included

- Autonomous, legal browser chess powered by `chess.js`
- A deterministic two-ply candidate evaluator
- Calm, greedy, and tilted selection policies
- Instant event simulation for demos
- Phantom wallet connection and Solana devnet self-transfer actions
- Server-side transaction signature verification
- Event rail, FEN snapshots, move reasoning, and SHA-256 checkpoints
- A local replay room persisted in `localStorage`
- Responsive, accessible Next.js interface

## Run locally

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The site works with no environment variables. By default, chain verification uses Solana's public devnet RPC. For better rate limits, set:

```env
NEXT_PUBLIC_SOLANA_RPC_URL=https://your-devnet-rpc.example
NEXT_PUBLIC_GITHUB_URL=https://github.com/your-name/blunder
```

## Devnet action markers

The transparent action sender transfers a tiny number of devnet lamports from the connected wallet back to itself. The amount is the public mood marker:

| Lamports | Mood |
| ---: | --- |
| 1,000 | calm |
| 2,000 | greedy |
| 3,000 | tilted |

These actions have no financial game mechanic. There are no wagers, pooled funds, odds, payouts, or claims of value.

## Commands

```bash
npm run dev        # start the local app
npm run lint       # lint source files
npm run typecheck  # check TypeScript
npm run build      # production build
```

## API

- `GET /api/health` — deployment and network health
- `POST /api/verify-signature` — verifies a successful devnet transaction and returns its mood marker

Request body:

```json
{ "signature": "..." }
```

## Production notes

The current MVP keeps live game history in the browser so it remains deployable without a database. For a shared global match, replace local persistence with Postgres/Supabase and run the game loop in a durable worker. The UI and event schema are already separated for that upgrade.

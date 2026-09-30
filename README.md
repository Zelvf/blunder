# BLUNDER — the onchain chess brain

BLUNDER is a working spectator chess experiment. An autonomous bot plays legal games while public mood signals change how it selects from its candidate moves. Calm chooses the clean line, greedy overweights captures, and tilted chooses from a wider risky set.

The entire proof loop is visible:

`Solana action → verified event → bounded mood → legal candidates → public move → replay + state hash`

## Included

- Autonomous, legal browser chess powered by `chess.js`
- A deterministic two-ply candidate evaluator
- Calm, greedy, and tilted selection policies
- Instant event simulation for demos
- Phantom wallet connection and bounded Solana mainnet self-transfer actions
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

The site works without environment variables by falling back to Solana's rate-limited public mainnet RPC. For production reliability, set a private server-side endpoint:

```env
SOLANA_RPC_URL=https://your-private-mainnet-rpc.example
NEXT_PUBLIC_GITHUB_URL=https://github.com/your-name/blunder
```

## Mainnet action markers

The transparent action sender signs a tiny native-SOL transfer from the connected wallet back to itself. No principal leaves the wallet, but the signer pays a real Solana mainnet network fee. The amount is the public mood marker:

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
- `GET /api/solana/config` — returns a fresh mainnet blockhash for a wallet action
- `POST /api/solana/submit` — validates, submits, confirms, and re-verifies a signed bounded action
- `POST /api/verify-signature` — verifies a fresh successful mainnet action and returns its mood marker

Request body:

```json
{ "signature": "..." }
```

## Production notes

The server rejects transactions that are not signed self-transfers of exactly 1,000, 2,000, or 3,000 lamports. Pasted signatures must be no more than 15 minutes old. Private keys never reach the application; Phantom signs locally and the server receives only the signed transaction bytes.

The current MVP keeps live game history in the browser so it remains deployable without a database. For a shared global match, replace local persistence with Postgres/Supabase and run the game loop in a durable worker. The UI and event schema are already separated for that upgrade.

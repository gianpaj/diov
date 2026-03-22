# Battle Circles

Battle Circles is a real-time multiplayer browser game built for mobile-first, landscape play. Players control circles, collect knibbles, eat smaller opponents, and survive until the round ends.

Gameplay is authoritative in SpacetimeDB. The frontend subscribes directly to row-level game state and calls reducers for player intent. The Node backend in `apps/backend/` now handles auth and commerce concerns, not match simulation.

## Current Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Rendering | PIXI.js via `@pixi/react` |
| Client state | Zustand |
| Authoritative gameplay backend | SpacetimeDB |
| Shared schema | `packages/shared` codegen |
| Auth / commerce backend | Hono + Better Auth + libSQL |

## Architecture

```txt
Frontend (React + PIXI + Zustand)
  ├─ subscribes to SpacetimeDB tables
  ├─ renders from authoritative row state
  ├─ calls reducers for movement / split / spit / lobby actions
  └─ calls backend HTTP APIs for auth, coins, shop, and loadouts

SpacetimeDB module
  ├─ room lifecycle
  ├─ queue modes: guest / competitive / casual_powerups
  ├─ countdown and match simulation
  ├─ collisions and eliminations
  └─ player_result standings

Backend service
  ├─ Better Auth sessions
  ├─ Telegram OIDC + Mini App auth
  ├─ wallet / ledger / catalog / inventory / loadout APIs
  └─ future TON checkout, webhooks, and entitlements

External bot runner
  ├─ connects to SpacetimeDB as a normal client
  ├─ builds fairness-filtered observations
  ├─ runs local policies or a Unix-socket bridge
  └─ exports traces for replay and training
```

## Important Directories

```txt
apps/frontend/          frontend app package
apps/frontend/src/stores/          GameStore + SocketStore
apps/backend/           auth, economy, and future payment backend
apps/bot-runner/        external bot client runtime
packages/shared/        canonical schema + generated frontend/backend types
packages/spacetimedb/   authoritative game module
packages/spacetimedb-bindings/ generated SpacetimeDB TypeScript client bindings
packages/agent-sdk/     shared bot observation and action schemas
docs/                   plans and research
```

## Queue Model

- `guest-global` → anonymous users can browse and play, but nothing persists
- `competitive-global` → registered-only fair queue
- `casual-global` → registered-only queue reserved for future entitlement-based modes

The frontend remembers the last queue separately for anonymous and registered users.

## Economy and Auth

- Coins are backend-owned, not stored in SpacetimeDB
- Inventory and equipped loadouts live in the backend
- SpacetimeDB only receives match-scoped cosmetic appearance data such as `skinId` and `color`
- Telegram OIDC is the standalone browser sign-in path
- Telegram Mini App sign-in remains supported when the app runs inside Telegram
- TON is the primary planned paid checkout rail; current backend purchase flow records pending TON purchase references rather than completing live blockchain checkout

## Run Locally

### 1. Install dependencies

```bash
pnpm install
```

### 2. Generate shared types and bindings

```bash
pnpm --filter @battle-circles/shared codegen
pnpm --filter @battle-circles/spacetimedb generate
```

### 3. Start SpacetimeDB

```bash
pnpm run spacetime:start
```

### 4. Publish the SpacetimeDB module

Use a stable local CLI identity before publishing. For a fresh local server:

```bash
spacetime logout
spacetime list --server local -y
pnpm --filter @battle-circles/spacetimedb publish:local battle-circles
```

If the local DB owner drifts, stop the running local SpacetimeDB process, run `spacetime server clear`, start the server again, then repeat the login + publish sequence above.

### 5. Configure frontend env

Create `apps/frontend/.env` with values like:

```env
VITE_SPACETIMEDB_HOST=ws://127.0.0.1:3002
VITE_SPACETIMEDB_DB_NAME=battle-circles
VITE_BETTER_AUTH_URL=http://localhost:3001
```

### 6. Configure backend env

Create `apps/frontend/.env` from `apps/frontend/.env.example` and `apps/backend/.env` from `apps/backend/.env.example`. At minimum for the backend:

```env
PORT=3001
CORS_ORIGIN=http://localhost:5173
BETTER_AUTH_URL=http://localhost:3001
BETTER_AUTH_SECRET=replace-with-a-real-secret
TURSO_DATABASE_URL=file:local.db
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_BOT_USERNAME=your_bot_username
TELEGRAM_OIDC_CLIENT_ID=123123123
TELEGRAM_OIDC_CLIENT_SECRET=your-telegram-oidc-client-secret
```

### 7. Start the backend

```bash
pnpm --filter backend dev
```

### 8. Start the frontend

```bash
pnpm --filter frontend dev
```

### 9. Start the bot runner

This is optional for AI and lobby-fill testing.

```bash
pnpm --filter bot-runner start
```

Optional:
- use `BOT_COUNT` to run several bots in one process
- use `BOT_TRACE_PATH` to export newline-delimited decision traces
- use `BOT_POLICY=bridge` to delegate actions to the local Python bridge

## Telegram OIDC in Local Dev

Telegram OIDC does not work on plain `localhost` or `127.0.0.1`. For standalone browser sign-in, use HTTPS tunnels and register the OIDC origin + callback in the BotFather mini app.

Example with `ngrok`:

```txt
frontend → https://<frontend>.ngrok-free.app -> http://localhost:5173
backend  → https://<backend>.ngrok-free.app  -> http://localhost:3001
```

Then configure:

Frontend `apps/frontend/.env`

```env
VITE_BETTER_AUTH_URL=https://<backend>.ngrok-free.app
```

Backend `apps/backend/.env`

```env
CORS_ORIGIN=https://<frontend>.ngrok-free.app
BETTER_AUTH_URL=https://<backend>.ngrok-free.app
```

In the BotFather mini app under `Bot Settings -> Web Login`:
- add the frontend HTTPS origin as the allowed URL
- add `https://<backend>.ngrok-free.app/api/auth/callback/telegram-oidc` as the redirect URL
- copy the generated OIDC client ID and client secret into `apps/backend/.env`
- do not use the legacy chat-menu `Domain` setting for OIDC

Open the app via the frontend HTTPS tunnel, not localhost.

## Useful Scripts

| Script | Purpose |
|---|---|
| `pnpm --filter frontend dev` | start the frontend |
| `pnpm --filter frontend type-check` | frontend type-check |
| `pnpm --filter backend dev` | start the backend |
| `pnpm --filter backend test` | run backend tests |
| `pnpm --filter bot-runner start` | start the external bot runner |
| `pnpm --filter bot-runner replay <trace.jsonl>` | replay a trace against the current bot policy |
| `pnpm --filter bot-runner test` | run bot runner tests |
| `pnpm --filter @battle-circles/shared codegen` | regenerate shared frontend/backend TS types |
| `pnpm --filter @battle-circles/spacetimedb generate` | regenerate frontend module bindings |
| `pnpm run spacetime:start` | start local SpacetimeDB |
| `pnpm --filter @battle-circles/spacetimedb publish:local <db>` | publish the local SpacetimeDB module |

## Current State

Working:
- SpacetimeDB-backed lobby, countdown, and match lifecycle
- Authoritative gameplay state from subscriptions
- Queue modes for guest and registered play
- Backend wallet, ledger, catalog, inventory, and loadout APIs
- Homepage shop/customizer flow and cosmetic-aware joins
- External bot runner with lobby-fill, benchmark, and bridge policies
- Packed observation transport, trace export, and replay harness

Still in progress:
- Telegram OIDC and Telegram Mini App auth support
- broader automated testing
- more frontend performance work
- further removal of compatibility `gameState` paths
- live TON checkout and webhook reconciliation
- long-term entitlement sync into match authority
- more stable and better-documented local SpacetimeDB identity workflow

## Notes for Contributors

- Edit `packages/shared/src/schema.ts` if the wire format changes
- Regenerate shared TS types and Spacetime bindings after schema changes
- Do not hand-edit `packages/spacetimedb-bindings/src/`
- Prefer row-level state from `GameStore` over compatibility `gameState`
- Do not put wallet, inventory, or payment state into SpacetimeDB

## Roadmaps

- [ROADMAP.md](ROADMAP.md)
- [ROADMAP-backend.md](ROADMAP-backend.md)
- [AGENTS.md](AGENTS.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)
- [docs/bot-runner.md](docs/bot-runner.md)

# Battle Circles

Battle Circles is a real-time multiplayer browser game built for mobile-first, landscape play. Players control circles, collect knibbles, eat smaller opponents, and try to survive until the match ends.

The project has been migrated to a SpacetimeDB-based authoritative multiplayer model. The frontend now talks directly to SpacetimeDB for lobby state, countdown, gameplay, and end-of-match results.

## Current Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Rendering | PIXI.js via `@pixi/react` |
| Client state | Zustand |
| Authoritative backend | SpacetimeDB |
| Shared schema | `packages/shared` codegen |
| Legacy backend | Node.js + Express + Socket.io (`backend/`) |

## Architecture

```txt
Frontend (React + PIXI + Zustand)
  ├─ subscribes to SpacetimeDB tables
  ├─ renders from authoritative row state
  └─ sends reducers for player intent

SpacetimeDB module
  ├─ room lifecycle
  ├─ host / lobby / countdown
  ├─ simulation tick
  ├─ collisions and eliminations
  └─ player_result standings

Legacy Node backend
  └─ not used for active gameplay authority
```

## Important Directories

```txt
src/                    frontend app
src/module_bindings/    generated SpacetimeDB TypeScript bindings
src/stores/             GameStore + SocketStore
packages/shared/        canonical schema + generated frontend/backend types
packages/spacetimedb/   authoritative game module
backend/                legacy backend / future business backend
docs/                   plans and research
```

## Run Locally

### 1. Install dependencies

```bash
pnpm install
pnpm --filter backend install
```

### 2. Generate bindings and shared types

```bash
pnpm --filter @battle-circles/shared codegen
pnpm run spacetime:generate
```

### 3. Start SpacetimeDB and publish the module

```bash
pnpm run spacetime:start
pnpm run spacetime:publish:local <db-name>
```

If you use anonymous local publish during development, expect the DB name to change when ownership/token state changes.

### 4. Configure frontend env

Create `.env.local` with values like:

```env
VITE_SPACETIMEDB_HOST=ws://127.0.0.1:3002
VITE_SPACETIMEDB_DB_NAME=battle-circles-v4
```

### 5. Start the frontend

```bash
pnpm run dev
```

## Useful Scripts

| Script | Purpose |
|---|---|
| `pnpm run dev` | start the frontend |
| `pnpm run type-check` | frontend type-check |
| `pnpm --filter @battle-circles/shared codegen` | regenerate shared frontend/backend TS types |
| `pnpm run spacetime:generate` | regenerate frontend module bindings |
| `pnpm run spacetime:start` | start local SpacetimeDB |
| `pnpm run spacetime:publish:local <db>` | publish module to local server |
| `pnpm --filter @battle-circles/spacetimedb exec tsc --noEmit` | type-check SpacetimeDB package |

## Current State

Working:
- SpacetimeDB-backed lobby, countdown, and match lifecycle
- Authoritative gameplay state from subscriptions
- Eliminated-player result persistence via `player_result`
- React + PIXI client still intact

Still in progress:
- further frontend performance work
- removal of the remaining compatibility `gameState` paths
- auth and payments
- stable local SpacetimeDB identity/publish workflow
- broader automated testing

## Legacy Backend

`backend/` is no longer the gameplay authority. Treat it as:
- legacy transition code
- a likely future home for auth, payment webhooks, entitlements, admin APIs, and external integrations

Do not assume it is part of the active match loop.

## Notes for Contributors

- Edit `packages/shared/src/schema.ts` if the wire format changes.
- Regenerate both shared TS types and module bindings after schema changes.
- Do not hand-edit `src/module_bindings/`.
- Prefer row-level state from `GameStore` over the compatibility `gameState`.

## Roadmaps

- [ROADMAP.md](ROADMAP.md)
- [ROADMAP-backend.md](ROADMAP-backend.md)
- [AGENTS.md](AGENTS.md)

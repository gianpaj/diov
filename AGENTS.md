# AGENTS.md — Battle Circles

> Read this file before making changes.

## Project Overview

Battle Circles is a real-time multiplayer browser game. Players control circles, eat smaller opponents, collect knibbles, and try to be the last one standing.

Current architecture:
- Frontend: React 18 + TypeScript + PIXI.js + Zustand + Vite
- Authoritative multiplayer backend: SpacetimeDB
- Legacy backend: `backend/` Node/Express/Socket.io code kept for transition and future business services, not for active gameplay authority
- Package manager: `pnpm`

The active game flow is now:
- frontend connects directly to SpacetimeDB
- frontend subscribes to authoritative tables
- frontend calls reducers for player intent
- SpacetimeDB owns lobby, countdown, match lifecycle, simulation, and final results

## Repository Layout

```txt
diov/
├── src/
│   ├── components/
│   │   ├── HomePage.tsx
│   │   ├── WaitingRoom.tsx
│   │   ├── GamePage.tsx
│   │   └── game/
│   │       ├── ActionButtons.tsx
│   │       ├── GameHUD.tsx
│   │       ├── GameOverScreen.tsx
│   │       └── VirtualJoystick.tsx
│   ├── hooks/
│   ├── module_bindings/        ← generated SpacetimeDB TS bindings
│   ├── stores/
│   │   ├── GameStore.tsx       ← row-level client state + compatibility state
│   │   └── SocketStore.tsx     ← SpacetimeDB connection/subscription store
│   ├── types/
│   └── vite-env.d.ts
├── packages/
│   ├── shared/                 ← canonical schema + codegen
│   └── spacetimedb/            ← authoritative SpacetimeDB module
├── backend/                    ← legacy Node backend / future business backend
├── docs/
├── package.json
└── README.md
```

## Active Data Flow

```txt
[Browser]
  └─ UI input
       └─ GamePage / WaitingRoom
            └─ SocketStore.tsx
                 ├─ call SpacetimeDB reducers
                 └─ subscribe to room/player/knibble/spit_blob/player_result

[SpacetimeDB]
  ├─ room lifecycle
  ├─ countdown/start/end
  ├─ player movement and collisions
  ├─ knibble and spit blob state
  └─ player_result rows for eliminated/final standings

[Frontend]
  ├─ GameStore authoritative row slices
  ├─ PIXI render from row state
  └─ compatibility GameState kept only for remaining legacy UI paths
```

## Key Tables and Reducers

The SpacetimeDB module in `packages/spacetimedb/src/index.ts` is the source of truth.

Public tables:
- `room`
- `player`
- `knibble`
- `spit_blob`
- `player_result`

Important reducers:
- `join_game`
- `leave_game`
- `start_game`
- `set_input`
- `split`
- `spit`
- scheduled `process_tick`

## Current Reality

These points matter when editing the repo:

- Gameplay does not go through the Node backend anymore.
- `SocketStore.tsx` is a SpacetimeDB client store despite the old name.
- `GameStore.tsx` holds row-level authoritative slices. Prefer those over the compatibility `gameState`.
- `src/module_bindings/` is generated. Do not hand-edit it.
- `packages/shared/src/schema.ts` is the canonical wire-format source. Run codegen after changing it.
- The local Node backend is still relevant for future auth, payments, webhooks, and admin APIs, but not for match authority.

## Running the Project

### Frontend

```bash
cd diov
pnpm install
pnpm run dev
```

### SpacetimeDB module workflow

```bash
cd diov
pnpm run spacetime:generate
pnpm run spacetime:publish:local <db-name>
```

Useful env vars:

```env
VITE_SPACETIMEDB_HOST=ws://127.0.0.1:3002
VITE_SPACETIMEDB_DB_NAME=battle-circles-v4
```

### Legacy backend

```bash
cd diov/backend
pnpm install
pnpm run dev
```

Use it only if you are working on legacy code or future business/backend service work.

## Environment Variables

Frontend:
- `VITE_SPACETIMEDB_HOST`
- `VITE_SPACETIMEDB_DB_NAME`

Legacy backend:
- see `backend/.env.example`

## Editing Rules

- Do not reintroduce Socket.io gameplay logic into the active multiplayer path.
- Prefer row-level state (`roomState`, `playerRows`, `knibbleRows`, `spitBlobRows`, `playerResultRows`) over compatibility snapshots.
- If you change `packages/shared/src/schema.ts`, regenerate:
  - `pnpm --filter @battle-circles/shared codegen`
  - `pnpm run spacetime:generate`
- If you change the SpacetimeDB module schema or reducers, publish a fresh local DB or republish to the intended DB owner.
- Keep the backend Node code intact unless the task is explicitly about retiring or repurposing it.

## High-Priority Open Work

- Reduce frontend sync/render churn further; `SocketStore.tsx` and `GamePage.tsx` still carry performance risk.
- Remove remaining compatibility `gameState` dependencies from the UI.
- Add real auth/session design.
- Add payments, entitlements, and webhook handling in a separate backend service.
- Add tests for SpacetimeDB reducer behavior and frontend subscription flows.
- Add proper local/dev documentation for stable SpacetimeDB identities instead of anonymous publish churn.

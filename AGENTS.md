# AGENTS.md — Battle Circles

> **For AI coding agents (Copilot, Claude, Cursor, etc.)**: Read this entire file before making any changes to the codebase.

---

## Project Overview

**Battle Circles** is a real-time multiplayer browser game built as a mobile-first web app.  
Players control growing circles, eat smaller opponents, and compete to be the last one standing.

- **Frontend**: React 18 + TypeScript + PIXI.js (via `@pixi/react`) + Zustand + Socket.io-client
- **Backend**: Node.js + Express 5 + Socket.io + in-memory state (Redis/PostgreSQL planned but not yet wired up)
- **Build Tool**: Vite 5 with PWA support
- **Package Manager**: `pnpm` (monorepo-like structure, two separate `package.json` files)

---

## Repository Layout

```
diov/                          ← frontend root (Vite + React)
├── src/
│   ├── App.tsx                ← root component; enforces landscape orientation
│   ├── main.tsx               ← ReactDOM entry, global touch/context-menu guards
│   ├── index.css              ← global styles (no Tailwind; plain CSS + styled-jsx)
│   ├── components/
│   │   ├── HomePage.tsx       ← name entry + join flow
│   │   ├── WaitingRoom.tsx    ← lobby, player list, countdown
│   │   ├── GamePage.tsx       ← PIXI stage + UI overlay (main game view)
│   │   └── game/
│   │       ├── ActionButtons.tsx   ← Split / Spit buttons (right side)
│   │       ├── GameHUD.tsx         ← time, rank, player count, minimap
│   │       ├── GameOverScreen.tsx  ← leaderboard + play-again
│   │       └── VirtualJoystick.tsx ← touch + mouse joystick (left side)
│   ├── game/
│   │   ├── entities/          ← EMPTY — intended for Player, Knibble classes
│   │   └── systems/           ← EMPTY — intended for Physics, Rendering systems
│   ├── hooks/
│   │   ├── useJoystick.ts     ← full touch + mouse joystick logic
│   │   └── useOrientation.ts  ← landscape enforcement
│   ├── stores/
│   │   ├── GameStore.tsx      ← Zustand store: game state, camera, player input
│   │   └── SocketStore.tsx    ← Zustand store: socket connection + all socket events
│   ├── types/
│   │   ├── game.ts            ← all shared types, enums, constants (GAME_CONSTANTS, COLORS)
│   │   └── index.ts           ← re-exports from game.ts
│   └── utils/                 ← EMPTY — utility helpers not yet written
│
├── public/                    ← EMPTY — PWA icons (icon-192x192.png etc.) missing
├── index.html
├── vite.config.ts             ← aliases: @/, @/components, @/game, @/hooks, etc.
├── tsconfig.json
└── package.json               ← frontend deps

diov/backend/                  ← backend root (Node + Socket.io)
├── src/
│   ├── server.ts              ← Express + Socket.io server entry
│   ├── config.ts              ← Zod-validated env config (requires .env)
│   ├── game/
│   │   ├── engine.ts          ← GameEngine: room registry + tick loop
│   │   ├── room.ts            ← GameRoom: players, knibbles, physics tick, broadcast
│   │   ├── player.ts          ← Player entity class
│   │   ├── physics.ts         ← Physics: move() + isColliding()
│   │   └── events.ts          ← socket event name constants
│   ├── networking/
│   │   ├── socket.ts          ← socketMiddleware: all socket.on() handlers
│   │   └── validators.ts      ← Zod schema for move payload
│   ├── persistence/
│   │   ├── inmemory.ts        ← in-memory Map<roomId, GameRoom> (active store)
│   │   ├── db.ts              ← Prisma client (NOT installed — @prisma/client missing)
│   │   ├── redis.ts           ← Upstash Redis client (NOT wired into server)
│   │   └── autoSave.ts        ← JSON file save/load (GameRoom.fromPlain is not implemented)
│   ├── database/              ← EMPTY — migrations, schema not yet created
│   └── types/
│       └── index.ts           ← PlayerState, KnibbleState, Boundary, GameState, RoomConfig
└── package.json               ← backend deps (missing: socket.io, uuid, dotenv, @upstash/redis)
```

---

## Data Flow

```
[Mobile Browser]
  └─ VirtualJoystick / ActionButtons
       └─ useJoystick hook → direction Vector2D
            └─ GamePage: sendPlayerInput() every render frame (too frequent — see TODO)
                 └─ SocketStore.sendPlayerInput() → socket.emit('player_input', ...)

[Backend]
  socket.on('move', ...) → room.updatePlayerVelocity()
  ↑ NOTE: Frontend emits 'player_input'; backend listens for 'move' — EVENT NAME MISMATCH

  GameEngine tick (every TICK_RATE ms):
    room.update() → physics.move() + resolveCollisions() + checkGameOver()
    room.broadcast() → socket.emit('game_state', state)

[Frontend]
  SocketStore.onGameStateUpdate() → GameStore.setGameState()
    └─ GamePage re-renders PIXI scene
```

---

## Critical Known Issues

These are **blocking bugs** — the game cannot function end-to-end until they are fixed.

### 1. Event Name Mismatch (Frontend ↔ Backend)
- **Frontend** (`SocketStore.tsx`) emits `'player_input'` with `{ movement, splitPressed, spitPressed }`.
- **Backend** (`socket.ts`) listens for `'move'` with `{ dx, dy }`.
- The input from the browser is silently dropped. Players cannot move.
- **Fix**: Align event names (prefer backend constants in `events.ts`) and reconcile payload shapes.

### 2. `join_game` Handler Breaks for Non-Host Players
- In `socket.ts`, the `join_game` handler immediately returns an error for any socket that is not the host:
  ```ts
  if (socket.id !== room.hostId) {
    socket.emit('error', { message: 'Only the host can start the game' })
    return  // ← skips sending initial state and starting countdown
  }
  ```
- Non-host players never receive `GAME_STATE` and are effectively stuck.
- **Fix**: Separate the "send initial state to all joiners" logic from the "only host may start" guard.

### 3. `join_game` Payload Missing `roomId`
- Frontend (`SocketStore.tsx`) emits `socket.emit('join_game', { playerName })` with no `roomId`.
- Backend handler destructures `payload.roomId` — this will be `undefined`, so `getOrCreateRoom(undefined)` always creates/returns the same room keyed by `"undefined"`.
- **Fix**: Either assign a default room ID on the backend (e.g. `"global"`) or pass a `roomId` from the frontend.

### 4. Frontend `GameState` Shape ≠ Backend `GameState` Shape
- Frontend types (`src/types/game.ts`): players keyed as `Record<string, Player>`, positions as `{ position: Vector2D }`, sizes as `size` number.
- Backend types (`backend/src/types/index.ts`): players as `PlayerState[]` array, positions as flat `x`/`y`, sizes as `radius`.
- Every `game_state` broadcast will fail to render correctly in the frontend.
- **Fix**: Agree on one canonical shape (recommend frontend-style with `position`, `size`) and update `room.getGameState()` to map to it.

### 5. `styled-jsx` Not Installed / `<style jsx>` Errors
- Multiple components use `<style jsx>{`…`}</style>` syntax (`GamePage`, `VirtualJoystick`, `GameHUD`, `ActionButtons`, `GameOverScreen`, `HomePage`).
- `styled-jsx` is **not** in `package.json` and is not a Vite plugin.
- TypeScript reports: `Property 'jsx' does not exist on type '...'`.
- **Fix**: Either install `styled-jsx` with the Vite plugin, or convert all component styles to CSS Modules (`.module.css`) or plain CSS classes in `index.css`.

### 6. Backend `config.ts` Requires a `.env` File — No `.env.example`
- `config.ts` uses Zod to parse env vars and will **throw at startup** if any are missing.
- Required vars: `PORT`, `TICK_RATE`, `MAX_PLAYERS_PER_ROOM`, `MIN_PLAYERS_PER_ROOM`, `MAX_SPEED`, `MAP_WIDTH`, `MAP_HEIGHT`, `REDIS_URL`, `DATABASE_URL`, `CORS_ORIGIN`.
- There is no `.env.example` file in the repo.
- `dotenv` is **not** in `backend/package.json`.
- **Fix**: Create `.env.example` with safe defaults; add `dotenv` to backend deps.

### 7. Backend `package.json` Missing Critical Dependencies
- `socket.io` — not listed (server won't start)
- `uuid` — used in `room.ts` (`import { v4 as uuidv4 } from 'uuid'`) but not listed
- `dotenv` — used in `config.ts` but not listed
- `@upstash/redis` — used in `persistence/redis.ts` but not listed
- `typescript`, `ts-node` or `tsx` — needed to run `.ts` files; `nodemon src/server.ts` will fail without a TS runner
- **Fix**: `pnpm add socket.io uuid dotenv @upstash/redis` in `backend/`, configure nodemon to use `tsx` or `ts-node`.

### 8. `GameRoom.fromPlain()` and `toPlain()` Not Implemented
- `autoSave.ts` calls `GameRoom.fromPlain(room)` and `room.toPlain()`.
- Both are stubs in `room.ts` (`toPlain() {}` / `static fromPlain` does not exist at all).
- TypeScript error on `autoSave.ts` line 18.
- The autosave interval will silently fail or crash.

### 9. `@prisma/client` Not Installed
- `backend/src/persistence/db.ts` imports from `@prisma/client` — package not installed, no Prisma schema exists.
- **Fix**: Either remove `db.ts` until Prisma is needed, or add Prisma and run `prisma init`.

### 10. `VITE_SERVER_URL` / `import.meta.env` Type Error
- `SocketStore.tsx` uses `import.meta.env.VITE_SERVER_URL` but there is no `src/vite-env.d.ts` type declaration file.
- TypeScript reports `Property 'env' does not exist on type 'ImportMeta'`.
- **Fix**: Add `/// <reference types="vite/client" />` to a `vite-env.d.ts` file in `src/`.

### 11. PWA Icons Missing
- `vite.config.ts` references `icon-192x192.png` and `icon-512x512.png` in the PWA manifest.
- `public/` directory is empty. Build will succeed but PWA install will fail.

### 12. `GameRoom.getGameState()` Missing `status` Field
- Backend `GameState` type requires a `status` field.
- `room.getGameState()` does not include it → TypeScript error on `room.ts` line 203.

### 13. `Socket.data` Type Error
- `SocketStore.tsx` line 362 uses `socket.data = { pingInterval }` to store the ping interval.
- Socket.io's `Socket` type does not have a `data` property in the client type.
- **Fix**: Store the interval ID in a `useRef` or a store field instead.

---

## Architecture Decisions & Constraints

- **Authoritative server**: The backend is the single source of truth. Clients send input and render state received from the server. Do not implement client-side physics simulation that diverges from the server.
- **Single global room (current)**: Until matchmaking is implemented, all joining players go into a single room. The `roomId` defaults should reflect this.
- **Mobile-first, landscape only**: `App.tsx` gates rendering behind an orientation check. All UI must assume landscape layout. Touch events are primary; mouse is for desktop testing only.
- **No framework CSS**: The project uses plain CSS in `index.css` and `<style>` blocks inside components. Do not introduce Tailwind or other CSS frameworks without updating the existing styles.
- **Zustand stores are singletons**: `useGameStore` and `useSocketStore` are module-level singletons. The `GameProvider` / `SocketProvider` contexts just expose them; they don't create per-tree instances.
- **PIXI.js rendering**: All game world rendering happens inside the `<Stage>` in `GamePage.tsx` using `@pixi/react` declarative components (`Graphics`, `Container`). Do not mix DOM rendering with PIXI rendering for game objects.

---

## Running the Project

### Frontend
```bash
cd diov
pnpm install
pnpm run dev          # http://localhost:3000
```

### Backend
```bash
cd diov/backend
# Create .env from .env.example (does not exist yet — see TODO)
pnpm install
pnpm run dev          # http://localhost:3001
```

> **Note**: The backend will crash on startup without a valid `.env` file. See issue #6 above.

---

## Environment Variables

### Backend `.env` (required)
| Variable | Example | Description |
|---|---|---|
| `PORT` | `3001` | HTTP/WS server port |
| `TICK_RATE` | `50` | Game loop interval in ms (50 = 20 TPS) |
| `MAX_PLAYERS_PER_ROOM` | `12` | |
| `MIN_PLAYERS_PER_ROOM` | `2` | |
| `MAX_SPEED` | `5` | Max pixels per tick |
| `MAP_WIDTH` | `2000` | World width in px |
| `MAP_HEIGHT` | `2000` | World height in px |
| `REDIS_URL` | `redis://localhost:6379` | Not yet used; required by schema |
| `DATABASE_URL` | `postgres://...` | Not yet used; required by schema |
| `CORS_ORIGIN` | `*` | |
| `NODE_ENV` | `development` | |

### Frontend `.env` (optional)
| Variable | Default | Description |
|---|---|---|
| `VITE_SERVER_URL` | `ws://localhost:3001` | Backend WebSocket URL |

---

## Code Style & Conventions

- **TypeScript strict mode** is enabled. Do not use `any` unless explicitly noted.
- All shared game types live in `src/types/game.ts`. Backend types in `backend/src/types/index.ts`. These two **must be kept in sync** — see issue #4.
- Socket event name constants live in `backend/src/game/events.ts`. Import from there; do not hardcode strings.
- Component files use `.tsx`; pure logic/hooks use `.ts`.
- Path aliases are configured: `@/` maps to `src/`. Use them consistently.
- Do not add `console.log` in render paths. Use them only in socket event handlers and one-time init code.
- Prefer `const` arrow functions for React components. Use `React.FC<Props>` typing.

---

## Testing

- Frontend test runner: **Vitest** (`pnpm test`)
- No tests exist yet. New logic should have unit tests alongside it.
- Backend has no test setup configured.

---

## What Is NOT Done (High Priority)

See `TODO.md` for the full list. Short version:

1. Frontend and backend event contracts are mismatched — game is unplayable.
2. Backend dependencies are incomplete — server will not start.
3. No `.env.example` — backend is unconfigurable from a fresh clone.
4. `styled-jsx` causes TypeScript errors in every UI component.
5. `src/game/entities/`, `src/game/systems/`, `src/utils/` are empty scaffolding directories.
6. No player authentication or session persistence.
7. No matchmaking — only one implicit global room.
8. Redis and PostgreSQL are declared in config but never used.
```

Now let me write the updated README:
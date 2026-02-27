# TODO — Battle Circles

Prioritised task list. Items marked 🔴 are **blocking** (the game cannot be played end-to-end until they are fixed). Items marked 🟡 are **important but non-blocking**. Items marked 🟢 are **nice-to-have / future work**.

---

## 🔵 Wire-Format Type Contract (Option C — Code Generation)

**Status: implemented.** The canonical types now live in one place and are generated into both packages.

### How it works

```
packages/shared/src/schema.ts   ← Zod v4 schemas (single source of truth)
packages/shared/src/events.ts   ← socket event name constants
packages/shared/src/validators.ts ← runtime safeParse helpers
       │
       └─ pnpm codegen
            ├─ backend/src/types/generated.ts   (do not edit by hand)
            └─ src/types/generated.ts           (do not edit by hand)
```

### Workflow — changing the wire format

1. Edit `packages/shared/src/schema.ts` (Zod schema)
2. Run `pnpm codegen` from the repo root (or `pnpm --filter @battle-circles/shared codegen`)
3. Commit `schema.ts` + both `generated.ts` files together in one commit
4. Run `pnpm type-check:all` to verify all three packages compile

### Workflow — changing event names

1. Edit `packages/shared/src/events.ts`
2. No codegen needed — the file is imported directly via path alias
3. Run `pnpm type-check:all`

### Remaining tasks

- [ ] Remove the now-redundant divergence comment block from `docs/testing-and-contract-sync.md` (the table at the bottom) and replace with a pointer to `packages/shared/src/schema.ts`
- [ ] Update `backend/src/networking/validators.ts` to fully remove the old local `moveSchema` / `vector2DSchema` definitions (currently kept as deprecated aliases — safe to delete once all call sites are updated)
- [ ] Add `pnpm codegen` as a step in the GitHub Actions CI pipeline so generated files are verified on every PR
- [ ] Add a CI check that fails if a developer edits `backend/src/types/generated.ts` or `src/types/generated.ts` directly (e.g. a pre-commit hook that re-runs codegen and diffs)


---

## 🔴 Blocking — Fix Before Anything Else

### Backend: No `.env.example`

- [ ] Create `backend/.env.example` with safe default values for all required variables:
  - `PORT=3001`
  - `TICK_RATE=50`
  - `MAX_PLAYERS_PER_ROOM=12`
  - `MIN_PLAYERS_PER_ROOM=2`
  - `MAX_SPEED=5`
  - `MAP_WIDTH=2000`
  - `MAP_HEIGHT=2000`
  - `REDIS_URL=redis://localhost:6379`
  - `DATABASE_URL=postgres://user:pass@localhost:5432/battle_circles`
  - `CORS_ORIGIN=*`
  - `NODE_ENV=development`

### Backend: `join_game` Handler Broken for Non-Host Players

- [x] Fix `backend/src/networking/socket.ts` — the current handler returns an error and exits for every player who is not the host, so only the host ever receives `game_state` or gets added to the room properly
- [x] Separate concerns: all joining players should receive initial state; only the host should be allowed to trigger `start_game`
- [x] Emit `game_state` (initial state) to every player on join, not just the host
- [x] Emit `player_joined` broadcast to all existing players in the room when a new player joins

### Backend: `join_game` Payload Missing `roomId`

- [x] Frontend (`SocketStore.tsx`) emits `socket.emit('join_game', { playerName })` with no `roomId`
- [x] Backend destructures `payload.roomId` which will be `undefined`, causing all players to share a single accidental room keyed `"undefined"`
- [x] Decision needed: either send a hardcoded default room ID from the frontend (`"global"` for MVP), or have the backend assign the room and return the `roomId` to the client
- [x] For MVP: default to a single global room; add matchmaking later

### Frontend ↔ Backend: Socket Event Name Mismatch

- [x] Frontend (`SocketStore.tsx`) emits `'player_input'` with payload `{ movement: { x, y }, splitPressed, spitPressed }`
- [x] Backend (`socket.ts`) listens for `'move'` with payload `{ dx, dy }` — the input is silently dropped; players cannot move
- [x] Align event names using the constants in `backend/src/game/events.ts`; add `PLAYER_INPUT`, `START_GAME`, `LEAVE_GAME` constants as needed
- [x] Reconcile payload shapes: backend validator (`validators.ts`) expects `{ dx, dy }` — update to accept `{ movement: { x, y }, splitPressed, spitPressed }` or map at the boundary
- [x] Frontend `startGame()` emits `'start_game'`; backend has no handler for it — add one in `socket.ts`
- [x] Frontend `leaveGame()` emits `'leave_game'`; backend has no handler — add one

### Frontend ↔ Backend: `GameState` Shape Mismatch

- [x] Frontend types (`src/types/game.ts`): players stored as `Record<string, Player>`, positions as `{ position: Vector2D }`, size as `size: number`, liveness as `isAlive: boolean`
- [x] Backend types (`backend/src/types/index.ts`): players as `PlayerState[]` array, positions as flat `x: number, y: number`, size as `radius: number`, no `isAlive` field
- [x] Every `game_state` broadcast will fail to render in the frontend
- [x] Recommended fix: update `room.getGameState()` to emit a shape matching the frontend `GameState` type (use `position`, `size`, `isAlive`, keyed record)
- [x] Canonical wire format established in `packages/shared/src/schema.ts`; both sides now import from `generated.ts` — see 🔵 section above

### Backend: `getGameState()` Missing `status` Field (TypeScript Error)

- [x] `room.ts` line 203: `getGameState()` returns an object missing the `status` field required by the `GameState` type
- [x] Add `status: this.status` to the returned object

### Frontend ↔ Backend: Type Divergences

The following divergences existed between the old hand-written type files. All are now resolved by the shared schema — the generated types are the single source of truth.

- [x] `GameEndedMessage.data.stats` — frontend expected `stats: GameStats[]`; backend never sent it. Now `stats` is `optional` in `GameEndedPayload` in the schema.
- [x] `GameStatus.ENDING` — frontend enum had a status the backend never emits. Removed from the schema; `GameStatus` is now derived from `RoomStatus` (no `ENDING` value).
- [x] `GameState.hostId` — frontend typed as `hostId?: string` (optional); backend always sets it. Now `hostId: string` (required) in the schema.
- [x] `Knibble.spawnTime` / `Knibble.value` — frontend-only extra fields. Kept in the frontend `Knibble` type alias but not in the shared `KnibbleState` schema.
- [x] `Player.splitPieces` — frontend-only concept. Kept in the frontend `Player` interface (extends `PlayerState`) but not on the wire.

### Frontend: `styled-jsx` Not Installed — TypeScript Errors in Every Component

- [ ] `styled-jsx` is used in `GamePage.tsx`, `VirtualJoystick.tsx`, `GameHUD.tsx`, `ActionButtons.tsx`, `GameOverScreen.tsx`, `HomePage.tsx`, `WaitingRoom.tsx`
- [ ] It is **not** in `package.json` and has no Vite plugin configured
- [ ] TypeScript error: `Property 'jsx' does not exist on type '...'` on every `<style jsx>` block
- [ ] Recommended fix: convert all component-scoped styles to CSS Modules (`.module.css` files) — this is idiomatic in Vite projects and avoids a runtime dependency
- [ ] Alternative: `pnpm add styled-jsx babel-plugin-styled-jsx` and configure the Vite/Babel plugin

### Frontend: Missing `vite-env.d.ts` — `import.meta.env` Type Error

- [x] `SocketStore.tsx` uses `import.meta.env.VITE_SERVER_URL` but there is no `src/vite-env.d.ts`
- [x] TypeScript reports: `Property 'env' does not exist on type 'ImportMeta'`
- [x] Fix: create `src/vite-env.d.ts` with `/// <reference types="vite/client" />` and typed `ImportMetaEnv`

---

## 🟡 Important — Needed for a Working Game

### Frontend ↔ Backend: Duplicate Event Name Constants

- [x] `backend/src/game/events.ts` is now a thin re-export shim over `packages/shared/src/events.ts`
- [x] Frontend `SocketStore.tsx` still defines local `EV_*` constants — update these to import from `@battle-circles/shared/events` (the Vite alias is already wired)
- [ ] Delete local `EV_*` constants in `SocketStore.tsx` once all references are updated to use shared imports

### Backend: `GameRoom.fromPlain()` / `toPlain()` Not Fully Implemented

- [x] `toPlain()` was a stub returning `undefined` — now returns a plain object snapshot
- [x] `fromPlain` static method did not exist — now exists and throws a clear `not yet implemented` error to satisfy the TypeScript compiler
- [ ] Fully re-hydrate `fromPlain()` to restore a `GameRoom` from a plain object (needed for crash recovery / persistence)
- [ ] TypeScript error on `autoSave.ts` line 18 is resolved; runtime re-hydration still pending

### Backend: `@prisma/client` Not Installed
- [ ] `backend/src/persistence/db.ts` imports `PrismaClient` from `@prisma/client` — package not installed, no Prisma schema exists
- [ ] TypeScript error on `db.ts` line 1
- [ ] For now: remove or stub out `db.ts`; add Prisma properly when PostgreSQL integration begins (`prisma init`, define schema, run migrations)

### Backend: `socket.data` Type Error (Ping Interval Storage)
- [x] `SocketStore.tsx` was storing ping interval on `socket.data` which is not a valid Socket.io client property
- [x] Fixed by adding `pingIntervalId` field to the Zustand store state; `startPingMonitoring` / `stopPingMonitoring` now manage it there

### Backend: `@upstash/redis` Not in `package.json`
- [ ] `backend/src/persistence/redis.ts` imports from `@upstash/redis` — not listed as a dependency
- [ ] Server will fail to import if the file is ever required
- [ ] Add `@upstash/redis` to backend deps, or stub out the file until Redis is needed

### Frontend: `GamePage.tsx` — Player Input Sent Too Frequently
- [ ] `sendPlayerInput` is called inside a `useEffect` that runs on every `direction` change (every render frame)
- [ ] This floods the socket with messages; input should be sent at the backend tick rate (e.g. 20 Hz / every 50 ms)
- [ ] Fix: throttle `sendPlayerInput` to match `GAME_CONSTANTS.NETWORK_UPDATE_RATE`

### Frontend: `GamePage.tsx` — Split/Spit Not Sent to Server
- [ ] `handleSplitAction` and `handleSpitAction` update local store state (`setSplitPressed`) but never call `socket.emit('split')` or `socket.emit('spit')`
- [ ] The backend has handlers for `events.SPLIT` and `events.SPIT` that are never triggered
- [ ] Fix: call `useSocketStore.getState().sendMessage(...)` (or add dedicated `sendSplit` / `sendSpit` actions to `SocketStore`) inside the handlers

### Frontend: Camera Update Causes Infinite Re-Render Risk
- [ ] `GamePage.tsx` `useEffect` for camera update lists `camera` in its dependency array, then calls `updateCamera` which modifies `camera` — this creates a potential infinite loop
- [ ] Fix: remove `camera` from the dependency array and read it via `useRef` or `useGameStore.getState()` inside the effect

### Frontend: `WaitingRoom.tsx` — Host Detection Hardcoded to `true`
- [ ] `const isHost = true` is hardcoded — all players see the "Start Game" button and can trigger a start
- [ ] The commented-out logic (`uiState.socket?.id === gameState?.hostId`) is the correct approach but `socket` is not on `uiState`
- [ ] Fix: expose `useSocketStore(s => s.socket?.id)` and compare it with `gameState.hostId`

### Frontend: `WaitingRoom.tsx` — `setGameState` Called with Backend Shape
- [ ] `onGameStateUpdate` callback passes the raw backend `GameState` to `setGameState` in `GameStore`
- [ ] These types are incompatible (see shape mismatch above) — will cause silent rendering failures
- [ ] Fix: transform/map the incoming state before storing it, or fix the backend to emit the correct shape

### Frontend: Orientation Lock Bypasses Desktop Workflow
- [ ] `App.tsx` shows a rotation warning whenever `window.innerWidth <= window.innerHeight`
- [ ] This blocks use on portrait desktop monitors and makes dev harder
- [ ] Fix: allow override in `NODE_ENV=development` or add a `?landscape=bypass` query param during testing

### Backend & Frontend: Player Presence Tracking

The game has no real presence system. The mechanical pieces (Maps, join/leave broadcasts) exist but several critical behaviours are missing.

- [ ] Add a `connected: boolean` (or `status: 'online' | 'disconnected'`) field to `Player` / `PlayerState` so the backend can distinguish a dropped socket from an eliminated player
- [ ] Implement a **reconnection grace window** (e.g. 10 s): on `disconnect`, mark the player as `connected: false` but do NOT delete them immediately; cancel deletion if the same session reconnects within the window
  - Requires a session token (e.g. a short-lived UUID returned on `join_game` and re-sent on reconnect) because the socket ID changes on reconnect
- [ ] Implement **host re-assignment**: if the host disconnects (or leaves), promote the next connected player to host and emit a `host_changed` event so the frontend can show the Start button to the new host
  - Currently `hostId` is set once and never updated — the room becomes permanently un-startable when the host leaves
- [ ] Make `WaitingRoom.tsx` react to `player_joined` / `player_left` events **directly** (update the player list immediately) rather than waiting for the next `game_state` tick
  - Both callbacks currently only `console.log`; during the `WAITING` phase the game loop does not tick, so the list may never refresh
- [ ] Emit a richer `player_left` payload that includes a `reason` field (`'disconnected' | 'left' | 'eliminated'`) so the frontend and other players can display the correct message
- [ ] Add idle / AFK detection: if a player sends no input for N seconds during `PLAYING`, mark them as AFK; optionally auto-remove after a longer timeout rather than relying on Socket.io's 20 s heartbeat

### Backend: `checkGameOver()` Is a Stub
- [ ] `room.ts` `checkGameOver()` detects 1 or 0 players remaining but does nothing — no winner broadcast, no room cleanup, no `game_ended` event
- [ ] Fix: emit a `game_ended` event with the winner's data, update room status to `FINISHED`, and schedule room cleanup

### Backend: Collision Detection Has a Bug (Eating Own Halves)
- [ ] After `splitPlayer()`, two new players are created with fresh UUIDs unlinked to the original socket ID
- [ ] The split pieces can immediately eat each other in `resolveCollisions()` since they are treated as separate players
- [ ] Fix: tag split pieces with `ownerId` and skip collisions between pieces sharing an owner for a merge-cooldown period

### Backend: `splitPlayer()` Deletes the Original Player
- [ ] After splitting, the original `socket.id`-keyed player is deleted and replaced with two UUID-keyed ones
- [ ] The socket handler uses `socket.id` to look up the player — subsequent `move`/`split`/`spit` events will fail to find the player
- [ ] Fix: keep the original socket.id player as one of the halves; use a piece ownership model

---

## 🟢 Nice to Have / Future Work

### Infrastructure
- [ ] Create `docker-compose.yml` with `frontend`, `backend`, `redis`, `postgres` services
- [ ] Add `backend/.env.example` (covered above) and `diov/.env.example` for frontend
- [ ] Add GitHub Actions CI: lint + type-check on push (`pnpm type-check:all` covers all three packages)
- [ ] Add CI step that runs `pnpm codegen` and fails if the generated files differ from what is committed (prevents hand-edits of generated files)

### Testing

- [ ] Write unit tests for `Physics.move()` and `Physics.isColliding()`
- [ ] Write unit tests for `GameRoom` collision resolution and knibble spawning
- [ ] Write integration tests for the `join_game` → `start_game` → `game_state` socket flow (see `docs/testing-and-contract-sync.md` for ready-to-paste examples)
- [ ] Add `vitest` + `socket.io-client` to `backend/package.json` devDependencies (already listed — run `pnpm install` in `backend/`)
- [ ] Create `backend/tests/` directory with `helpers/`, `integration/`, and `unit/` subdirectories
- [ ] Use Zod schemas from `@battle-circles/shared/validators` in integration tests to validate every broadcast payload shape
- [ ] Add frontend component tests with Vitest + Testing Library for `WaitingRoom` and `GameHUD`

### PWA
- [ ] Add `icon-192x192.png` and `icon-512x512.png` to `public/` — currently missing; PWA install fails
- [ ] Add `manifest.webmanifest` splash screen images
- [ ] Test offline behaviour

### Game: Empty Scaffolding Directories
- [ ] `src/game/entities/` — implement `Player`, `Knibble`, `SpitBlob` client-side entity classes for the PIXI renderer
- [ ] `src/game/systems/` — implement `RenderSystem` (manage PIXI sprites), `CameraSystem` (viewport), `InterpolationSystem` (smooth server-state lerp)
- [ ] `src/utils/` — add `lerp`, `clamp`, `distance`, `normalise` math helpers; move repeated inline math out of components
- [ ] `backend/src/database/` — add Prisma schema file once DB integration begins

### Game: Client-Side Interpolation
- [ ] Server sends snapshots at 20 Hz; without interpolation, movement looks jittery at 60 FPS
- [ ] Implement a ring buffer of the last N server states and lerp between them using `GAME_CONSTANTS.INTERPOLATION_DELAY`

### Game: Shrinking Map Boundary
- [ ] `GameRoom` boundary is static (`{ left: 0, top: 0, right: 2000, bottom: 2000 }`)
- [ ] Implement gradual boundary shrink over the game duration
- [ ] Broadcast updated boundary in each `game_state` tick
- [ ] Frontend should render boundary warning (colour change / pulsing) when a player is near the edge

### Game: SpitBlob Entity
- [ ] Backend `room.ts` `spitPlayer()` modifies speed but does not create a `SpitBlob` entity in the world
- [ ] Add `spitBlobs: SpitBlobState[]` to `GameRoom` state
- [ ] Implement `SpitBlob` lifetime / despawn timer
- [ ] Add player-vs-spitblob collision in `resolveCollisions()`

### Game: Player Name Display
- [ ] Player names are stored on the backend (`Player.name`) but not included in `getGameState()` output
- [ ] Add `name` to `PlayerState` and broadcast it; render player name above the circle in `GamePage.tsx`

### Game: Knibble Colours

- [x] `KnibbleState` now has a `color` field in the shared schema — the backend already assigns it from `KNIBBLE_COLORS` in `room.ts`

### Networking
- [ ] Add rate limiting per socket to prevent input flooding
- [ ] Implement server-side input sequence numbers and client-side reconciliation
- [ ] Add `ping`/`pong` handler on the backend (currently frontend emits `ping` but backend has no listener — latency will always read 0)

### Matchmaking
- [ ] Support multiple concurrent rooms (rooms beyond the single global room)
- [ ] Add a `GET /rooms` HTTP endpoint listing open rooms with player counts
- [ ] Auto-create a new room when the current one is full or in-progress

### Persistence (Redis)
- [ ] Wire `redisClient` from `persistence/redis.ts` into the server
- [ ] Store active game state snapshots in Redis with TTL (for crash recovery)
- [ ] Store per-room leaderboard in a Redis sorted set

### Persistence (PostgreSQL / Prisma)
- [ ] Run `prisma init` in `backend/`
- [ ] Define `Player`, `Game`, `GameResult` models in `schema.prisma`
- [ ] Run migrations
- [ ] Save game results on `game_ended`

### UI / UX
- [ ] Add cooldown indicator (visual timer arc) on Split and Spit buttons
- [ ] Show player name in `GameOverScreen` leaderboard entries
- [ ] Add a minimap that scales correctly (current inline `px` calculations are hardcoded)
- [ ] Add sound effects (eat, split, spit, death) — `AudioState` type exists but nothing plays audio
- [ ] Add particle effects on eat / death events — `ParticleEffect` type and `EffectType` enum exist but nothing renders particles

### Code Quality
- [ ] Remove all `any` type usages in `GamePage.tsx` (`renderPlayer`, `renderKnibble`, `renderSpitBlob` use `any` parameters)
- [ ] Delete unused imports: `Text` in `GamePage.tsx`, `Player` and `GameStateMessage` in `SocketStore.tsx`
- [ ] Extract inline `renderGrid()` and `renderBoundaries()` into dedicated PIXI React components
- [ ] Consolidate duplicate `getConnectionStatusColor()` / `getConnectionColor()` logic between `HomePage.tsx` and `WaitingRoom.tsx` into a shared utility
- [ ] Add `eslint-plugin-jsx-a11y` and fix accessibility issues (buttons missing `aria-label`, etc.)

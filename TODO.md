# TODO — Battle Circles

Prioritised task list. Items marked 🔴 are **blocking** (the game cannot be played end-to-end until they are fixed). Items marked 🟡 are **important but non-blocking**. Items marked 🟢 are **nice-to-have / future work**.

---

## 🔴 Blocking — Fix Before Anything Else

### Backend: Missing Dependencies

- [ ] Add `tsx` (or `ts-node`) to `backend/package.json` devDependencies — `nodemon src/server.ts` cannot run `.ts` files without a TypeScript runner; update `nodemon` config accordingly

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

- [ ] Fix `backend/src/networking/socket.ts` — the current handler returns an error and exits for every player who is not the host, so only the host ever receives `game_state` or gets added to the room properly
- [ ] Separate concerns: all joining players should receive initial state; only the host should be allowed to trigger `start_game`
- [ ] Emit `game_state` (initial state) to every player on join, not just the host
- [ ] Emit `player_joined` broadcast to all existing players in the room when a new player joins

### Backend: `join_game` Payload Missing `roomId`

- [ ] Frontend (`SocketStore.tsx`) emits `socket.emit('join_game', { playerName })` with no `roomId`
- [ ] Backend destructures `payload.roomId` which will be `undefined`, causing all players to share a single accidental room keyed `"undefined"`
- [ ] Decision needed: either send a hardcoded default room ID from the frontend (`"global"` for MVP), or have the backend assign the room and return the `roomId` to the client
- [ ] For MVP: default to a single global room; add matchmaking later

### Frontend ↔ Backend: Socket Event Name Mismatch

- [ ] Frontend (`SocketStore.tsx`) emits `'player_input'` with payload `{ movement: { x, y }, splitPressed, spitPressed }`
- [ ] Backend (`socket.ts`) listens for `'move'` with payload `{ dx, dy }` — the input is silently dropped; players cannot move
- [ ] Align event names using the constants in `backend/src/game/events.ts`; add `PLAYER_INPUT`, `START_GAME`, `LEAVE_GAME` constants as needed
- [ ] Reconcile payload shapes: backend validator (`validators.ts`) expects `{ dx, dy }` — update to accept `{ movement: { x, y }, splitPressed, spitPressed }` or map at the boundary
- [ ] Frontend `startGame()` emits `'start_game'`; backend has no handler for it — add one in `socket.ts`
- [ ] Frontend `leaveGame()` emits `'leave_game'`; backend has no handler — add one

### Frontend ↔ Backend: `GameState` Shape Mismatch

- [ ] Frontend types (`src/types/game.ts`): players stored as `Record<string, Player>`, positions as `{ position: Vector2D }`, size as `size: number`, liveness as `isAlive: boolean`
- [ ] Backend types (`backend/src/types/index.ts`): players as `PlayerState[]` array, positions as flat `x: number, y: number`, size as `radius: number`, no `isAlive` field
- [ ] Every `game_state` broadcast will fail to render in the frontend
- [ ] Recommended fix: update `room.getGameState()` to emit a shape matching the frontend `GameState` type (use `position`, `size`, `isAlive`, keyed record)
- [ ] Alternatively, add a mapping/transform layer in the frontend `SocketStore` `onGameStateUpdate` handler
- [ ] Either way: document the canonical wire format and keep both sides in sync

### Backend: `getGameState()` Missing `status` Field (TypeScript Error)

- [ ] `room.ts` line 203: `getGameState()` returns an object missing the `status` field required by the `GameState` type
- [ ] Add `status: this.status` to the returned object

### Frontend: `styled-jsx` Not Installed — TypeScript Errors in Every Component

- [ ] `styled-jsx` is used in `GamePage.tsx`, `VirtualJoystick.tsx`, `GameHUD.tsx`, `ActionButtons.tsx`, `GameOverScreen.tsx`, `HomePage.tsx`, `WaitingRoom.tsx`
- [ ] It is **not** in `package.json` and has no Vite plugin configured
- [ ] TypeScript error: `Property 'jsx' does not exist on type '...'` on every `<style jsx>` block
- [ ] Recommended fix: convert all component-scoped styles to CSS Modules (`.module.css` files) — this is idiomatic in Vite projects and avoids a runtime dependency
- [ ] Alternative: `pnpm add styled-jsx babel-plugin-styled-jsx` and configure the Vite/Babel plugin

### Frontend: Missing `vite-env.d.ts` — `import.meta.env` Type Error
- [ ] `SocketStore.tsx` uses `import.meta.env.VITE_SERVER_URL` but there is no `src/vite-env.d.ts`
- [ ] TypeScript reports: `Property 'env' does not exist on type 'ImportMeta'`
- [ ] Fix: create `src/vite-env.d.ts` with:
  ```ts
  /// <reference types="vite/client" />
  interface ImportMetaEnv {
    readonly VITE_SERVER_URL: string
  }
  ```

---

## 🟡 Important — Needed for a Working Game

### Backend: `GameRoom.fromPlain()` / `toPlain()` Not Implemented
- [ ] `autoSave.ts` calls `GameRoom.fromPlain(room)` and `room.toPlain()` — both are stubs
- [ ] `toPlain()` is declared but returns `undefined`; `fromPlain` is a static method that doesn't exist
- [ ] TypeScript error on `autoSave.ts` line 18
- [ ] Either implement both methods to enable JSON persistence, or remove `autoSave.ts` until persistence is a priority

### Backend: `@prisma/client` Not Installed
- [ ] `backend/src/persistence/db.ts` imports `PrismaClient` from `@prisma/client` — package not installed, no Prisma schema exists
- [ ] TypeScript error on `db.ts` line 1
- [ ] For now: remove or stub out `db.ts`; add Prisma properly when PostgreSQL integration begins (`prisma init`, define schema, run migrations)

### Backend: `socket.data` Type Error (Ping Interval Storage)
- [ ] `SocketStore.tsx` line 362 sets `socket.data = { pingInterval }` to store the ping timer
- [ ] Socket.io client `Socket` type does not have a `data` property
- [ ] Fix: store the interval ID in a `useRef` inside `useAutoConnect`, or add a `pingIntervalId` field to the store state

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
- [ ] Add GitHub Actions CI: lint + type-check on push

### Testing
- [ ] Write unit tests for `Physics.move()` and `Physics.isColliding()`
- [ ] Write unit tests for `GameRoom` collision resolution and knibble spawning
- [ ] Write integration tests for the `join_game` → `start_game` → `game_state` socket flow
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
- [ ] Backend `KnibbleState` has no `color` field; frontend `Knibble` type expects one
- [ ] Add `color` to `KnibbleState` and assign from a palette on spawn

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

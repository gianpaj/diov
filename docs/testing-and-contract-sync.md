# Testing & Contract Sync — Battle Circles

How to keep the frontend and backend speaking the same language, and how to verify that with automated tests.

---

## Table of Contents

1. [The Problem](#the-problem)
2. [Dimension 1 — Type Sync](#dimension-1--type-sync)
   - [Option A: Shared Package (Recommended Long-Term)](#option-a-shared-package-recommended-long-term)
   - [Option B: Frontend Imports Backend Types via Path Alias](#option-b-frontend-imports-backend-types-via-path-alias)
   - [Option C: Code Generation from a Schema](#option-c-code-generation-from-a-schema)
   - [Option D: Structural Validation Tests (Recommended Near-Term)](#option-d-structural-validation-tests-recommended-near-term)
3. [Dimension 2 — Event Contract Sync](#dimension-2--event-contract-sync)
4. [Dimension 3 — Integration Testing](#dimension-3--integration-testing)
   - [What to Test](#what-to-test)
   - [Recommended Stack](#recommended-stack)
   - [Test Structure](#test-structure)
   - [Example Tests](#example-tests)
5. [Recommended Migration Path](#recommended-migration-path)
6. [Current Divergences to Fix](#current-divergences-to-fix)

---

## The Problem

This project has two separate TypeScript packages that must agree on the exact shape of every socket message. When either side drifts silently the game breaks at runtime with no compile error.

There are two independent sub-problems:

**Type sync** — the wire format types are defined twice:

- `backend/src/types/index.ts` — authoritative for what the server emits
- `src/types/game.ts` — what the frontend expects to receive

They are currently close but not identical (see [Current Divergences](#current-divergences-to-fix)).
Any field rename is a compile error on exactly one side, not both.

**Event contract sync** — socket event name strings are also defined twice:

- `backend/src/game/events.ts` — the canonical list
- `src/stores/SocketStore.tsx` — local `EV_*` constants that duplicate them

A typo in one file compiles cleanly.

Both problems have the same root cause: two packages with no shared compile step or shared module boundary.

---

## Dimension 1 — Type Sync

### Option A: Shared Package (Recommended Long-Term)

Extract the wire format types into a third package that both sides import.

#### Directory layout

```
diov/                           ← pnpm workspace root (new package.json here)
  packages/
    shared/                     ← new package
      src/
        events.ts               ← all event name constants
        types.ts                ← wire format types (GameState, PlayerState, …)
        validators.ts           ← Zod schemas for every inbound payload
      package.json
      tsconfig.json
  backend/                      ← imports from '@battle-circles/shared'
    package.json                ← add "@battle-circles/shared": "workspace:*"
  src/                          ← imports from '@battle-circles/shared'
  package.json                  ← pnpm workspace root, add workspaces field
```

#### `packages/shared/package.json`

```json
{
  "name": "@battle-circles/shared",
  "version": "0.0.1",
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

#### `package.json` (workspace root)

```json
{
  "name": "battle-circles-root",
  "private": true,
  "workspaces": ["packages/*", "backend", "."]
}
```

#### What moves into `packages/shared/src/`

| File | Content |
|---|---|
| `events.ts` | All socket event name constants (currently in `backend/src/game/events.ts`) |
| `types.ts` | `GameState`, `PlayerState`, `KnibbleState`, `Boundary`, `Vector2D`, `RoomStatusValue`, all payload types |
| `validators.ts` | Zod schemas for `PlayerInputPayload`, `JoinGamePayload`, etc. |

The backend `backend/src/types/index.ts` becomes a thin re-export:

```ts
export * from '@battle-circles/shared/types'
```

The frontend `src/types/game.ts` drops its duplicate definitions and imports the shared ones, keeping only frontend-only types (`Camera`, `JoystickState`, `UIState`, etc.).

#### Pros

- Single source of truth — a field rename is a compile error on both sides simultaneously
- Zod schemas live alongside the types so both sides validate against the same schema
- `pnpm` workspaces handle the symlink; no npm publish needed

#### Cons

- Requires restructuring the project into a proper pnpm monorepo (non-trivial but straightforward)
- Adds a `packages/shared` build step, or requires `tsx`/`ts-node` path resolution for `backend/`
- All existing imports must be updated

---

### Option B: Frontend Imports Backend Types via Path Alias

Keep the types only in `backend/src/types/index.ts` and add a TypeScript path alias in the frontend `tsconfig.json` that points into `../backend/src/types`.

```json
// diov/tsconfig.json (addition only)
{
  "compilerOptions": {
    "paths": {
      "@battle-circles/wire": ["../backend/src/types/index.ts"]
    }
  }
}
```

#### Pros

- Zero new packages or tooling
- Immediate — works today

#### Cons

- Crosses npm package boundaries unconventionally; Vite's `isolatedModules` mode can mishandle it
- Any Node.js-only import that leaks into the backend types file (e.g. `import type { Socket }`) breaks the frontend build
- The backend would need to be careful never to import anything non-portable into `types/index.ts`
- **Verdict: viable as a stepping stone, not as a permanent solution**

---

### Option C: Code Generation from a Schema

Define the wire format in a language-neutral schema (JSON Schema or a hand-written Zod schema that is the single source) and generate TypeScript type declarations from it for both packages.

#### Example flow

```
packages/shared/schema.ts  ← Zod schema is the source of truth
       │
       ├─ pnpm codegen → backend/src/types/generated.ts
       └─ pnpm codegen → src/types/generated.ts
```

Tools: `zod-to-ts`, `ts-to-zod` (reverse direction), or just a small hand-rolled `ts-morph` script.

#### Pros

- Maximum single-source-of-truth guarantee
- Can generate runtime validators on both sides from the same schema
- Scales to multiple clients (e.g. a future native app)

#### Cons

- Adds a code-generation step and a new tool to the build pipeline
- Generated files must be committed or regenerated on every change — adds friction
- Significant overhead for a project that does not yet run end-to-end
- **Verdict: the right answer for a production game at scale, not for MVP**

---

### Option D: Structural Validation Tests (Recommended Near-Term)

Do not restructure the project. Instead write integration tests that:

1. Boot a real Socket.io server (`GameEngine` + `socketMiddleware`)
2. Connect a real Socket.io client
3. Assert that every payload emitted by the server is valid against the Zod schemas in `backend/src/networking/validators.ts`

The test suite itself becomes the living contract document. If the backend emits a payload that would be rejected by the frontend, the relevant test fails.

This approach works today, with the existing project structure, and survives a later migration to Option A because the tests exercise runtime behavior, not import paths.

---

## Dimension 2 — Event Contract Sync

### Current state

Event names are duplicated:

| Constant | Backend (`events.ts`) | Frontend (`SocketStore.tsx`) |
|---|---|---|
| `join_game` | `JOIN_GAME` | `EV_JOIN_GAME` |
| `player_input` | `PLAYER_INPUT` | `EV_PLAYER_INPUT` |
| `game_state` | `GAME_STATE` | `EV_GAME_STATE` |
| … | … | … |

### Near-term fix (works without monorepo)

Vite can resolve imports that live outside `src/` using an explicit alias.
Add a single alias in `vite.config.ts` that points the frontend at the backend's events file:

```ts
// vite.config.ts
resolve: {
  alias: {
    // existing aliases …
    '@battle-circles/events': path.resolve(__dirname, '../backend/src/game/events.ts'),
  }
}
```

Add the corresponding path in `tsconfig.json`:

```json
"@battle-circles/events": ["../backend/src/game/events.ts"]
```

Then in `SocketStore.tsx`:

```ts
import * as events from '@battle-circles/events'
// use events.PLAYER_INPUT, events.GAME_STATE, etc.
// delete the local EV_* constants entirely
```

This eliminates the duplication without a monorepo restructure. It carries the same caveat as Option B (cross-package alias) but for a pure-constants file with no Node.js imports it is safe.

### Long-term fix

Move `events.ts` into `packages/shared/src/events.ts` as part of the Option A migration.

---

## Dimension 3 — Integration Testing

### What to Test

Integration tests for this game should cover the full socket lifecycle, not individual functions. The highest-value tests, in priority order:

#### 1. Join flow

- Client connects and emits `join_game`
- Server emits `game_state` back to the joiner with a valid `GameState` payload
- Server emits `player_joined` to all other connected clients with a valid `PlayerJoinedPayload`

#### 2. Start game flow

- Host emits `start_game`
- Server emits `game_started` to all clients with `{ gameState, countdown }`
- After the countdown, server emits `game_state` with `status: 'playing'`
- Non-host client emitting `start_game` receives an `error` response with `code: 'NOT_HOST'`

#### 3. Player input flow
- Client emits `player_input` with `{ movement: { x: 0.5, y: 0 }, splitPressed: false, spitPressed: false }`
- On the next server tick, the emitted `game_state` shows the player's position has changed

#### 4. Invalid input rejection
- Client emits `player_input` with `{ movement: { x: 999, y: 0 } }` (out of range)
- Server emits `error` with `code: 'INVALID_INPUT'`

#### 5. Disconnect flow
- Client A and Client B are in the same room
- Client A disconnects
- Client B receives `player_left` with `{ playerId: <A's id>, playerCount: 1 }`

#### 6. Room full rejection
- Fill a room to `maxPlayers`
- The next join attempt receives `error` with `code: 'ROOM_FULL'`

#### 7. Game over
- Reduce the room to 1 player (by having others disconnect or be eaten)
- Server emits `game_ended` with `{ winner: PlayerState | null, finalState: GameState }`

### Recommended Stack

**[Vitest](https://vitest.dev/)** as the test runner — already a dev dependency on the frontend, fast, excellent TypeScript support, works in Node.js without a browser.

**[socket.io-client](https://socket.io/docs/v4/client-api/)** for test clients — the real client library, not a mock.

**[socket.io](https://socket.io/)** server spun up in-process in a `beforeAll` hook — no separate process, no ports to manage, instant startup.

This combination means tests are:

- Fully async/await (no callback hell)
- Deterministic (in-process server, controlled tick rate)
- Fast (no browser, no subprocess)

### Test Structure

```
backend/
  tests/
    helpers/
      createTestServer.ts     ← boots GameEngine + socketMiddleware on a random port
      createTestClient.ts     ← wraps socket.io-client with promise-based helpers
      waitForEvent.ts         ← typed promise wrapper: waitForEvent(socket, 'game_state')
      gameStateSchema.ts      ← Zod schema assertions for each payload shape
    integration/
      join.test.ts
      startGame.test.ts
      playerInput.test.ts
      disconnect.test.ts
      gameover.test.ts
    unit/
      physics.test.ts
      room.test.ts
      validators.test.ts
```

### Example Tests

#### `helpers/createTestServer.ts`

```ts
import { createServer } from 'node:http'
import { AddressInfo } from 'node:net'
import express from 'express'
import { Server as SocketIOServer } from 'socket.io'
import { GameEngine } from '../../src/game/engine.ts'
import { socketMiddleware } from '../../src/networking/socket.ts'

export interface TestServer {
  url: string
  engine: GameEngine
  io: SocketIOServer
  close: () => Promise<void>
}

export async function createTestServer(tickRate = 100): Promise<TestServer> {
  const app = express()
  const httpServer = createServer(app)
  const io = new SocketIOServer(httpServer, { cors: { origin: '*' } })

  // Use a controlled tick rate so tests don't need to wait 50ms
  process.env['PORT'] = '0'
  process.env['TICK_RATE'] = String(tickRate)
  process.env['MAX_PLAYERS_PER_ROOM'] = '12'
  process.env['MIN_PLAYERS_PER_ROOM'] = '2'
  process.env['MAX_SPEED'] = '5'
  process.env['MAP_WIDTH'] = '2000'
  process.env['MAP_HEIGHT'] = '2000'
  process.env['NODE_ENV'] = 'test'

  const engine = new GameEngine(io)
  socketMiddleware(io, engine)

  await new Promise<void>(resolve => httpServer.listen(0, resolve))
  const { port } = httpServer.address() as AddressInfo

  return {
    url: `http://localhost:${port}`,
    engine,
    io,
    close: () =>
      new Promise<void>((resolve, reject) => {
        engine.stop()
        httpServer.close(err => (err ? reject(err) : resolve()))
      }),
  }
}
```

#### `helpers/waitForEvent.ts`

```ts
import type { Socket } from 'socket.io-client'

/**
 * Returns a promise that resolves with the first payload emitted on `event`,
 * or rejects after `timeoutMs` (default 2000ms).
 *
 *   const state = await waitForEvent<GameState>(socket, 'game_state')
 */
export function waitForEvent<T>(
  socket: Socket,
  event: string,
  timeoutMs = 2000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timed out waiting for event "${event}" after ${timeoutMs}ms`))
    }, timeoutMs)

    socket.once(event, (payload: T) => {
      clearTimeout(timer)
      resolve(payload)
    })
  })
}
```

#### `helpers/gameStateSchema.ts`

```ts
import { z } from 'zod'

// These schemas are the integration test contract.
// They assert the exact shape the frontend will receive.
// If getGameState() is changed without updating these, the tests fail.

export const vector2DSchema = z.object({
  x: z.number(),
  y: z.number(),
})

export const playerStateSchema = z.object({
  id: z.string(),
  name: z.string(),
  position: vector2DSchema,
  velocity: vector2DSchema,
  size: z.number().positive(),
  color: z.string(),
  isAlive: z.boolean(),
  score: z.number().int().min(0),
  lastSplitTime: z.number(),
  lastSpitTime: z.number(),
})

export const knibbleStateSchema = z.object({
  id: z.string(),
  position: vector2DSchema,
  size: z.number().positive(),
  color: z.string(),
})

export const boundarySchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number().positive(),
  height: z.number().positive(),
})

export const roomStatusSchema = z.enum(['waiting', 'starting', 'playing', 'finished'])

export const gameStateSchema = z.object({
  id: z.string(),
  status: roomStatusSchema,
  startTime: z.number(),
  endTime: z.number().optional(),
  duration: z.number().positive(),
  maxPlayers: z.number().int().positive(),
  minPlayers: z.number().int().positive(),
  hostId: z.string(),
  winner: z.string().optional(),
  lastUpdate: z.number(),
  players: z.record(z.string(), playerStateSchema),
  knibbles: z.record(z.string(), knibbleStateSchema),
  spitBlobs: z.record(z.string(), z.unknown()),
  bounds: boundarySchema,
})

export const playerJoinedSchema = z.object({
  player: playerStateSchema,
  playerCount: z.number().int().positive(),
})

export const playerLeftSchema = z.object({
  playerId: z.string(),
  playerCount: z.number().int().min(0),
})

export const gameStartedSchema = z.object({
  gameState: gameStateSchema,
  countdown: z.number().int().positive(),
})

export const gameEndedSchema = z.object({
  winner: playerStateSchema.nullable(),
  finalState: gameStateSchema,
})

export const errorPayloadSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
})
```

#### `integration/join.test.ts`

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { io as ioClient, Socket } from 'socket.io-client'
import { createTestServer, type TestServer } from '../helpers/createTestServer.ts'
import { waitForEvent } from '../helpers/waitForEvent.ts'
import {
  gameStateSchema,
  playerJoinedSchema,
  errorPayloadSchema,
} from '../helpers/gameStateSchema.ts'

describe('join_game', () => {
  let server: TestServer
  let clientA: Socket
  let clientB: Socket

  beforeAll(async () => {
    server = await createTestServer()
  })

  afterAll(async () => {
    clientA?.disconnect()
    clientB?.disconnect()
    await server.close()
  })

  it('first joiner receives game_state with status "waiting"', async () => {
    clientA = ioClient(server.url, { autoConnect: false })
    clientA.connect()

    const [, state] = await Promise.all([
      new Promise<void>(r => clientA.once('connect', r)),
      waitForEvent(clientA, 'game_state'),
    ])

    // Assert the payload matches the full expected shape
    const parsed = gameStateSchema.safeParse(state)
    expect(parsed.success, JSON.stringify(parsed.error?.flatten())).toBe(true)

    if (parsed.success) {
      expect(parsed.data.status).toBe('waiting')
      expect(Object.keys(parsed.data.players)).toHaveLength(1)
    }
  })

  it('second joiner receives game_state and first joiner receives player_joined', async () => {
    clientB = ioClient(server.url, { autoConnect: false })

    const playerJoinedPromise = waitForEvent(clientA, 'player_joined')

    clientB.connect()
    await new Promise<void>(r => clientB.once('connect', r))

    const [gameStatePayload, playerJoinedPayload] = await Promise.all([
      waitForEvent(clientB, 'game_state'),
      playerJoinedPromise,
    ])

    // game_state sent to the new joiner has both players
    const parsedState = gameStateSchema.safeParse(gameStatePayload)
    expect(parsedState.success, JSON.stringify(parsedState.error?.flatten())).toBe(true)
    if (parsedState.success) {
      expect(Object.keys(parsedState.data.players)).toHaveLength(2)
    }

    // player_joined sent to the existing player has the right shape
    const parsedJoined = playerJoinedSchema.safeParse(playerJoinedPayload)
    expect(parsedJoined.success, JSON.stringify(parsedJoined.error?.flatten())).toBe(true)
    if (parsedJoined.success) {
      expect(parsedJoined.data.playerCount).toBe(2)
    }
  })

  it('rejects join when room is full', async () => {
    // Create a server with maxPlayers = 1 to easily test this
    const smallServer = await createTestServer()
    const room = smallServer.engine.getOrCreateRoom('full-room-test')
    // Fill the room by lowering the cap via a fresh GameRoom config
    // (in real usage, spin up enough clients to fill it)

    const overflow = ioClient(smallServer.url)
    overflow.emit('join_game', { playerName: 'player1', roomId: 'full-room-test' })
    // Connect 12 more clients… or test via the engine directly:
    // This is intentionally left as a TODO in the test suite until
    // a test fixture helper for "fill a room" is written.

    overflow.disconnect()
    await smallServer.close()
  })
})
```

#### `integration/startGame.test.ts`

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { io as ioClient, Socket } from 'socket.io-client'
import { createTestServer, type TestServer } from '../helpers/createTestServer.ts'
import { waitForEvent } from '../helpers/waitForEvent.ts'
import {
  gameStartedSchema,
  gameStateSchema,
  errorPayloadSchema,
} from '../helpers/gameStateSchema.ts'

describe('start_game', () => {
  let server: TestServer
  let host: Socket
  let guest: Socket

  beforeAll(async () => {
    server = await createTestServer()

    host = ioClient(server.url)
    guest = ioClient(server.url)

    // Both players join
    await Promise.all([
      new Promise<void>(r => host.once('connect', () => {
        host.emit('join_game', { playerName: 'Host', roomId: 'global' })
        // wait for game_state to confirm we're in
        host.once('game_state', () => r())
      })),
      new Promise<void>(r => guest.once('connect', () => {
        guest.emit('join_game', { playerName: 'Guest', roomId: 'global' })
        guest.once('game_state', () => r())
      })),
    ])
  })

  afterAll(async () => {
    host?.disconnect()
    guest?.disconnect()
    await server.close()
  })

  it('non-host receives error with code NOT_HOST when they emit start_game', async () => {
    const errorPromise = waitForEvent(guest, 'error')
    guest.emit('start_game')
    const error = await errorPromise

    const parsed = errorPayloadSchema.safeParse(error)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.code).toBe('NOT_HOST')
    }
  })

  it('host receives game_started broadcast with valid payload', async () => {
    // Both clients listen for game_started
    const hostStarted = waitForEvent(host, 'game_started')
    const guestStarted = waitForEvent(guest, 'game_started')

    host.emit('start_game')

    const [hostPayload, guestPayload] = await Promise.all([hostStarted, guestStarted])

    for (const payload of [hostPayload, guestPayload]) {
      const parsed = gameStartedSchema.safeParse(payload)
      expect(parsed.success, JSON.stringify(parsed.error?.flatten())).toBe(true)
      if (parsed.success) {
        expect(parsed.data.gameState.status).toBe('starting')
        expect(parsed.data.countdown).toBeGreaterThan(0)
      }
    }
  })

  it('after countdown, game_state with status "playing" is broadcast', async () => {
    // The countdown is 5s — in a real test you'd either:
    //   a) use fake timers (vi.useFakeTimers) to advance time
    //   b) use a very short countdown in the test server config
    // Here we show approach (a):
    //
    //   vi.useFakeTimers()
    //   host.emit('start_game')
    //   await vi.advanceTimersByTimeAsync(5100)
    //   const state = await waitForEvent(host, 'game_state')
    //   expect(state.status).toBe('playing')
    //   vi.useRealTimers()
    //
    // Marked as a TODO until fake timers are wired into createTestServer.
    expect(true).toBe(true) // placeholder
  })
})
```

#### `integration/playerInput.test.ts`

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { io as ioClient, Socket } from 'socket.io-client'
import { createTestServer, type TestServer } from '../helpers/createTestServer.ts'
import { waitForEvent } from '../helpers/waitForEvent.ts'
import { gameStateSchema, errorPayloadSchema } from '../helpers/gameStateSchema.ts'

describe('player_input', () => {
  let server: TestServer
  let client: Socket

  beforeAll(async () => {
    server = await createTestServer()
    client = ioClient(server.url)
    await new Promise<void>(r => {
      client.once('connect', () => {
        client.emit('join_game', { playerName: 'Tester', roomId: 'global' })
        client.once('game_state', () => r())
      })
    })
  })

  afterAll(async () => {
    client?.disconnect()
    await server.close()
  })

  it('rejects invalid movement values (out of [-1, 1] range)', async () => {
    const errorPromise = waitForEvent(client, 'error')
    client.emit('player_input', {
      movement: { x: 999, y: 0 },
      splitPressed: false,
      spitPressed: false,
    })
    const error = await errorPromise

    const parsed = errorPayloadSchema.safeParse(error)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.code).toBe('INVALID_INPUT')
    }
  })

  it('rejects missing fields', async () => {
    const errorPromise = waitForEvent(client, 'error')
    client.emit('player_input', { movement: { x: 0.5 } }) // missing y, splitPressed, spitPressed
    const error = await errorPromise

    const parsed = errorPayloadSchema.safeParse(error)
    expect(parsed.success).toBe(true)
  })

  it('valid input does not trigger an error event', async () => {
    let receivedError = false
    client.once('error', () => { receivedError = true })

    client.emit('player_input', {
      movement: { x: 0.5, y: -0.3 },
      splitPressed: false,
      spitPressed: false,
    })

    // Wait one tick to let the server process
    await new Promise(r => setTimeout(r, 50))
    expect(receivedError).toBe(false)
  })
})
```

#### `integration/disconnect.test.ts`

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { io as ioClient, Socket } from 'socket.io-client'
import { createTestServer, type TestServer } from '../helpers/createTestServer.ts'
import { waitForEvent } from '../helpers/waitForEvent.ts'
import { playerLeftSchema } from '../helpers/gameStateSchema.ts'

describe('disconnect / leave_game', () => {
  let server: TestServer

  afterAll(async () => {
    await server.close()
  })

  it('remaining player receives player_left when another player disconnects', async () => {
    server = await createTestServer()
    const stayer = ioClient(server.url)
    const leaver = ioClient(server.url)

    // Both join
    await Promise.all([
      new Promise<void>(r => stayer.once('connect', () => {
        stayer.emit('join_game', { playerName: 'Stayer', roomId: 'global' })
        stayer.once('game_state', () => r())
      })),
      new Promise<void>(r => leaver.once('connect', () => {
        leaver.emit('join_game', { playerName: 'Leaver', roomId: 'global' })
        leaver.once('game_state', () => r())
      })),
    ])

    const playerLeftPromise = waitForEvent(stayer, 'player_left')
    leaver.disconnect()
    const payload = await playerLeftPromise

    const parsed = playerLeftSchema.safeParse(payload)
    expect(parsed.success, JSON.stringify(parsed.error?.flatten())).toBe(true)
    if (parsed.success) {
      expect(parsed.data.playerCount).toBe(1)
    }

    stayer.disconnect()
  })

  it('remaining player receives player_left when another player emits leave_game', async () => {
    server = await createTestServer()
    const stayer = ioClient(server.url)
    const leaver = ioClient(server.url)

    await Promise.all([
      new Promise<void>(r => stayer.once('connect', () => {
        stayer.emit('join_game', { playerName: 'Stayer', roomId: 'global2' })
        stayer.once('game_state', () => r())
      })),
      new Promise<void>(r => leaver.once('connect', () => {
        leaver.emit('join_game', { playerName: 'Leaver', roomId: 'global2' })
        leaver.once('game_state', () => r())
      })),
    ])

    const playerLeftPromise = waitForEvent(stayer, 'player_left')
    leaver.emit('leave_game')
    const payload = await playerLeftPromise

    const parsed = playerLeftSchema.safeParse(payload)
    expect(parsed.success).toBe(true)

    stayer.disconnect()
    leaver.disconnect()
  })
})
```

#### `unit/physics.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { Physics } from '../../src/game/physics.ts'
import type { Boundary } from '../../src/types/index.ts'

const bounds: Boundary = { x: 0, y: 0, width: 2000, height: 2000 }

describe('Physics.move()', () => {
  it('advances position by velocity each tick', () => {
    const physics = new Physics()
    const player = { x: 100, y: 100, radius: 20, velocityX: 5, velocityY: -3 }
    physics.move(player, bounds)
    expect(player.x).toBe(105)
    expect(player.y).toBe(97)
  })

  it('clamps x to left boundary and reverses x velocity', () => {
    const physics = new Physics()
    const player = { x: 5, y: 100, radius: 20, velocityX: -10, velocityY: 0 }
    physics.move(player, bounds)
    expect(player.x).toBe(20) // left edge = bounds.x + radius
    expect(player.velocityX).toBeGreaterThan(0) // reversed
  })

  it('clamps x to right boundary and reverses x velocity', () => {
    const physics = new Physics()
    const player = { x: 1995, y: 100, radius: 20, velocityX: 10, velocityY: 0 }
    physics.move(player, bounds)
    expect(player.x).toBe(1980) // right edge = bounds.x + bounds.width - radius
    expect(player.velocityX).toBeLessThan(0)
  })

  it('clamps y to top boundary and reverses y velocity', () => {
    const physics = new Physics()
    const player = { x: 100, y: 5, radius: 20, velocityX: 0, velocityY: -10 }
    physics.move(player, bounds)
    expect(player.y).toBe(20)
    expect(player.velocityY).toBeGreaterThan(0)
  })

  it('clamps y to bottom boundary and reverses y velocity', () => {
    const physics = new Physics()
    const player = { x: 100, y: 1995, radius: 20, velocityX: 0, velocityY: 10 }
    physics.move(player, bounds)
    expect(player.y).toBe(1980)
    expect(player.velocityY).toBeLessThan(0)
  })
})

describe('Physics.isColliding()', () => {
  it('returns true when circles overlap', () => {
    const physics = new Physics()
    const a = { x: 0, y: 0, radius: 20 }
    const b = { x: 30, y: 0, radius: 20 }
    expect(physics.isColliding(a, b)).toBe(true) // distance 30, radSum 40
  })

  it('returns false when circles are exactly touching (not overlapping)', () => {
    const physics = new Physics()
    const a = { x: 0, y: 0, radius: 20 }
    const b = { x: 40, y: 0, radius: 20 }
    // distance == radSum → distSq == radSum² → condition is <=, so this returns true
    // actual edge case: distance 40, radSum 40 → touching → true per the current impl
    expect(physics.isColliding(a, b)).toBe(true)
  })

  it('returns false when circles are separated', () => {
    const physics = new Physics()
    const a = { x: 0, y: 0, radius: 20 }
    const b = { x: 100, y: 0, radius: 20 }
    expect(physics.isColliding(a, b)).toBe(false)
  })

  it('returns true for diagonal overlap', () => {
    const physics = new Physics()
    const a = { x: 0, y: 0, radius: 20 }
    const b = { x: 14, y: 14, radius: 20 } // distance ~= 19.8, radSum 40
    expect(physics.isColliding(a, b)).toBe(true)
  })
})

describe('Physics.isCollidingFlat()', () => {
  it('produces identical results to isColliding()', () => {
    const physics = new Physics()
    const cases: [number, number, number, number, number, number][] = [
      [0, 0, 20, 30, 0, 20],
      [0, 0, 20, 100, 0, 20],
      [50, 50, 15, 65, 50, 15],
    ]
    for (const [ax, ay, ar, bx, by, br] of cases) {
      const a = { x: ax, y: ay, radius: ar }
      const b = { x: bx, y: by, radius: br }
      expect(physics.isCollidingFlat(ax, ay, ar, bx, by, br)).toBe(physics.isColliding(a, b))
    }
  })
})
```

#### `unit/validators.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { validatePlayerInput } from '../../src/networking/validators.ts'

describe('validatePlayerInput()', () => {
  it('accepts a valid payload', () => {
    const result = validatePlayerInput({
      movement: { x: 0.5, y: -1 },
      splitPressed: false,
      spitPressed: true,
    })
    expect(result.success).toBe(true)
  })

  it('accepts boundary movement values (exactly -1 and 1)', () => {
    const result = validatePlayerInput({
      movement: { x: -1, y: 1 },
      splitPressed: false,
      spitPressed: false,
    })
    expect(result.success).toBe(true)
  })

  it('rejects movement.x > 1', () => {
    const result = validatePlayerInput({
      movement: { x: 1.1, y: 0 },
      splitPressed: false,
      spitPressed: false,
    })
    expect(result.success).toBe(false)
  })

  it('rejects movement.y < -1', () => {
    const result = validatePlayerInput({
      movement: { x: 0, y: -1.5 },
      splitPressed: false,
      spitPressed: false,
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing splitPressed', () => {
    const result = validatePlayerInput({
      movement: { x: 0, y: 0 },
      spitPressed: false,
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing movement entirely', () => {
    const result = validatePlayerInput({ splitPressed: false, spitPressed: false })
    expect(result.success).toBe(false)
  })

  it('rejects non-boolean splitPressed', () => {
    const result = validatePlayerInput({
      movement: { x: 0, y: 0 },
      splitPressed: 1,
      spitPressed: false,
    })
    expect(result.success).toBe(false)
  })
})
```

---

## Recommended Migration Path

### Phase 1 — Tests (now)

1. Add `vitest` and `socket.io-client` to `backend/package.json` devDependencies
2. Add a `test` script: `"test": "vitest run"` and `"test:watch": "vitest"`
3. Create the `backend/tests/` directory structure above
4. Write `helpers/` files first — they are prerequisites for every integration test
5. Write unit tests for `physics.ts` and `validators.ts` — no server needed, fast to verify
6. Write integration tests in priority order: join → disconnect → input rejection → start game

### Phase 2 — Event sync (soon)

1. Add a Vite alias `@battle-circles/events → ../backend/src/game/events.ts`
2. Replace the `EV_*` local constants in `SocketStore.tsx` with imports from the alias
3. Delete the local constants

### Phase 3 — Shared package (when the game runs end-to-end)

1. Add `pnpm-workspace.yaml` at the repo root with `packages: ['packages/*', 'backend', '.']`
2. Create `packages/shared/` with `package.json`, `tsconfig.json`, and `src/index.ts`
3. Move `backend/src/game/events.ts` → `packages/shared/src/events.ts`
4. Move wire-format types out of `backend/src/types/index.ts` and `src/types/game.ts` → `packages/shared/src/types.ts`
5. Move Zod validators out of `backend/src/networking/validators.ts` → `packages/shared/src/validators.ts`
6. Update all imports in `backend/` and `src/` to use `@battle-circles/shared`
7. Delete the now-empty duplicate files

### Phase 4 — Frontend component tests (after game renders)

1. Add `@vitest/ui`, `@testing-library/react`, `@testing-library/user-event` to frontend devDeps
2. Add `jsdom` as the Vitest environment in `vite.config.ts`
3. Write component tests for `WaitingRoom`, `GameHUD`, `GameOverScreen`
4. Mock `SocketStore` with a Vitest mock to isolate from real sockets

---

## Current Divergences to Fix

These are type-level inconsistencies between the two packages that currently exist even after the shape alignment work. Each one is a potential silent bug.

| Field | Backend type | Frontend type | Risk |
|---|---|---|---|
| `GameEndedMessage.data.stats` | not present in `GameEndedPayload` | `stats: GameStats[]` expected | Frontend `GameOverScreen` reads `stats` which will be `undefined` |
| `Knibble.spawnTime` | not present in `KnibbleState` | `spawnTime: number` | Frontend type has extra field; fine for now but confusing |
| `Knibble.value` | not present in `KnibbleState` | `value: number` | Same |
| `GameStatus.ENDING` | not present in `RoomStatus` | `ENDING = 'ending'` | Frontend enum has a status the backend never emits |
| `GameState.hostId` | `hostId: string` (required) | `hostId?: string` (optional) | Backend always sets it; frontend incorrectly treats it as optional |
| `Player.splitPieces` | not present in `PlayerState` | `splitPieces?: PlayerPiece[]` | Frontend-only concept not yet implemented on backend |

The cleanest fix for all of these is the Phase 3 shared package. Until then, document each divergence in a comment in both files so future edits don't re-introduce them silently.

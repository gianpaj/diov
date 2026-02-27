# Architecture & Scaling Decisions

> **Status:** Living document — last updated February 2026  
> **Audience:** Core contributors and AI coding agents working on Battle Circles

This document captures the major architectural decisions that need to be made (or have been made) as the game grows from a working prototype into a scalable, monetisable product. It is intentionally opinionated. Where a decision is marked **decided**, it should not be relitigated without updating this file.

---

## Table of Contents

1. [Where we are now](#1-where-we-are-now)
2. [Auth first — everything else depends on it](#2-auth-first--everything-else-depends-on-it)
3. [Postgres now, Redis for the right things](#3-postgres-now-redis-for-the-right-things)
4. [The token economy](#4-the-token-economy)
5. [Horizontal scaling](#5-horizontal-scaling)
6. [Frontend rendering pipeline](#6-frontend-rendering-pipeline)
7. [Monorepo structure](#7-monorepo-structure)
8. [Prioritised implementation order](#8-prioritised-implementation-order)

---

## 1. Where we are now

### Strengths

- **Shared type/schema codegen pipeline** (`packages/shared`) — wire types are generated from a single source of truth and consumed by both frontend and backend. This is the right call and most projects never do it.
- **Clean separation of concerns** — `GameEngine` (room registry + tick loop), `GameRoom` (per-room physics + state), and socket handlers are distinct layers.
- **Zustand stores separated by concern** — `GameStore` owns game/render state, `SocketStore` owns the transport layer.
- **Zod-validated config** — environment variables are validated at startup and typed throughout the backend.

### Current limitations

| Limitation | Impact |
|---|---|
| Player identity = socket ID | Vanishes on disconnect; no persistence possible |
| All game state in-process memory | One Node.js process; cannot scale horizontally |
| Full game state broadcast every tick | Bandwidth grows linearly with rooms; no delta encoding |
| No Postgres/Redis wired up | Auth, tokens, leaderboards all blocked |
| 20 Hz server tick drives render directly | Render stutters on packet loss; no interpolation |
| Single global room | No matchmaking; everyone in one game |

---

## 2. Auth first — everything else depends on it

**Status: not started — highest priority**

A "player" is currently just a socket ID. It vanishes on disconnect. You cannot build paid features, token balances, match history, or matchmaking on top of ephemeral socket IDs. Auth is the foundation everything else sits on.

### Approach

#### Guest flow (keep working immediately)
- On first visit, generate a `guestId` UUID and persist it in `localStorage`
- Guest can play without signing in
- Guest session is tied to that browser only — no cross-device continuity

#### Authenticated flow
- **OAuth providers only** — no email/password to start. "Sign in with Google" and "Sign in with Discord" convert better for a game audience. Discord in particular is natural.
- Use [Better Auth](https://www.better-auth.com/) self-hosted on your own Postgres, or [Clerk](https://clerk.com/) if you want to avoid running auth infrastructure yourself.
- On sign-in, merge the guest's in-progress state (token balance, stats) into the authenticated account.

#### Socket authentication
JWT issued at login; passed in the socket handshake. A socket middleware verifies it before any game event is processed:

```ts
// backend/src/networking/authMiddleware.ts
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token  // undefined for guests
  if (token) {
    const user = await verifyJwt(token)       // throws on invalid
    socket.data.userId = user.id
  } else {
    socket.data.userId = null                 // guest
    socket.data.guestId = socket.handshake.auth.guestId
  }
  next()
})
```

The `socket.data.userId` (or `guestId`) then replaces `socket.id` as the canonical player identity everywhere in the game engine.

### What this unlocks
- Reconnect tokens (§3)
- Token balances and rewards (§4)
- Match history and leaderboards (§3)
- Paid tiers and Stripe subscriptions (§4)

---

## 3. Postgres now, Redis for the right things

**Status: config wired, Prisma not installed**

### Postgres — the source of truth

Wire Prisma up now. The initial schema is intentionally small — the goal is to establish the identity and accounting records, not to model everything up front.

```prisma
// packages/shared/prisma/schema.prisma

model User {
  id                   String        @id @default(cuid())
  displayName          String
  email                String?       @unique
  avatarUrl            String?
  createdAt            DateTime      @default(now())
  tier                 Tier          @default(FREE)
  tokens               Int           @default(0)
  lifetimeTokensEarned Int           @default(0)
  sessions             GameSession[] @relation("winner")
  results              PlayerResult[]
}

model GameSession {
  id          String         @id @default(cuid())
  roomId      String
  startedAt   DateTime
  endedAt     DateTime?
  winnerUserId String?
  winner      User?          @relation("winner", fields: [winnerUserId], references: [id])
  results     PlayerResult[]
}

model PlayerResult {
  id        String      @id @default(cuid())
  session   GameSession @relation(fields: [sessionId], references: [id])
  sessionId String
  user      User        @relation(fields: [userId], references: [id])
  userId    String
  score     Int
  rank      Int
  placement Int         // 1 = winner
}

enum Tier {
  FREE
  PRO
  WHALE
}
```

This is enough to unlock: leaderboards, match history, token rewards, and paid tiers.

### Redis — not a database

Redis is for **ephemeral, high-frequency data only**. Do not store user records or game history in Redis.

| Use case | TTL | Notes |
|---|---|---|
| Reconnect tokens | 5 min | Short-lived UUID → `{ userId, roomId }` mapping |
| Rate limiting | 1 min rolling | Join attempts, input events per socket |
| Presence (who's online) | 30s heartbeat | Powers lobby player counts |
| Pub/sub between game server instances | — | Required for horizontal scale (§5) |
| Matchmaking queue | — | List of waiting players, consumed by matchmaker |

### Reconnect tokens (fixes the refresh bug properly)

The current workaround (`sessionStorage` + `RequireSession` guard) sends the player back to `/` on refresh. The proper fix:

1. On `join_game`, backend generates a `reconnectToken` (UUID) and stores `token → { userId/guestId, roomId, playerState }` in Redis with a 5-minute TTL
2. Backend sends the token to the client in the `game_state` response
3. Client stores token in `sessionStorage`
4. On reconnect, client sends token in socket handshake auth: `{ reconnectToken }`
5. Backend looks up token, restores player into the correct room, invalidates the token

This is transparent to the player — refresh during a game puts them back exactly where they were.

---

## 4. The token economy

**Status: not started**

Design the model before building any paid features. Changing the token economy after launch is extremely disruptive.

### Schema fields (on `User`)

```
tokens                Int   -- spendable balance
lifetimeTokensEarned  Int   -- never decremented; used for achievement tiers
tier                  Enum  -- FREE | PRO | WHALE
```

### Earning tokens (free)

| Event | Reward | Notes |
|---|---|---|
| Win a match | +50–200 | Scaled by player count |
| Top 3 placement | +10–50 | |
| Eat another player | +2 per eat | Capped per session |
| Daily login | +10 | Streak multiplier up to 3× |
| First match of the day | +25 | |

### Spending tokens (cosmetics and convenience)

| Item | Cost | Notes |
|---|---|---|
| Circle colour pack | 200 | Cosmetic only |
| Trail effect | 500 | Cosmetic only |
| Name colour | 150 | Cosmetic only |
| Create a private room | 100 | Convenience |
| Extra split charge | 50 | Convenience, **not** a stat boost |

### Paid tier (`PRO`)

- Purchased via Stripe (monthly subscription or one-time lifetime)
- Grants a monthly token stipend (+500/month)
- Unlocks private room creation without token cost
- Unlocks custom game mode settings (map size, tick rate, player count)
- No ads (if ads are ever introduced)

### Hard rule: never sell gameplay advantage

Do not sell: bigger starting size, faster speed, longer split range, reduced cooldowns, or any stat that affects match outcome. Sell cosmetics and convenience only.

This keeps the game fair and avoids the pay-to-win reputation that kills multiplayer games.

### Payment infrastructure

- **Stripe** for subscriptions and one-time purchases
- Stripe webhook → backend endpoint → update `User.tier` and `User.tokens` in Postgres
- Token purchases are append-only ledger entries (never mutate balance directly — always `+= amount` in a transaction to avoid race conditions)

---

## 5. Horizontal scaling

**Status: single process, not yet needed**

The current `GameEngine` holds all rooms in a `Map` inside a single Node.js process. That is appropriate for development and early production. Here is the three-stage path forward.

### Stage A: single server, optimised (now → ~500 CCU)

**Delta state encoding**

The current implementation broadcasts a full `GameState` snapshot every tick (~3 KB per room at 12 players, 20 TPS). At 50 concurrent rooms that is ~3 MB/s of broadcast traffic — manageable, but linear.

Switch to delta encoding: send only what changed since the last ack'd state per client.

```ts
// Instead of:
room.broadcast(room.getGameState())

// Send:
room.broadcastDelta(lastAckedSequence)
// → { seq: 1042, players: { "abc": { position: {x,y} } }, removed: [] }
```

This gives roughly 10× headroom before hardware becomes the bottleneck.

**CPU isolation for physics**

Move `room.update()` into a `worker_threads` Worker. The main thread handles socket I/O; workers handle physics. This prevents a CPU-heavy tick from blocking socket message delivery.

### Stage B: multiple instances + Redis pub/sub (~500 → ~5000 CCU)

- Run N game server instances (e.g. behind a load balancer)
- Each instance manages its own rooms — stateless about rooms on other instances
- Use the [Socket.io Redis adapter](https://socket.io/docs/v4/redis-adapter/) so a broadcast from one instance reaches clients connected to another
- Add a **matchmaking service** (a small separate process) that:
  - Accepts players from the queue in Redis
  - Decides which instance has capacity
  - Redirects the player's socket to that instance

The key structural constraint: **`GameEngine` must not be a singleton that assumes global room visibility**. Each instance knows only its own rooms. The matchmaker knows the topology.

### Stage C: dedicated servers per room (~5000+ CCU)

Each room gets a dedicated process/container spun up on demand (e.g. via Fly.io Machines API or a Kubernetes Job). The game server process exits when the room finishes. This is the architecture used by production titles. You do not need to design for this now, but nothing in Stage A or B should preclude it.

---

## 6. Frontend rendering pipeline

**Status: needs rework before adding more entities**

Currently `GamePage` re-renders the entire PIXI scene on every `game_state` from the server (20 Hz). This means:
- Visible stutter at 20 fps instead of 60 fps
- Every added entity (spit blobs, split pieces, particles) makes it worse
- On packet loss the screen freezes until the next packet

### Target architecture: interpolation with client-side prediction

```
Server tick (20 Hz)
  └─ Writes snapshot to a circular buffer in GameStore
        └─ [ snapshot_n-1, snapshot_n ]  (kept for 100ms interpolation window)

Render loop (60 Hz via requestAnimationFrame)
  └─ Reads TWO snapshots from buffer
  └─ Interpolates all entity positions between them at (now - 100ms)
  └─ Applies client-side prediction offset for the local player
  └─ Draws to PIXI stage

Input loop (20 Hz via setInterval)
  └─ Sends movement input to server
  └─ Advances local player position immediately (prediction)
  └─ Server reconciles and corrects on next snapshot
```

The constants `INTERPOLATION_DELAY` (100ms) and `PREDICTION_TIME` (50ms) are already defined in `GAME_CONSTANTS` — they just need to be wired up.

**Practical impact:** smooth 60fps movement even on a 20Hz server tick and variable network latency. This is the single biggest factor in perceived game feel.

---

## 7. Monorepo structure

**Status: partially done — commit to it**

`packages/shared` already exists with codegen. The natural completion:

```
packages/
  shared/          ← wire types, event constants, Zod schemas  ✅ exists
  game-engine/     ← pure physics / collision — no Node, no socket
  ui/              ← shared React components (profile page, dashboard)

apps/
  frontend/        ← current diov/ root
  backend/         ← current diov/backend/
  matchmaker/      ← lightweight matchmaking service (Stage B)
```

### Why extract `game-engine` as a package

A `game-engine` package with **zero dependencies on Node.js or socket.io** gives you:

1. **Testability** — run Vitest against physics and collision logic with no server setup
2. **Client-side prediction** — import the same physics code in the browser to predict the local player's position between server ticks
3. **Worker thread isolation** — run it in a `worker_threads` Worker on the server without circular dependency concerns
4. **Future: WASM compilation** — pure TS with no I/O dependencies can be compiled to WASM for a significant physics performance boost

---

## 8. Prioritised implementation order

Do not skip phases. Each phase is a prerequisite for the next.

| Phase | Deliverable | Unlocks |
|---|---|---|
| **1** | Prisma + `User` / `GameSession` / `PlayerResult` schema | All persistence |
| **2** | Auth — guest `guestId` + Discord OAuth + socket JWT middleware | Identity everywhere |
| **3** | Reconnect tokens via Redis (5-min TTL) | Refresh resilience |
| **4** | Delta state encoding | 10× broadcast headroom |
| **5** | Client interpolation — 60fps render loop reading from snapshot buffer | Game feel |
| **6** | Token economy — earn on win, spend on cosmetics | Engagement loop |
| **7** | Stripe integration — PRO tier subscription | Revenue |
| **8** | Matchmaking service + Socket.io Redis adapter | Horizontal scale |
| **9** | Extract `game-engine` package | Client prediction, testability |
| **10** | Dedicated server per room (Stage C) | 5000+ CCU |

Phases 1–3 are the prerequisites for anything paid. Do not build Stripe before you have a `userId` to attach a subscription to.

---

*This document should be updated whenever a decision in it changes. Do not let it go stale.*
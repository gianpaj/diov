# SpacetimeDB Authoritative Backend Design

> Date: March 9, 2026
> Status: Approved design
> Scope: Replace the current authoritative backend and state synchronization layer with SpacetimeDB while keeping the current React + PIXI frontend

## Goal

Move Battle Circles to one authoritative state model, one thin input layer, and one predictable synchronization path.

The new design removes the current Node.js + Socket.io game authority layer and replaces it with a SpacetimeDB module that owns:

- lobby state,
- host assignment,
- countdown,
- match lifecycle,
- player simulation,
- food spawning,
- split/spit actions,
- collision resolution,
- and end-of-game state.

The frontend remains React + PIXI. It stops consuming custom socket events and instead uses generated SpacetimeDB bindings plus table subscriptions.

## Why This Design

This directly addresses the current problems in `diov`:

- protocol drift between frontend and backend,
- event-name mismatch risk,
- state-shape mismatch risk,
- multi-path synchronization logic,
- fragile join/start/countdown choreography,
- and too much transport-specific ceremony in the client.

SpacetimeDB is a good fit because the game is:

- real-time,
- authoritative,
- stateful,
- subscription-friendly,
- and naturally expressed as a small set of reducers plus shared tables.

## Non-Goals

This migration does not try to:

- redesign core gameplay,
- replace PIXI with Phaser,
- add matchmaking,
- add persistent accounts,
- add blockchain features,
- or solve large-scale multi-region deployment in the first pass.

This is a networking and authority refactor, not a product redesign.

## Target Architecture

## Backend

The SpacetimeDB module becomes the only source of truth.

It owns:

- canonical game state,
- room lifecycle,
- lobby membership,
- reducer execution,
- tick scheduling,
- and state publication through subscriptions.

The existing Node backend is removed from the gameplay path. Long term, it can either be deleted entirely or kept only for unrelated HTTP endpoints if any appear later.

## Frontend

The frontend keeps:

- React views,
- PIXI world rendering,
- Zustand stores for client-only UI state,
- touch joystick logic,
- camera state,
- and overlays such as waiting room and game over screens.

The frontend changes from:

- emitting Socket.io events,
- waiting for custom payloads,
- and storing server snapshots from hand-authored event listeners

to:

- connecting to SpacetimeDB,
- subscribing to canonical tables,
- calling reducers for user intent,
- and deriving render state from subscribed rows.

## Synchronization Model

There is exactly one synchronization path:

1. Client connects to SpacetimeDB.
2. Client subscribes to the tables needed for the active room.
3. Client renders subscribed rows.
4. Client sends reducer calls for intent only.
5. SpacetimeDB updates tables transactionally.
6. Subscription updates flow back to all subscribed clients.

No custom broadcast layer remains.

## Canonical Data Model

The schema should stay small and explicit.

## `room`

Fields:

- `id`
- `status` (`waiting`, `starting`, `playing`, `finished`)
- `hostIdentity`
- `countdownEndsAt`
- `startedAt`
- `endedAt`
- `durationMs`
- `maxPlayers`
- `minPlayers`
- `winnerIdentity`
- `lastUpdateAt`

Purpose:

- Defines the authoritative lifecycle for a match.
- Drives waiting room, countdown UI, active match status, and game over state.

## `player`

Fields:

- `identity`
- `roomId`
- `name`
- `x`
- `y`
- `radius`
- `velX`
- `velY`
- `inputX`
- `inputY`
- `color`
- `score`
- `isAlive`
- `lastSplitAt`
- `lastSpitAt`
- `joinedAt`

Purpose:

- Represents both lobby membership and active in-match entity state.
- Gives the frontend one row source for waiting room lists and game rendering.

## `knibble`

Fields:

- `id`
- `roomId`
- `x`
- `y`
- `size`
- `color`

Purpose:

- Authoritative food state.

## `spit_blob`

Fields:

- `id`
- `roomId`
- `ownerIdentity`
- `x`
- `y`
- `velX`
- `velY`
- `size`
- `createdAt`

Purpose:

- Server-owned spit projectiles and collision inputs.

## `game_tick`

Fields:

- `scheduledId`
- `roomId`
- `scheduledAt`

Purpose:

- Drives scheduled simulation ticks per room.

## Optional `room_member`

Only add this if the team decides player entity rows should not exist before match start.

Default recommendation: do not add it initially. Use `player` for both lobby presence and active gameplay. Fewer tables means fewer edge cases.

## Reducer Design

Reducers should express player intent and lifecycle transitions, not client-side state patches.

## Required reducers

- `join_game`
- `leave_game`
- `set_input`
- `start_game`
- `split`
- `spit`
- `process_tick`

## `join_game`

Responsibilities:

- place the caller into the default room,
- assign host if the room is empty,
- create or update the player's row,
- and keep join behavior idempotent.

Rules:

- one global room for MVP,
- no host-only special case for initial state delivery,
- joining twice should update membership safely instead of corrupting state.

## `leave_game`

Responsibilities:

- remove or deactivate the player,
- transfer host if needed,
- and end the room if no players remain.

## `start_game`

Responsibilities:

- enforce host-only start,
- validate minimum player count,
- transition room status from `waiting` to `starting`,
- set `countdownEndsAt`,
- and schedule the first tick if needed.

## `set_input`

Responsibilities:

- store normalized movement intent only,
- update `inputX` and `inputY`,
- and do nothing else.

Rules:

- no direct client-driven movement,
- no position patches from the client,
- and no dependence on render cadence.

## `split`

Responsibilities:

- validate cooldown and minimum size,
- split the player mass/radius according to the game rules,
- create or update resulting entities according to final design,
- and record the authoritative action time.

Note:

The existing frontend already exposes split as player intent. The reducer should remain command-oriented even if the internal implementation evolves.

## `spit`

Responsibilities:

- validate cooldown and minimum size,
- reduce player size,
- spawn an authoritative spit blob,
- and record action time.

## `process_tick`

Responsibilities:

- advance player movement from stored input,
- clamp to world bounds,
- move spit blobs,
- resolve collisions,
- spawn knibbles,
- update scores and deaths,
- check win conditions,
- and schedule the next tick.

This reducer is the center of authority.

## Room Lifecycle

The room lifecycle is fully state-driven:

1. `waiting`
2. `starting`
3. `playing`
4. `finished`

### Waiting

- Players may join and leave.
- Host is visible.
- Waiting room UI is derived from subscribed room and player rows.

### Starting

- Countdown is active.
- Frontend reads `countdownEndsAt` and shows remaining time locally.
- No custom `game_started` event is required.

### Playing

- Tick reducer runs continuously.
- World state comes from player, knibble, spit blob, and room rows.

### Finished

- Room row contains winner and end timestamps.
- Frontend renders game-over UI from subscribed state.
- Restart behavior can initially be implemented as host creating a fresh waiting state in the same room.

## Frontend Changes

The frontend stays structurally similar but loses transport-specific logic.

## Keep

- React pages and components
- PIXI rendering pipeline
- joystick and action-button UX
- Zustand for UI-only state

## Replace

- `SocketStore.tsx` becomes a SpacetimeDB connection and subscription store
- custom event listeners become table subscriptions
- manual `GAME_STATE` persistence becomes derived state from subscribed rows

## Frontend state split

Keep two categories of state:

### Remote authoritative state

From SpacetimeDB tables:

- room
- players
- knibbles
- spit blobs

### Local client-only state

In Zustand:

- connection status
- camera position and zoom
- joystick state
- orientation state
- active menus and overlays
- local latency/debug info

This prevents the store from becoming a second shadow copy of server state.

## One Thin Input Layer

Inputs should become reducer calls with minimal frequency and no transport-specific wrappers.

Recommended input behavior:

- call `set_input` only when direction changes materially or at a low capped rate,
- call `split` on button press,
- call `spit` on button press,
- never send position or velocity from the client.

This mirrors the strongest lesson from `blackholio-ts`: intent is small, authority is remote.

## Predictable Synchronization Path

The client should not consume a synthetic "whole game snapshot" event as the primary mechanism.

Instead:

- subscribe to the relevant room row,
- subscribe to players filtered by room,
- subscribe to knibbles filtered by room,
- subscribe to spit blobs filtered by room,
- and derive the render model from those rows.

This makes join, reconnect, and countdown behavior consistent because all screens read from the same subscribed records.

## Error Handling

Reducers should validate and fail early for:

- invalid room state transitions,
- non-host `start_game`,
- joining a full room,
- split/spit cooldown violations,
- and actions from users not in the room.

Frontend behavior:

- show a human-readable UI error for reducer failures,
- keep local UI state resilient,
- and never assume a reducer succeeded until the subscribed state reflects it.

## Testing Strategy

## Schema and reducer tests

Add focused tests for:

- join and host assignment,
- leave and host transfer,
- start-game validation,
- countdown transition,
- movement from input,
- collision and eating rules,
- split/spit constraints,
- and room finish conditions.

## Frontend integration checks

Add tests for:

- room state derived from subscriptions,
- waiting room player list rendering,
- countdown rendering from timestamps,
- and local input throttling behavior.

## Migration Plan

Implement this in phases to avoid a blind rewrite.

## Phase 1: SpacetimeDB foundation

- add SpacetimeDB module to the repo
- define initial schema
- publish locally
- generate TypeScript bindings

## Phase 2: Client connection replacement

- add a SpacetimeDB connection store
- replace Socket.io connect/join/start/input flows with reducers and subscriptions
- keep UI components mostly unchanged

## Phase 3: Lobby and countdown

- drive waiting room and start flow entirely from room/player tables
- remove Socket.io event assumptions from waiting room components

## Phase 4: Active gameplay authority

- implement tick loop, collisions, knibbles, split, and spit in reducers
- render from subscribed rows only

## Phase 5: Backend cleanup

- remove obsolete Node gameplay backend code
- remove shared event constants that only existed for Socket.io
- prune now-dead transport logic from the frontend

## Risks and Tradeoffs

## Main risks

- SpacetimeDB introduces a new backend runtime and toolchain.
- Existing room logic must be translated, not copied blindly.
- Split/spit behavior may require revisiting how player entities are modeled.
- Team familiarity with SpacetimeDB is likely lower than with Node + Socket.io.

## Main payoff

- one backend authority model,
- one state schema,
- one sync path,
- less client ceremony,
- and less opportunity for contract drift.

## Recommendation

Proceed with a narrow but complete vertical slice:

- one global room,
- lobby,
- host start,
- countdown,
- player movement,
- knibbles,
- player eating,
- and game over.

Do not carry forward the old socket event architecture in parallel. The goal is simplification, not a bridge layer.

## Definition of Done

This migration is successful when:

- the frontend renders subscribed SpacetimeDB state directly,
- there is no gameplay authority left in the Node backend,
- join/start/countdown/play/finish all derive from one room lifecycle model,
- player input is reducer-based and thin,
- and reconnecting clients arrive in a correct state without special-case snapshot logic.

# Blackholio TS Analysis and SpacetimeDB Comparison

> Research date: March 9, 2026
> Repo analyzed: `git@github.com:aasoni/blackholio-ts.git`
> Local clone used for analysis: `/tmp/blackholio-ts`
> Purpose: understand how they built their agar.io-style game and evaluate whether SpacetimeDB is a strong alternative for Battle Circles

## Executive Summary

`blackholio-ts` is a much narrower game than Battle Circles, but its networking model is cleaner.

The core idea is simple:

- SpacetimeDB owns the game state.
- The server-side module runs the game loop and collision logic.
- The client sends only reducer calls such as `spawn` and `set_direction`.
- The client renders table updates from subscriptions instead of manually handling many socket event shapes.

That architecture removes several classes of bugs that currently exist in `diov`, especially event-name drift, payload-shape mismatch, and "did this joiner receive initial state?" problems.

SpacetimeDB looks like a good alternative if the goal is:

- authoritative real-time state,
- fewer custom networking contracts,
- simpler client synchronization,
- and fast iteration on a single shared world.

It is not automatically the right move if the goal is:

- maximum control over infra,
- easy horizontal scaling with standard Node services,
- complex custom matchmaking across many rooms very soon,
- or keeping the current Socket.io + React + PIXI architecture with minimal migration cost.

My recommendation: treat SpacetimeDB as a strong candidate for a prototype or vertical slice, not as an immediate full rewrite of Battle Circles.

## Important Note on Their `AGENTS.md`

Their `AGENTS.md` is about SpacetimeDB development rules, not about the game design or code architecture itself.

That matters because the useful learnings come mostly from these files, not from `AGENTS.md`:

- `/tmp/blackholio-ts/spacetimedb/src/index.ts`
- `/tmp/blackholio-ts/src/main.tsx`
- `/tmp/blackholio-ts/src/GameScene.ts`
- `/tmp/blackholio-ts/README.md`

## How Blackholio Is Built

## 1. Server authority is real, not partial

Blackholio keeps the important game logic inside the SpacetimeDB module:

- player table
- food table
- scheduled tick table
- reducers for `spawn`, `set_direction`, and `process_tick`

The server owns:

- movement integration,
- direction smoothing,
- world bounds,
- food spawning,
- player-food collisions,
- player-player eating,
- respawn state,
- disconnect cleanup,
- and tick scheduling.

This is stronger than the current `diov` setup, where the architecture intends to be authoritative, but the wire contract is still fragile and split across frontend and backend event handlers.

## 2. The game loop is scheduled inside the data platform

Blackholio uses a scheduled table plus `process_tick` reducer to run the loop at 20 ticks per second.

Practical effect:

- no separate Node timer orchestration,
- no manual room tick registry,
- no custom broadcast code per update,
- and no risk that a client misses the current state because a special "initial snapshot" path was skipped.

That is a major simplification compared with `diov/backend/src/game/engine.ts` plus `room.ts` plus Socket.io event flow.

## 3. Input is tiny and intentional

The client does not stream full state or spam action payloads every frame. It sends:

- `spawn({ name })`
- `set_direction({ dirX, dirY })`

In `src/GameScene.ts`, direction is sent only when it changes.

That is one of the best concrete lessons for Battle Circles. Right now the project history and AGENTS note already call out that input was being emitted too frequently. Blackholio handles this correctly: input is a command stream, not a render stream.

## 4. State sync is subscription-driven

The client subscribes to:

- `SELECT * FROM player`
- `SELECT * FROM food`

Then rendering reacts to inserts, updates, and deletes. There is no hand-maintained matrix of:

- join event
- state event
- eaten event
- spawned event
- reconnect state replay

That reduces protocol surface area. In `diov`, much of the complexity comes from maintaining many event names and payload definitions across frontend and backend.

## 5. The client is thin

Blackholio's client mostly does four things:

- connect,
- spawn,
- subscribe,
- render.

That is a healthy split for a real-time multiplayer game. It also makes it easier to test correctness because simulation bugs stay on the server side.

## What They Do Well

## Networking and sync

- One source of truth.
- No frontend/backend event drift.
- No separate "state schema" and "transport schema" divergence.
- Automatic state propagation via subscriptions.

## Game loop simplicity

- One scheduled tick reducer.
- One data model.
- One client subscription model.

## Input model

- Direction changes only.
- Reducers use normalized values.
- The client does not pretend to simulate authoritative physics.

## Lifecycle handling

- Connect does not auto-spawn a player.
- Spawn is explicit and validated.
- Disconnect removes the entity cleanly.
- Respawn reuses the same reducer as first spawn.

## Build and developer workflow

- Clear local flow: `spacetime start`, publish module, generate bindings, run client.
- Generated TypeScript bindings reduce manual protocol glue.

## What Is Simpler Than Battle Circles

Blackholio is not a direct template for the whole `diov` roadmap. It is simpler in several important ways:

- single world, no waiting room flow,
- no host/start-game semantics,
- no split mechanic,
- no spit projectile system,
- no lobby UX,
- no mobile-first touch control complexity,
- no room matchmaking,
- and no PIXI scene graph.

So the repo is useful as a reference for synchronization architecture more than as a feature-complete gameplay reference.

## Learnings for Battle Circles

## 1. Collapse the networking contract

The strongest lesson is not "use the same code." It is "reduce the number of contracts."

Battle Circles currently pays a tax for:

- event constants,
- message payload types,
- frontend store expectations,
- backend room state shape,
- and initialization edge cases.

Blackholio avoids most of that by exposing stateful tables and a small reducer API.

Even if `diov` stays on Socket.io, it should copy this principle:

- keep input commands minimal,
- keep state shape canonical,
- and avoid special-case events when a snapshot can do the job.

## 2. Use one canonical world model

Blackholio's client bindings are generated from the server schema, so the client cannot casually drift away from the backend shape.

That directly addresses one of Battle Circles' current biggest issues: frontend and backend `GameState` disagree.

The actionable takeaway is broader than SpacetimeDB:

- define the backend state shape once,
- generate or share the types,
- and make the client render that shape directly.

## 3. Send intent, not simulation

Battle Circles should prefer:

- joystick direction,
- split pressed,
- spit pressed,

as player intent only.

It should not tie input emission to render cadence. A throttled or change-based input stream is better. Blackholio already demonstrates the lean version of this.

## 4. Make join and reconnect boring

Blackholio's model makes join simple:

- connect
- subscribe
- spawn
- render current rows

Battle Circles currently has more room for edge cases:

- join routing,
- host restrictions,
- initial snapshot,
- countdown state,
- room status transitions,
- and reconnect timing.

The lesson is to make joins idempotent and state-driven, not event choreography.

## 5. Keep the renderer dumb

This codebase already wants an authoritative server. Blackholio shows the practical version:

- the client animates and interpolates,
- but game truth stays remote.

That is the right instinct for Battle Circles too.

## Feature Comparison

| Area | `diov` today | `blackholio-ts` | Takeaway |
|---|---|---|---|
| Transport | Custom Socket.io events | SpacetimeDB reducers + subscriptions | Blackholio has fewer failure points |
| State sync | Manual `game_state` snapshots and event handlers | Live table subscriptions | SpacetimeDB reduces custom sync glue |
| Type safety across network | Partial, currently drifting | Stronger because bindings come from schema | This is a real advantage |
| Game loop | Node engine + rooms + timers | Scheduled reducer inside module | SpacetimeDB is simpler for one shared world |
| Input | Joystick/actions over socket events | Direction reducer only when changed | Blackholio is more efficient |
| Rooms/lobby | Present in design, partly implemented | Not present | `diov` supports more session structure |
| Mobile controls | Core requirement | Not a focus | `diov` is ahead on target UX |
| Split/spit mechanics | Present in design/backend | Not implemented | `diov` has broader gameplay scope |
| Rendering | React + PIXI | Phaser | Neutral; renderer choice is independent |
| Infra flexibility | Standard Node service model | Tied to SpacetimeDB runtime model | `diov` is more conventional |
| Persistence path | Planned Redis/Postgres | State-native database model | SpacetimeDB can simplify this |
| Migration cost | None if current stack is fixed | High if adopted fully | This is the main tradeoff |

## Is SpacetimeDB a Good Alternative?

Short answer: yes, for the networking and state-sync layer especially. But it is not a free win.

## Why it is attractive

### 1. It directly solves several current `diov` problems

SpacetimeDB would largely eliminate or reduce:

- event name mismatch,
- payload shape mismatch,
- missed initial state on join,
- manual state broadcasting,
- and duplicated frontend/backend schema definitions.

### 2. It fits the game genre

Agar.io-style games map well to:

- continuous shared state,
- authoritative server simulation,
- frequent small updates,
- and clients that mostly render and send movement intent.

That is exactly the shape Blackholio uses.

### 3. It simplifies the client

A Battle Circles client backed by generated bindings would likely remove a large amount of:

- SocketStore ceremony,
- custom event registration,
- transport-specific retry handling,
- and manual snapshot plumbing.

## Why it is not automatically the right next step

### 1. It is a platform migration, not a refactor

Adopting SpacetimeDB means replacing more than sockets. It changes:

- backend runtime model,
- game loop implementation style,
- type generation workflow,
- deployment workflow,
- persistence model,
- and parts of debugging and observability.

### 2. Battle Circles already has room/lobby semantics

Blackholio is one global world. Battle Circles already thinks in terms of:

- waiting room,
- host,
- countdown,
- game start,
- game end,
- and future matchmaking.

SpacetimeDB can support those ideas, but the design work is still yours. Blackholio does not prove them out.

### 3. Team familiarity matters

Socket.io + Node is conventional. SpacetimeDB is more opinionated.

That is often good, but only if the team wants:

- generated bindings,
- reducer-centric backend logic,
- and the operational model that comes with it.

## Recommendation

## Best near-term path

Do not rewrite `diov` to SpacetimeDB immediately.

First fix the current contract issues in the existing stack:

- keep one canonical `GameState`,
- keep one canonical event source,
- reduce input chatter,
- and finish the server-authoritative path cleanly.

That is the fastest route to a playable game.

## Best evaluation path

Build a narrow SpacetimeDB spike after the current game is playable.

The spike should include only:

- one shared room,
- joystick direction input,
- food spawning,
- player growth,
- player eating,
- mobile rendering with the existing frontend feel,
- and one generated schema-to-client pipeline.

Success criteria for the spike:

- fewer networking bugs,
- simpler client code,
- stable 20 TPS or better,
- and lower protocol complexity than the current Socket.io stack.

If that spike feels materially better, then a migration becomes defensible.

## Practical Borrow-Now Ideas Without Migrating

Battle Circles can borrow these ideas immediately without adopting SpacetimeDB:

1. Send movement only when changed or at a fixed low rate.
2. Keep the backend as the sole owner of simulation state.
3. Collapse frontend/backend state definitions into one generated or shared contract.
4. Prefer snapshot-driven rendering over many special-case event payloads.
5. Make spawn, respawn, join, and reconnect flows idempotent.

## Bottom Line

Blackholio is not more feature-rich than Battle Circles. It is more disciplined in how it moves state.

That is the main learning.

SpacetimeDB is a credible alternative for Battle Circles because it matches the genre and removes protocol drift. But the strongest immediate move is not a rewrite. It is to make `diov` behave more like Blackholio in one key respect: one authoritative state model, one thin input layer, and one predictable synchronization path.

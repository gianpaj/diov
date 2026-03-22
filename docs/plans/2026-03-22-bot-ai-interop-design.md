# Bot AI And AgarCL Interop Design

## Goal

Add external AI-controlled players to Battle Circles without changing gameplay authority.

The design must support both:
- live bots that join real matches as normal players
- offline training and benchmarking workflows

The system should interoperate with the AgarCL project in `/Users/gianpaj_it/tmp/AgarCL/` by reusing its policy assumptions and training style, not by replacing Battle Circles with AgarCL's engine.

## Non-Goals

- Replace SpacetimeDB with the AgarCL C++ engine
- Give bots privileged access to full-room state during live play
- Build a full Gym-native SpacetimeDB simulator in the first phase
- Force Python as the only bot runtime

## Current Reality

Battle Circles already has the core action and state surfaces required for bot control:

- reducers:
  - `join_game`
  - `leave_game`
  - `set_input`
  - `split`
  - `spit`
- public tables:
  - `room`
  - `player`
  - `knibble`
  - `spit_blob`
  - `player_result`

AgarCL already uses a policy-friendly contract that maps well to Battle Circles:

- action:
  - normalized movement vector
  - discrete special ability
- observations:
  - structured entity observations
  - grid observations

This makes adapter-level interoperability practical.

## Recommended Architecture

Use external bot clients that run close to the SpacetimeDB server, ideally on the same Hetzner host.

Add three new layers:

### `packages/agent-sdk`

The shared contract layer.

Responsibilities:
- define the canonical bot action schema
- define the canonical fairness-filtered observation schema
- provide observation converters
- provide action converters
- provide binary and debug encoders

### `apps/bot-runner`

The live runtime for bots.

Responsibilities:
- connect to SpacetimeDB as a real client
- subscribe to authoritative tables
- build fairness-filtered observations
- call a policy
- translate policy output into reducer calls
- manage bot lifecycle, queue joining, and reconnection

### `apps/training-bridge`

Optional in phase 1, but planned from the start.

Responsibilities:
- expose Battle Circles observations and actions through a Gym-like loop
- support replay export and evaluation
- connect Python models from the AgarCL ecosystem to the same shared schema

## Canonical Action Contract

Define one versioned action contract:

```ts
type CanonicalActionV1 = {
  move: { x: number; y: number }
  ability: 'none' | 'spit' | 'split'
}
```

Rules:
- movement is normalized to `[-1, 1]`
- `ability` is edge-triggered for the current decision step

Battle Circles mapping:
- `move` -> `set_input`
- `ability: 'split'` -> `split`
- `ability: 'spit'` -> `spit`

AgarCL mapping:
- `move.x`, `move.y` -> `(dx, dy)`
- `ability` -> discrete action id

## Canonical Observation Contract

Define one fairness-filtered semantic contract for one controlled bot:

```ts
type PolicyObservationV1 = {
  header: {
    version: 1
    tickId: number
    timestampMs: number
  }
  self: {
    playerId: string
    roomId: string
    position: { x: number; y: number }
    velocity: { x: number; y: number }
    radius: number
    score: number
    isAlive: boolean
    canSplit: boolean
    canSpit: boolean
  }
  room: {
    status: string
    bounds: { x: number; y: number; width: number; height: number }
    timeRemainingMs: number
    playerCount: number
  }
  visiblePlayers: Array<{
    id: string
    position: { x: number; y: number }
    velocity: { x: number; y: number }
    radius: number
    score: number
    isAlive: boolean
    relation: 'self' | 'smaller' | 'larger' | 'unknown'
  }>
  visibleFood: Array<{
    id: string
    position: { x: number; y: number }
    size: number
  }>
  visibleProjectiles: Array<{
    id: string
    position: { x: number; y: number }
    velocity: { x: number; y: number }
    size: number
    ownerId: string
  }>
  leaderboard: Array<{
    id: string
    score: number
    rank: number
  }>
  recentResults: Array<{
    playerId: string
    placement: number
    finalScore: number
  }>
}
```

Derived observation formats:
- `StructuredObservation`
  - best for rule bots and GoBigger-style models
- `GridObservation`
  - fixed-shape tensor for RL training and evaluation

The semantic contract is the source of truth. All runtime and training formats derive from it.

## Fairness Boundary

The bot must not see more than a desktop human player.

Live inference rules:
- only entities inside the same visible camera region as the desktop player are included
- no hidden off-screen entities
- no direct access to full authoritative table contents
- no future state
- no collision oracle
- no exact hidden cooldown internals unless the UI already exposes them

Allowed information:
- current camera-visible entities
- current room state that the UI already reveals
- visible scoreboard or leaderboard, if shown in the desktop UI
- end-of-match results, if shown in the desktop UI

Disallowed information:
- positions of unseen players
- full room roster unless visible in the UI
- whole-map food state
- whole-map projectile state
- hidden timings or internal reducer outcomes before they are visible

The adapter should therefore expose two layers:

- `PolicyObservation`
  - the only input allowed for live policies
- `PrivilegedDiagnostics`
  - full-room data for replay analysis, reward diagnostics, dataset labeling, and benchmark metrics
  - never available to live inference

Training should use `PolicyObservation` as model input by default. `PrivilegedDiagnostics` may exist beside it for analysis, but not as policy input.

## Camera And Visibility

The visibility filter must reuse the desktop camera rules, not an approximate heuristic.

Implementation requirement:
- extract or centralize the current camera rectangle logic from the frontend gameplay code
- use the same viewport sizing, zoom, and player-centered framing for bot observations

This keeps bot perception aligned with real play.

## Performance-Oriented Data Model

The semantic schema should not be tied to a single encoding.

Use three representations:

### `DebugJSON`

Use for:
- fixtures
- logs
- replay inspection
- debugging policy inputs and outputs

### `PackedFrame`

Use for:
- live inference between the TypeScript bot runner and Python policy process

Recommended design:
- fixed-size slot arrays
- deterministic ordering
- mask arrays for unused slots

Recommended packed structure:
- `header`
- `self`
- `players[K_PLAYERS]`
- `food[K_FOOD]`
- `projectiles[K_PROJECTILES]`
- `leaderboard[K_LEADERBOARD]`
- `masks`

Representation rules:
- normalize coordinates to the bot's visible camera bounds
- sort entities deterministically, for example nearest-first or threat-first
- use compact numeric types where possible

### `TensorView`

Use for:
- offline training
- replay export
- batch evaluation

Export formats:
- `npz` or NumPy memmap for tensor-heavy training
- `Arrow` or `Parquet` for replay analytics and large datasets

## Wire Protocol Recommendation

Do not optimize around JSON for the hot path.

Recommended order:

1. `MessagePack` or `CBOR` over Unix domain sockets
   - good first version
   - simple in TypeScript and Python
   - fast enough for live bots at current tick rates
2. `FlatBuffers`
   - candidate upgrade if live inference throughput becomes the bottleneck
   - useful if the binary schema becomes large and stable
3. shared-memory ring buffer
   - only if local IPC becomes a measured bottleneck

Recommendation:
- semantic schema stays versioned and stable
- physical encoding stays swappable

## AgarCL Interoperability

Treat AgarCL as a policy and training ecosystem, not as the authoritative engine.

### What To Reuse

- normalized movement plus discrete ability action model
- structured observation style similar to AgarCL GoBigger mode
- grid observation style similar to AgarCL grid mode
- Python training workflows and model serving patterns

### What Not To Reuse

- the AgarCL C++ simulation engine as the live game engine
- AgarCL's privileged training assumptions in live play

### Integration Shape

Build a Python bridge that mirrors the shared semantic schema.

Flow:

1. Battle Circles bot runner subscribes to authoritative SpacetimeDB state.
2. The observation adapter builds a fairness-filtered `PolicyObservationV1`.
3. The runtime encodes it as `PackedFrame`.
4. The Python policy process decodes it.
5. The Python process converts it to either:
   - a structured AgarCL-like input
   - a grid tensor
6. The policy outputs `CanonicalActionV1`.
7. The bot runner maps that action to Battle Circles reducers.

This allows:
- TypeScript rule bots
- Python RL bots
- replay and training export from the same observation contract

## Bot Runtime Design

Each bot is a real external client process.

Bot runtime responsibilities:
- join a configured queue
- keep a local snapshot of the subscribed authoritative state
- rebuild `PolicyObservationV1` at a fixed decision cadence
- execute one policy step
- send reducer calls
- disconnect or respawn cleanly after death or match end

Recommended decision cadence:
- start at `50ms` or `100ms`
- keep the cadence configurable
- batch inference for multiple bots where practical

Recommended bot classes:
- `LobbyFillPolicy`
  - believable but lightweight behavior for early public testing
- `BenchmarkPolicy`
  - deterministic policy behavior for load, balance, and regression testing
- `PythonModelPolicy`
  - bridge to AgarCL-trained models or future RL agents

## Training And Replay Design

Phase 1 should not attempt to build a full Battle Circles simulator.

Instead:
- capture fairness-filtered observations from live or replayed authoritative state
- pair them with actions and outcomes
- export them into training-friendly formats

Training modes:
- offline imitation or behavior cloning from captured matches
- offline RL or evaluation from replay datasets
- live evaluation against rule bots and humans

Later extension:
- a Gym-like `BattleCirclesEnvAdapter` can expose `reset`, `step`, and multi-agent rollout semantics on top of replay or controlled simulation tooling

## Rollout Plan

### Phase 1

- create `packages/agent-sdk`
- define `CanonicalActionV1`
- define `PolicyObservationV1`
- implement fairness-filtered structured observation builder
- implement a TypeScript rule bot in `apps/bot-runner`

### Phase 2

- add packed binary protocol
- add Python policy bridge
- support AgarCL-style structured inference
- add fixed-size tensor conversion

### Phase 3

- add training dataset export
- add benchmark bot suite
- add replay evaluation harness
- compare rule bots and Python models under the same contract

### Phase 4

- add Gym-like training bridge if still useful
- optionally optimize the live wire format further
- optionally add batch inference or shared-memory transport

## Testing And Validation

Required tests:

- schema compatibility tests for semantic and packed formats
- fairness tests that verify off-screen entities never enter `PolicyObservation`
- parity tests between desktop camera rules and bot visibility filtering
- reducer mapping tests for `CanonicalActionV1`
- deterministic fixture tests for observation packing
- benchmark tests for per-bot latency and throughput

Live validation targets:
- bots can join matches as normal players
- live bot input latency stays within the same practical range as a nearby human client
- live bots do not act on hidden information
- the same policy contract supports both rule bots and Python policy processes

## Risks

- camera parity may drift if bot visibility filtering does not reuse frontend rules exactly
- training quality will suffer if offline datasets use privileged information not available in live play
- Python IPC can become a bottleneck if the observation format is variable-size or overly verbose
- model behavior may overfit to the packed feature ordering if the schema is not stable and versioned

## Recommendation

Start with:
- external bot clients on the Hetzner host
- one shared semantic observation and action contract
- fairness-filtered structured observations
- a fixed-size packed frame format
- `MessagePack` over Unix domain sockets
- a TypeScript rule bot before the Python RL bridge

This yields the fastest path to useful live bots while keeping the system compatible with AgarCL-style training and future high-frequency policy inference.

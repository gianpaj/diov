# Bot AI And AgarCL Interop Implementation Plan

## Goal

Implement AI-controlled external clients for Battle Circles using one shared observation and action contract that supports:

- live bots in real matches
- offline replay and training workflows
- future Python and AgarCL-style model inference

The first milestone is a fairness-safe TypeScript rule bot that can join matches as a normal player and act only on human-equivalent information.

## Scope

In scope:
- shared agent schema and adapters
- fairness-filtered visibility model
- live bot runner
- a first lobby-fill rule bot
- a packed transport format for later Python inference
- a staged path toward training and replay export

Out of scope for the first implementation wave:
- replacing SpacetimeDB with a custom simulator
- giving bots full-room privileged state in live play
- building a complete Gym environment before live bots work
- optimizing IPC beyond what is needed for the first live bot

## Guiding Constraints

- Gameplay authority remains in SpacetimeDB.
- A live bot must behave like a real external client.
- A live bot must not see more than a desktop human player.
- The semantic policy contract must stay stable across rule bots, Python policies, replay export, and training.
- Physical encoding may evolve, but policy semantics should not.

## Deliverables

### Repo Additions

- `packages/agent-sdk`
- `apps/bot-runner`
- optionally later `apps/training-bridge`

### Core Outputs

- `CanonicalActionV1`
- `PolicyObservationV1`
- fairness-safe viewport filter
- structured observation builder
- fixed-slot packed frame encoder
- one TypeScript lobby-fill policy
- one benchmark-oriented deterministic policy

## Workstreams

### 1. Shared Agent SDK

Purpose:
- define the stable contract used by all bot runtimes and future training tools

Planned contents:
- `schema.ts`
- `observation.ts`
- `action.ts`
- `packing/`
- `fixtures/`

Responsibilities:
- define `CanonicalActionV1`
- define `PolicyObservationV1`
- define `PrivilegedDiagnosticsV1`
- normalize and validate actions
- encode and decode debug JSON
- encode and decode packed frames
- expose conversion helpers for structured and tensor views

Acceptance criteria:
- schema is versioned
- schema round-trip tests pass
- packed and debug encoders produce equivalent semantic content

### 2. Camera And Fairness Parity

Purpose:
- ensure bot perception matches the desktop human view

Planned work:
- identify the authoritative desktop camera behavior now implemented in frontend gameplay code
- extract shared camera math into a reusable module
- define the viewport rectangle for a given player state
- filter visible players, food, and projectiles using that viewport
- expose scoreboard and match results only if the desktop UI already exposes them

Likely touchpoints:
- frontend camera logic in the gameplay UI
- `packages/agent-sdk` visibility utilities
- test fixtures for visibility edge cases

Acceptance criteria:
- off-screen entities are excluded from `PolicyObservationV1`
- visible entities match desktop camera expectations
- fairness tests cover edge-of-screen and zoom-related cases

### 3. Live Bot Runner

Purpose:
- run real bot clients close to SpacetimeDB on the Hetzner host

Planned contents:
- connection lifecycle
- room and queue join logic
- authoritative snapshot store
- decision loop scheduler
- policy adapter interface
- reducer dispatch layer

Core interfaces:
- `BotClient`
- `BotPolicy`
- `ObservationProvider`
- `ActionExecutor`

Responsibilities:
- connect as a real SpacetimeDB client
- subscribe to authoritative tables
- maintain the latest room-local snapshot
- build fairness-filtered observations on schedule
- send `set_input`, `split`, and `spit`
- handle death, reconnect, and match transitions

Acceptance criteria:
- one bot can join a match and move reliably
- multiple bots can run concurrently
- decision cadence is configurable
- failures do not leave the process in a broken state

### 4. First Policies

Purpose:
- ship something useful before Python model serving exists

Initial policies:
- `LobbyFillPolicy`
  - simple but believable movement
  - food seeking
  - threat avoidance
  - opportunistic aggression
- `BenchmarkPolicy`
  - deterministic action selection
  - fixed seed support
  - stable enough for regression and load tests

Acceptance criteria:
- bots survive and interact in a real room
- behavior is good enough to fill early testing matches
- benchmark mode is deterministic under fixed inputs

### 5. Packed Live Protocol

Purpose:
- prepare for local high-frequency inference without overcommitting to a heavy schema system

Recommended first protocol:
- semantic schema stays TypeScript-first and versioned
- physical encoding uses `MessagePack` over Unix domain sockets

Packed frame shape:
- header
- self
- `players[K_PLAYERS]`
- `food[K_FOOD]`
- `projectiles[K_PROJECTILES]`
- `leaderboard[K_LEADERBOARD]`
- masks

Design rules:
- fixed slot counts
- deterministic entity ordering
- normalized coordinates inside the visible camera bounds
- compact numeric types where useful

Acceptance criteria:
- frame encode and decode are stable
- frame size stays bounded
- Python can consume the same packed frame later without semantic drift

### 6. Python And AgarCL Bridge

Purpose:
- let Python policies consume the same observations as live rule bots

Planned shape:
- local policy bridge process on the Hetzner host
- Unix socket transport
- schema mirror in Python dataclasses or Pydantic
- converters:
  - `PolicyObservationV1 -> structured model input`
  - `PolicyObservationV1 -> grid tensor`
  - `CanonicalActionV1 <- model output`

Important rule:
- Python models get the same fairness-filtered `PolicyObservationV1`
- `PrivilegedDiagnosticsV1` may be logged or exported, but not passed into live inference

Acceptance criteria:
- Python bridge can load a trivial stub policy
- live runner can call the Python policy over the packed protocol
- action latency stays within the live budget

### 7. Replay And Training Export

Purpose:
- create a path from live authoritative matches to reproducible offline evaluation and training

Planned outputs:
- per-tick or per-decision observation snapshots
- policy action logs
- match results
- optional privileged diagnostics for analytics

Recommended export targets:
- `npz` or memmap for tensor-heavy training
- `Arrow` or `Parquet` for analytics and large replay sets

Acceptance criteria:
- replay export can reconstruct a policy input sequence
- exported data distinguishes policy-visible fields from privileged diagnostics
- deterministic benchmark runs can be replayed and compared

## Implementation Slices

These slices are intentionally narrow. They should be implemented in order.

### Slice 1. Create `packages/agent-sdk`

Deliver:
- package scaffold
- `CanonicalActionV1`
- `PolicyObservationV1`
- `PrivilegedDiagnosticsV1`
- validation helpers
- debug JSON fixtures

Do not include yet:
- Python bridge
- live bot process
- tensor export

Validation:
- type-check
- schema fixture round-trips

### Slice 2. Extract Camera And Visibility Logic

Deliver:
- shared viewport calculation derived from desktop gameplay rules
- visibility filter for players, food, and projectiles
- fairness tests

Do not include yet:
- bot logic
- reducer dispatch

Validation:
- compare filtered entities against expected camera bounds
- verify off-screen entities never appear in `PolicyObservationV1`

### Slice 3. Build Structured Observation Adapter

Deliver:
- room-local snapshot to `PolicyObservationV1`
- deterministic ordering rules
- optional top-N leaderboard extraction

Do not include yet:
- packed live transport
- Python policy bridge

Validation:
- fixture-based observation generation tests
- stable ordering tests

### Slice 4. Create `apps/bot-runner`

Deliver:
- SpacetimeDB client connection
- subscription wiring
- decision loop
- reducer dispatch wrapper

Do not include yet:
- Python bridge
- advanced lifecycle orchestration

Validation:
- one bot can connect, join, move, split, and spit

### Slice 5. Implement `LobbyFillPolicy`

Deliver:
- simple food-seeking
- larger-player avoidance
- opportunistic target chasing
- basic split and spit heuristics

Validation:
- bot behaves plausibly in local matches
- bot does not require privileged state

### Slice 6. Implement `BenchmarkPolicy`

Deliver:
- deterministic policy
- fixed seed configuration
- basic scripted workload scenarios

Validation:
- repeated runs on the same fixture produce the same actions

### Slice 7. Add Packed Frame Encoding

Deliver:
- fixed-slot `PackedFrame`
- `MessagePack` encoder and decoder
- compatibility tests against semantic observations

Validation:
- packed frame round-trips
- encoded payload size stays bounded and predictable

### Slice 8. Add Python Stub Bridge

Deliver:
- Unix socket server or client pair
- Python schema mirror
- echo or trivial policy runner

Validation:
- live bot runner can request an action from Python and apply it

### Slice 9. Add Replay Export

Deliver:
- observation and action logging
- training-friendly export format
- benchmark replay harness

Validation:
- exported data can be reloaded for analysis

## Suggested File Targets

Planned new files and directories:

- `packages/agent-sdk/package.json`
- `packages/agent-sdk/src/schema.ts`
- `packages/agent-sdk/src/action.ts`
- `packages/agent-sdk/src/observation.ts`
- `packages/agent-sdk/src/visibility.ts`
- `packages/agent-sdk/src/packing/message-pack.ts`
- `packages/agent-sdk/src/fixtures/`
- `apps/bot-runner/package.json`
- `apps/bot-runner/src/index.ts`
- `apps/bot-runner/src/runtime/BotClient.ts`
- `apps/bot-runner/src/runtime/ObservationProvider.ts`
- `apps/bot-runner/src/runtime/ActionExecutor.ts`
- `apps/bot-runner/src/policies/LobbyFillPolicy.ts`
- `apps/bot-runner/src/policies/BenchmarkPolicy.ts`
- `apps/bot-runner/src/config.ts`
- later `apps/training-bridge/`

Potential shared-code extraction targets:
- camera or viewport utilities currently implied by frontend gameplay code
- deterministic sort helpers for visible entities

## Validation Strategy

### Unit Tests

- action validation
- observation builder correctness
- visibility filtering
- deterministic sorting
- packed frame round-trips

### Integration Tests

- live bot can connect and join a room
- bot sends valid reducer actions
- bot survives reconnects and room resets

### Fairness Tests

- hidden entities never enter `PolicyObservationV1`
- visible leaderboard only includes human-visible information
- training inputs match live inference inputs semantically

### Performance Tests

- decision loop latency under one bot
- throughput under several bots
- packed frame encode and decode cost
- Python bridge latency once added

## Operational Notes

- run live bots on the Hetzner host or very near it
- use Unix domain sockets between the TypeScript runner and Python bridge on the same host
- keep live bot count configurable
- add process supervision later only after the first bot loop works

## Risks And Mitigations

### Risk: Camera parity drifts from the desktop UI

Mitigation:
- derive visibility from shared camera code, not a separate approximation

### Risk: Schema changes break training and live inference compatibility

Mitigation:
- version the semantic schema from the start
- keep packing format separate from semantics

### Risk: Python IPC becomes the bottleneck

Mitigation:
- ship TypeScript rule bots first
- use fixed-slot packed frames
- move to FlatBuffers or shared memory only if measured

### Risk: Bots accidentally rely on privileged state

Mitigation:
- keep `PolicyObservationV1` and `PrivilegedDiagnosticsV1` physically separate in code
- add explicit fairness tests

## Recommended Execution Order

1. Slice 1: `packages/agent-sdk`
2. Slice 2: camera and visibility parity
3. Slice 3: structured observation adapter
4. Slice 4: `apps/bot-runner`
5. Slice 5: `LobbyFillPolicy`
6. Slice 6: `BenchmarkPolicy`
7. Slice 7: packed frame encoding
8. Slice 8: Python stub bridge
9. Slice 9: replay export

## Immediate Next Slices

These are the three slices worth starting now.

### Next Slice A

Create `packages/agent-sdk` with:
- semantic schemas
- validation helpers
- debug JSON fixtures

### Next Slice B

Extract the desktop camera and visibility rules into shared code and build fairness tests around them.

### Next Slice C

Build the structured observation adapter and a minimal `apps/bot-runner` that can connect and drive one bot with a trivial rule policy.

## Definition Of Done For The First Milestone

The first milestone is complete when:
- one bot can join a real room as a normal player
- the bot acts only on desktop-human-equivalent visible information
- the bot can move, split, and spit through the canonical action adapter
- the semantic observation and action schema are stable and tested
- the rule bot path does not depend on Python

At that point, the repo will have a valid base for:
- better live bots
- Python and AgarCL model integration
- replay export and offline evaluation

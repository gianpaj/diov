# Architecture

## Goal

Battle Circles is split into four active runtime surfaces:
- browser frontend
- SpacetimeDB authoritative gameplay module
- backend auth and commerce service
- external bot runner and training bridge

This file describes how those parts fit together today.

## System Overview

```txt
[Browser Frontend]
  ├─ React + PIXI UI
  ├─ subscribes directly to SpacetimeDB tables
  ├─ calls gameplay reducers
  └─ calls backend /api/* for auth and economy

[SpacetimeDB]
  ├─ authoritative room and match lifecycle
  ├─ simulation tick and collisions
  ├─ player, knibble, spit_blob, player_result tables
  └─ reducer API for player intent

[Backend]
  ├─ Better Auth sessions
  ├─ Telegram OIDC and Mini App auth
  ├─ wallet, ledger, catalog, inventory, loadouts
  └─ future TON checkout and webhooks

[Bot Runner]
  ├─ external SpacetimeDB clients
  ├─ fairness-safe observation builder
  ├─ local rule policies or Unix-socket bridge
  ├─ trace export
  └─ replay harness
```

## Frontend

Location:
- `apps/frontend/`

Responsibilities:
- render the game and menus
- subscribe to row-level authoritative state
- send gameplay intent through SpacetimeDB reducers
- call backend APIs for auth, wallet, shop, inventory, and loadouts

Important details:
- gameplay does not go through the Node backend
- `SocketStore.tsx` is the SpacetimeDB client store
- `GameStore.tsx` is the preferred row-level state surface
- compatibility `gameState` still exists for some UI paths, but it is not the long-term source of truth

## SpacetimeDB Module

Location:
- `packages/spacetimedb/`

Responsibilities:
- own queue and room state
- run countdown, start, tick, and end-of-match transitions
- process movement, split, spit, collisions, and eliminations
- publish authoritative rows to all clients

Public gameplay tables:
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

## Backend Service

Location:
- `apps/backend/`

Responsibilities:
- create and validate Better Auth sessions
- handle Telegram OIDC and Telegram Mini App authentication
- own coins, wallet ledger, catalog, inventory, and loadouts
- support future payment and entitlement flows

Important rule:
- do not move gameplay authority into this service

## External Bot Stack

Locations:
- `apps/bot-runner/`
- `apps/training-bridge/`
- `packages/agent-sdk/`

### Agent SDK

`packages/agent-sdk/` defines the stable policy surface:
- `CanonicalActionV1`
- `PolicyObservationV1`
- `PrivilegedDiagnosticsV1`
- packed observation format
- validators and MessagePack helpers

Design rule:
- keep semantic policy contracts stable
- let physical encoding evolve separately

### Bot Runner

`apps/bot-runner/` runs external clients that behave like normal players:
- connect to SpacetimeDB directly
- subscribe to authoritative tables
- build fairness-filtered observations using shared camera logic
- choose actions through a local policy or a Unix-socket bridge
- dispatch `set_input`, `split`, and `spit`

Current policy modes:
- `lobby-fill`
- `benchmark`
- `bridge`

Current runtime features:
- multi-bot supervision in one process
- optional packed observation transport for bridge mode
- trace export to newline-delimited JSON
- replay harness for comparing recorded actions against current policy behavior

### Training Bridge

`apps/training-bridge/` currently contains a Python stub policy bridge.

Purpose:
- receive structured or packed observations over a Unix socket
- return canonical actions
- provide a clean integration seam for AgarCL-style Python policies later

## Data Flow

### Human player path

```txt
Frontend input
  -> SpacetimeDB reducer call
  -> authoritative tick updates rows
  -> frontend subscription receives new rows
  -> frontend renders the updated state
```

### Economy and auth path

```txt
Frontend UI
  -> backend /api/*
  -> Better Auth or economy logic
  -> backend response updates frontend state
```

### Bot path

```txt
SpacetimeDB rows
  -> bot-runner snapshot builder
  -> fairness-safe observation adapter
  -> local policy or Python bridge
  -> canonical action
  -> SpacetimeDB reducer call
```

### Replay and training path

```txt
Bot decision
  -> trace export
  -> JSONL trace file
  -> replay harness or offline analysis
  -> future tensor and dataset export
```

## Fairness Model

Live bots must not see more than a desktop human player can see.

That constraint is enforced by:
- shared viewport math in `packages/agent-sdk`
- visibility filtering before policy input creation
- separation between `PolicyObservationV1` and `PrivilegedDiagnosticsV1`

Rule:
- live policies use `PolicyObservationV1`
- `PrivilegedDiagnosticsV1` is for trace export, replay analysis, and offline tooling only

## Generated Code

Generated code lives in:
- `packages/spacetimedb-bindings/src/`

Do not hand-edit it.

Regenerate with:

```bash
pnpm --filter @battle-circles/shared codegen
pnpm --filter @battle-circles/spacetimedb generate
```

## Deployment Shape

Current intended deployment:
- frontend on Vercel
- backend on Vercel
- SpacetimeDB on Hetzner
- bot runner and optional Python bridge on the same Hetzner host, or very near it

That layout keeps gameplay authority and bot latency close to each other while letting auth and web UI stay managed.

## Near-Term Risks

- camera and visibility parity can drift if frontend and bot viewport logic diverge
- compatibility `gameState` paths can confuse future gameplay edits
- live bot behavior still needs validation against the Hetzner SpacetimeDB deployment
- training and replay exports are still JSONL-first and not yet optimized for large datasets

## Related Docs

- [README.md](/Users/gianpaj_it/github/gianpaj/diov/README.md)
- [AGENTS.md](/Users/gianpaj_it/github/gianpaj/diov/AGENTS.md)
- [docs/bot-runner.md](/Users/gianpaj_it/github/gianpaj/diov/docs/bot-runner.md)
- [2026-03-22-bot-ai-interop-design.md](/Users/gianpaj_it/github/gianpaj/diov/docs/plans/2026-03-22-bot-ai-interop-design.md)
- [2026-03-22-bot-ai-interop-implementation-plan.md](/Users/gianpaj_it/github/gianpaj/diov/docs/plans/2026-03-22-bot-ai-interop-implementation-plan.md)

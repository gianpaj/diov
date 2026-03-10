# ROADMAP

This roadmap reflects the current architecture: React + PIXI frontend, SpacetimeDB as the authoritative multiplayer backend, and a separate future backend track for auth/payments/business logic.

## Current Phase

Battle Circles is in the SpacetimeDB migration phase after the core gameplay path has already moved off Socket.io.

Done:
- direct frontend connection to SpacetimeDB
- authoritative room/player/knibble/spit_blob subscriptions
- SpacetimeDB-owned lobby, countdown, start, finish, and tick loop
- `player_result` persistence for eliminated and final standings
- waiting room and game page mostly driven by row-level state

Still active:
- frontend performance and smoothing work
- removal of remaining compatibility snapshot paths
- production-grade local/dev workflow for SpacetimeDB publish and identities

## Phase 1: Stabilize the New Authoritative Path

- remove the remaining UI dependence on compatibility `gameState`
- continue reducing frontend sync/render churn
- add reliable local dev scripts and docs for SpacetimeDB server + publish flow
- add tests for reducer behavior:
  - joins and leaves
  - countdown and start
  - eating collisions
  - end-of-match transitions
  - player_result persistence

## Phase 2: Gameplay Quality

- smoother remote-player motion and correction handling
- visual polish for growth, elimination, and game-end states
- balancing pass for movement, growth, split, and spit
- better desktop controls while keeping mobile-first touch UX
- richer spectator/end-of-match experience

## Phase 3: Match and Session Features

- proper matchmaking beyond the current global-room dev flow
- reconnect/resume strategy
- guest identity strategy
- match history and richer post-game stats
- analytics hooks for match outcomes and session flow

## Phase 4: Business Backend

This is where `backend/` becomes useful again as a separate service.

- auth and session issuance
- payment webhooks
- purchase reconciliation
- entitlement state
- admin endpoints
- abuse/rate-limit controls

This phase should not pull gameplay authority back out of SpacetimeDB.

## Phase 5: Launch Readiness

- performance targets on mid-tier mobile devices
- asset and PWA polish
- error monitoring and telemetry
- deployment hardening
- region and latency strategy
- production rollback and migration playbooks

## Near-Term Priorities

1. Finish the row-level UI migration.
2. Keep reducing frontend microtask/render cost from subscription updates.
3. Add reducer-level tests around room lifecycle and collision outcomes.
4. Clean up docs and local workflow so new contributors can run SpacetimeDB without guesswork.
5. Define the separate auth/payments backend scope before building it.

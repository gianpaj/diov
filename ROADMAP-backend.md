# ROADMAP-backend

This file now refers to the non-gameplay backend track.

Gameplay authority has moved to SpacetimeDB. The Node backend in `backend/` should no longer be treated as the active room engine. Its future job is business logic and external integrations.

## Purpose of the Backend Track

Use `backend/` for:
- auth and session issuance
- payment webhooks
- purchase reconciliation
- entitlement storage
- admin APIs
- rate limiting and abuse controls
- integrations with third-party services

Do not use it for:
- authoritative movement
- room simulation
- collision resolution
- countdown/start/end game state

Those belong in SpacetimeDB.

## Phase 1: Clean Separation

- document the backend as legacy/non-authoritative for gameplay
- remove or isolate old Socket.io room-engine assumptions from active docs
- keep config and startup sane for local development
- define clear service boundaries between:
  - SpacetimeDB
  - frontend
  - business backend

## Phase 2: Auth Foundation

- choose auth provider or custom session model
- issue durable player/session identities
- connect frontend auth state to SpacetimeDB access model
- define guest-to-account upgrade path

## Phase 3: Commerce and Entitlements

- payment provider integration
- webhook ingestion
- idempotent purchase processing
- entitlement persistence
- refund/reversal handling

## Phase 4: Admin and Operations

- admin APIs for support and moderation
- audit logging
- abuse/risk controls
- environment and secret management
- monitoring and alerting

## Phase 5: Persistence and Reporting

- player profile storage
- purchase history
- account-linked match history summaries
- analytics export paths

## Open Questions

- What identity model should the frontend and SpacetimeDB share?
- Which data must live in SpacetimeDB versus a relational store?
- How should entitlements be reflected inside live multiplayer sessions?
- What part of the old `backend/` code should be retired versus repurposed?

## Near-Term Recommendation

Do not invest in reviving the old Socket.io game server. Keep the backend focused on future auth and payment responsibilities while gameplay remains in SpacetimeDB.

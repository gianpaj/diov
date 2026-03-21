# AGENTS.md — Battle Circles

> Read this file before making changes.

## Project Overview

Battle Circles is a real-time multiplayer browser game. Players control circles, eat smaller opponents, collect knibbles, and try to be the last one standing.

Current architecture:
- Frontend: React 18 + TypeScript + PIXI.js + Zustand + Vite
- Authoritative multiplayer backend: SpacetimeDB
- Auth and commerce backend: `apps/backend/` Hono + Better Auth + libSQL
- Package manager: `pnpm`

The active game flow is now:
- frontend connects directly to SpacetimeDB for lobby and gameplay
- frontend subscribes to authoritative tables
- frontend calls reducers for player intent
- frontend calls backend HTTP APIs for auth, coins, shop, and loadouts
- SpacetimeDB owns queue/lobby, countdown, match lifecycle, simulation, and final results

## Repository Layout

```txt
diov/
├── apps/
│   ├── frontend/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── HomePage.tsx
│   │   │   │   ├── WaitingRoom.tsx
│   │   │   │   ├── GamePage.tsx
│   │   │   │   └── game/
│   │   │   ├── hooks/
│   │   │   ├── lib/            ← backend API client + auth client
│   │   │   ├── module_bindings/← generated SpacetimeDB TS bindings
│   │   │   ├── stores/
│   │   │   │   ├── GameStore.tsx
│   │   │   │   └── SocketStore.tsx
│   │   │   ├── types/
│   │   │   └── vite-env.d.ts
│   │   └── package.json
│   └── backend/                ← auth, economy, and future payments backend
├── packages/
│   ├── shared/                 ← canonical schema + codegen
│   └── spacetimedb/            ← authoritative SpacetimeDB module
├── docs/
├── package.json
└── README.md
```

## Active Data Flow

```txt
[Browser]
  ├─ UI input
  │    └─ GamePage / WaitingRoom
  │         └─ SocketStore.tsx
  │              ├─ call SpacetimeDB reducers
  │              └─ subscribe to room/player/knibble/spit_blob/player_result
  └─ economy/auth UI
       └─ HomePage / backend-api.ts
            └─ call backend /api/* routes

[SpacetimeDB]
  ├─ queue modes: guest / competitive / casual_powerups
  ├─ room lifecycle
  ├─ countdown/start/end
  ├─ player movement and collisions
  ├─ knibble and spit blob state
  └─ player_result rows for eliminated/final standings

[Backend]
  ├─ Better Auth sessions
  ├─ Telegram OIDC + Mini App auth
  ├─ wallet / ledger
  ├─ catalog / inventory / loadouts
  └─ future TON checkout and webhooks

[Frontend]
  ├─ GameStore authoritative row slices
  ├─ PIXI render from row state
  └─ compatibility GameState kept only for remaining legacy UI paths
```

## Key Tables and Reducers

The SpacetimeDB module in `packages/spacetimedb/src/index.ts` is the source of truth for match state.

Public tables:
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
- scheduled `process_tick`

Canonical room ids:
- `guest-global`
- `competitive-global`
- `casual-global`

## Current Reality

These points matter when editing the repo:

- Gameplay does not go through the Node backend anymore.
- `SocketStore.tsx` is a SpacetimeDB client store despite the old name.
- `GameStore.tsx` holds row-level authoritative slices. Prefer those over the compatibility `gameState`.
- `apps/frontend/src/module_bindings/` is generated. Do not hand-edit it.
- `packages/shared/src/schema.ts` is the canonical wire-format source. Run codegen after changing it.
- Coins, inventory, loadouts, and payment state live in the backend, not in SpacetimeDB.
- SpacetimeDB only receives match-scoped appearance data such as `skinId` and `color`.
- The backend is active for auth and commerce work even though it is not part of gameplay authority.

## Running the Project

### Frontend

```bash
cd diov
pnpm install
pnpm --filter frontend dev
```

### Backend

```bash
cd diov
pnpm --filter backend dev
```

Use the backend whenever you work on auth, wallet, inventory, shop, or payment-related features.

### SpacetimeDB module workflow

```bash
cd diov
pnpm --filter @battle-circles/shared codegen
pnpm --filter @battle-circles/spacetimedb generate
spacetime logout
spacetime list --server local -y
pnpm --filter @battle-circles/spacetimedb publish:local battle-circles
```

If local ownership drifts, stop the running SpacetimeDB process, run `spacetime server clear`, restart the server, then republish using the stable-login flow above.

Useful frontend env vars:

```env
VITE_SPACETIMEDB_HOST=ws://127.0.0.1:3002
VITE_SPACETIMEDB_DB_NAME=battle-circles
VITE_BETTER_AUTH_URL=http://localhost:3001
```

These belong in `apps/frontend/.env`.

Useful backend env vars:

```env
CORS_ORIGIN=http://localhost:5173
BETTER_AUTH_URL=http://localhost:3001
BETTER_AUTH_SECRET=...
TURSO_DATABASE_URL=file:local.db
TELEGRAM_BOT_TOKEN=...
TELEGRAM_BOT_USERNAME=your_bot_username
TELEGRAM_OIDC_CLIENT_ID=123123123
TELEGRAM_OIDC_CLIENT_SECRET=your-telegram-oidc-client-secret
```

These belong in `apps/backend/.env`.

### Telegram OIDC local dev

For standalone browser Telegram login, use HTTPS tunnels such as `ngrok` for both frontend and backend.

Typical setup:

```txt
frontend https://<frontend>.ngrok-free.app -> http://localhost:5173
backend  https://<backend>.ngrok-free.app  -> http://localhost:3001
```

Then:
- set `VITE_BETTER_AUTH_URL` to the backend HTTPS tunnel
- set backend `CORS_ORIGIN` to the frontend HTTPS tunnel
- set backend `BETTER_AUTH_URL` to the backend HTTPS tunnel
- open the BotFather mini app, then go to `Bot Settings -> Web Login`
- register the frontend HTTPS origin there as the allowed URL
- register `https://<backend>.ngrok-free.app/api/auth/callback/telegram-oidc` there as the redirect URL
- copy `TELEGRAM_OIDC_CLIENT_ID` and `TELEGRAM_OIDC_CLIENT_SECRET` from that Web Login screen into `apps/backend/.env`
- do not use the legacy BotFather chat menu or the `Domain` setting for OIDC setup
- open the app via the frontend HTTPS tunnel, not localhost

## Environment Variables

Frontend:
- `VITE_SPACETIMEDB_HOST`
- `VITE_SPACETIMEDB_DB_NAME`
- `VITE_BETTER_AUTH_URL`

Backend:
- see `apps/backend/.env.example`

## Editing Rules

- Do not reintroduce Socket.io gameplay logic into the active multiplayer path.
- Prefer row-level state (`roomState`, `playerRows`, `knibbleRows`, `spitBlobRows`, `playerResultRows`) over compatibility snapshots.
- If you change `packages/shared/src/schema.ts`, regenerate:
  - `pnpm --filter @battle-circles/shared codegen`
  - `pnpm --filter @battle-circles/spacetimedb generate`
- If you change the SpacetimeDB module schema or reducers, publish a fresh local DB or republish to the intended DB owner.
- Do not put wallet, inventory, purchases, or auth session state into SpacetimeDB.
- Keep backend auth/economy code intact unless the task is explicitly about changing auth, commerce, or payment responsibilities.

## High-Priority Open Work

- Reduce frontend sync/render churn further; `SocketStore.tsx` and `GamePage.tsx` still carry performance risk.
- Remove remaining compatibility `gameState` dependencies from the UI.
- Harden auth/session flows beyond current Telegram and anonymous support.
- Complete TON checkout, reconciliation, and webhook handling in the backend service.
- Add tests for SpacetimeDB reducer behavior and frontend subscription flows.
- Add better local/dev documentation for stable SpacetimeDB identities and Telegram OIDC setup.


## Skills
A skill is a set of local instructions to follow that is stored in a `SKILL.md` file. Below is the list of skills that can be used. Each entry includes a name, description, and file path so you can open the source for full instructions when using a specific skill.
### Available skills
- pixi-js: Expert guidance for Pixi.js game development with TypeScript, focusing on high-performance web and mobile games (file: /Users/gianpaj_it/github/gianpaj/diov/.agents/skills/pixi-js/SKILL.md)
- agent-browser: Browser automation CLI for AI agents. Use when the user needs to interact with websites, including navigating pages, filling forms, clicking buttons, taking screenshots, extracting data, testing web apps, or automating any browser task. Triggers include requests to "open a website", "fill out a form", "click a button", "take a screenshot", "scrape data from a page", "test this web app", "login to a site", "automate browser actions", or any task requiring programmatic web interaction. (file: /Users/gianpaj_it/.agents/skills/agent-browser/SKILL.md)
- brainstorming: You MUST use this before any creative work - creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design before implementation. (file: /Users/gianpaj_it/.agents/skills/brainstorming/SKILL.md)
- domain-hunter: Search domains, compare prices, find promo codes, get purchase recommendations. Use when user wants to buy a domain, check prices, or find domain deals. (file: /Users/gianpaj_it/.agents/skills/domain-hunter/SKILL.md)
- find-skills: Helps users discover and install agent skills when they ask questions like "how do I do X", "find a skill for X", "is there a skill that can...", or express interest in extending capabilities. This skill should be used when the user is looking for functionality that might exist as an installable skill. (file: /Users/gianpaj_it/.agents/skills/find-skills/SKILL.md)
- gh-fix-ci: Use when a user asks to debug or fix failing GitHub PR checks that run in GitHub Actions; use `gh` to inspect checks and logs, summarize failure context, draft a fix plan, and implement only after explicit approval. Treat external providers (for example Buildkite) as out of scope and report only the details URL. (file: /Users/gianpaj_it/.agents/skills/gh-fix-ci/SKILL.md)
- seo-geo: SEO & GEO (Generative Engine Optimization) for websites. Analyze keywords, generate schema markup, optimize for AI search engines (ChatGPT, Perplexity, Gemini, Copilot, Claude) and traditional search (Google, Bing). Use when user wants to improve search visibility. (file: /Users/gianpaj_it/.agents/skills/seo-geo/SKILL.md)
- writing-clearly-and-concisely: Apply Strunk's timeless writing rules to ANY prose humans will read—documentation, commit messages, error messages, explanations, reports, or UI text. Makes your writing clearer, stronger, and more professional. (file: /Users/gianpaj_it/.agents/skills/writing-clearly-and-concisely/SKILL.md)
- skill-creator: Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Codex's capabilities with specialized knowledge, workflows, or tool integrations. (file: /Users/gianpaj_it/.codex/skills/.system/skill-creator/SKILL.md)
- skill-installer: Install Codex skills into $CODEX_HOME/skills from a curated list or a GitHub repo path. Use when a user asks to list installable skills, install a curated skill, or install a skill from another repo (including private repos). (file: /Users/gianpaj_it/.codex/skills/.system/skill-installer/SKILL.md)
### How to use skills
- Discovery: The list above is the skills available in this session (name + description + file path). Skill bodies live on disk at the listed paths.
- Trigger rules: If the user names a skill (with `$SkillName` or plain text) OR the task clearly matches a skill's description shown above, you must use that skill for that turn. Multiple mentions mean use them all. Do not carry skills across turns unless re-mentioned.
- Missing/blocked: If a named skill isn't in the list or the path can't be read, say so briefly and continue with the best fallback.
- How to use a skill (progressive disclosure):
  1) After deciding to use a skill, open its `SKILL.md`. Read only enough to follow the workflow.
  2) When `SKILL.md` references relative paths (e.g., `scripts/foo.py`), resolve them relative to the skill directory listed above first, and only consider other paths if needed.
  3) If `SKILL.md` points to extra folders such as `references/`, load only the specific files needed for the request; don't bulk-load everything.
  4) If `scripts/` exist, prefer running or patching them instead of retyping large code blocks.
  5) If `assets/` or templates exist, reuse them instead of recreating from scratch.
- Coordination and sequencing:
  - If multiple skills apply, choose the minimal set that covers the request and state the order you'll use them.
  - Announce which skill(s) you're using and why (one short line). If you skip an obvious skill, say why.
- Context hygiene:
  - Keep context small: summarize long sections instead of pasting them; only load extra files when needed.
  - Avoid deep reference-chasing: prefer opening only files directly linked from `SKILL.md` unless you're blocked.
  - When variants exist (frameworks, providers, domains), pick only the relevant reference file(s) and note that choice.
  - Safety and fallback: If a skill can't be applied cleanly (missing files, unclear instructions), state the issue, pick the next-best approach, and continue.

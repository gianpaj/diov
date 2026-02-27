# Battle Circles

## High-level Architecture

```txt
┌───────────────────────┐
│  Front‑end (React +   │
│  PIXI, socket.io‑cli) │
└───────▲───────────────┘
        │ websocket   ▲
        │             │
┌───────▼───────────────┐  ┌───────────────────────┐
│  HTTP/WS Server (Node) │  │   Database Layer       │
│    Express + Socket.io │  │   ┌─────────────────┐ │
│  • Matchmaking         │  │   │ PostgreSQL       │ │
│  • Room Manager        │  │   │ (user stats)    │ │
│  • Game Engine         │  │   └─────────────────┘ │
│  • Redis Pub/Sub       │  │   ┌─────────────────┐ │
│  • Auth / Rate‑limit   │  │   │ Redis (state)    │ │
└───────▲───────────────┘  └───────────────────────┘
        │             ▲
        │ websocket   │
        ▼             │
  ┌─────────────────────┐
  │  Docker/K8s (optional) │
  └─────────────────────┘
```

A real-time multiplayer browser game where players control circles, eat smaller opponents, and compete to be the last one standing. Built as a mobile-first web app with landscape orientation.

![Status](https://img.shields.io/badge/Status-In%20Development-orange)
![React](https://img.shields.io/badge/React-18.2-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)
![PIXI.js](https://img.shields.io/badge/PIXI.js-7.3-green)

> ⚠️ **Work in progress.** The frontend renders and the backend runs in isolation, but they are not yet fully connected. See [TODO.md](TODO.md) for the full list of blocking issues.

---

## Game Overview

Players join a lobby, wait for others, then battle in a shrinking arena:

- Move with a virtual joystick (left side of screen)
- Eat players smaller than you to grow
- Collect knibbles (food pellets) that spawn randomly
- Use **Split** to divide into multiple pieces
- Use **Spit** to eject mass and gain a speed burst
- Avoid the shrinking map boundaries
- Last circle standing wins

**Match size**: 2–12 players | **Round length**: 5 minutes

---

## Architecture

```
┌─────────────────────────────┐
│  Frontend (React + PIXI.js) │
│  Vite · Zustand · Socket.io │
└────────────┬────────────────┘
             │ WebSocket (Socket.io)
┌────────────▼────────────────┐   ┌─────────────────────────┐
│  Backend (Node + Express 5) │   │  Persistence (planned)  │
│  Socket.io · Game Engine    │   │  Redis  · PostgreSQL    │
│  Room Manager · Physics     │   │  (not yet connected)    │
└─────────────────────────────┘   └─────────────────────────┘
```

- **Authoritative server** — only the backend decides positions and collisions.
- **Room-based** — each game is an isolated `GameRoom` instance.
- **In-memory state** — active game state lives in a `Map<roomId, GameRoom>`.
- **Redis / PostgreSQL** — wired in config but not yet active (see TODO).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 + TypeScript |
| Game rendering | PIXI.js 7 via `@pixi/react` |
| State management | Zustand (with `subscribeWithSelector`) |
| Networking | Socket.io-client (frontend) / Socket.io (backend) |
| Backend runtime | Node.js 20 + Express 5 |
| Build tool | Vite 5 + `vite-plugin-pwa` |
| Validation | Zod (backend config + move payloads) |
| Linting / formatting | ESLint + Prettier |
| Testing | Vitest (frontend, no tests written yet) |

---

## Project Structure

```
diov/                          ← frontend
├── src/
│   ├── App.tsx                ← root; enforces landscape mode
│   ├── components/
│   │   ├── HomePage.tsx       ← name entry + join
│   │   ├── WaitingRoom.tsx    ← lobby + countdown
│   │   ├── GamePage.tsx       ← PIXI stage + UI overlay
│   │   └── game/
│   │       ├── ActionButtons.tsx
│   │       ├── GameHUD.tsx
│   │       ├── GameOverScreen.tsx
│   │       └── VirtualJoystick.tsx
│   ├── game/
│   │   ├── entities/          ← (empty — planned)
│   │   └── systems/           ← (empty — planned)
│   ├── hooks/
│   │   ├── useJoystick.ts
│   │   └── useOrientation.ts
│   ├── stores/
│   │   ├── GameStore.tsx      ← game state, camera, input
│   │   └── SocketStore.tsx    ← socket connection + events
│   ├── types/
│   │   └── game.ts            ← all shared types + constants
│   └── utils/                 ← (empty — planned)
├── public/                    ← (empty — PWA icons missing)
├── vite.config.ts
└── package.json

diov/backend/                  ← backend
├── src/
│   ├── server.ts              ← Express + Socket.io entry
│   ├── config.ts              ← Zod-validated env config
│   ├── game/
│   │   ├── engine.ts          ← room registry + tick loop
│   │   ├── room.ts            ← GameRoom: state + physics tick
│   │   ├── player.ts          ← Player entity
│   │   ├── physics.ts         ← move + collision
│   │   └── events.ts          ← socket event name constants
│   ├── networking/
│   │   ├── socket.ts          ← all socket.on() handlers
│   │   └── validators.ts      ← Zod move schema
│   ├── persistence/
│   │   ├── inmemory.ts        ← active in-memory store
│   │   ├── db.ts              ← Prisma client (not installed)
│   │   ├── redis.ts           ← Upstash Redis (not wired up)
│   │   └── autoSave.ts        ← JSON file save/load (incomplete)
│   ├── database/              ← (empty — schema not created)
│   └── types/
│       └── index.ts           ← PlayerState, GameState, etc.
└── package.json
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+

### 1. Install frontend dependencies

```bash
cd diov
pnpm install
```

### 2. Install backend dependencies

```bash
cd diov/backend
pnpm install
```

> Several packages are missing from `backend/package.json`. Until they are added you will see install/runtime errors. See [TODO.md](TODO.md).

### 3. Configure the backend

```bash
# No .env.example exists yet — create backend/.env manually:
cp /dev/null diov/backend/.env
```

Add the following to `diov/backend/.env`:

```
PORT=3001
TICK_RATE=50
MAX_PLAYERS_PER_ROOM=12
MIN_PLAYERS_PER_ROOM=2
MAX_SPEED=5
MAP_WIDTH=2000
MAP_HEIGHT=2000
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgres://user:pass@localhost:5432/battle_circles
CORS_ORIGIN=*
NODE_ENV=development
```

> `REDIS_URL` and `DATABASE_URL` are required by the Zod schema even though neither service is active yet. Provide any syntactically valid value.

### 4. Start the backend

```bash
cd diov/backend
pnpm run dev
# → http://localhost:3001
```

### 5. Start the frontend

```bash
cd diov
pnpm run dev
# → http://localhost:3000
```

Navigate to `http://localhost:3000` in a landscape browser window or mobile device.

---

## Available Scripts

### Frontend (`diov/`)

| Script | Description |
|---|---|
| `pnpm run dev` | Start Vite dev server on port 3000 |
| `pnpm run build` | Type-check + Vite production build |
| `pnpm run preview` | Preview production build |
| `pnpm run lint` | Run ESLint |
| `pnpm run lint:fix` | Auto-fix ESLint issues |
| `pnpm run format` | Format with Prettier |
| `pnpm run type-check` | Run `tsc --noEmit` |
| `pnpm test` | Run Vitest |

### Backend (`diov/backend/`)

| Script | Description |
|---|---|
| `pnpm run dev` | Start with nodemon (needs tsx/ts-node) |
| `pnpm run start` | Run with node directly |

---

## Game Controls

### Mobile (landscape required)

| Control | Action |
|---|---|
| Virtual joystick (left) | Move |
| Split button (right, top) | Split into pieces |
| Spit button (right, bottom) | Eject mass for speed |
| Pause button (top left) | Pause / leave |

### Desktop (testing)

Mouse controls the virtual joystick. Same buttons apply.

---

## Known Issues

The game is not yet end-to-end functional. The most critical blockers are:

1. **Event name mismatch** — frontend emits `player_input`; backend listens for `move`. Players cannot move.
2. **`join_game` breaks non-host players** — the handler returns early for anyone who isn't the room host, so only the host receives game state.
3. **No `roomId` sent on join** — `getOrCreateRoom(undefined)` always resolves the same accidental room.
4. **Frontend and backend `GameState` shapes are incompatible** — different field names (`position` vs `x`/`y`, `size` vs `radius`, array vs record).
5. **`styled-jsx` not installed** — every component with `<style jsx>` produces TypeScript errors.
6. **Backend missing dependencies** — `socket.io`, `uuid`, `dotenv`, `typescript`, `tsx` not in `package.json`.
7. **No `.env.example`** — backend crashes at startup from a fresh clone.

See [TODO.md](TODO.md) for the complete prioritised list.

---

## Troubleshooting

**Backend crashes immediately on startup**
→ Missing or invalid `.env` file. The Zod config validator throws on any missing variable. See step 3 above.

**Frontend compiles but shows TypeScript errors**
→ `styled-jsx` is not installed. Run `pnpm add styled-jsx` in `diov/` and add the Vite plugin, or convert styles to CSS modules.

**"Loading game…" spinner never goes away**
→ `gameState` and `localPlayer` are both `null` in `GameStore`. This means the socket is not receiving a `game_state` event from the backend. Check the event name mismatch (issue #1 and #2 above).

**Players can't move**
→ Frontend emits `player_input`; backend listens for `move`. See issue #1.

**Device must be in landscape mode**
→ `App.tsx` renders a rotation prompt if `window.innerWidth <= window.innerHeight`. Rotate your device or resize your browser window to be wider than tall.

**Touch controls not responding**
→ `main.tsx` calls `e.preventDefault()` on all `touchstart` and `touchmove` events globally. This can interfere with scroll in portrait testing. In landscape game mode this is intentional.

---

## Browser Compatibility

| Browser | Minimum version |
|---|---|
| Chrome / Chromium | 90+ (recommended) |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b fix/event-name-mismatch`
3. Make your changes, ensuring `pnpm run type-check` and `pnpm run lint` pass
4. Commit: `git commit -m 'fix: align socket event names frontend ↔ backend'`
5. Push and open a Pull Request

Please read [AGENTS.md](AGENTS.md) before making changes — it documents all known issues and architectural decisions in detail.

---

## Roadmap

See [ROADMAP.md](ROADMAP.md) for detailed phase planning.

**Planned features (post-MVP)**

- [ ] Player customization (skins, colours)
- [ ] Matchmaking and multiple rooms
- [ ] Persistent player stats (PostgreSQL)
- [ ] Redis pub/sub for horizontal scaling
- [ ] Spectator mode
- [ ] Replay system
- [ ] Native mobile apps
- [ ] Tournaments and ranked play

---

## License

MIT — see [LICENSE](LICENSE) for details.

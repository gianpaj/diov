/**
 * packages/shared/src/events.ts
 *
 * Socket event name constants shared by the backend and every client.
 *
 * Import from this file — never hardcode event name strings directly.
 *
 * Usage in backend:
 *   import * as events from '@battle-circles/shared/events'
 *
 * Usage in frontend:
 *   import * as events from '@battle-circles/shared/events'
 *
 * Alias wiring:
 *   - Backend `tsconfig.json`: already resolved via pnpm workspace
 *   - Frontend `tsconfig.json` + `vite.config.ts`: add path alias
 *     `@battle-circles/shared` → `../packages/shared/src/index.ts`
 */

// ── Inbound (client → server) ─────────────────────────────────────────────

/** Client joins or re-joins a room. Payload: JoinGamePayload */
export const JOIN_GAME = 'join_game' as const

/** Client sends movement + action input. Payload: PlayerInput */
export const PLAYER_INPUT = 'player_input' as const

/** Host requests the game to start. No payload. */
export const START_GAME = 'start_game' as const

/** Client voluntarily leaves the room. No payload. */
export const LEAVE_GAME = 'leave_game' as const

/** Client triggers a split action. No payload (also accepted inside PLAYER_INPUT). */
export const SPLIT = 'split' as const

/** Client triggers a spit action. No payload (also accepted inside PLAYER_INPUT). */
export const SPIT = 'spit' as const

/** Latency probe sent by the client. Server responds with PONG immediately. */
export const PING = 'ping' as const

// ── Outbound (server → client) ────────────────────────────────────────────

/** Full game snapshot broadcast every tick and on join. Payload: GameState */
export const GAME_STATE = 'game_state' as const

/** Broadcast to all players when a new player joins. Payload: PlayerJoinedPayload */
export const PLAYER_JOINED = 'player_joined' as const

/** Broadcast to all remaining players when someone leaves. Payload: PlayerLeftPayload */
export const PLAYER_LEFT = 'player_left' as const

/** Broadcast to all players when the host starts the countdown. Payload: GameStartedPayload */
export const GAME_STARTED = 'game_started' as const

/** Broadcast to all players when the game ends. Payload: GameEndedPayload */
export const GAME_ENDED = 'game_ended' as const

/** Broadcast when a player eats another player. Payload: PlayerEatenPayload */
export const PLAYER_EATEN = 'player_eaten' as const

/** Broadcast when a new knibble spawns. Payload: KnibbleSpawnedPayload */
export const KNIBBLE_SPAWNED = 'knibble_spawned' as const

/**
 * Emitted to the host when a different player is promoted to host
 * (e.g. because the previous host disconnected).
 * Payload: { newHostId: string }
 */
export const HOST_CHANGED = 'host_changed' as const

/** Response to PING — no payload. */
export const PONG = 'pong' as const

/** Emitted to a single client on a validation or logic error. Payload: ErrorPayload */
export const ERROR = 'error' as const

// ── Legacy aliases (kept for backward compat — prefer the constants above) ─

/** @deprecated Use PLAYER_INPUT instead */
export const MOVE = 'move' as const

/** @deprecated Use GAME_STATE instead */
export const INITIAL_STATE = 'initial_state' as const

/**
 * backend/src/game/events.ts
 *
 * Socket event name constants.
 *
 * All constants now come from @battle-circles/shared so that the backend and
 * every client share the exact same string values with no duplication.
 *
 * Existing backend code that imports from this file continues to work without
 * any path changes — this file is now a thin re-export shim.
 *
 * To add a new event:
 *   1. Add the constant to packages/shared/src/events.ts
 *   2. Re-export it here
 *   3. Add the corresponding payload schema to packages/shared/src/schema.ts
 *   4. Run codegen
 */

export {
  // ── Inbound (client → server) ─────────────────────────────────────────
  JOIN_GAME,
  PLAYER_INPUT,
  START_GAME,
  LEAVE_GAME,
  SPLIT,
  SPIT,
  PING,

  // ── Outbound (server → client) ────────────────────────────────────────
  GAME_STATE,
  PLAYER_JOINED,
  PLAYER_LEFT,
  GAME_STARTED,
  GAME_ENDED,
  PLAYER_EATEN,
  KNIBBLE_SPAWNED,
  HOST_CHANGED,
  PONG,
  ERROR,

  // ── Legacy aliases ────────────────────────────────────────────────────
  MOVE,
  INITIAL_STATE,
} from '@battle-circles/shared/events'

// Socket event name constants shared across the backend.
// Import these in socket.ts and reference them in the frontend SocketStore
// to keep both sides in sync.

// ── Inbound (client → server) ─────────────────────────────────────────────
export const JOIN_GAME = 'join_game'
export const PLAYER_INPUT = 'player_input'
export const MOVE = 'move' // legacy alias – prefer PLAYER_INPUT
export const SPLIT = 'split'
export const SPIT = 'spit'
export const START_GAME = 'start_game'
export const LEAVE_GAME = 'leave_game'

// ── Outbound (server → client) ────────────────────────────────────────────
export const GAME_STATE = 'game_state'
export const INITIAL_STATE = 'initial_state'
export const PLAYER_JOINED = 'player_joined'
export const PLAYER_LEFT = 'player_left'
export const GAME_STARTED = 'game_started'
export const GAME_ENDED = 'game_ended'
export const PLAYER_EATEN = 'player_eaten'
export const KNIBBLE_SPAWNED = 'knibble_spawned'
export const ERROR = 'error'

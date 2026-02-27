/**
 * packages/shared/src/index.ts
 *
 * Barrel export for @battle-circles/shared.
 *
 * Import the sub-paths directly when you only need one concern:
 *
 *   import * as events from '@battle-circles/shared/events'
 *   import { validatePlayerInput } from '@battle-circles/shared/validators'
 *   import { gameStateSchema } from '@battle-circles/shared/schema'
 *
 * Or import everything via the root when you need multiple concerns:
 *
 *   import { GameState, JOIN_GAME, validatePlayerInput } from '@battle-circles/shared'
 */

// ── Types (generated from Zod schema) ─────────────────────────────────────
export type {
  Vector2D,
  Boundary,
  RoomStatus,
  PlayerState,
  KnibbleState,
  SpitBlobState,
  GameState,
  RoomConfig,
  PlayerInput,
  JoinGamePayload,
  PlayerJoinedPayload,
  PlayerLeftPayload,
  GameStartedPayload,
  GameEndedPayload,
  PlayerEatenPayload,
  KnibbleSpawnedPayload,
  ErrorPayload,
} from './schema.ts'

// ── Zod schemas (for runtime validation) ──────────────────────────────────
export {
  vector2DSchema,
  boundarySchema,
  roomStatusSchema,
  playerStateSchema,
  knibbleStateSchema,
  spitBlobStateSchema,
  gameStateSchema,
  roomConfigSchema,
  playerInputSchema,
  joinGamePayloadSchema,
  playerJoinedPayloadSchema,
  playerLeftPayloadSchema,
  gameStartedPayloadSchema,
  gameEndedPayloadSchema,
  playerEatenPayloadSchema,
  knibbleSpawnedPayloadSchema,
  errorPayloadSchema,
} from './schema.ts'

// ── Validation helpers ─────────────────────────────────────────────────────
export {
  validatePlayerInput,
  validateJoinGame,
  validateGameState,
  validatePlayerJoined,
  validatePlayerLeft,
  validateGameStarted,
  validateGameEnded,
  validateError,
} from './validators.ts'

// ── Socket event name constants ────────────────────────────────────────────
export {
  // Inbound (client → server)
  JOIN_GAME,
  PLAYER_INPUT,
  START_GAME,
  LEAVE_GAME,
  SPLIT,
  SPIT,
  PING,
  // Outbound (server → client)
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
  // Legacy aliases
  MOVE,
  INITIAL_STATE,
} from './events.ts'

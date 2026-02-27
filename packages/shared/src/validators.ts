/**
 * packages/shared/src/validators.ts
 *
 * Runtime validation helpers built on top of the Zod schemas in `schema.ts`.
 *
 * Both the backend and (optionally) the frontend can import from here to
 * validate incoming data at the boundary — e.g. in socket event handlers.
 *
 * The backend's `backend/src/networking/validators.ts` should be updated to
 * re-export from here rather than defining its own schemas, eliminating the
 * duplicate definitions.
 *
 * Usage:
 *   import { validatePlayerInput, validateJoinGame } from '@battle-circles/shared/validators'
 *
 *   const result = validatePlayerInput(rawPayload)
 *   if (!result.success) {
 *     socket.emit('error', { message: 'Invalid input', code: 'INVALID_INPUT' })
 *     return
 *   }
 *   const { movement, splitPressed, spitPressed } = result.data
 */

export {
  playerInputSchema,
  joinGamePayloadSchema,
  gameStateSchema,
  playerStateSchema,
  knibbleStateSchema,
  spitBlobStateSchema,
  boundarySchema,
  vector2DSchema,
  roomStatusSchema,
  roomConfigSchema,
  playerJoinedPayloadSchema,
  playerLeftPayloadSchema,
  gameStartedPayloadSchema,
  gameEndedPayloadSchema,
  playerEatenPayloadSchema,
  knibbleSpawnedPayloadSchema,
  errorPayloadSchema,
} from './schema.ts'

import {
  playerInputSchema,
  joinGamePayloadSchema,
  gameStateSchema,
  playerJoinedPayloadSchema,
  playerLeftPayloadSchema,
  gameStartedPayloadSchema,
  gameEndedPayloadSchema,
  errorPayloadSchema,
} from './schema.ts'

// ── Typed safeParse wrappers ───────────────────────────────────────────────
//
// Each helper below calls `schema.safeParse(payload)` and returns a typed
// discriminated union so callers never have to import Zod themselves.

/** Validate a `player_input` payload from a socket event. */
export const validatePlayerInput = (payload: unknown) =>
  playerInputSchema.safeParse(payload)

/** Validate a `join_game` payload from a socket event. */
export const validateJoinGame = (payload: unknown) =>
  joinGamePayloadSchema.safeParse(payload)

/** Validate a full `game_state` broadcast (useful in integration tests). */
export const validateGameState = (payload: unknown) =>
  gameStateSchema.safeParse(payload)

/** Validate a `player_joined` broadcast payload. */
export const validatePlayerJoined = (payload: unknown) =>
  playerJoinedPayloadSchema.safeParse(payload)

/** Validate a `player_left` broadcast payload. */
export const validatePlayerLeft = (payload: unknown) =>
  playerLeftPayloadSchema.safeParse(payload)

/** Validate a `game_started` broadcast payload. */
export const validateGameStarted = (payload: unknown) =>
  gameStartedPayloadSchema.safeParse(payload)

/** Validate a `game_ended` broadcast payload. */
export const validateGameEnded = (payload: unknown) =>
  gameEndedPayloadSchema.safeParse(payload)

/** Validate an `error` payload emitted by the server. */
export const validateError = (payload: unknown) =>
  errorPayloadSchema.safeParse(payload)

/**
 * backend/src/networking/validators.ts
 *
 * Runtime validation for all inbound socket payloads.
 *
 * Schemas are imported from @battle-circles/shared so that the Zod definitions
 * remain a single source of truth.  Do not define schemas here — add them to
 * packages/shared/src/schema.ts and re-export them from this file if needed.
 */

export {
  playerInputSchema,
  joinGamePayloadSchema,
  validatePlayerInput,
  validateJoinGame,
} from '@battle-circles/shared/validators'

import { validatePlayerInput, validateJoinGame } from '@battle-circles/shared/validators'
export type { PlayerInput as ValidatedPlayerInput } from '@battle-circles/shared'

// ── Typed helpers re-exported under the original names ─────────────────────
//
// Code in socket.ts imports `validatePlayerInput` and `validateMove` from here.
// The new canonical name is `validatePlayerInput`; `validateMove` is kept as a
// deprecated alias so existing references compile without a bulk rename.

/** @deprecated Use validatePlayerInput instead */
export const validateMove = validatePlayerInput

/** @deprecated Use validateJoinGame instead */
export const validateJoinGamePayload = validateJoinGame

/**
 * backend/src/types/index.ts
 *
 * All wire-format types now come from the generated file produced by the
 * codegen script in packages/shared.  Do NOT add new hand-written types here.
 *
 * To change a type:
 *   1. Edit packages/shared/src/schema.ts
 *   2. Run: pnpm --filter @battle-circles/shared codegen
 *   3. Commit packages/shared/src/schema.ts AND backend/src/types/generated.ts
 *      AND src/types/generated.ts together.
 *
 * To add a backend-only type (not part of the wire format — e.g. an internal
 * engine structure) add it below the re-export block with a clear comment.
 */

// ── Value re-exports (const objects usable at runtime) ────────────────────
//
// `RoomStatus` is both a const object and a type alias in generated.ts.
// A plain `export { ... }` covers both the value and type sides.

export { RoomStatus } from './generated.ts'

// ── Type-only re-exports ──────────────────────────────────────────────────
//
// Everything that is a pure type (interface / type alias) and has no runtime
// representation goes here.  Keeping value and type exports separate avoids
// the "exported using export type" TS1362 error when code uses these as
// runtime values.

export type {
  PlayerId,
  RoomId,
  Vector2D,
  Boundary,
  RoomStatusValue,
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
  GameStats,
  PlayerEatenPayload,
  KnibbleSpawnedPayload,
  ErrorPayload,
} from './generated.ts'

// ── Backward-compat aliases ───────────────────────────────────────────────
//
// The old hand-written types/index.ts exported these names.  Code that
// imports them continues to compile without a bulk rename.

export type { PlayerInput as PlayerInputPayload } from './generated.ts'
export type { RoomStatusValue as RoomStatusValueAlias } from './generated.ts'

/**
 * packages/shared/src/schema.ts
 *
 * THE single source of truth for every type that crosses the wire between the
 * backend and any client.
 *
 * Rules:
 *   1. Only touch this file when the wire format changes.
 *   2. After editing, run `pnpm --filter @battle-circles/shared codegen` to
 *      regenerate `backend/src/types/generated.ts` and `src/types/generated.ts`.
 *   3. Do NOT import from the generated files inside this package — the schema
 *      is the source; generated files are downstream artefacts.
 *   4. All schemas use Zod v4 (same version as the backend).
 *
 * Consumers:
 *   - `backend/src/types/generated.ts`   (generated — do not edit by hand)
 *   - `src/types/generated.ts`            (generated — do not edit by hand)
 *   - `backend/src/networking/validators.ts` imports schemas directly for
 *     runtime validation (no generation needed — it already imports from here
 *     once the alias is wired up).
 */

import { z } from 'zod'

// ── Primitives ─────────────────────────────────────────────────────────────

export const playerId = z.string()
export const roomId = z.string()

// ── Sub-types ──────────────────────────────────────────────────────────────

export const vector2DSchema = z.object({
  x: z.number(),
  y: z.number(),
})

export const boundarySchema = z.object({
  /** Left edge (world pixels). */
  x: z.number(),
  /** Top edge (world pixels). */
  y: z.number(),
  width: z.number(),
  height: z.number(),
})

// ── Room / game status ─────────────────────────────────────────────────────

/**
 * Canonical set of room statuses.
 *
 * Note: the frontend `GameStatus` enum previously included `ENDING = 'ending'`
 * which the backend never emits.  That value has been intentionally omitted
 * here — the backend goes directly from `PLAYING` to `FINISHED`.  If a
 * transition state is ever needed, add it here first.
 */
export const roomStatusSchema = z.enum(['waiting', 'starting', 'playing', 'finished'])

// ── Entity state schemas ───────────────────────────────────────────────────

export const playerStateSchema = z.object({
  id: playerId,
  name: z.string(),
  position: vector2DSchema,
  velocity: vector2DSchema,
  /** Circle radius in world pixels. */
  size: z.number(),
  /** CSS colour string, e.g. "#FF6B6B". */
  color: z.string(),
  isAlive: z.boolean(),
  score: z.number().int(),
  lastSplitTime: z.number(),
  lastSpitTime: z.number(),
})

export const knibbleStateSchema = z.object({
  id: z.string(),
  position: vector2DSchema,
  /** Circle radius in world pixels. */
  size: z.number(),
  color: z.string(),
})

export const spitBlobStateSchema = z.object({
  id: z.string(),
  playerId: playerId,
  position: vector2DSchema,
  velocity: vector2DSchema,
  size: z.number(),
  color: z.string(),
  spawnTime: z.number(),
  despawnTime: z.number(),
})

// ── Top-level GameState ────────────────────────────────────────────────────

/**
 * Full game snapshot broadcast on every tick and on join.
 *
 * `players`, `knibbles`, and `spitBlobs` are keyed by their `id` for O(1)
 * lookup on the frontend.
 */
export const gameStateSchema = z.object({
  /** Unique room / game id. */
  id: z.string(),
  status: roomStatusSchema,
  /** ms epoch timestamp at which the match started (0 while WAITING). */
  startTime: z.number(),
  /** ms epoch timestamp at which the match ended (undefined while active). */
  endTime: z.number().optional(),
  /** Nominal round length in ms — used by the client countdown timer. */
  duration: z.number(),
  maxPlayers: z.number().int(),
  minPlayers: z.number().int(),
  /**
   * Socket id of the room creator.
   *
   * Required (not optional) — the backend always sets this on the first join.
   * The frontend previously typed this as `hostId?: string`; that was wrong.
   */
  hostId: z.string(),
  /** Socket id of the winner; set when status becomes "finished". */
  winner: z.string().optional(),
  /** ms timestamp of this snapshot (set by `room.getGameState()`). */
  lastUpdate: z.number(),

  players: z.record(z.string(), playerStateSchema),
  knibbles: z.record(z.string(), knibbleStateSchema),
  spitBlobs: z.record(z.string(), spitBlobStateSchema),
  bounds: boundarySchema,
})

// ── Room configuration ─────────────────────────────────────────────────────

export const roomConfigSchema = z.object({
  id: roomId,
  /** Maximum concurrent players (2–12). */
  maxPlayers: z.number().int().min(2).max(12),
  /** Tick interval in ms (e.g. 50 = 20 TPS). */
  tickRate: z.number().int().positive(),
})

// ── Client → server payloads ───────────────────────────────────────────────

/**
 * Movement + action input sent by the client each frame.
 *
 * `movement.x` and `movement.y` are normalised values in [-1, 1].
 */
export const playerInputSchema = z.object({
  movement: z.object({
    x: z.number().min(-1).max(1),
    y: z.number().min(-1).max(1),
  }),
  splitPressed: z.boolean(),
  spitPressed: z.boolean(),
})

/** Sent by the client on `join_game`. */
export const joinGamePayloadSchema = z.object({
  playerName: z.string().min(1).max(32),
  /** Defaults to "global" on the backend if omitted. */
  roomId: z.string().optional(),
})

// ── Server → client payloads ───────────────────────────────────────────────

/** Broadcast to all existing players when a new player joins. */
export const playerJoinedPayloadSchema = z.object({
  player: playerStateSchema,
  playerCount: z.number().int(),
})

/**
 * Broadcast to all remaining players when someone leaves or disconnects.
 *
 * `reason` distinguishes a voluntary leave from a network drop or elimination.
 * Use it on the frontend to show contextually correct messages.
 */
export const playerLeftPayloadSchema = z.object({
  playerId: playerId,
  playerCount: z.number().int(),
  reason: z.enum(['left', 'disconnected', 'eliminated']).optional(),
})

/** Broadcast to all players when the host starts the countdown. */
export const gameStartedPayloadSchema = z.object({
  gameState: gameStateSchema,
  /** Countdown length in seconds before `status` becomes "playing". */
  countdown: z.number().int().positive(),
})

/**
 * Broadcast to all players when the game ends.
 *
 * `stats` is intentionally included here (the frontend `GameOverScreen`
 * reads it) even though the backend does not yet populate it — see divergence
 * notes in `docs/testing-and-contract-sync.md`.  The field is optional so
 * the backend can omit it until the stats system is implemented.
 */
export const gameEndedPayloadSchema = z.object({
  winner: playerStateSchema.nullable(),
  finalState: gameStateSchema,
  stats: z
    .array(
      z.object({
        playerId: z.string(),
        rank: z.number().int(),
        finalSize: z.number(),
        knibblesEaten: z.number().int(),
        playersEaten: z.number().int(),
        timeAlive: z.number(),
        maxSize: z.number(),
        splitCount: z.number().int(),
        spitCount: z.number().int(),
      })
    )
    .optional(),
})

/** Broadcast when a player eats another player. */
export const playerEatenPayloadSchema = z.object({
  eaterId: playerId,
  victimId: playerId,
})

/** Broadcast when a new knibble spawns on the map. */
export const knibbleSpawnedPayloadSchema = z.object({
  knibble: knibbleStateSchema,
})

/** Emitted to a single client when a server-side validation or logic error occurs. */
export const errorPayloadSchema = z.object({
  message: z.string(),
  code: z
    .enum([
      'ROOM_FULL',
      'NOT_IN_ROOM',
      'NOT_HOST',
      'INVALID_INPUT',
      'ALREADY_STARTED',
      'UNKNOWN',
    ])
    .optional(),
})

// ── Inferred TypeScript types ──────────────────────────────────────────────
//
// These are the canonical types.  The codegen script (`scripts/codegen.ts`)
// writes these same inferred shapes as plain interfaces into:
//
//   backend/src/types/generated.ts
//   src/types/generated.ts
//
// so that neither side needs to import Zod at all — they just use the plain
// types.  The Zod schemas are only imported where runtime validation is
// needed (i.e. in `backend/src/networking/validators.ts`).

export type Vector2D = z.infer<typeof vector2DSchema>
export type Boundary = z.infer<typeof boundarySchema>
export type RoomStatus = z.infer<typeof roomStatusSchema>
export type PlayerState = z.infer<typeof playerStateSchema>
export type KnibbleState = z.infer<typeof knibbleStateSchema>
export type SpitBlobState = z.infer<typeof spitBlobStateSchema>
export type GameState = z.infer<typeof gameStateSchema>
export type RoomConfig = z.infer<typeof roomConfigSchema>
export type PlayerInput = z.infer<typeof playerInputSchema>
export type JoinGamePayload = z.infer<typeof joinGamePayloadSchema>
export type PlayerJoinedPayload = z.infer<typeof playerJoinedPayloadSchema>
export type PlayerLeftPayload = z.infer<typeof playerLeftPayloadSchema>
export type GameStartedPayload = z.infer<typeof gameStartedPayloadSchema>
export type GameEndedPayload = z.infer<typeof gameEndedPayloadSchema>
export type PlayerEatenPayload = z.infer<typeof playerEatenPayloadSchema>
export type KnibbleSpawnedPayload = z.infer<typeof knibbleSpawnedPayloadSchema>
export type ErrorPayload = z.infer<typeof errorPayloadSchema>

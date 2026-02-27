// ============================================================
// AUTO-GENERATED — DO NOT EDIT BY HAND
//
// Source of truth: packages/shared/src/schema.ts
// Regenerate:      pnpm --filter @battle-circles/shared codegen
//
// This file contains the canonical wire-format types for Battle Circles.
// It is produced by packages/shared/scripts/codegen.ts and must be
// committed to the repository so the package compiles without running the
// generator.
//
// When the wire format changes:
//   1. Update packages/shared/src/schema.ts
//   2. Run the codegen script
//   3. Commit both files together
// ============================================================

/* eslint-disable */
// @ts-nocheck — the file is machine-generated; individual fields are typed


// ── Primitive aliases ────────────────────────────────────────────────────────

export type PlayerId = string
export type RoomId = string

// ── Sub-types ────────────────────────────────────────────────────────────────

export interface Vector2D {
  x: number
  y: number
}

export interface Boundary {
  /** Left edge (world pixels). */
  x: number
  /** Top edge (world pixels). */
  y: number
  width: number
  height: number
}

// ── Room / game status ───────────────────────────────────────────────────────

/**
 * Canonical room status string union.
 *
 * Note: there is no "ending" status — the backend transitions directly from
 * "playing" to "finished".  Do not add "ending" here without adding it to
 * packages/shared/src/schema.ts first.
 *
 * Use the `RoomStatus` const object below for named constants rather than
 * raw string literals.
 */
export type RoomStatusValue = 'waiting' | 'starting' | 'playing' | 'finished'

/**
 * Named constants for room status values.
 *
 * `typeof RoomStatus[keyof typeof RoomStatus]` is equivalent to RoomStatusValue.
 *
 *   import { RoomStatus } from '@/types'
 *   room.status === RoomStatus.PLAYING  // ✅
 */
export const RoomStatus = {
  WAITING: 'waiting',
  STARTING: 'starting',
  PLAYING: 'playing',
  FINISHED: 'finished',
} as const


// ── Entity state types ───────────────────────────────────────────────────────

export interface PlayerState {
  id: PlayerId
  name: string
  position: Vector2D
  velocity: Vector2D
  /** Circle radius in world pixels. */
  size: number
  /** CSS colour string, e.g. "#FF6B6B". */
  color: string
  isAlive: boolean
  score: number
  lastSplitTime: number
  lastSpitTime: number
}

export interface KnibbleState {
  id: string
  position: Vector2D
  /** Circle radius in world pixels. */
  size: number
  color: string
}

export interface SpitBlobState {
  id: string
  playerId: PlayerId
  position: Vector2D
  velocity: Vector2D
  size: number
  color: string
  spawnTime: number
  despawnTime: number
}

// ── Top-level GameState ──────────────────────────────────────────────────────

/**
 * Full game snapshot broadcast on every tick and on join.
 *
 * `players`, `knibbles`, and `spitBlobs` are keyed by their `id` for O(1)
 * lookup on the frontend.
 */
export interface GameState {
  /** Unique room / game id. */
  id: string
  status: RoomStatusValue
  /** ms epoch timestamp at which the match started (0 while WAITING). */
  startTime: number
  /** ms epoch timestamp at which the match ended (undefined while active). */
  endTime?: number
  /** Nominal round length in ms — used by the client countdown timer. */
  duration: number
  maxPlayers: number
  minPlayers: number
  /**
   * Socket id of the room creator.
   * Always present — the backend sets this on the very first join.
   */
  hostId: string
  /** Socket id of the winner; set when status becomes "finished". */
  winner?: string
  /** ms timestamp of this snapshot. */
  lastUpdate: number

  players: Record<PlayerId, PlayerState>
  knibbles: Record<string, KnibbleState>
  spitBlobs: Record<string, SpitBlobState>
  bounds: Boundary
}

// ── Room configuration ───────────────────────────────────────────────────────

export interface RoomConfig {
  id: RoomId
  /** Maximum concurrent players (2–12). */
  maxPlayers: number
  /** Tick interval in ms (e.g. 50 = 20 TPS). */
  tickRate: number
}

// ── Client → server payloads ─────────────────────────────────────────────────

/**
 * Movement + action input sent by the client each frame.
 * `movement.x` and `movement.y` are normalised values in [-1, 1].
 */
export interface PlayerInput {
  movement: {
    x: number
    y: number
  }
  splitPressed: boolean
  spitPressed: boolean
}

/** Sent by the client on `join_game`. */
export interface JoinGamePayload {
  playerName: string
  /** Defaults to "global" on the backend if omitted. */
  roomId?: string
}

// ── Server → client payloads ─────────────────────────────────────────────────

/** Broadcast to all existing players when a new player joins. */
export interface PlayerJoinedPayload {
  player: PlayerState
  playerCount: number
}

/**
 * Broadcast to all remaining players when someone leaves or disconnects.
 *
 * `reason` distinguishes a voluntary leave from a network drop or elimination.
 */
export interface PlayerLeftPayload {
  playerId: PlayerId
  playerCount: number
  reason?: 'left' | 'disconnected' | 'eliminated'
}

/** Broadcast to all players when the host starts the countdown. */
export interface GameStartedPayload {
  gameState: GameState
  /** Countdown length in seconds before status becomes "playing". */
  countdown: number
}

export interface GameStats {
  playerId: string
  rank: number
  finalSize: number
  knibblesEaten: number
  playersEaten: number
  timeAlive: number
  maxSize: number
  splitCount: number
  spitCount: number
}

/** Broadcast to all players when the game ends. */
export interface GameEndedPayload {
  winner: PlayerState | null
  finalState: GameState
  /** Per-player stats; omitted until the stats system is implemented. */
  stats?: GameStats[]
}

/** Broadcast when a player eats another player. */
export interface PlayerEatenPayload {
  eaterId: PlayerId
  victimId: PlayerId
}

/** Broadcast when a new knibble spawns on the map. */
export interface KnibbleSpawnedPayload {
  knibble: KnibbleState
}

/** Emitted to a single client on a validation or logic error. */
export interface ErrorPayload {
  message: string
  code?: 'ROOM_FULL' | 'NOT_IN_ROOM' | 'NOT_HOST' | 'INVALID_INPUT' | 'ALREADY_STARTED' | 'UNKNOWN'
}

// ── Frontend compatibility shim ───────────────────────────────────────────────
//
// The frontend previously used a `GameStatus` enum.  We provide a const object
// with the same name so that `GameStatus.PLAYING` etc. continue to work as
// runtime values.
//
// The *type* alias for game status values is `RoomStatusValue` (shared with
// the backend).  `GameStatusValue` is provided as a frontend-friendly alias.
//
// IMPORTANT: `GameStatus.ENDING` is intentionally absent.  It was defined in
// the old `src/types/game.ts` but the backend never emits it.  If you need a
// transition state, add it to `packages/shared/src/schema.ts` first.

export const GameStatus = RoomStatus
export type GameStatusValue = RoomStatusValue

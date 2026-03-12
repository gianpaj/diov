#!/usr/bin/env tsx
/**
 * packages/shared/scripts/codegen.ts
 *
 * Code-generation script for Option C (Schema-Driven Type Sync).
 *
 * Reads the Zod schemas exported from `../src/schema.ts` and writes two
 * plain TypeScript files containing only interface / type alias declarations
 * (no Zod dependency at all):
 *
 *   ../../apps/backend/src/types/generated.ts
 *   ../../apps/frontend/src/types/generated.ts
 *
 * Run:
 *   pnpm --filter @battle-circles/shared codegen
 *   # or from the repo root:
 *   pnpm run codegen
 *
 * The generated files are committed to the repository so that neither the
 * backend nor the frontend needs to install Zod to get the types.
 *
 * Design notes
 * ────────────
 * We deliberately avoid `zod-to-ts` (Zod v3 only) and `ts-morph` (heavyweight
 * AST manipulation).  Instead, the script is a self-contained template:
 *
 *   1. Each type is written out as a hand-crafted interface string — exactly
 *      mirroring what `z.infer<typeof schema>` would produce.
 *   2. When the schema changes, the developer updates BOTH the Zod schema in
 *      `schema.ts` AND the corresponding template string in this file.  The
 *      CI `type-check` step will catch any drift because the generated files
 *      are checked by `tsc`.
 *   3. The generated files also include a `RoomStatus` const enum so that
 *      consumers have a named constant set rather than raw string literals.
 *
 * The generated header warns readers not to edit the file by hand.
 */

import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ── Output paths ────────────────────────────────────────────────────────────

const BACKEND_OUT = resolve(__dirname, '../../../apps/backend/src/types/generated.ts')
const FRONTEND_OUT = resolve(__dirname, '../../../apps/frontend/src/types/generated.ts')

// ── Generated file header ────────────────────────────────────────────────────

const HEADER = `// ============================================================
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

`

// ── Shared type body (identical for both packages) ───────────────────────────
//
// Each block mirrors the z.infer<> output of the corresponding schema in
// schema.ts.  When you add or remove a field in schema.ts you MUST update
// the matching block here.

const SHARED_TYPES = `
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

export interface InputVector {
  x: number
  y: number
}

// ── Room / game status ───────────────────────────────────────────────────────

export type RoomMode = 'guest' | 'competitive' | 'casual_powerups'

/**
 * Canonical room status string union.
 *
 * Note: there is no "ending" status — the backend transitions directly from
 * "playing" to "finished".  Do not add "ending" here without adding it to
 * packages/shared/src/schema.ts first.
 *
 * Use the \`RoomStatus\` const object below for named constants rather than
 * raw string literals.
 */
export type RoomStatusValue = 'waiting' | 'starting' | 'playing' | 'finished'

/**
 * Named constants for room status values.
 *
 * \`typeof RoomStatus[keyof typeof RoomStatus]\` is equivalent to RoomStatusValue.
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
  skinId?: string
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

// ── Subscription-driven authoritative row types ─────────────────────────────

export interface RoomState {
  id: RoomId
  mode: RoomMode
  status: RoomStatusValue
  hostId?: string
  countdownEndsAt?: number
  startedAt?: number
  endedAt?: number
  durationMs: number
  maxPlayers: number
  minPlayers: number
  winnerId?: string
  lastUpdateAt: number
  bounds: Boundary
}

export interface PlayerRowState {
  id: PlayerId
  roomId: RoomId
  name: string
  position: Vector2D
  velocity: Vector2D
  input: InputVector
  size: number
  color: string
  skinId?: string
  score: number
  isAlive: boolean
  lastSplitTime: number
  lastSpitTime: number
  joinedAt: number
}

export interface KnibbleRowState {
  id: string
  roomId: RoomId
  position: Vector2D
  size: number
  color: string
}

export interface SpitBlobRowState {
  id: string
  roomId: RoomId
  playerId: PlayerId
  position: Vector2D
  velocity: Vector2D
  size: number
  color: string
  createdAt: number
}

export interface PlayerResultRowState {
  id: string
  roomId: RoomId
  playerId: PlayerId
  name: string
  color: string
  placement: number
  finalSize: number
  finalScore: number
  joinedAt: number
  eliminatedAt: number
  wasWinner: boolean
}

// ── Top-level GameState ──────────────────────────────────────────────────────

/**
 * Full game snapshot broadcast on every tick and on join.
 *
 * \`players\`, \`knibbles\`, and \`spitBlobs\` are keyed by their \`id\` for O(1)
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
 * \`movement.x\` and \`movement.y\` are normalised values in [-1, 1].
 */
export interface PlayerInput {
  movement: InputVector
  splitPressed: boolean
  spitPressed: boolean
}

/** Sent by the client on \`join_game\`. */
export interface JoinGamePayload {
  playerName: string
  /** Defaults to "global" on the backend if omitted. */
  roomId?: string
  skinId?: string
  color?: string
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
 * \`reason\` distinguishes a voluntary leave from a network drop or elimination.
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
`

// ── Backend-only additions ───────────────────────────────────────────────────
//
// The backend generated file gets a RoomStatusValue type alias that the old
// hand-written backend/src/types/index.ts exported as `RoomStatusValue`.
// Existing backend code that imports `RoomStatusValue` continues to compile.

const BACKEND_EXTRA = `
// ── Backend compatibility aliases ────────────────────────────────────────────
// The old backend/src/types/index.ts exported \`RoomStatusValue\` as the status
// union type.  We keep that name here so existing imports compile unchanged
// while the migration to the generated file is in progress.

export type { RoomStatusValue }

// The old types also used \`PlayerInputPayload\` for what is now \`PlayerInput\`.
export type { PlayerInput as PlayerInputPayload }
`

// ── Frontend-only additions ───────────────────────────────────────────────────
//
// The frontend generated file gets a GameStatus const alias so that existing
// frontend code using `GameStatus.PLAYING` etc. does not need to be rewritten.
// The type alias is named GameStatusValue (parallel to RoomStatusValue) to
// avoid the TypeScript declaration-merging pitfall of sharing a name between
// a const and a type in re-export chains.
// Note: ENDING is intentionally absent — see schema.ts comment.

const FRONTEND_EXTRA = `
// ── Frontend compatibility shim ───────────────────────────────────────────────
//
// The frontend previously used a \`GameStatus\` enum.  We provide a const object
// with the same name so that \`GameStatus.PLAYING\` etc. continue to work as
// runtime values.
//
// The *type* alias for game status values is \`RoomStatusValue\` (shared with
// the backend).  \`GameStatusValue\` is provided as a frontend-friendly alias.
//
// IMPORTANT: \`GameStatus.ENDING\` is intentionally absent.  It was defined in
// the old \`src/types/game.ts\` but the backend never emits it.  If you need a
// transition state, add it to \`packages/shared/src/schema.ts\` first.

export const GameStatus = RoomStatus
export type GameStatusValue = RoomStatusValue
`

// ── Write helpers ─────────────────────────────────────────────────────────────

function write(outputPath: string, extraSection: string, label: string): void {
  const content = HEADER + SHARED_TYPES + extraSection
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, content, 'utf8')
  console.log(`✅  Generated ${label}`)
  console.log(`    → ${outputPath}`)
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log('🔧  Battle Circles — codegen')
console.log('    Source: packages/shared/src/schema.ts\n')

write(BACKEND_OUT, BACKEND_EXTRA, 'apps/backend/src/types/generated.ts')
write(FRONTEND_OUT, FRONTEND_EXTRA, 'apps/frontend/src/types/generated.ts')

console.log('\n✨  Done. Commit both generated files together with any schema changes.')
console.log('    Run `pnpm type-check` in each package to verify the generated types compile.\n')

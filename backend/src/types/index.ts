/**
 * backend/src/types/index.ts
 *
 * Canonical type definitions for the game wire format.
 *
 * These types define the shape of data sent over the socket.  The frontend
 * (`src/types/game.ts`) must stay in sync with these.  When changing a type
 * here, update the frontend counterpart too.
 */

export type PlayerId = string
export type RoomId = string

// ── Room status ────────────────────────────────────────────────────────────

export const RoomStatus = {
  WAITING: 'waiting',
  STARTING: 'starting',
  PLAYING: 'playing',
  FINISHED: 'finished',
} as const

export type RoomStatusValue = (typeof RoomStatus)[keyof typeof RoomStatus]

// ── Shared sub-types ───────────────────────────────────────────────────────

/** 2-D coordinate used for positions and velocities. */
export interface Vector2D {
  x: number
  y: number
}

/**
 * Player state that is broadcast to every client each tick.
 *
 * Uses `position` + `size` to match the frontend `Player` shape.
 */
export interface PlayerState {
  id: PlayerId
  name: string
  position: Vector2D // world coordinates (pixels)
  velocity: Vector2D // pixels per tick
  size: number // radius
  color: string // e.g. "rgb(255,0,128)" or "#FF6B6B"
  isAlive: boolean
  score: number
  lastSplitTime: number
  lastSpitTime: number
}

/** Food pellet broadcast to clients. */
export interface KnibbleState {
  id: string
  position: Vector2D
  size: number // radius
  color: string
}

/** Ejected mass blob. */
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

/** Axis-aligned boundary of the playable area. */
export interface Boundary {
  x: number // left edge
  y: number // top edge
  width: number
  height: number
}

// ── Top-level GameState (wire format) ─────────────────────────────────────

/**
 * Full game snapshot sent by `room.broadcast()` on every tick and on join.
 *
 * `players`, `knibbles`, and `spitBlobs` are keyed by id for O(1) lookup on
 * the frontend.
 */
export interface GameState {
  /** Unique game/room id. */
  id: string
  status: RoomStatusValue
  /** ms since epoch at which the match started (undefined while WAITING). */
  startTime: number
  /** ms since epoch at which the match ended (undefined while active). */
  endTime?: number
  /** Nominal round length in ms (used by the client countdown). */
  duration: number
  maxPlayers: number
  minPlayers: number
  /** Socket id of the player who created the room. */
  hostId: string
  /** Socket id of the winner, set when status becomes FINISHED. */
  winner?: string
  /** ms timestamp of this snapshot. */
  lastUpdate: number

  players: Record<PlayerId, PlayerState>
  knibbles: Record<string, KnibbleState>
  spitBlobs: Record<string, SpitBlobState>
  bounds: Boundary
}

// ── Room configuration ─────────────────────────────────────────────────────

export interface RoomConfig {
  id: RoomId
  maxPlayers: number // 2-12
  tickRate: number // ms per update, e.g. 50 ms (= 20 TPS)
}

// ── Socket message payloads ────────────────────────────────────────────────

/** Sent by the client when it wants to move. */
export interface PlayerInputPayload {
  movement: Vector2D // normalised dx/dy in [-1, 1]
  splitPressed: boolean
  spitPressed: boolean
}

/** Sent by the client on join_game. */
export interface JoinGamePayload {
  playerName: string
  roomId: string
}

/** Emitted to all players when someone joins. */
export interface PlayerJoinedPayload {
  player: PlayerState
  playerCount: number
}

/** Emitted to all players when someone leaves or disconnects. */
export interface PlayerLeftPayload {
  playerId: PlayerId
  playerCount: number
}

/** Emitted to all players when the countdown begins. */
export interface GameStartedPayload {
  gameState: GameState
  /** Countdown length in seconds. */
  countdown: number
}

/** Emitted to all players when the game is over. */
export interface GameEndedPayload {
  winner: PlayerState | null
  finalState: GameState
}

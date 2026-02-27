// src/game/player.ts
import type { PlayerState } from '../types/index.ts'

// Palette that matches frontend COLORS.PLAYER_COLORS
const PLAYER_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E9',
  '#F8C471',
  '#82E0AA',
]

/**
 * Options you pass when constructing a player.
 */
export interface PlayerOptions {
  /** Socket.io id of the client. */
  id: string
  /** Display name chosen by the player. */
  name?: string
  /** X coordinate in world pixels. */
  x: number
  /** Y coordinate in world pixels. */
  y: number
  /** Starting radius. */
  radius: number
  /** Optional colour override – if omitted a colour is picked from the palette. */
  color?: string
}

/**
 * Mutable player entity that lives inside a `GameRoom`.
 *
 * All physics-relevant fields are public so `Physics` and `GameRoom` can
 * manipulate them directly without extra getter/setter boilerplate.
 */
export class Player {
  // ── Identity ────────────────────────────────────────────────────────────
  readonly id: string
  readonly name: string
  readonly color: string

  // ── Position & size ──────────────────────────────────────────────────────
  x: number
  y: number
  /** Radius doubles as the "size" value sent to the client. */
  radius: number

  // ── Velocity (pixels per tick) ───────────────────────────────────────────
  velocityX = 0
  velocityY = 0

  // ── Game stats ───────────────────────────────────────────────────────────
  score = 0
  lastSplitTime = 0
  lastSpitTime = 0

  // ── Internal state ───────────────────────────────────────────────────────
  /** Index into the palette used for this player – lets pieces inherit colour. */
  private static nextColorIndex = 0

  constructor(opts: PlayerOptions) {
    this.id = opts.id
    this.name = opts.name ?? ''
    this.x = opts.x
    this.y = opts.y
    this.radius = opts.radius
    this.color = opts.color ?? Player.pickColor()
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Convenience setter used by the socket handler. */
  setVelocity(dx: number, dy: number) {
    this.velocityX = dx
    this.velocityY = dy
  }

  /**
   * Return a plain object in the canonical wire format (`PlayerState`).
   * This is what `GameRoom.getGameState()` embeds in each tick broadcast.
   */
  getState(): PlayerState {
    return {
      id: this.id,
      name: this.name,
      position: { x: this.x, y: this.y },
      velocity: { x: this.velocityX, y: this.velocityY },
      size: this.radius,
      color: this.color,
      isAlive: true,
      score: this.score,
      lastSplitTime: this.lastSplitTime,
      lastSpitTime: this.lastSpitTime,
    }
  }

  // ── Private utilities ────────────────────────────────────────────────────

  /** Round-robin through the palette so successive players get distinct colours. */
  private static pickColor(): string {
    const color = PLAYER_COLORS[Player.nextColorIndex % PLAYER_COLORS.length]
    Player.nextColorIndex++
    return color
  }
}

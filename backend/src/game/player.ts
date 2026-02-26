// src/game/player.ts
import type { PlayerState } from '../types'

/**
 * Options you pass when constructing a player.
 */
export interface PlayerOptions {
  /** Socket.io id of the client. */
  id: string
  /** X coordinate (pixels). */
  x: number
  /** Y coordinate (pixels). */
  y: number
  /** Current radius. */
  radius: number
  /** Optional starting colour – if omitted a random colour is chosen. */
  color?: string

  name?: string
}

/**
 * Player entity that lives inside a `GameRoom`.
 *
 * • Holds the socket reference for quick emit.
 * • Exposes a tiny API (`setVelocity`, `getState`) so the room can keep
 *   the physics engine ignorant of networking details.
 */
export class Player {
  /** Socket.io id (also used as player id). */
  readonly id: string

  readonly name: string

  /* ---------- Position & Size ---------- */
  x: number
  y: number
  radius: number

  /* ---------- Movement ---------- */
  /** Velocity in pixels per tick. Filled by `setVelocity`. */
  velocityX = 0
  velocityY = 0

  /* ---------- Appearance ---------- */
  readonly color: string

  /** ------------------------------------------------------------ */
  constructor(opts: PlayerOptions) {
    this.id = opts.id
    this.name = opts.name || ''

    // Position & size
    this.x = opts.x
    this.y = opts.y
    this.radius = opts.radius

    // Color – default to a random RGB if none supplied
    this.color = opts.color ?? Player.randomColor()
  }

  /* ------------------------------------------------------------ */
  /** Set the velocity (called by the room when a `move` event arrives). */
  setVelocity(dx: number, dy: number) {
    this.velocityX = dx
    this.velocityY = dy
  }

  /* ------------------------------------------------------------ */
  /** Return a plain object that the client can consume. */
  getState(): PlayerState {
    return {
      id: this.id,
      x: this.x,
      y: this.y,
      radius: this.radius,
      color: this.color,
    }
  }

  /* ------------------------------------------------------------ */
  /** Utility – generate a random RGB string. */
  private static randomColor(): string {
    const r = Math.floor(Math.random() * 256)
    const g = Math.floor(Math.random() * 256)
    const b = Math.floor(Math.random() * 256)
    return `rgb(${r},${g},${b})`
  }
}

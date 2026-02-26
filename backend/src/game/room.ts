import type { Socket } from 'socket.io'
import { v4 as uuidv4 } from 'uuid'
import { config } from '../config.ts'
import type {
  Boundary,
  GameState,
  // PlayerState,
  KnibbleState,
  RoomConfig,
} from '../types/index.ts'
import * as events from './events.ts'
import { Physics } from './physics.ts'
import { Player } from './player.ts'

export class GameRoom {
  private config: RoomConfig
  private players = new Map<string, Player>()
  private sockets = new Map<string, Socket>()

  private knibbles: KnibbleState[] = []
  private boundary: Boundary
  private physics = new Physics()
  private nextKnibbleTimer?: NodeJS.Timeout

  constructor(config: RoomConfig) {
    this.config = config
    this.boundary = { left: 0, top: 0, right: 2000, bottom: 2000 } // 2000x2000 px
    this.spawnKnibble() // initial spawn
    this.scheduleNextKnibble()
  }

  toPlain() {} // serialise for JSON
  // static fromPlain(o: any): GameRoom {};   // re‑create instance

  /* ---------- Player Management ---------- */

  addPlayer(socketId: string, playerName: string, socket: Socket): Player {
    const player = new Player({ id: socketId, name: playerName, x: 1000, y: 1000, radius: 20 })
    this.players.set(socketId, player)
    this.sockets.set(socketId, socket) // keep a parallel map
    return player
  }

  removePlayer(id: string) {
    this.players.delete(id)
    this.sockets.delete(id)
  }

  hasPlayer(id: string) {
    return this.players.has(id)
  }

  updatePlayerVelocity(id: string, dx: number, dy: number) {
    const player = this.players.get(id)
    if (!player) return
    player.velocityX = dx * config.MAX_SPEED // clamp in physics
    player.velocityY = dy * config.MAX_SPEED
  }

  splitPlayer(id: string) {
    const player = this.players.get(id)
    if (!player || player.radius < 30) return // min size to split
    const newRadius = Math.max(5, player.radius / 2)
    const offset = 20
    // spawn two halves
    this.players.set(
      uuidv4(),
      new Player({
        id: uuidv4(),
        x: player.x + offset,
        y: player.y + offset,
        radius: newRadius,
      })
    )
    this.players.set(
      uuidv4(),
      new Player({
        id: uuidv4(),
        x: player.x - offset,
        y: player.y - offset,
        radius: newRadius,
      })
    )
    this.players.delete(id)
  }

  spitPlayer(id: string) {
    const player = this.players.get(id)
    if (!player || player.radius < 30) return
    // Reduce radius, add speed boost
    player.radius -= 5
    const angle = Math.atan2(player.velocityY, player.velocityX)
    player.velocityX += Math.cos(angle) * 0.5
    player.velocityY += Math.sin(angle) * 0.5
  }

  /* ---------- Game Loop ---------- */

  update() {
    // 1️⃣ Move players
    for (const p of this.players.values()) {
      this.physics.move(p, this.boundary)
    }

    // 2️⃣ Resolve collisions
    this.resolveCollisions()

    // 3️⃣ Remove dead players, spawn winners etc.
    this.checkGameOver()
  }

  /* ---------- Collision Handling ---------- */

  private resolveCollisions() {
    const players = Array.from(this.players.values())

    // Player vs player
    for (let i = 0; i < players.length; i++) {
      const a = players[i]
      for (let j = i + 1; j < players.length; j++) {
        const b = players[j]
        if (this.physics.isColliding(a, b)) {
          // The larger eats the smaller
          if (a.radius > b.radius) {
            a.radius += Math.round(b.radius * 0.1) // 10% growth
            this.players.delete(b.id)
          } else if (b.radius > a.radius) {
            b.radius += Math.round(a.radius * 0.1)
            this.players.delete(a.id)
          }
        }
      }
    }

    // Player vs knibble
    for (const k of this.knibbles) {
      for (const p of players) {
        if (this.physics.isColliding(p, k)) {
          p.radius += 2 // fixed growth
          this.knibbles = this.knibbles.filter(kb => kb.id !== k.id)
        }
      }
    }

    // Boundary collisions already handled in physics.move
  }

  /* ---------- Knibble Spawning ---------- */

  private spawnKnibble() {
    const id = uuidv4()
    this.knibbles.push({
      id,
      x: Math.random() * (this.boundary.right - this.boundary.left) + this.boundary.left,
      y: Math.random() * (this.boundary.bottom - this.boundary.top) + this.boundary.top,
      radius: 5,
    })
  }

  private scheduleNextKnibble() {
    const delay = 2000 + Math.random() * 3000 // 2–5s
    this.nextKnibbleTimer = setTimeout(() => {
      this.spawnKnibble()
      this.scheduleNextKnibble()
    }, delay)
  }

  /* ---------- State Broadcasting ---------- */

  getGameState(): GameState {
    return {
      timestamp: Date.now(),
      players: Array.from(this.players.values()).map(p => ({
        id: p.id,
        x: p.x,
        y: p.y,
        radius: p.radius,
        color: p.color,
      })),
      knibbles: this.knibbles,
      boundary: this.boundary,
    }
  }

  broadcast(state: GameState) {
    // Send to all sockets in this room
    for (const p of this.players.values()) {
      const sock = this.sockets.get(p.id)
      sock?.emit(events.GAME_STATE, state)
    }
  }

  /* ---------- Game Over? ---------- */

  private checkGameOver() {
    if (this.players.size <= 1) {
      // Broadcast winner, reset or create new room
    }
  }
}

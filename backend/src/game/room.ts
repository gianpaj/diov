import type { Socket } from 'socket.io'
import { v4 as uuidv4 } from 'uuid'
import { config } from '../config.ts'
import {
  RoomStatus,
  type RoomStatusValue,
  type Boundary,
  type GameState,
  type KnibbleState,
  type PlayerState,
  type PlayerJoinedPayload,
  type GameStartedPayload,
  type GameEndedPayload,
  type RoomConfig,
} from '../types/index.ts'
import * as events from './events.ts'
import { Physics } from './physics.ts'
import { Player } from './player.ts'

// Knibble colours — matches frontend COLORS.KNIBBLE_COLORS
const KNIBBLE_COLORS = ['#FFD93D', '#6BCF7F', '#4D96FF', '#FF6B9D', '#C44569']

export class GameRoom {
  readonly id: string
  status: RoomStatusValue = RoomStatus.WAITING
  hostId!: string // socket id of the first player who joined
  startTime: number = 0 // epoch ms when the match actually starts
  endTime?: number // epoch ms when the match ended

  private readonly roomConfig: RoomConfig
  private players = new Map<string, Player>()
  private sockets = new Map<string, Socket>()

  private knibbles = new Map<string, KnibbleState>()
  private bounds: Boundary
  private physics = new Physics()
  private nextKnibbleTimer?: NodeJS.Timeout

  // Game constants (could be moved to config later)
  private readonly GAME_DURATION_MS = 5 * 60 * 1000 // 5 minutes
  private readonly MIN_PLAYERS = 2
  private readonly MAX_PLAYERS: number

  constructor(roomConfig: RoomConfig) {
    this.id = roomConfig.id
    this.roomConfig = roomConfig
    this.MAX_PLAYERS = roomConfig.maxPlayers
    this.bounds = { x: 0, y: 0, width: 2000, height: 2000 }
    this.spawnKnibble()
    this.scheduleNextKnibble()
  }

  // ── Serialisation (stub — implemented when persistence is wired up) ──────

  toPlain(): Record<string, unknown> {
    return {
      id: this.id,
      status: this.status,
      hostId: this.hostId,
      startTime: this.startTime,
      endTime: this.endTime,
      players: Array.from(this.players.values()).map(p => p.getState()),
      knibbles: Array.from(this.knibbles.values()),
      bounds: this.bounds,
    }
  }

  static fromPlain(_o: Record<string, unknown>): GameRoom {
    // TODO: fully re-hydrate — for now return an empty room so the import compiles
    throw new Error('GameRoom.fromPlain is not yet implemented')
  }

  // ── Countdown / game lifecycle ──────────────────────────────────────────

  startCountdown() {
    if (this.status !== RoomStatus.WAITING) return

    this.status = RoomStatus.STARTING
    const countdownSec = 5
    const countdownMs = countdownSec * 1000
    this.startTime = Date.now() + countdownMs

    const startedPayload: GameStartedPayload = {
      gameState: this.getGameState(),
      countdown: countdownSec,
    }
    this.broadcastAll(events.GAME_STARTED, startedPayload)

    setTimeout(() => {
      this.status = RoomStatus.PLAYING
      this.startTime = Date.now() // overwrite with actual start
      this.broadcastAll(events.GAME_STATE, this.getGameState())
    }, countdownMs)
  }

  // ── Player management ───────────────────────────────────────────────────

  addPlayer(socketId: string, playerName: string, socket: Socket): Player {
    const player = new Player({
      id: socketId,
      name: playerName,
      x: 500 + Math.random() * 1000,
      y: 500 + Math.random() * 1000,
      radius: 20,
    })

    if (this.players.size === 0) {
      this.hostId = socketId
    }

    this.players.set(socketId, player)
    this.sockets.set(socketId, socket)
    return player
  }

  removePlayer(id: string) {
    this.players.delete(id)
    this.sockets.delete(id)
  }

  hasPlayer(id: string) {
    return this.players.has(id)
  }

  get playerCount() {
    return this.players.size
  }

  get isFull() {
    return this.players.size >= this.MAX_PLAYERS
  }

  // ── Player actions ──────────────────────────────────────────────────────

  updatePlayerVelocity(id: string, dx: number, dy: number) {
    const player = this.players.get(id)
    if (!player) return
    player.velocityX = dx * config.MAX_SPEED
    player.velocityY = dy * config.MAX_SPEED
  }

  splitPlayer(id: string) {
    const player = this.players.get(id)
    if (!player || player.radius < 30) return

    const newRadius = Math.max(5, player.radius / 2)
    const offset = newRadius + 5

    // Shrink the original player to one half
    player.radius = newRadius
    player.lastSplitTime = Date.now()

    // Spawn the second half as a new entity
    const pieceId = uuidv4()
    const piece = new Player({
      id: pieceId,
      name: player.name,
      x: player.x + offset,
      y: player.y - offset,
      radius: newRadius,
      color: player.color,
    })
    // Give the piece a small outward burst
    piece.velocityX = player.velocityX * 0.5
    piece.velocityY = player.velocityY * 0.5

    this.players.set(pieceId, piece)
  }

  spitPlayer(id: string) {
    const player = this.players.get(id)
    if (!player || player.radius < 15) return

    player.radius = Math.max(10, player.radius - 5)
    player.lastSpitTime = Date.now()

    const angle = Math.atan2(player.velocityY || 0, player.velocityX || 0)
    player.velocityX = (player.velocityX || 0) + Math.cos(angle) * 1.5
    player.velocityY = (player.velocityY || 0) + Math.sin(angle) * 1.5
  }

  // ── Game loop ───────────────────────────────────────────────────────────

  update() {
    if (this.status !== RoomStatus.PLAYING) return

    for (const p of this.players.values()) {
      this.physics.move(p, this.bounds)
    }

    this.resolveCollisions()
    this.checkGameOver()
  }

  // ── Collision resolution ────────────────────────────────────────────────

  private resolveCollisions() {
    const players = Array.from(this.players.values())

    // Player vs player — larger eats smaller (must be 10% bigger)
    for (let i = 0; i < players.length; i++) {
      const a = players[i]
      if (!this.players.has(a.id)) continue // already eaten this tick

      for (let j = i + 1; j < players.length; j++) {
        const b = players[j]
        if (!this.players.has(b.id)) continue

        if (this.physics.isColliding(a, b)) {
          if (a.radius > b.radius * 1.1) {
            a.radius += Math.round(b.radius * 0.1)
            a.score += Math.round(b.radius)
            this.players.delete(b.id)
            this.sockets.delete(b.id)
            this.broadcastAll(events.PLAYER_EATEN, { eaterId: a.id, victimId: b.id })
          } else if (b.radius > a.radius * 1.1) {
            b.radius += Math.round(a.radius * 0.1)
            b.score += Math.round(a.radius)
            this.players.delete(a.id)
            this.sockets.delete(a.id)
            this.broadcastAll(events.PLAYER_EATEN, { eaterId: b.id, victimId: a.id })
            break // a is gone — stop inner loop for this a
          }
        }
      }
    }

    // Player vs knibble
    for (const [kid, k] of this.knibbles) {
      for (const p of this.players.values()) {
        if (this.physics.isCollidingFlat(p.x, p.y, p.radius, k.position.x, k.position.y, k.size)) {
          p.radius += 2
          p.score += 1
          this.knibbles.delete(kid)
          break
        }
      }
    }
  }

  // ── Knibble spawning ────────────────────────────────────────────────────

  private spawnKnibble() {
    const id = uuidv4()
    const color = KNIBBLE_COLORS[Math.floor(Math.random() * KNIBBLE_COLORS.length)]
    this.knibbles.set(id, {
      id,
      position: {
        x: this.bounds.x + Math.random() * this.bounds.width,
        y: this.bounds.y + Math.random() * this.bounds.height,
      },
      size: 5,
      color,
    })
  }

  private scheduleNextKnibble() {
    const delay = 2000 + Math.random() * 3000 // 2–5 s
    this.nextKnibbleTimer = setTimeout(() => {
      this.spawnKnibble()
      this.scheduleNextKnibble()
    }, delay)
  }

  // ── State serialisation ─────────────────────────────────────────────────

  /**
   * Returns a full game snapshot in the canonical wire format.
   * This is what gets broadcast to clients on every tick and on join.
   */
  getGameState(): GameState {
    const players: Record<string, PlayerState> = {}
    for (const [id, p] of this.players) {
      players[id] = {
        id: p.id,
        name: p.name,
        position: { x: p.x, y: p.y },
        velocity: { x: p.velocityX, y: p.velocityY },
        size: p.radius,
        color: p.color,
        isAlive: true, // if the player is in the map they are alive
        score: p.score,
        lastSplitTime: p.lastSplitTime,
        lastSpitTime: p.lastSpitTime,
      }
    }

    const knibbles: Record<string, KnibbleState> = {}
    for (const [id, k] of this.knibbles) {
      knibbles[id] = k
    }

    return {
      id: this.id,
      status: this.status,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.GAME_DURATION_MS,
      maxPlayers: this.MAX_PLAYERS,
      minPlayers: this.MIN_PLAYERS,
      hostId: this.hostId,
      winner: undefined,
      lastUpdate: Date.now(),
      players,
      knibbles,
      spitBlobs: {}, // SpitBlob entity not yet implemented
      bounds: this.bounds,
    }
  }

  // ── Broadcasting helpers ────────────────────────────────────────────────

  /** Emit an event + payload to every connected player in this room. */
  broadcastAll(event: string, payload: unknown) {
    for (const sock of this.sockets.values()) {
      sock.emit(event, payload)
    }
  }

  /** Emit the current game state to every player (used by the tick loop). */
  broadcast(state: GameState) {
    this.broadcastAll(events.GAME_STATE, state)
  }

  /**
   * Notify all *existing* players that a new player has joined.
   * The joining player itself should receive the full `game_state` separately.
   */
  broadcastPlayerJoined(newPlayer: Player) {
    const payload: PlayerJoinedPayload = {
      player: {
        id: newPlayer.id,
        name: newPlayer.name,
        position: { x: newPlayer.x, y: newPlayer.y },
        velocity: { x: newPlayer.velocityX, y: newPlayer.velocityY },
        size: newPlayer.radius,
        color: newPlayer.color,
        isAlive: true,
        score: newPlayer.score,
        lastSplitTime: newPlayer.lastSplitTime,
        lastSpitTime: newPlayer.lastSpitTime,
      },
      playerCount: this.players.size,
    }

    for (const [id, sock] of this.sockets) {
      // Skip the player who just joined — they get game_state instead
      if (id !== newPlayer.id) {
        sock.emit(events.PLAYER_JOINED, payload)
      }
    }
  }

  /**
   * Notify all players that someone left.
   */
  broadcastPlayerLeft(playerId: string) {
    this.broadcastAll(events.PLAYER_LEFT, {
      playerId,
      playerCount: this.players.size,
    })
  }

  // ── Game over ───────────────────────────────────────────────────────────

  private checkGameOver() {
    if (this.status !== RoomStatus.PLAYING) return

    const alive = Array.from(this.players.values())
    const timeExpired = this.startTime > 0 && Date.now() - this.startTime >= this.GAME_DURATION_MS

    if (alive.length <= 1 || timeExpired) {
      this.status = RoomStatus.FINISHED
      this.endTime = Date.now()
      if (this.nextKnibbleTimer) clearTimeout(this.nextKnibbleTimer)

      const winnerPlayer = alive.length === 1 ? alive[0] : null
      const finalState = this.getGameState()
      if (winnerPlayer) {
        finalState.winner = winnerPlayer.id
      }

      const payload: GameEndedPayload = {
        winner: winnerPlayer
          ? {
              id: winnerPlayer.id,
              name: winnerPlayer.name,
              position: { x: winnerPlayer.x, y: winnerPlayer.y },
              velocity: { x: winnerPlayer.velocityX, y: winnerPlayer.velocityY },
              size: winnerPlayer.radius,
              color: winnerPlayer.color,
              isAlive: true,
              score: winnerPlayer.score,
              lastSplitTime: winnerPlayer.lastSplitTime,
              lastSpitTime: winnerPlayer.lastSpitTime,
            }
          : null,
        finalState,
      }

      this.broadcastAll(events.GAME_ENDED, payload)
    }
  }
}

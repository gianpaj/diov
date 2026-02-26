import type { Server as SocketIOServer } from 'socket.io'
import { config } from '../config.ts'
import { GameRoom } from './room.ts'

export class GameEngine {
  private rooms = new Map<string, GameRoom>()
  // private io: SocketIOServer
  private tickTimer?: NodeJS.Timeout

  constructor(io: SocketIOServer) {
    // this.io = io
    // await loadFromDisk();
    this.startLoop()
  }

  /** Create or fetch a room. */
  getOrCreateRoom(roomId: string): GameRoom {
    if (!this.rooms.has(roomId)) {
      const room = new GameRoom({ id: roomId, maxPlayers: 12, tickRate: config.TICK_RATE })
      this.rooms.set(roomId, room)
    }
    return this.rooms.get(roomId)!
  }

  /** Find the room a player belongs to. */
  findRoomByPlayer(playerId: string): GameRoom | undefined {
    for (const room of this.rooms.values()) {
      if (room.hasPlayer(playerId)) return room
    }
  }

  /** Remove a player from all rooms (disconnect). */
  removePlayer(playerId: string) {
    for (const room of this.rooms.values()) {
      if (room.hasPlayer(playerId)) {
        room.removePlayer(playerId)
        break
      }
    }
  }

  /** Main tick loop. */
  private startLoop() {
    this.tickTimer = setInterval(() => {
      for (const room of this.rooms.values()) {
        room.update() // physics, AI, spawns
        const state = room.getGameState()
        room.broadcast(state) // send to all clients in that room
      }
    }, config.TICK_RATE)
  }

  stop() {
    clearInterval(this.tickTimer)
  }
}

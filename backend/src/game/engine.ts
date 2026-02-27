import type { Server as SocketIOServer } from 'socket.io'
import { config } from '../config.ts'
import { GameRoom } from './room.ts'
import { RoomStatus } from '../types/index.ts'

export class GameEngine {
  private rooms = new Map<string, GameRoom>()
  // private io: SocketIOServer
  private tickTimer?: NodeJS.Timeout

  constructor(_io: SocketIOServer) {
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
      for (const [roomId, room] of this.rooms) {
        // Clean up finished rooms so they stop occupying the loop
        if (room.status === RoomStatus.FINISHED) {
          this.rooms.delete(roomId)
          continue
        }

        room.update() // physics, AI, spawns

        // Only broadcast live state to clients while the game is actually running
        if (room.status === RoomStatus.PLAYING) {
          const state = room.getGameState()
          room.broadcast(state)
        }
      }
    }, config.TICK_RATE)
  }

  stop() {
    clearInterval(this.tickTimer)
  }
}

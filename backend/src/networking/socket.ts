import { Server as SocketIOServer, Socket } from 'socket.io'

import type { GameEngine } from '../game/engine.ts'
import * as events from '../game/events.ts'
import {
  validateMove,
  // validateAction
} from './validators.ts'

export function socketMiddleware(io: SocketIOServer, engine: GameEngine) {
  io.on('connection', (socket: Socket) => {
    console.log(`⚡️ ${socket.id} connected`)

    // 1️⃣ Join a room
    socket.on(events.JOIN_GAME, (payload: { roomId: string; playerName: string }) => {
      const room = engine.getOrCreateRoom(payload.roomId)
      const player = room.addPlayer(socket.id, payload.playerName, socket)

      // Send initial state
      socket.emit(events.GAME_STATE, room.getGameState())
    })

    // 2️⃣ Handle player input
    socket.on(events.MOVE, (payload: { dx: number; dy: number }) => {
      const room = engine.findRoomByPlayer(socket.id)
      if (!room) return

      // Validate (e.g. max speed)
      const { error, data } = validateMove(payload)
      if (error) return socket.emit(events.ERROR, { message: error.message })

      room.updatePlayerVelocity(socket.id, data.dx, data.dy)
    })

    // 3️⃣ Actions: split / spit
    socket.on(events.SPLIT, () => {
      const room = engine.findRoomByPlayer(socket.id)
      if (!room) return
      room.splitPlayer(socket.id)
    })

    socket.on(events.SPIT, () => {
      const room = engine.findRoomByPlayer(socket.id)
      if (!room) return
      room.spitPlayer(socket.id)
    })

    // 4️⃣ Disconnect
    socket.on('disconnect', () => {
      console.log(`❌ ${socket.id} disconnected`)
      engine.removePlayer(socket.id)
    })
  })
}

import { Server as SocketIOServer, Socket } from 'socket.io'

import type { GameEngine } from '../game/engine.ts'
import * as events from '../game/events.ts'
import type { JoinGamePayload, PlayerInputPayload } from '../types/index.ts'
import { validatePlayerInput } from './validators.ts'

// For MVP every player lands in the same room until matchmaking is added.
const DEFAULT_ROOM_ID = 'global'

export function socketMiddleware(io: SocketIOServer, engine: GameEngine) {
  io.on('connection', (socket: Socket) => {
    console.log(`⚡️ ${socket.id} connected`)

    // ── 1. Join a room ────────────────────────────────────────────────────
    //
    // Payload: { playerName: string, roomId?: string }
    //
    // What we do:
    //   a) Put the player into the room (creating it if needed).
    //   b) Send the joining player the full current game state.
    //   c) Broadcast player_joined to everyone *else* in the room.
    //
    socket.on(events.JOIN_GAME, (payload: Partial<JoinGamePayload>) => {
      const playerName = (payload?.playerName ?? '').trim() || 'Anonymous'
      const roomId = payload?.roomId?.trim() || DEFAULT_ROOM_ID

      const room = engine.getOrCreateRoom(roomId)

      if (room.isFull) {
        socket.emit(events.ERROR, { message: 'Room is full', code: 'ROOM_FULL' })
        return
      }

      const player = room.addPlayer(socket.id, playerName, socket)

      console.log(
        `👤 ${playerName} (${socket.id}) joined room "${roomId}" (${room.playerCount} players)`
      )

      // Send the full game state to the player who just joined
      socket.emit(events.GAME_STATE, room.getGameState())

      // Let everyone else know a new player arrived
      room.broadcastPlayerJoined(player)
    })

    // ── 2. Start the game (host only) ─────────────────────────────────────
    //
    // The host clicks "Start Game" in the waiting room.  We validate that
    // the requester really is the host before kicking off the countdown.
    //
    socket.on(events.START_GAME, () => {
      const room = engine.findRoomByPlayer(socket.id)
      if (!room) {
        socket.emit(events.ERROR, { message: 'You are not in a room', code: 'NOT_IN_ROOM' })
        return
      }

      if (socket.id !== room.hostId) {
        socket.emit(events.ERROR, { message: 'Only the host can start the game', code: 'NOT_HOST' })
        return
      }

      console.log(`🚀 Host ${socket.id} started room "${room.id}"`)
      room.startCountdown()
    })

    // ── 3. Player input ───────────────────────────────────────────────────
    //
    // Payload: { movement: { x, y }, splitPressed: boolean, spitPressed: boolean }
    //
    // movement.x / movement.y are normalised values in [-1, 1].
    //
    socket.on(events.PLAYER_INPUT, (payload: unknown) => {
      const room = engine.findRoomByPlayer(socket.id)
      if (!room) return

      const result = validatePlayerInput(payload)
      if (!result.success) {
        socket.emit(events.ERROR, {
          message: 'Invalid input payload',
          code: 'INVALID_INPUT',
          details: result.error.flatten(),
        })
        return
      }

      const { movement, splitPressed, spitPressed } = result.data as PlayerInputPayload

      room.updatePlayerVelocity(socket.id, movement.x, movement.y)

      if (splitPressed) {
        room.splitPlayer(socket.id)
      }

      if (spitPressed) {
        room.spitPlayer(socket.id)
      }
    })

    // ── 4. Split (standalone button, kept for compatibility) ──────────────
    socket.on(events.SPLIT, () => {
      const room = engine.findRoomByPlayer(socket.id)
      if (!room) return
      room.splitPlayer(socket.id)
    })

    // ── 5. Spit (standalone button, kept for compatibility) ───────────────
    socket.on(events.SPIT, () => {
      const room = engine.findRoomByPlayer(socket.id)
      if (!room) return
      room.spitPlayer(socket.id)
    })

    // ── 6. Leave game (voluntary) ─────────────────────────────────────────
    socket.on(events.LEAVE_GAME, () => {
      const room = engine.findRoomByPlayer(socket.id)
      if (!room) return

      console.log(`🚪 ${socket.id} left room "${room.id}"`)
      room.removePlayer(socket.id)
      room.broadcastPlayerLeft(socket.id)
    })

    // ── 7. Disconnect (involuntary) ───────────────────────────────────────
    socket.on('disconnect', reason => {
      console.log(`❌ ${socket.id} disconnected (${reason})`)

      const room = engine.findRoomByPlayer(socket.id)
      if (room) {
        room.removePlayer(socket.id)
        room.broadcastPlayerLeft(socket.id)
      }

      engine.removePlayer(socket.id)
    })

    // ── 8. Ping / latency measurement ─────────────────────────────────────
    socket.on('ping', () => {
      socket.emit('pong')
    })
  })
}

import React, { createContext, useContext, ReactNode, useEffect, useRef } from 'react'
import { useGameStore } from '@/stores/GameStore'
import {
  JOIN_GAME,
  START_GAME,
  LEAVE_GAME,
  PLAYER_INPUT,
  GAME_STATE,
  PLAYER_JOINED,
  PLAYER_LEFT,
  GAME_STARTED,
  GAME_ENDED,
  PLAYER_EATEN,
  KNIBBLE_SPAWNED,
  ERROR,
} from '@battle-circles/shared/events'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { io, Socket } from 'socket.io-client'
import {
  type SocketMessage,
  type GameState,
  ConnectionStatus,
  type JoinGameMessage,
  type PlayerInputMessage,
  type PlayerJoinedMessage,
  type PlayerLeftMessage,
  type GameStartedMessage,
  type GameEndedMessage,
  type PlayerEatenMessage,
  type KnibbleSpawnedMessage,
  type ErrorMessage,
  type PlayerInput,
} from '@/types'

// For MVP all players land in the same room — matches DEFAULT_ROOM_ID in socket.ts
const DEFAULT_ROOM_ID = 'global'

const DEFAULT_SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

const MAX_RECONNECT_ATTEMPTS = 5
const INITIAL_RECONNECT_DELAY = 1000
const PING_INTERVAL = 5000

interface SocketStore {
  // Connection State
  socket: Socket | null
  socketId: string | null
  isConnected: boolean
  connectionStatus: ConnectionStatus
  reconnectAttempts: number
  maxReconnectAttempts: number
  reconnectDelay: number
  lastPingTime: number
  latency: number
  /** ReturnType of setInterval for the ping loop — stored here instead of
   *  on socket.data to avoid a TypeScript error. */
  pingIntervalId: ReturnType<typeof setInterval> | null

  // Connection Actions
  connect: (serverUrl?: string) => void
  disconnect: () => void
  reconnect: () => void

  // Game Actions
  joinGame: (playerName: string) => void
  leaveGame: () => void
  startGame: () => void
  sendPlayerInput: (input: PlayerInput) => void
  sendSplit: () => void
  sendSpit: () => void
  sendMessage: (message: SocketMessage) => void

  // Event Handlers (each returns an unsubscribe function)
  onGameStateUpdate: (callback: (state: GameState) => void) => () => void
  onPlayerJoined: (callback: (data: PlayerJoinedMessage['data']) => void) => () => void
  onPlayerLeft: (callback: (data: PlayerLeftMessage['data']) => void) => () => void
  onGameStarted: (callback: (data: GameStartedMessage['data']) => void) => () => void
  onGameEnded: (callback: (data: GameEndedMessage['data']) => void) => () => void
  onPlayerEaten: (callback: (data: PlayerEatenMessage['data']) => void) => () => void
  onKnibbleSpawned: (callback: (data: KnibbleSpawnedMessage['data']) => void) => () => void
  onError: (callback: (data: ErrorMessage['data']) => void) => () => void

  // Internal Actions
  setConnectionStatus: (status: ConnectionStatus) => void
  updateLatency: (latency: number) => void
  incrementReconnectAttempts: () => void
  resetReconnectAttempts: () => void
  startPingMonitoring: () => void
  stopPingMonitoring: () => void
}

export const useSocketStore = create<SocketStore>()(
  subscribeWithSelector((set, get) => ({
    // ── Initial State ──────────────────────────────────────────────────────
    socket: null,
    socketId: null,
    isConnected: false,
    connectionStatus: ConnectionStatus.DISCONNECTED,
    reconnectAttempts: 0,
    maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectDelay: INITIAL_RECONNECT_DELAY,
    lastPingTime: 0,
    latency: 0,
    pingIntervalId: null,

    // ── Connection Actions ─────────────────────────────────────────────────

    connect: (serverUrl = DEFAULT_SERVER_URL) => {
      const { socket, isConnected } = get()

      if (socket && isConnected) {
        console.warn('Socket already connected')
        return
      }

      console.log('Connecting to server:', serverUrl)
      set({ connectionStatus: ConnectionStatus.CONNECTING })

      const newSocket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true,
        reconnection: false, // manual reconnection handled below
      })

      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id)
        set({
          socket: newSocket,
          socketId: newSocket.id ?? null,
          isConnected: true,
          connectionStatus: ConnectionStatus.CONNECTED,
        })
        get().resetReconnectAttempts()
        get().startPingMonitoring()
      })

      newSocket.on('disconnect', reason => {
        console.log('Socket disconnected:', reason)
        get().stopPingMonitoring()
        set({
          socketId: null,
          isConnected: false,
          connectionStatus: ConnectionStatus.DISCONNECTED,
        })

        // Reconnect unless the client intentionally disconnected
        if (reason !== 'io client disconnect') {
          setTimeout(() => get().reconnect(), get().reconnectDelay)
        }
      })

      newSocket.on('connect_error', error => {
        console.error('Socket connection error:', error)
        set({ connectionStatus: ConnectionStatus.ERROR })
        setTimeout(() => get().reconnect(), get().reconnectDelay)
      })

      // Pong handler for round-trip latency measurement
      newSocket.on('pong', () => {
        const latency = Date.now() - get().lastPingTime
        get().updateLatency(latency)
      })

      // Persist every game_state directly into GameStore the moment it
      // arrives — regardless of whether any component has mounted and
      // registered its own onGameStateUpdate listener yet.
      // This is the single source of truth for game state on the frontend.
      newSocket.on(GAME_STATE, (state: GameState) => {
        useGameStore.getState().setGameState(state)
      })

      set({ socket: newSocket })
    },

    disconnect: () => {
      get().stopPingMonitoring()
      const { socket } = get()
      if (socket) {
        socket.disconnect()
        set({
          socket: null,
          socketId: null,
          isConnected: false,
          connectionStatus: ConnectionStatus.DISCONNECTED,
        })
      }
    },

    reconnect: () => {
      const { reconnectAttempts, maxReconnectAttempts, socket } = get()

      if (reconnectAttempts >= maxReconnectAttempts) {
        console.error('Max reconnection attempts reached')
        set({ connectionStatus: ConnectionStatus.ERROR })
        return
      }

      console.log(`Reconnection attempt ${reconnectAttempts + 1}/${maxReconnectAttempts}`)
      set({ connectionStatus: ConnectionStatus.RECONNECTING })
      get().incrementReconnectAttempts()

      if (socket) {
        socket.removeAllListeners()
        socket.disconnect()
      }

      // Exponential backoff capped at 10 s
      const delay = Math.min(get().reconnectDelay * Math.pow(2, reconnectAttempts), 10_000)
      setTimeout(() => get().connect(), delay)
    },

    // ── Game Actions ───────────────────────────────────────────────────────

    joinGame: (playerName: string) => {
      const { socket, isConnected } = get()
      if (!socket || !isConnected) {
        console.error('Cannot join game: not connected to server')
        return
      }

      // Send roomId so the backend can route to the correct room.
      // For MVP this is always 'global'; matchmaking can change it later.
      const message: JoinGameMessage = {
        type: JOIN_GAME,
        data: { playerName },
        timestamp: Date.now(),
      }

      socket.emit(JOIN_GAME, { playerName: message.data.playerName, roomId: DEFAULT_ROOM_ID })
    },

    startGame: () => {
      const { socket, isConnected } = get()
      if (!socket || !isConnected) return
      socket.emit(START_GAME)
    },

    leaveGame: () => {
      const { socket, isConnected } = get()
      if (!socket || !isConnected) return
      socket.emit(LEAVE_GAME)
    },

    sendPlayerInput: (input: PlayerInput) => {
      const { socket, isConnected } = get()
      if (!socket || !isConnected) return

      const message: PlayerInputMessage = {
        type: PLAYER_INPUT,
        data: input,
        timestamp: Date.now(),
      }

      // Emit using the constant so it always matches the backend handler
      socket.emit(PLAYER_INPUT, message.data)
    },

    sendSplit: () => {
      const { socket, isConnected } = get()
      if (!socket || !isConnected) return
      socket.emit('split')
    },

    sendSpit: () => {
      const { socket, isConnected } = get()
      if (!socket || !isConnected) return
      socket.emit('spit')
    },

    sendMessage: (message: SocketMessage) => {
      const { socket, isConnected } = get()
      if (!socket || !isConnected) {
        console.error('Cannot send message: not connected to server')
        return
      }
      socket.emit(message.type, message.data)
    },

    // ── Event Handlers ─────────────────────────────────────────────────────

    onGameStateUpdate: (callback: (state: GameState) => void) => {
      const { socket } = get()
      if (!socket) return () => {}
      const handler = (data: GameState) => callback(data)
      socket.on(GAME_STATE, handler)
      return () => socket.off(GAME_STATE, handler)
    },

    onPlayerJoined: (callback: (data: PlayerJoinedMessage['data']) => void) => {
      const { socket } = get()
      if (!socket) return () => {}
      const handler = (data: PlayerJoinedMessage['data']) => callback(data)
      socket.on(PLAYER_JOINED, handler)
      return () => socket.off(PLAYER_JOINED, handler)
    },

    onPlayerLeft: (callback: (data: PlayerLeftMessage['data']) => void) => {
      const { socket } = get()
      if (!socket) return () => {}
      const handler = (data: PlayerLeftMessage['data']) => callback(data)
      socket.on(PLAYER_LEFT, handler)
      return () => socket.off(PLAYER_LEFT, handler)
    },

    onGameStarted: (callback: (data: GameStartedMessage['data']) => void) => {
      const { socket } = get()
      if (!socket) return () => {}
      const handler = (data: GameStartedMessage['data']) => callback(data)
      socket.on(GAME_STARTED, handler)
      return () => socket.off(GAME_STARTED, handler)
    },

    onGameEnded: (callback: (data: GameEndedMessage['data']) => void) => {
      const { socket } = get()
      if (!socket) return () => {}
      const handler = (data: GameEndedMessage['data']) => callback(data)
      socket.on(GAME_ENDED, handler)
      return () => socket.off(GAME_ENDED, handler)
    },

    onPlayerEaten: (callback: (data: PlayerEatenMessage['data']) => void) => {
      const { socket } = get()
      if (!socket) return () => {}
      const handler = (data: PlayerEatenMessage['data']) => callback(data)
      socket.on(PLAYER_EATEN, handler)
      return () => socket.off(PLAYER_EATEN, handler)
    },

    onKnibbleSpawned: (callback: (data: KnibbleSpawnedMessage['data']) => void) => {
      const { socket } = get()
      if (!socket) return () => {}
      const handler = (data: KnibbleSpawnedMessage['data']) => callback(data)
      socket.on(KNIBBLE_SPAWNED, handler)
      return () => socket.off(KNIBBLE_SPAWNED, handler)
    },

    onError: (callback: (data: ErrorMessage['data']) => void) => {
      const { socket } = get()
      if (!socket) return () => {}
      const handler = (data: ErrorMessage['data']) => callback(data)
      socket.on(ERROR, handler)
      return () => socket.off(ERROR, handler)
    },

    // ── Internal Actions ───────────────────────────────────────────────────

    setConnectionStatus: (status: ConnectionStatus) => {
      set({ connectionStatus: status })
    },

    updateLatency: (latency: number) => {
      set({ latency })
    },

    incrementReconnectAttempts: () => {
      set(state => ({ reconnectAttempts: state.reconnectAttempts + 1 }))
    },

    resetReconnectAttempts: () => {
      set({ reconnectAttempts: 0, reconnectDelay: INITIAL_RECONNECT_DELAY })
    },

    startPingMonitoring: () => {
      // Clear any existing interval before starting a new one
      get().stopPingMonitoring()

      const { socket } = get()
      if (!socket) return

      const id = setInterval(() => {
        if (!get().isConnected) {
          get().stopPingMonitoring()
          return
        }
        set({ lastPingTime: Date.now() })
        socket.emit('ping')
      }, PING_INTERVAL)

      set({ pingIntervalId: id })
    },

    stopPingMonitoring: () => {
      const { pingIntervalId } = get()
      if (pingIntervalId !== null) {
        clearInterval(pingIntervalId)
        set({ pingIntervalId: null })
      }
    },
  }))
)

// ── React Context (thin wrapper so components can access the store) ──────────

const SocketStoreContext = createContext<typeof useSocketStore | null>(null)

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <SocketStoreContext.Provider value={useSocketStore}>{children}</SocketStoreContext.Provider>
  )
}

export const useSocketContext = () => {
  const context = useContext(SocketStoreContext)
  if (!context) {
    throw new Error('useSocketContext must be used within a SocketProvider')
  }
  return context()
}

// ── Auto-connection hook ─────────────────────────────────────────────────────

export const useAutoConnect = (autoConnect = true) => {
  const connect = useSocketStore(state => state.connect)
  const disconnect = useSocketStore(state => state.disconnect)
  const isConnected = useSocketStore(state => state.isConnected)
  const hasTriedConnect = useRef(false)

  useEffect(() => {
    if (autoConnect && !isConnected && !hasTriedConnect.current) {
      hasTriedConnect.current = true
      connect()
    }

    return () => {
      if (hasTriedConnect.current) {
        disconnect()
      }
    }
  }, [autoConnect, isConnected, connect, disconnect])

  return { isConnected }
}

// ── Selectors ────────────────────────────────────────────────────────────────

export const socketSelectors = {
  isConnected: (state: ReturnType<typeof useSocketStore.getState>) => state.isConnected,
  connectionStatus: (state: ReturnType<typeof useSocketStore.getState>) => state.connectionStatus,
  latency: (state: ReturnType<typeof useSocketStore.getState>) => state.latency,
  reconnectAttempts: (state: ReturnType<typeof useSocketStore.getState>) => state.reconnectAttempts,
}

// ── Convenience hooks ────────────────────────────────────────────────────────

export const useIsConnected = () => useSocketStore(socketSelectors.isConnected)
export const useConnectionStatus = () => useSocketStore(socketSelectors.connectionStatus)
export const useLatency = () => useSocketStore(socketSelectors.latency)
export const useReconnectAttempts = () => useSocketStore(socketSelectors.reconnectAttempts)

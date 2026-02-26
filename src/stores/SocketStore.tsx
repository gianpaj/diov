import React, { createContext, useContext, ReactNode, useEffect, useRef } from 'react'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { io, Socket } from 'socket.io-client'
import {
  type SocketMessage,
  type GameState,
  Player,
  ConnectionStatus,
  type JoinGameMessage,
  type PlayerInputMessage,
  GameStateMessage,
  type PlayerJoinedMessage,
  type PlayerLeftMessage,
  type GameStartedMessage,
  type GameEndedMessage,
  type PlayerEatenMessage,
  type KnibbleSpawnedMessage,
  type ErrorMessage,
  type PlayerInput,
} from '@/types'

interface SocketStore {
  // Connection State
  socket: Socket | null
  isConnected: boolean
  connectionStatus: ConnectionStatus
  reconnectAttempts: number
  maxReconnectAttempts: number
  reconnectDelay: number
  lastPingTime: number
  latency: number

  // Connection Actions
  connect: (serverUrl?: string) => void
  disconnect: () => void
  reconnect: () => void

  // Game Actions
  joinGame: (playerName: string) => void
  leaveGame: () => void
  startGame: () => void
  sendPlayerInput: (input: PlayerInput) => void
  sendMessage: (message: SocketMessage) => void

  // Event Handlers
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
}

const DEFAULT_SERVER_URL = import.meta.env.VITE_SERVER_URL || 'ws://localhost:3001'
const MAX_RECONNECT_ATTEMPTS = 5
const INITIAL_RECONNECT_DELAY = 1000
const PING_INTERVAL = 5000

export const useSocketStore = create<SocketStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial State
    socket: null,
    isConnected: false,
    connectionStatus: ConnectionStatus.DISCONNECTED,
    reconnectAttempts: 0,
    maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectDelay: INITIAL_RECONNECT_DELAY,
    lastPingTime: 0,
    latency: 0,

    // Connection Actions
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
        reconnection: false, // We handle reconnection manually
      })

      // Connection event handlers
      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id)
        set({
          socket: newSocket,
          isConnected: true,
          connectionStatus: ConnectionStatus.CONNECTED,
        })
        get().resetReconnectAttempts()

        // Start ping monitoring
        get().startPingMonitoring()
      })

      newSocket.on('disconnect', reason => {
        console.log('Socket disconnected:', reason)
        set({
          isConnected: false,
          connectionStatus: ConnectionStatus.DISCONNECTED,
        })

        // Attempt reconnection if not manually disconnected
        if (reason !== 'io client disconnect') {
          setTimeout(() => get().reconnect(), get().reconnectDelay)
        }
      })

      newSocket.on('connect_error', error => {
        console.error('Socket connection error:', error)
        set({ connectionStatus: ConnectionStatus.ERROR })

        // Attempt reconnection
        setTimeout(() => get().reconnect(), get().reconnectDelay)
      })

      // Pong handler for latency measurement
      newSocket.on('pong', () => {
        const now = Date.now()
        const latency = now - get().lastPingTime
        get().updateLatency(latency)
      })

      set({ socket: newSocket })
    },

    disconnect: () => {
      const { socket } = get()
      if (socket) {
        socket.disconnect()
        set({
          socket: null,
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
      set({
        connectionStatus: ConnectionStatus.RECONNECTING,
      })
      get().incrementReconnectAttempts()

      // Clean up existing socket
      if (socket) {
        socket.removeAllListeners()
        socket.disconnect()
      }

      // Exponential backoff
      const delay = get().reconnectDelay * Math.pow(2, reconnectAttempts)
      setTimeout(
        () => {
          get().connect()
        },
        Math.min(delay, 10000)
      ) // Max 10 seconds delay
    },

    // Game Actions
    joinGame: (playerName: string) => {
      const { socket, isConnected } = get()
      if (!socket || !isConnected) {
        console.error('Cannot join game: not connected to server')
        return
      }

      const message: JoinGameMessage = {
        type: 'join_game',
        data: { playerName },
        timestamp: Date.now(),
      }

      socket.emit('join_game', message.data)
    },

    startGame: () => {
      const { socket, isConnected } = get()
      if (!socket || !isConnected) return

      socket.emit('start_game')
    },

    leaveGame: () => {
      const { socket, isConnected } = get()
      if (!socket || !isConnected) return

      socket.emit('leave_game')
    },

    sendPlayerInput: (input: PlayerInput) => {
      const { socket, isConnected } = get()
      if (!socket || !isConnected) return

      const message: PlayerInputMessage = {
        type: 'player_input',
        data: input,
        timestamp: Date.now(),
      }

      socket.emit('player_input', message.data)
    },

    sendMessage: (message: SocketMessage) => {
      const { socket, isConnected } = get()
      if (!socket || !isConnected) {
        console.error('Cannot send message: not connected to server')
        return
      }

      socket.emit(message.type, message.data)
    },

    // Event Handlers
    onGameStateUpdate: (callback: (state: GameState) => void) => {
      const { socket } = get()
      if (!socket) return () => {}

      const handler = (data: GameState) => callback(data)
      socket.on('game_state', handler)

      return () => socket.off('game_state', handler)
    },

    onPlayerJoined: (callback: (data: PlayerJoinedMessage['data']) => void) => {
      const { socket } = get()
      if (!socket) return () => {}

      const handler = (data: PlayerJoinedMessage['data']) => callback(data)
      socket.on('player_joined', handler)

      return () => socket.off('player_joined', handler)
    },

    onPlayerLeft: (callback: (data: PlayerLeftMessage['data']) => void) => {
      const { socket } = get()
      if (!socket) return () => {}

      const handler = (data: PlayerLeftMessage['data']) => callback(data)
      socket.on('player_left', handler)

      return () => socket.off('player_left', handler)
    },

    onGameStarted: (callback: (data: GameStartedMessage['data']) => void) => {
      const { socket } = get()
      if (!socket) return () => {}

      const handler = (data: GameStartedMessage['data']) => callback(data)
      socket.on('game_started', handler)

      return () => socket.off('game_started', handler)
    },

    onGameEnded: (callback: (data: GameEndedMessage['data']) => void) => {
      const { socket } = get()
      if (!socket) return () => {}

      const handler = (data: GameEndedMessage['data']) => callback(data)
      socket.on('game_ended', handler)

      return () => socket.off('game_ended', handler)
    },

    onPlayerEaten: (callback: (data: PlayerEatenMessage['data']) => void) => {
      const { socket } = get()
      if (!socket) return () => {}

      const handler = (data: PlayerEatenMessage['data']) => callback(data)
      socket.on('player_eaten', handler)

      return () => socket.off('player_eaten', handler)
    },

    onKnibbleSpawned: (callback: (data: KnibbleSpawnedMessage['data']) => void) => {
      const { socket } = get()
      if (!socket) return () => {}

      const handler = (data: KnibbleSpawnedMessage['data']) => callback(data)
      socket.on('knibble_spawned', handler)

      return () => socket.off('knibble_spawned', handler)
    },

    onError: (callback: (data: ErrorMessage['data']) => void) => {
      const { socket } = get()
      if (!socket) return () => {}

      const handler = (data: ErrorMessage['data']) => callback(data)
      socket.on('error', handler)

      return () => socket.off('error', handler)
    },

    // Internal Actions
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

    // Helper method for ping monitoring (not exposed in interface)
    startPingMonitoring: () => {
      const { socket } = get()
      if (!socket) return

      const pingInterval = setInterval(() => {
        if (!get().isConnected) {
          clearInterval(pingInterval)
          return
        }

        set({ lastPingTime: Date.now() })
        socket.emit('ping')
      }, PING_INTERVAL)

      // Store interval ID for cleanup
      socket.data = { pingInterval }
    },
  }))
)

// Context for providing the store
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

// Auto-connection hook
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

// Selectors for optimized subscriptions
export const socketSelectors = {
  isConnected: (state: ReturnType<typeof useSocketStore.getState>) => state.isConnected,
  connectionStatus: (state: ReturnType<typeof useSocketStore.getState>) => state.connectionStatus,
  latency: (state: ReturnType<typeof useSocketStore.getState>) => state.latency,
  reconnectAttempts: (state: ReturnType<typeof useSocketStore.getState>) => state.reconnectAttempts,
}

// Custom hooks for common operations
export const useIsConnected = () => useSocketStore(socketSelectors.isConnected)
export const useConnectionStatus = () => useSocketStore(socketSelectors.connectionStatus)
export const useLatency = () => useSocketStore(socketSelectors.latency)
export const useReconnectAttempts = () => useSocketStore(socketSelectors.reconnectAttempts)

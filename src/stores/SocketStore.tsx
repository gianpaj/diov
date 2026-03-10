import React, { createContext, useContext, type ReactNode, useEffect, useRef } from 'react'
import { create } from 'zustand'
import { useGameStore } from '@/stores/GameStore'
import {
  type ErrorMessage,
  type GameEndedMessage,
  type GameState,
  type GameStartedMessage,
  type KnibbleRowState,
  type KnibbleSpawnedMessage,
  type Player,
  type PlayerEatenMessage,
  type PlayerInput,
  type PlayerJoinedMessage,
  type PlayerLeftMessage,
  type PlayerRowState,
  type RoomState,
  type SocketMessage,
  type SpitBlobRowState,
  ConnectionStatus,
  GameStatus,
  type KnibbleState,
  COLORS,
} from '@/types'
import { DbConnection, type ErrorContext, type SubscriptionHandle } from '@/module_bindings'

const DEFAULT_ROOM_ID = 'global'
const DEFAULT_SPACETIMEDB_HOST = import.meta.env.VITE_SPACETIMEDB_HOST || 'ws://localhost:3000'
const DEFAULT_SPACETIMEDB_DB_NAME = import.meta.env.VITE_SPACETIMEDB_DB_NAME || 'battle-circles'

const MAX_RECONNECT_ATTEMPTS = 5
const INITIAL_RECONNECT_DELAY = 1000
const AUTH_TOKEN_KEY = 'spacetimedb_token'

const gameStateListeners = new Set<(state: GameState) => void>()
const playerJoinedListeners = new Set<(data: PlayerJoinedMessage['data']) => void>()
const playerLeftListeners = new Set<(data: PlayerLeftMessage['data']) => void>()
const gameStartedListeners = new Set<(data: GameStartedMessage['data']) => void>()
const gameEndedListeners = new Set<(data: GameEndedMessage['data']) => void>()
const playerEatenListeners = new Set<(data: PlayerEatenMessage['data']) => void>()
const knibbleSpawnedListeners = new Set<(data: KnibbleSpawnedMessage['data']) => void>()
const errorListeners = new Set<(data: ErrorMessage['data']) => void>()

const emitTo = <T,>(listeners: Set<(data: T) => void>, data: T) => {
  listeners.forEach(listener => listener(data))
}

const toMillis = (value?: bigint | null): number | undefined =>
  value === undefined || value === null ? undefined : Number(value)

const toRoomState = (row: any): RoomState => ({
  id: row.id,
  status: row.status as RoomState['status'],
  hostId: row.hostIdentity?.toHexString(),
  countdownEndsAt: toMillis(row.countdownEndsAt),
  startedAt: toMillis(row.startedAt),
  endedAt: toMillis(row.endedAt),
  durationMs: row.durationMs,
  maxPlayers: row.maxPlayers,
  minPlayers: row.minPlayers,
  winnerId: row.winnerIdentity?.toHexString(),
  lastUpdateAt: Number(row.lastUpdateAt),
  bounds: {
    x: row.boundsX,
    y: row.boundsY,
    width: row.boundsWidth,
    height: row.boundsHeight,
  },
})

const toPlayerRowState = (row: any): PlayerRowState => ({
  id: row.identity.toHexString(),
  roomId: row.roomId,
  name: row.name,
  position: { x: row.x, y: row.y },
  velocity: { x: row.velX, y: row.velY },
  input: { x: row.inputX, y: row.inputY },
  size: row.radius,
  color: row.color,
  score: row.score,
  isAlive: row.isAlive,
  lastSplitTime: Number(row.lastSplitAt),
  lastSpitTime: Number(row.lastSpitAt),
  joinedAt: Number(row.joinedAt),
})

const toKnibbleRowState = (row: any): KnibbleRowState => ({
  id: row.id.toString(),
  roomId: row.roomId,
  position: { x: row.x, y: row.y },
  size: row.size,
  color: row.color,
})

const toSpitBlobRowState = (row: any): SpitBlobRowState => ({
  id: row.id.toString(),
  roomId: row.roomId,
  playerId: row.ownerIdentity.toHexString(),
  position: { x: row.x, y: row.y },
  velocity: { x: row.velX, y: row.velY },
  size: row.size,
  color: COLORS.SPIT_BLOB,
  createdAt: Number(row.createdAt),
})

const toPlayerState = (row: any) => ({
  id: row.id,
  name: row.name,
  position: row.position,
  velocity: row.velocity,
  size: row.size,
  color: row.color,
  isAlive: row.isAlive,
  score: row.score,
  lastSplitTime: row.lastSplitTime,
  lastSpitTime: row.lastSpitTime,
})

const toKnibbleState = (row: KnibbleRowState): KnibbleState => ({
  id: row.id,
  position: row.position,
  size: row.size,
  color: row.color,
})

const buildGameStateFromAuthoritative = (
  room: RoomState | null,
  playerRows: Record<string, PlayerRowState>,
  knibbleRows: Record<string, KnibbleRowState>,
  spitBlobRows: Record<string, SpitBlobRowState>
): GameState | null => {
  if (!room) {
    return null
  }

  const players = Object.values(playerRows).reduce<Record<string, Player>>((acc, row) => {
    const player = toPlayerState(row)
    acc[player.id] = player
    return acc
  }, {})

  const knibbles = Object.values(knibbleRows).reduce<Record<string, KnibbleState>>((acc, row) => {
    const knibble = toKnibbleState(row)
    acc[knibble.id] = knibble
    return acc
  }, {})

  const spitBlobs = Object.values(spitBlobRows).reduce<Record<string, GameState['spitBlobs'][string]>>(
    (acc, row) => {
      acc[row.id] = {
        id: row.id,
        playerId: row.playerId,
        position: row.position,
        velocity: row.velocity,
        size: row.size,
        color: row.color,
        spawnTime: row.createdAt,
        despawnTime: row.createdAt + 20_000,
      }
      return acc
    },
    {}
  )

  const startTime = room.status === GameStatus.STARTING ? room.countdownEndsAt ?? 0 : room.startedAt ?? 0

  return {
    id: room.id,
    status: room.status,
    startTime,
    endTime: room.endedAt,
    duration: room.durationMs,
    maxPlayers: room.maxPlayers,
    minPlayers: room.minPlayers,
    hostId: room.hostId ?? '',
    winner: room.winnerId,
    lastUpdate: room.lastUpdateAt,
    players,
    knibbles,
    spitBlobs,
    bounds: room.bounds,
  }
}

interface SocketStore {
  connection: DbConnection | null
  subscription: SubscriptionHandle | null
  socketId: string | null
  isConnected: boolean
  connectionStatus: ConnectionStatus
  reconnectAttempts: number
  maxReconnectAttempts: number
  reconnectDelay: number
  lastPingTime: number
  latency: number
  activeRoomId: string

  connect: (serverUrl?: string) => void
  disconnect: () => void
  reconnect: () => void

  joinGame: (playerName: string) => void
  leaveGame: () => void
  startGame: () => void
  sendPlayerInput: (input: PlayerInput) => void
  sendSplit: () => void
  sendSpit: () => void
  sendMessage: (message: SocketMessage) => void

  onGameStateUpdate: (callback: (state: GameState) => void) => () => void
  onPlayerJoined: (callback: (data: PlayerJoinedMessage['data']) => void) => () => void
  onPlayerLeft: (callback: (data: PlayerLeftMessage['data']) => void) => () => void
  onGameStarted: (callback: (data: GameStartedMessage['data']) => void) => () => void
  onGameEnded: (callback: (data: GameEndedMessage['data']) => void) => () => void
  onPlayerEaten: (callback: (data: PlayerEatenMessage['data']) => void) => () => void
  onKnibbleSpawned: (callback: (data: KnibbleSpawnedMessage['data']) => void) => () => void
  onError: (callback: (data: ErrorMessage['data']) => void) => () => void

  setConnectionStatus: (status: ConnectionStatus) => void
  updateLatency: (latency: number) => void
  incrementReconnectAttempts: () => void
  resetReconnectAttempts: () => void
  startPingMonitoring: () => void
  stopPingMonitoring: () => void
}

export const useSocketStore = create<SocketStore>((set, get) => {
  const emitError = (message: string, code: ErrorMessage['data']['code'] = 'UNKNOWN') => {
    const payload = { message, code }
    emitTo(errorListeners, payload)
  }

  const syncAuthoritativeState = () => {
    const { connection, activeRoomId } = get()
    if (!connection) {
      return
    }

    const previous = useGameStore.getState().gameState
    const roomRow = [...connection.db.room.iter()].find((row: any) => row.id === activeRoomId)
    const room = roomRow ? toRoomState(roomRow) : null
    const playerRows = [...connection.db.player.iter()]
      .filter((row: any) => row.roomId === activeRoomId)
      .reduce<Record<string, PlayerRowState>>((acc, row: any) => {
        const player = toPlayerRowState(row)
        acc[player.id] = player
        return acc
      }, {})
    const knibbleRows = [...connection.db.knibble.iter()]
      .filter((row: any) => row.roomId === activeRoomId)
      .reduce<Record<string, KnibbleRowState>>((acc, row: any) => {
        const knibble = toKnibbleRowState(row)
        acc[knibble.id] = knibble
        return acc
      }, {})
    const spitBlobRows = [...connection.db.spitBlob.iter()]
      .filter((row: any) => row.roomId === activeRoomId)
      .reduce<Record<string, SpitBlobRowState>>((acc, row: any) => {
        const spitBlob = toSpitBlobRowState(row)
        acc[spitBlob.id] = spitBlob
        return acc
      }, {})

    useGameStore.getState().setAuthoritativeState({
      room,
      players: playerRows,
      knibbles: knibbleRows,
      spitBlobs: spitBlobRows,
    })

    const next = buildGameStateFromAuthoritative(room, playerRows, knibbleRows, spitBlobRows)
    if (!next || !room) {
      return
    }

    useGameStore.getState().setGameState(next)
    emitTo(gameStateListeners, next)

    if (previous) {
      const previousPlayerIds = new Set(Object.keys(previous.players))
      const nextPlayerIds = new Set(Object.keys(next.players))

      nextPlayerIds.forEach(id => {
        if (!previousPlayerIds.has(id)) {
          emitTo(playerJoinedListeners, {
            player: next.players[id],
            playerCount: nextPlayerIds.size,
          })
        }
      })

      previousPlayerIds.forEach(id => {
        if (!nextPlayerIds.has(id)) {
          emitTo(playerLeftListeners, {
            playerId: id,
            playerCount: nextPlayerIds.size,
            reason: previous.status === GameStatus.PLAYING ? 'eliminated' : 'left',
          })
        }
      })

      const previousKnibbles = new Set(Object.keys(previous.knibbles))
      Object.keys(next.knibbles).forEach(id => {
        if (!previousKnibbles.has(id)) {
          emitTo(knibbleSpawnedListeners, { knibble: next.knibbles[id] })
        }
      })
    }

    if (next.status === GameStatus.STARTING && previous?.status !== GameStatus.STARTING) {
      const countdown = Math.max(0, Math.ceil((next.startTime - Date.now()) / 1000))
      emitTo(gameStartedListeners, {
        gameState: next,
        countdown,
      })
    }

    if (next.status === GameStatus.FINISHED && previous?.status !== GameStatus.FINISHED) {
      emitTo(gameEndedListeners, {
        winner: next.winner ? next.players[next.winner] ?? null : null,
        finalState: next,
      })
    }
  }

  const installTableListeners = (connection: DbConnection) => {
    connection.db.room.onInsert(syncAuthoritativeState)
    connection.db.room.onUpdate(syncAuthoritativeState)
    connection.db.room.onDelete(syncAuthoritativeState)
    connection.db.player.onInsert(syncAuthoritativeState)
    connection.db.player.onUpdate((_ctx, oldPlayer: any, newPlayer: any) => {
      if (oldPlayer.isAlive && !newPlayer.isAlive) {
        emitTo(playerEatenListeners, {
          eaterId: '',
          victimId: newPlayer.identity.toHexString(),
        })
      }
      syncAuthoritativeState()
    })
    connection.db.player.onDelete(syncAuthoritativeState)
    connection.db.knibble.onInsert(syncAuthoritativeState)
    connection.db.knibble.onUpdate(syncAuthoritativeState)
    connection.db.knibble.onDelete(syncAuthoritativeState)
    connection.db.spitBlob.onInsert(syncAuthoritativeState)
    connection.db.spitBlob.onUpdate(syncAuthoritativeState)
    connection.db.spitBlob.onDelete(syncAuthoritativeState)
  }

  return {
    connection: null,
    subscription: null,
    socketId: null,
    isConnected: false,
    connectionStatus: ConnectionStatus.DISCONNECTED,
    reconnectAttempts: 0,
    maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectDelay: INITIAL_RECONNECT_DELAY,
    lastPingTime: 0,
    latency: 0,
    activeRoomId: DEFAULT_ROOM_ID,

    connect: (serverUrl = DEFAULT_SPACETIMEDB_HOST) => {
      const { connection, isConnected } = get()
      if (connection && isConnected) {
        return
      }

      set({ connectionStatus: ConnectionStatus.CONNECTING })

      const builder = DbConnection.builder()
        .withUri(serverUrl)
        .withDatabaseName(DEFAULT_SPACETIMEDB_DB_NAME)
        .withToken(localStorage.getItem(AUTH_TOKEN_KEY) || undefined)
        .onConnect((conn, identity, token) => {
          localStorage.setItem(AUTH_TOKEN_KEY, token)
          installTableListeners(conn)

          const subscription = conn
            .subscriptionBuilder()
            .onApplied(() => {
              syncAuthoritativeState()
            })
            .onError((ctx: ErrorContext) => {
              emitError(ctx.event?.message || 'Subscription failed')
            })
            .subscribe([
              'SELECT * FROM room',
              'SELECT * FROM player',
              'SELECT * FROM knibble',
              'SELECT * FROM spit_blob',
            ])

          set({
            connection: conn,
            subscription,
            socketId: identity.toHexString(),
            isConnected: true,
            connectionStatus: ConnectionStatus.CONNECTED,
          })

          useGameStore.getState().setLocalPlayerId(identity.toHexString())
          get().resetReconnectAttempts()
          syncAuthoritativeState()
        })
        .onDisconnect((_ctx, error) => {
          set({
            connection: null,
            subscription: null,
            socketId: null,
            isConnected: false,
            connectionStatus: ConnectionStatus.DISCONNECTED,
          })
          if (error) {
            emitError(error.message)
          }
        })
        .onConnectError((_ctx, error) => {
          set({ connectionStatus: ConnectionStatus.ERROR })
          emitError(error.message || 'Could not connect to SpacetimeDB')
        })

      const connectionHandle = builder.build()
      set({ connection: connectionHandle })
    },

    disconnect: () => {
      const { connection, subscription } = get()
      subscription?.unsubscribe()
      connection?.disconnect()
      set({
        connection: null,
        subscription: null,
        socketId: null,
        isConnected: false,
        connectionStatus: ConnectionStatus.DISCONNECTED,
      })
      useGameStore.getState().resetGame()
    },

    reconnect: () => {
      const { reconnectAttempts, maxReconnectAttempts } = get()
      if (reconnectAttempts >= maxReconnectAttempts) {
        set({ connectionStatus: ConnectionStatus.ERROR })
        return
      }

      set({ connectionStatus: ConnectionStatus.RECONNECTING })
      get().incrementReconnectAttempts()
      setTimeout(() => get().connect(), Math.min(INITIAL_RECONNECT_DELAY * 2 ** reconnectAttempts, 10_000))
    },

    joinGame: playerName => {
      const { connection, socketId, activeRoomId } = get()
      if (!connection || !socketId) {
        emitError('Cannot join game: not connected')
        return
      }

      set({ activeRoomId })
      void connection.reducers
        .joinGame({ roomId: activeRoomId, playerName })
        .then(() => {
          useGameStore.getState().setLocalPlayerId(socketId)
        })
        .catch(error => emitError(error.message || 'Failed to join game'))
    },

    leaveGame: () => {
      const { connection } = get()
      if (!connection) return
      void connection.reducers
        .leaveGame({})
        .catch(error => emitError(error.message || 'Failed to leave game'))
    },

    startGame: () => {
      const { connection } = get()
      if (!connection) return
      void connection.reducers
        .startGame({})
        .catch(error => emitError(error.message || 'Failed to start game'))
    },

    sendPlayerInput: input => {
      const { connection } = get()
      if (!connection) return

      void connection.reducers
        .setInput({ x: input.movement.x, y: input.movement.y })
        .catch(error => emitError(error.message || 'Failed to send input'))
    },

    sendSplit: () => {
      const { connection } = get()
      if (!connection) return
      void connection.reducers.split({}).catch(error => emitError(error.message || 'Failed to split'))
    },

    sendSpit: () => {
      const { connection } = get()
      if (!connection) return
      void connection.reducers.spit({}).catch(error => emitError(error.message || 'Failed to spit'))
    },

    sendMessage: message => {
      if (message.type === 'join_game') {
        get().joinGame(message.data.playerName)
        return
      }
      if (message.type === 'start_game') {
        get().startGame()
        return
      }
      if (message.type === 'leave_game') {
        get().leaveGame()
      }
    },

    onGameStateUpdate: callback => {
      gameStateListeners.add(callback)
      return () => gameStateListeners.delete(callback)
    },

    onPlayerJoined: callback => {
      playerJoinedListeners.add(callback)
      return () => playerJoinedListeners.delete(callback)
    },

    onPlayerLeft: callback => {
      playerLeftListeners.add(callback)
      return () => playerLeftListeners.delete(callback)
    },

    onGameStarted: callback => {
      gameStartedListeners.add(callback)
      return () => gameStartedListeners.delete(callback)
    },

    onGameEnded: callback => {
      gameEndedListeners.add(callback)
      return () => gameEndedListeners.delete(callback)
    },

    onPlayerEaten: callback => {
      playerEatenListeners.add(callback)
      return () => playerEatenListeners.delete(callback)
    },

    onKnibbleSpawned: callback => {
      knibbleSpawnedListeners.add(callback)
      return () => knibbleSpawnedListeners.delete(callback)
    },

    onError: callback => {
      errorListeners.add(callback)
      return () => errorListeners.delete(callback)
    },

    setConnectionStatus: status => set({ connectionStatus: status }),
    updateLatency: latency => set({ latency }),
    incrementReconnectAttempts: () =>
      set(state => ({ reconnectAttempts: state.reconnectAttempts + 1 })),
    resetReconnectAttempts: () =>
      set({ reconnectAttempts: 0, reconnectDelay: INITIAL_RECONNECT_DELAY }),
    startPingMonitoring: () => {},
    stopPingMonitoring: () => {},
  }
})

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

export const socketSelectors = {
  isConnected: (state: ReturnType<typeof useSocketStore.getState>) => state.isConnected,
  connectionStatus: (state: ReturnType<typeof useSocketStore.getState>) => state.connectionStatus,
  latency: (state: ReturnType<typeof useSocketStore.getState>) => state.latency,
  reconnectAttempts: (state: ReturnType<typeof useSocketStore.getState>) =>
    state.reconnectAttempts,
}

export const useIsConnected = () => useSocketStore(socketSelectors.isConnected)
export const useConnectionStatus = () => useSocketStore(socketSelectors.connectionStatus)
export const useLatency = () => useSocketStore(socketSelectors.latency)
export const useReconnectAttempts = () => useSocketStore(socketSelectors.reconnectAttempts)

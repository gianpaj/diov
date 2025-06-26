import React, { createContext, useContext, ReactNode } from 'react'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import {
  GameState,
  Player,
  GameStatus,
  PlayerInput,
  Vector2D,
  Camera,
  UIState,
  ConnectionStatus,
  GameConfig,
  GAME_CONSTANTS
} from '@/types'

interface GameStore {
  // Game State
  gameState: GameState | null
  localPlayer: Player | null
  localPlayerId: string | null
  playerInput: PlayerInput
  camera: Camera
  uiState: UIState
  gameConfig: GameConfig

  // Actions
  setGameState: (state: GameState) => void
  setLocalPlayer: (player: Player) => void
  setLocalPlayerId: (id: string) => void
  updatePlayerInput: (input: Partial<PlayerInput>) => void
  updateCamera: (camera: Partial<Camera>) => void
  updateUIState: (ui: Partial<UIState>) => void
  resetGame: () => void

  // Game Logic Helpers
  isGameActive: () => boolean
  getPlayerById: (id: string) => Player | null
  getPlayersInRange: (position: Vector2D, range: number) => Player[]
  canEatPlayer: (eater: Player, target: Player) => boolean

  // Input Helpers
  setMovementInput: (direction: Vector2D) => void
  setSplitPressed: (pressed: boolean) => void
  setSpitPressed: (pressed: boolean) => void
}

const defaultGameConfig: GameConfig = {
  maxPlayers: 12,
  minPlayers: 5,
  gameDuration: 5 * 60 * 1000, // 5 minutes
  mapShrinkRate: 0.1,
  knibbleSpawnInterval: { min: 5000, max: 10000 },
  knibbleSize: { min: 5, max: 15 },
  playerStartSize: 20,
  playerMaxSize: 200,
  playerMinSize: 10,
  splitCooldown: 3000,
  spitCooldown: 1000,
  spitBlobLifetime: 20000,
  splitPiecesRange: { min: 4, max: 10 },
  sizeSpeedMultiplier: 0.5,
  attractionDistance: 30,
  attractionForce: 0.1,
}

const defaultUIState: UIState = {
  showHUD: true,
  showMenu: false,
  showWaitingRoom: false,
  showGameOver: false,
  isConnected: false,
  isJoined: false,
  playerName: '',
  connectionStatus: ConnectionStatus.DISCONNECTED,
}

const defaultCamera: Camera = {
  position: { x: 0, y: 0 },
  zoom: 1,
  target: undefined,
  smoothing: GAME_CONSTANTS.CAMERA_SMOOTH_FACTOR,
}

const defaultPlayerInput: PlayerInput = {
  movement: { x: 0, y: 0 },
  splitPressed: false,
  spitPressed: false,
}

export const useGameStore = create<GameStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial State
    gameState: null,
    localPlayer: null,
    localPlayerId: null,
    playerInput: defaultPlayerInput,
    camera: defaultCamera,
    uiState: defaultUIState,
    gameConfig: defaultGameConfig,

    // Actions
    setGameState: (state: GameState) => {
      set({ gameState: state })

      // Update local player if it exists in the new state
      const { localPlayerId } = get()
      if (localPlayerId && state.players[localPlayerId]) {
        set({ localPlayer: state.players[localPlayerId] })
      }
    },

    setLocalPlayer: (player: Player) => {
      set({ localPlayer: player, localPlayerId: player.id })
    },

    setLocalPlayerId: (id: string) => {
      set({ localPlayerId: id })

      // Update local player if game state exists
      const { gameState } = get()
      if (gameState && gameState.players[id]) {
        set({ localPlayer: gameState.players[id] })
      }
    },

    updatePlayerInput: (input: Partial<PlayerInput>) => {
      set(state => ({
        playerInput: { ...state.playerInput, ...input }
      }))
    },

    updateCamera: (cameraUpdate: Partial<Camera>) => {
      set(state => ({
        camera: { ...state.camera, ...cameraUpdate }
      }))
    },

    updateUIState: (uiUpdate: Partial<UIState>) => {
      set(state => ({
        uiState: { ...state.uiState, ...uiUpdate }
      }))
    },

    resetGame: () => {
      set({
        gameState: null,
        localPlayer: null,
        localPlayerId: null,
        playerInput: defaultPlayerInput,
        camera: defaultCamera,
        uiState: { ...defaultUIState },
      })
    },

    // Game Logic Helpers
    isGameActive: () => {
      const { gameState } = get()
      return gameState?.status === GameStatus.PLAYING
    },

    getPlayerById: (id: string) => {
      const { gameState } = get()
      return gameState?.players[id] || null
    },

    getPlayersInRange: (position: Vector2D, range: number) => {
      const { gameState } = get()
      if (!gameState) return []

      return Object.values(gameState.players).filter(player => {
        if (!player.isAlive) return false

        const dx = player.position.x - position.x
        const dy = player.position.y - position.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        return distance <= range
      })
    },

    canEatPlayer: (eater: Player, target: Player) => {
      if (!eater.isAlive || !target.isAlive) return false
      if (eater.id === target.id) return false

      // Can only eat if significantly larger
      return eater.size > target.size * 1.1
    },

    // Input Helpers
    setMovementInput: (direction: Vector2D) => {
      set(state => ({
        playerInput: {
          ...state.playerInput,
          movement: direction
        }
      }))
    },

    setSplitPressed: (pressed: boolean) => {
      set(state => ({
        playerInput: {
          ...state.playerInput,
          splitPressed: pressed
        }
      }))
    },

    setSpitPressed: (pressed: boolean) => {
      set(state => ({
        playerInput: {
          ...state.playerInput,
          spitPressed: pressed
        }
      }))
    },
  }))
)

// Context for providing the store
const GameStoreContext = createContext<typeof useGameStore | null>(null)

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <GameStoreContext.Provider value={useGameStore}>
      {children}
    </GameStoreContext.Provider>
  )
}

export const useGameContext = () => {
  const context = useContext(GameStoreContext)
  if (!context) {
    throw new Error('useGameContext must be used within a GameProvider')
  }
  return context()
}

// Selectors for optimized subscriptions
export const gameSelectors = {
  gameState: (state: ReturnType<typeof useGameStore.getState>) => state.gameState,
  localPlayer: (state: ReturnType<typeof useGameStore.getState>) => state.localPlayer,
  playerInput: (state: ReturnType<typeof useGameStore.getState>) => state.playerInput,
  camera: (state: ReturnType<typeof useGameStore.getState>) => state.camera,
  uiState: (state: ReturnType<typeof useGameStore.getState>) => state.uiState,
  isGameActive: (state: ReturnType<typeof useGameStore.getState>) =>
    state.gameState?.status === GameStatus.PLAYING,
  playerCount: (state: ReturnType<typeof useGameStore.getState>) =>
    state.gameState ? Object.keys(state.gameState.players).length : 0,
  timeRemaining: (state: ReturnType<typeof useGameStore.getState>) => {
    if (!state.gameState || state.gameState.status !== GameStatus.PLAYING) return 0
    const elapsed = Date.now() - state.gameState.startTime
    return Math.max(0, state.gameConfig.gameDuration - elapsed)
  },
}

// Custom hooks for common operations
export const useLocalPlayer = () => useGameStore(gameSelectors.localPlayer)
export const useGameState = () => useGameStore(gameSelectors.gameState)
export const usePlayerInput = () => useGameStore(gameSelectors.playerInput)
export const useCamera = () => useGameStore(gameSelectors.camera)
export const useUIState = () => useGameStore(gameSelectors.uiState)
export const useIsGameActive = () => useGameStore(gameSelectors.isGameActive)
export const usePlayerCount = () => useGameStore(gameSelectors.playerCount)
export const useTimeRemaining = () => useGameStore(gameSelectors.timeRemaining)

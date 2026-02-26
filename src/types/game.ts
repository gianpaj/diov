// Core game types and interfaces

export interface Vector2D {
  x: number
  y: number
}

export interface GameBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface PlayerInput {
  movement: Vector2D
  splitPressed: boolean
  spitPressed: boolean
}

export interface Player {
  id: string
  name: string
  position: Vector2D
  velocity: Vector2D
  size: number
  color: string
  isAlive: boolean
  score: number
  splitPieces?: PlayerPiece[]
  lastSplitTime: number
  lastSpitTime: number
}

export interface PlayerPiece {
  id: string
  parentId: string
  position: Vector2D
  velocity: Vector2D
  size: number
  attractionForce: Vector2D
}

export interface Knibble {
  id: string
  position: Vector2D
  size: number
  color: string
  spawnTime: number
  value: number
}

export interface SpitBlob {
  id: string
  playerId: string
  position: Vector2D
  velocity: Vector2D
  size: number
  color: string
  spawnTime: number
  despawnTime: number
}

export interface GameState {
  id: string
  status: GameStatus
  players: Record<string, Player>
  knibbles: Record<string, Knibble>
  spitBlobs: Record<string, SpitBlob>
  bounds: GameBounds
  startTime: number
  endTime?: number
  duration: number
  maxPlayers: number
  minPlayers: number
  winner?: string
  hostId?: string
  lastUpdate: number
}

export enum GameStatus {
  WAITING = 'waiting',
  STARTING = 'starting',
  PLAYING = 'playing',
  ENDING = 'ending',
  FINISHED = 'finished',
}

export interface GameConfig {
  maxPlayers: number
  minPlayers: number
  gameDuration: number // in milliseconds
  mapShrinkRate: number
  knibbleSpawnInterval: { min: number; max: number }
  knibbleSize: { min: number; max: number }
  playerStartSize: number
  playerMaxSize: number
  playerMinSize: number
  splitCooldown: number
  spitCooldown: number
  spitBlobLifetime: number
  splitPiecesRange: { min: number; max: number }
  sizeSpeedMultiplier: number
  attractionDistance: number
  attractionForce: number
}

export interface GameStats {
  playerId: string
  rank: number
  finalSize: number
  knibblesEaten: number
  playersEaten: number
  timeAlive: number
  maxSize: number
  splitCount: number
  spitCount: number
}

// Socket message types
export interface SocketMessage {
  type: string
  data: any
  timestamp: number
}

export interface JoinGameMessage extends SocketMessage {
  type: 'join_game'
  data: {
    playerName: string
  }
}

export interface PlayerInputMessage extends SocketMessage {
  type: 'player_input'
  data: PlayerInput
}

export interface GameStateMessage extends SocketMessage {
  type: 'game_state'
  data: GameState
}

export interface PlayerJoinedMessage extends SocketMessage {
  type: 'player_joined'
  data: {
    player: Player
    playerCount: number
  }
}

export interface PlayerLeftMessage extends SocketMessage {
  type: 'player_left'
  data: {
    playerId: string
    playerCount: number
  }
}

export interface GameStartedMessage extends SocketMessage {
  type: 'game_started'
  data: {
    gameState: GameState
    countdown: number
  }
}

export interface GameEndedMessage extends SocketMessage {
  type: 'game_ended'
  data: {
    winner: Player
    stats: GameStats[]
    finalState: GameState
  }
}

export interface PlayerEatenMessage extends SocketMessage {
  type: 'player_eaten'
  data: {
    eaterId: string
    victimId: string
  }
}

export interface KnibbleSpawnedMessage extends SocketMessage {
  type: 'knibble_spawned'
  data: {
    knibble: Knibble
  }
}

export interface ErrorMessage extends SocketMessage {
  type: 'error'
  data: {
    message: string
    code?: string
  }
}

// UI state types
export interface UIState {
  showHUD: boolean
  showMenu: boolean
  showWaitingRoom: boolean
  showGameOver: boolean
  isConnected: boolean
  isJoined: boolean
  playerName: string
  connectionStatus: ConnectionStatus
}

export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

// Camera and viewport types
export interface Camera {
  position: Vector2D
  zoom: number
  target?: Vector2D
  smoothing: number
}

export interface Viewport {
  width: number
  height: number
  center: Vector2D
  bounds: GameBounds
}

// Input types
export interface TouchData {
  id: number
  position: Vector2D
  startPosition: Vector2D
  startTime: number
}

export interface JoystickState {
  center: Vector2D
  knobPosition: Vector2D
  isActive: boolean
  direction: Vector2D
  magnitude: number
}

// Animation and visual effects types
export interface ParticleEffect {
  id: string
  type: EffectType
  position: Vector2D
  velocity: Vector2D
  size: number
  color: string
  lifetime: number
  startTime: number
}

export enum EffectType {
  EAT = 'eat',
  SPLIT = 'split',
  SPIT = 'spit',
  DEATH = 'death',
  SPAWN = 'spawn',
}

// Audio types
export interface SoundEffect {
  id: string
  src: string
  volume: number
  loop: boolean
}

export interface AudioState {
  masterVolume: number
  sfxVolume: number
  musicVolume: number
  isMuted: boolean
}

// Game constants
export const GAME_CONSTANTS = {
  CANVAS_WIDTH: 1920,
  CANVAS_HEIGHT: 1080,
  MAX_FPS: 60,
  NETWORK_UPDATE_RATE: 20, // Hz
  INTERPOLATION_DELAY: 100, // ms
  PREDICTION_TIME: 50, // ms
  MAX_EXTRAPOLATION_TIME: 200, // ms
  JOYSTICK_DEAD_ZONE: 0.1,
  JOYSTICK_MAX_DISTANCE: 50,
  BUTTON_COOLDOWN: 100, // ms
  CAMERA_SMOOTH_FACTOR: 0.1,
  COLLISION_DETECTION_GRID_SIZE: 100,
  MAX_PARTICLES: 100,
  PARTICLE_LIFETIME: 2000, // ms
} as const

// Color constants
export const COLORS = {
  PLAYER_COLORS: [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#96CEB4', // Green
    '#FFEAA7', // Yellow
    '#DDA0DD', // Plum
    '#98D8C8', // Mint
    '#F7DC6F', // Light Yellow
    '#BB8FCE', // Light Purple
    '#85C1E9', // Light Blue
    '#F8C471', // Light Orange
    '#82E0AA', // Light Green
  ],
  KNIBBLE_COLORS: [
    '#FFD93D', // Gold
    '#6BCF7F', // Green
    '#4D96FF', // Blue
    '#FF6B9D', // Pink
    '#C44569', // Dark Pink
  ],
  SPIT_BLOB: '#4A90E2',
  BACKGROUND: '#0F0F23',
  BOUNDARY: '#FF4757',
  UI_PRIMARY: '#667EEA',
  UI_SECONDARY: '#764BA2',
} as const

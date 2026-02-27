/**
 * src/types/game.ts
 *
 * Frontend type definitions.
 *
 * Wire-format types (anything that crosses the socket) come from the
 * auto-generated file `src/types/generated.ts`.  Do NOT redefine them here —
 * if the wire format needs to change, edit `packages/shared/src/schema.ts`
 * and run codegen.
 *
 * This file is the right place for:
 *   - Frontend-only types (Camera, Viewport, UI state, input, particles, audio)
 *   - Aliases / re-exports so existing imports continue to work
 *   - Runtime constants that belong only on the client (GAME_CONSTANTS, COLORS)
 */

// ── Wire-format types (generated) ─────────────────────────────────────────
//
// Re-exported so that code importing from '@/types' or '@/types/game' does not
// need to know about the generated file.

export type {
  PlayerId,
  RoomId,
  Vector2D,
  Boundary,
  RoomStatusValue,
  PlayerState,
  KnibbleState,
  SpitBlobState,
  GameState,
  RoomConfig,
  PlayerInput,
  JoinGamePayload,
  PlayerJoinedPayload,
  PlayerLeftPayload,
  GameStartedPayload,
  GameEndedPayload,
  GameStats,
  PlayerEatenPayload,
  KnibbleSpawnedPayload,
  ErrorPayload,
  GameStatusValue,
} from './generated'

// Re-export the RoomStatus and GameStatus const objects so that
// `RoomStatus.WAITING`, `GameStatus.PLAYING` etc. work as runtime values.
export { RoomStatus, GameStatus } from './generated'

// ── Frontend Player type ───────────────────────────────────────────────────
//
// The frontend `Player` type extends `PlayerState` with client-side-only
// fields (split pieces, attraction force) that are never sent over the wire.
// Use `PlayerState` when handling socket payloads; use `Player` when working
// with local game-loop / rendering state.

import type { PlayerState, Vector2D as Vec2D } from './generated'

export interface PlayerPiece {
  id: string
  parentId: string
  position: Vec2D
  velocity: Vec2D
  size: number
  attractionForce: Vec2D
}

export interface Player extends PlayerState {
  /** Client-side split fragments — not part of the wire format. */
  splitPieces?: PlayerPiece[]
}

// ── Frontend Knibble / SpitBlob extensions ─────────────────────────────────
//
// The wire types (`KnibbleState`, `SpitBlobState`) contain all the fields the
// renderer needs.  These aliases exist so that code using the old names
// (`Knibble`, `SpitBlob`) continues to compile during the migration.

export type { KnibbleState as Knibble } from './generated'
export type { SpitBlobState as SpitBlob } from './generated'

// ── GameBounds alias ──────────────────────────────────────────────────────
// Old name was `GameBounds`; canonical name is now `Boundary`.
export type { Boundary as GameBounds } from './generated'

// ── PlayerInput alias ─────────────────────────────────────────────────────
// The wire type is `PlayerInput`; code that used the old `PlayerInput` from
// this file already matches — no alias needed, it's exported above.

// ── UI state types ────────────────────────────────────────────────────────

export enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

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

// ── Camera and viewport types ─────────────────────────────────────────────

export interface Camera {
  position: Vec2D
  zoom: number
  target?: Vec2D
  smoothing: number
}

export interface Viewport {
  width: number
  height: number
  center: Vec2D
  bounds: import('./generated').Boundary
}

// ── Input types ───────────────────────────────────────────────────────────

export interface TouchData {
  id: number
  position: Vec2D
  startPosition: Vec2D
  startTime: number
}

export interface JoystickState {
  center: Vec2D
  knobPosition: Vec2D
  isActive: boolean
  direction: Vec2D
  magnitude: number
}

// ── Animation and visual effects ──────────────────────────────────────────

export interface ParticleEffect {
  id: string
  type: EffectType
  position: Vec2D
  velocity: Vec2D
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

// ── Audio types ───────────────────────────────────────────────────────────

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

// ── Socket message envelope types ─────────────────────────────────────────
//
// These are frontend-only wrapper types used inside SocketStore.tsx to type
// the `data` field of each received event.  They are NOT sent over the wire
// (only the `data` payload is).

import type {
  GameState,
  PlayerJoinedPayload,
  PlayerLeftPayload,
  GameStartedPayload,
  GameEndedPayload,
  PlayerEatenPayload,
  KnibbleSpawnedPayload,
  ErrorPayload,
} from './generated'

export interface SocketMessage {
  type: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
  timestamp: number
}

export interface GameStateMessage extends SocketMessage {
  type: 'game_state'
  data: GameState
}

export interface PlayerJoinedMessage extends SocketMessage {
  type: 'player_joined'
  data: PlayerJoinedPayload
}

export interface PlayerLeftMessage extends SocketMessage {
  type: 'player_left'
  data: PlayerLeftPayload
}

export interface GameStartedMessage extends SocketMessage {
  type: 'game_started'
  data: GameStartedPayload
}

export interface GameEndedMessage extends SocketMessage {
  type: 'game_ended'
  data: GameEndedPayload
}

export interface PlayerEatenMessage extends SocketMessage {
  type: 'player_eaten'
  data: PlayerEatenPayload
}

export interface KnibbleSpawnedMessage extends SocketMessage {
  type: 'knibble_spawned'
  data: KnibbleSpawnedPayload
}

export interface ErrorMessage extends SocketMessage {
  type: 'error'
  data: ErrorPayload
}

// Legacy message types kept for backward compat during migration
export interface JoinGameMessage extends SocketMessage {
  type: 'join_game'
  data: {
    playerName: string
  }
}

export interface PlayerInputMessage extends SocketMessage {
  type: 'player_input'
  data: import('./generated').PlayerInput
}

// ── Game configuration (frontend-only) ────────────────────────────────────
//
// This is local game configuration used by the UI (default values, tuning
// constants).  It is NOT the same as `RoomConfig` which is the wire-format
// room config returned by the server.

export interface GameConfig {
  maxPlayers: number
  minPlayers: number
  gameDuration: number // ms
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

// ── Game constants ────────────────────────────────────────────────────────

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

// ── Color constants ───────────────────────────────────────────────────────

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

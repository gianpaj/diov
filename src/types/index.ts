// Main type definitions export file

// ── Wire-format types from generated file ──────────────────────────────────
// These are the canonical types shared with the backend.
// Do NOT add wire types here — edit packages/shared/src/schema.ts instead.

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

// Re-export const objects as values (not type-only) so that
// `GameStatus.PLAYING`, `RoomStatus.WAITING` etc. work at runtime.
export { GameStatus, RoomStatus } from './generated'

// ── Frontend-only types from game.ts ──────────────────────────────────────
export { ConnectionStatus, EffectType } from './game'

export type {
  // Aliases kept for backward compat
  Boundary as GameBounds,
  KnibbleState as Knibble,
  SpitBlobState as SpitBlob,

  // Frontend-only extensions
  Player,
  PlayerPiece,

  // UI / input / rendering
  UIState,
  Camera,
  Viewport,
  TouchData,
  JoystickState,
  ParticleEffect,
  AudioState,
  SoundEffect,
  GameConfig,

  // Socket message envelope types (frontend-only wrappers)
  SocketMessage,
  PlayerInputMessage,
  JoinGameMessage,
  GameStateMessage,
  PlayerJoinedMessage,
  PlayerLeftMessage,
  GameStartedMessage,
  GameEndedMessage,
  PlayerEatenMessage,
  KnibbleSpawnedMessage,
  ErrorMessage,
} from './game'

// ── Runtime constants ──────────────────────────────────────────────────────
export { GAME_CONSTANTS, COLORS } from './game'

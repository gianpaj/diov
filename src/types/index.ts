// Main type definitions export file
export * from './game'

// Re-export commonly used types for convenience
export { GameStatus, ConnectionStatus, EffectType } from './game'
export type {
  Vector2D,
  Player,
  GameState,
  PlayerInput,
  Knibble,
  SpitBlob,
  GameBounds,
  UIState,
  Camera,
  Viewport,
  JoystickState,
  TouchData,
  ParticleEffect,
  AudioState,
  SoundEffect,
  GameConfig,
  GameStats,
  SocketMessage,
  PlayerJoinedMessage,
  PlayerLeftMessage,
  GameStartedMessage,
  GameEndedMessage,
  PlayerEatenMessage,
  KnibbleSpawnedMessage,
  ErrorMessage,
} from './game'

// Export constants
export { GAME_CONSTANTS, COLORS } from './game'

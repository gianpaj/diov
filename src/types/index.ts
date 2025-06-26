// Main type definitions export file
export * from './game'

// Re-export commonly used types for convenience
export type {
  Vector2D,
  Player,
  GameState,
  GameStatus,
  PlayerInput,
  Knibble,
  SpitBlob,
  GameBounds,
  UIState,
  ConnectionStatus,
  Camera,
  Viewport,
  JoystickState,
  TouchData,
  ParticleEffect,
  EffectType,
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
  ErrorMessage
} from './game'

// Export constants
export { GAME_CONSTANTS, COLORS } from './game'

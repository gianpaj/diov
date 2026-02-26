export type PlayerId = string
export type RoomId = string

// Shared state that the client renders
export interface PlayerState {
  id: PlayerId
  x: number // world coordinates (pixels)
  y: number
  radius: number // size
  color: string // hex or rgb
  velocityX?: number
  velocityY?: number
}

export interface KnibbleState {
  id: string
  x: number
  y: number
  radius: number
}

export interface Boundary {
  left: number // px
  top: number
  right: number
  bottom: number
}

export const RoomStatus = {
  WAITING: 'waiting',
  STARTING: 'starting',
  PLAYING: 'playing',
}

export interface GameState {
  timestamp: number // ms since epoch
  status: typeof RoomStatus // PLAYING, STARTING, …
  startTime?: number
  hostId?: string
  players: PlayerState[]
  knibbles: KnibbleState[]
  boundary: Boundary
}

export interface RoomConfig {
  id: RoomId
  maxPlayers: number // 5-12
  tickRate: number // ms per update, e.g. 50ms
}

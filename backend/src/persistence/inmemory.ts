// src/persistence/inmemory.ts
import type { GameRoom } from '../game/room'

export interface InMemoryDB {
  /** Map of roomId → GameRoom instance */
  rooms: Map<string, GameRoom>
}

export const db: InMemoryDB = {
  rooms: new Map(),
}

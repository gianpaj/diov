// src/persistence/autoSave.ts

import fs from 'node:fs/promises'
import { GameRoom } from '../game/room'
import { db, type InMemoryDB } from './inmemory'

const FILE = 'battle-circles-state.json'

export async function loadFromDisk() {
  try {
    const data = await fs.readFile(FILE, 'utf8')
    const parsed: Partial<InMemoryDB> = JSON.parse(data)
    if (parsed.rooms) {
      // Re‑hydrate the Map
      const map = new Map<string, GameRoom>()
      for (const [id, room] of Object.entries(parsed.rooms)) {
        // `room` is a plain object – we need to re‑instantiate the class
        map.set(id, GameRoom.fromPlain(room as any))
      }
      db.rooms = map
    }
  } catch (e) {
    console.log('No previous state found – starting fresh.')
  }
}

export async function saveToDisk() {
  const plain: any = { rooms: {} }
  for (const [id, room] of db.rooms.entries()) {
    plain.rooms[id] = room.toPlain() // GameRoom serialises itself
  }
  await fs.writeFile(FILE, JSON.stringify(plain), 'utf8')
}

// Auto‑save every 30 s
setInterval(() => {
  saveToDisk().catch(err => console.error('Auto‑save failed', err))
}, 30_000)

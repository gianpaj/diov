import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'
import test from 'node:test'
import { encodeCanonicalActionV1, type PolicyObservationV1 } from '@battle-circles/agent-sdk'
import { PolicyBridgeClient } from '../src/bridge/PolicyBridgeClient.ts'
import { encodeLengthPrefixedFrame, tryDecodeLengthPrefixedFrame } from '../src/bridge/frame.ts'

const observation: PolicyObservationV1 = {
  header: { version: 1, tickId: 5, timestampMs: 1774182000000 },
  self: {
    playerId: 'self',
    roomId: 'guest-global',
    position: { x: 200, y: 100 },
    velocity: { x: 0, y: 0 },
    radius: 25,
    score: 50,
    isAlive: true,
    canSplit: true,
    canSpit: true,
  },
  room: {
    status: 'playing',
    bounds: { x: 0, y: 0, width: 2000, height: 2000 },
    timeRemainingMs: 1000,
    playerCount: 1,
  },
  visiblePlayers: [],
  visibleFood: [],
  visibleProjectiles: [],
  leaderboard: [],
  recentResults: [],
}

test('PolicyBridgeClient exchanges one request/response over a unix socket', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'battle-circles-bridge-'))
  const socketPath = path.join(tempDir, 'policy.sock')
  const server = net.createServer(socket => {
    let inbound = new Uint8Array(0)
    socket.on('data', chunk => {
      const chunkBytes = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk)
      const merged = new Uint8Array(inbound.byteLength + chunkBytes.byteLength)
      merged.set(inbound, 0)
      merged.set(chunkBytes, inbound.byteLength)
      inbound = merged

      const decoded = tryDecodeLengthPrefixedFrame(inbound)
      if (!decoded) {
        return
      }

      socket.write(
        encodeLengthPrefixedFrame(
          encodeCanonicalActionV1({
            move: { x: 1, y: 0 },
            ability: 'none',
          })
        )
      )
      socket.end()
    })
  })

  await new Promise<void>((resolve, reject) => {
    server.listen(socketPath, () => resolve())
    server.once('error', reject)
  })

  try {
    const client = new PolicyBridgeClient(socketPath)
    const action = await client.requestAction(observation)
    assert.deepEqual(action, {
      move: { x: 1, y: 0 },
      ability: 'none',
    })
  } finally {
    server.close()
    await rm(tempDir, { recursive: true, force: true })
  }
})

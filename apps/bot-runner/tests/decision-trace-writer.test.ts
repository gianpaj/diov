import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import type { DecisionTraceRecordV1 } from '@battle-circles/agent-sdk'
import { DecisionTraceWriter } from '../src/runtime/DecisionTraceWriter.ts'

const record: DecisionTraceRecordV1 = {
  version: 1,
  policyName: 'benchmark',
  recordedAtMs: 1774186000000,
  viewportBounds: { x: 0, y: 0, width: 800, height: 600 },
  policyObservation: {
    header: { version: 1, tickId: 10, timestampMs: 1774186000000 },
    self: {
      playerId: 'self',
      roomId: 'guest-global',
      position: { x: 100, y: 120 },
      velocity: { x: 0, y: 0 },
      radius: 16,
      score: 40,
      isAlive: true,
      canSplit: true,
      canSpit: false,
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
  },
  privilegedDiagnostics: {
    header: { version: 1, tickId: 10, timestampMs: 1774186000000 },
    room: {
      status: 'playing',
      bounds: { x: 0, y: 0, width: 2000, height: 2000 },
      timeRemainingMs: 1000,
      playerCount: 1,
    },
    allPlayers: [],
    allFood: [],
    allProjectiles: [],
    fullLeaderboard: [],
    fullResults: [],
  },
  action: {
    move: { x: 0, y: -1 },
    ability: 'none',
  },
}

test('DecisionTraceWriter appends newline-delimited JSON records', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'battle-circles-trace-'))
  const tracePath = path.join(tempDir, 'bot-trace.jsonl')
  const writer = new DecisionTraceWriter(tracePath)

  try {
    await writer.write(record)
    await writer.close()

    const contents = await readFile(tracePath, 'utf8')
    const lines = contents.trim().split('\n')
    assert.equal(lines.length, 1)
    assert.deepEqual(JSON.parse(lines[0] ?? '{}'), record)
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
})

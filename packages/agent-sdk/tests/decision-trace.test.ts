import assert from 'node:assert/strict'
import test from 'node:test'
import { validateDecisionTraceRecordV1 } from '../src/index.ts'
import type { DecisionTraceRecordV1 } from '../src/schema.ts'

const record: DecisionTraceRecordV1 = {
  version: 1,
  policyName: 'lobby-fill',
  recordedAtMs: 1774185000000,
  viewportBounds: { x: 0, y: 0, width: 800, height: 600 },
  policyObservation: {
    header: { version: 1, tickId: 9, timestampMs: 1774185000000 },
    self: {
      playerId: 'self',
      roomId: 'guest-global',
      position: { x: 400, y: 300 },
      velocity: { x: 0, y: 0 },
      radius: 20,
      score: 100,
      isAlive: true,
      canSplit: true,
      canSpit: true,
    },
    room: {
      status: 'playing',
      bounds: { x: 0, y: 0, width: 2000, height: 2000 },
      timeRemainingMs: 10000,
      playerCount: 1,
    },
    visiblePlayers: [],
    visibleFood: [],
    visibleProjectiles: [],
    leaderboard: [],
    recentResults: [],
  },
  privilegedDiagnostics: {
    header: { version: 1, tickId: 9, timestampMs: 1774185000000 },
    room: {
      status: 'playing',
      bounds: { x: 0, y: 0, width: 2000, height: 2000 },
      timeRemainingMs: 10000,
      playerCount: 1,
    },
    allPlayers: [],
    allFood: [],
    allProjectiles: [],
    fullLeaderboard: [],
    fullResults: [],
  },
  action: {
    move: { x: 1, y: 0 },
    ability: 'none',
  },
}

test('decision trace records validate against the shared schema', () => {
  const parsed = validateDecisionTraceRecordV1(record)
  assert.equal(parsed.success, true)
  assert.deepEqual(parsed.data, record)
})

import assert from 'node:assert/strict'
import test from 'node:test'
import type { DecisionTraceRecordV1 } from '@battle-circles/agent-sdk'
import { BenchmarkPolicy } from '../src/policies/BenchmarkPolicy.ts'
import { replayDecisionTrace, summarizeReplayComparison } from '../src/replay/replayDecisionTrace.ts'

const makeRecord = (tickId: number): DecisionTraceRecordV1 => ({
  version: 1,
  policyName: 'benchmark',
  recordedAtMs: 1774188000000 + tickId,
  viewportBounds: { x: 0, y: 0, width: 800, height: 600 },
  policyObservation: {
    header: { version: 1, tickId, timestampMs: 1774188000000 + tickId },
    self: {
      playerId: 'self',
      roomId: 'guest-global',
      position: { x: 400, y: 300 },
      velocity: { x: 0, y: 0 },
      radius: 30,
      score: 120,
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
    header: { version: 1, tickId, timestampMs: 1774188000000 + tickId },
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
    move: tickId < 20 ? { x: 1, y: 0 } : { x: 0, y: 1 },
    ability: 'none',
  },
})

test('replayDecisionTrace reproduces benchmark-policy actions from recorded traces', async () => {
  const records = [makeRecord(0), makeRecord(25)]
  const comparisons = await replayDecisionTrace(records, new BenchmarkPolicy())
  const summary = summarizeReplayComparison(comparisons)

  assert.equal(summary.total, 2)
  assert.equal(summary.mismatched, 0)
  assert.ok(comparisons.every(comparison => comparison.matches))
})

test('replayDecisionTrace reports mismatches when recorded actions drift', async () => {
  const record = makeRecord(0)
  record.action = {
    move: { x: -1, y: 0 },
    ability: 'none',
  }

  const comparisons = await replayDecisionTrace([record], new BenchmarkPolicy())
  const summary = summarizeReplayComparison(comparisons)

  assert.equal(summary.mismatched, 1)
  assert.equal(comparisons[0]?.matches, false)
})

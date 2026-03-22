import assert from 'node:assert/strict'
import test from 'node:test'
import { parseDecisionTraceJsonl } from '../src/replay/DecisionTraceReader.ts'

const makeTraceLine = (tickId: number, score: number) =>
  JSON.stringify({
    version: 1,
    policyName: 'benchmark',
    recordedAtMs: 1774187000000 + tickId,
    viewportBounds: { x: 0, y: 0, width: 800, height: 600 },
    policyObservation: {
      header: { version: 1, tickId, timestampMs: 1774187000000 + tickId },
      self: {
        playerId: 'self',
        roomId: 'guest-global',
        position: { x: 100, y: 100 },
        velocity: { x: 0, y: 0 },
        radius: 20,
        score,
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
      header: { version: 1, tickId, timestampMs: 1774187000000 + tickId },
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
  })

test('parseDecisionTraceJsonl reads newline-delimited decision trace records', () => {
  const contents = `${makeTraceLine(1, 50)}\n${makeTraceLine(2, 55)}\n`
  const records = parseDecisionTraceJsonl(contents)

  assert.equal(records.length, 2)
  assert.equal(records[0]?.policyObservation.header.tickId, 1)
  assert.equal(records[1]?.policyObservation.self.score, 55)
})

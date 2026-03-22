import assert from 'node:assert/strict'
import test from 'node:test'
import type { PolicyObservationV1 } from '@battle-circles/agent-sdk'
import { BenchmarkPolicy } from '../src/policies/BenchmarkPolicy.ts'

const makeObservation = (): PolicyObservationV1 => ({
  header: {
    version: 1,
    tickId: 40,
    timestampMs: 1774181000000,
  },
  self: {
    playerId: 'self',
    roomId: 'guest-global',
    position: { x: 400, y: 300 },
    velocity: { x: 0, y: 0 },
    radius: 30,
    score: 200,
    isAlive: true,
    canSplit: true,
    canSpit: true,
  },
  room: {
    status: 'playing',
    bounds: { x: 0, y: 0, width: 2000, height: 2000 },
    timeRemainingMs: 100000,
    playerCount: 1,
  },
  visiblePlayers: [],
  visibleFood: [],
  visibleProjectiles: [],
  leaderboard: [],
  recentResults: [],
})

test('BenchmarkPolicy picks the lexicographically first visible food target', () => {
  const policy = new BenchmarkPolicy()
  const observation = makeObservation()
  observation.visibleFood = [
    { id: 'food-b', position: { x: 450, y: 300 }, size: 8 },
    { id: 'food-a', position: { x: 400, y: 350 }, size: 8 },
  ]

  const action = policy.decide({
    policyObservation: observation,
    viewportBounds: { x: 0, y: 0, width: 800, height: 600 },
  })
  assert.equal(action.ability, 'none')
  assert.equal(action.move.x, 0)
  assert.equal(action.move.y, 1)
})

test('BenchmarkPolicy falls back to a deterministic movement pattern', () => {
  const policy = new BenchmarkPolicy()
  const observation = makeObservation()

  const action = policy.decide({
    policyObservation: observation,
    viewportBounds: { x: 0, y: 0, width: 800, height: 600 },
  })
  assert.deepEqual(action, {
    move: { x: -1, y: 0 },
    ability: 'none',
  })
})

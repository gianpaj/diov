import assert from 'node:assert/strict'
import test from 'node:test'
import { packPolicyObservationV1 } from '../src/packing/packed-frame.ts'
import type { PolicyObservationV1 } from '../src/schema.ts'

const observation: PolicyObservationV1 = {
  header: { version: 1, tickId: 3, timestampMs: 1774183000000 },
  self: {
    playerId: 'self',
    roomId: 'guest-global',
    position: { x: 400, y: 300 },
    velocity: { x: 1, y: -1 },
    radius: 20,
    score: 50,
    isAlive: true,
    canSplit: true,
    canSpit: false,
  },
  room: {
    status: 'playing',
    bounds: { x: 0, y: 0, width: 2000, height: 2000 },
    timeRemainingMs: 1000,
    playerCount: 2,
  },
  visiblePlayers: [
    {
      id: 'self',
      position: { x: 400, y: 300 },
      velocity: { x: 1, y: -1 },
      radius: 20,
      score: 50,
      isAlive: true,
      relation: 'self',
    },
    {
      id: 'other',
      position: { x: 800, y: 600 },
      velocity: { x: 0, y: 0 },
      radius: 40,
      score: 120,
      isAlive: true,
      relation: 'larger',
    },
  ],
  visibleFood: [{ id: 'food-1', position: { x: 600, y: 450 }, size: 8 }],
  visibleProjectiles: [],
  leaderboard: [{ id: 'other', score: 120, rank: 1 }],
  recentResults: [],
}

test('packPolicyObservationV1 produces fixed-size arrays', () => {
  const packed = packPolicyObservationV1(
    observation,
    { x: 0, y: 0, width: 1000, height: 1000 },
    { players: 4, food: 3, projectiles: 2, leaderboard: 2 }
  )

  assert.equal(packed.players.length, 4)
  assert.equal(packed.food.length, 3)
  assert.equal(packed.projectiles.length, 2)
  assert.equal(packed.leaderboard.length, 2)
  assert.equal(packed.players[2]?.active, 0)
  assert.equal(packed.food[1]?.active, 0)
})

test('packPolicyObservationV1 normalizes coordinates into the viewport bounds', () => {
  const packed = packPolicyObservationV1(
    observation,
    { x: 0, y: 0, width: 1000, height: 1000 },
    { players: 2, food: 1, projectiles: 1, leaderboard: 1 }
  )

  assert.equal(packed.self.x, 0.4)
  assert.equal(packed.self.y, 0.3)
  assert.equal(packed.players[1]?.x, 0.8)
  assert.equal(packed.players[1]?.y, 0.6)
})

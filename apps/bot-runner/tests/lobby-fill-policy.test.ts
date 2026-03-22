import assert from 'node:assert/strict'
import test from 'node:test'
import type { PolicyObservationV1 } from '@battle-circles/agent-sdk'
import { LobbyFillPolicy } from '../src/policies/LobbyFillPolicy.ts'

const baseObservation = (): PolicyObservationV1 => ({
  header: {
    version: 1,
    tickId: 1,
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
    playerCount: 2,
  },
  visiblePlayers: [],
  visibleFood: [],
  visibleProjectiles: [],
  leaderboard: [],
  recentResults: [],
})

test('LobbyFillPolicy steers away from a larger visible threat', () => {
  const policy = new LobbyFillPolicy()
  const observation = baseObservation()
  observation.visiblePlayers = [
    {
      id: 'larger',
      position: { x: 450, y: 300 },
      velocity: { x: 0, y: 0 },
      radius: 45,
      score: 400,
      isAlive: true,
      relation: 'larger',
    },
  ]

  const action = policy.decide(observation)
  assert.equal(action.ability, 'none')
  assert.ok(action.move.x < 0)
})

test('LobbyFillPolicy steers toward food when no threat is visible', () => {
  const policy = new LobbyFillPolicy()
  const observation = baseObservation()
  observation.visibleFood = [
    {
      id: 'food-1',
      position: { x: 430, y: 330 },
      size: 8,
    },
  ]

  const action = policy.decide(observation)
  assert.equal(action.ability, 'none')
  assert.ok(action.move.x > 0)
  assert.ok(action.move.y > 0)
})

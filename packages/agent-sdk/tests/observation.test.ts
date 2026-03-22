import assert from 'node:assert/strict'
import test from 'node:test'
import { buildObservationArtifacts } from '../src/observation.ts'

test('buildObservationArtifacts filters off-screen entities from the policy observation', () => {
  const { policyObservation, privilegedDiagnostics } = buildObservationArtifacts(
    {
      tickId: 10,
      timestampMs: 1774180001000,
      selfId: 'self',
      room: {
        id: 'guest-global',
        status: 'playing',
        bounds: { x: 0, y: 0, width: 2000, height: 2000 },
        timeRemainingMs: 120000,
        playerCount: 3,
      },
      players: [
        {
          id: 'self',
          roomId: 'guest-global',
          position: { x: 400, y: 300 },
          velocity: { x: 0, y: 0 },
          radius: 30,
          score: 200,
          isAlive: true,
          canSplit: true,
          canSpit: true,
        },
        {
          id: 'visible-smaller',
          roomId: 'guest-global',
          position: { x: 500, y: 320 },
          velocity: { x: 0.5, y: 0 },
          radius: 16,
          score: 90,
          isAlive: true,
          canSplit: true,
          canSpit: true,
        },
        {
          id: 'hidden-larger',
          roomId: 'guest-global',
          position: { x: 1600, y: 1600 },
          velocity: { x: 0, y: 0 },
          radius: 48,
          score: 450,
          isAlive: true,
          canSplit: true,
          canSpit: true,
        },
      ],
      food: [
        { id: 'food-visible', roomId: 'guest-global', position: { x: 410, y: 280 }, size: 7 },
        { id: 'food-hidden', roomId: 'guest-global', position: { x: 1700, y: 1700 }, size: 7 },
      ],
      projectiles: [
        {
          id: 'spit-visible',
          roomId: 'guest-global',
          position: { x: 420, y: 310 },
          velocity: { x: 2, y: 0 },
          size: 6,
          ownerId: 'visible-smaller',
        },
      ],
      results: [{ playerId: 'self', placement: 2, finalScore: 300 }],
    },
    {
      cameraPosition: { x: 400, y: 300 },
      dimensions: { width: 800, height: 600 },
      leaderboardLimit: 5,
      resultsLimit: 5,
    }
  )

  assert.deepEqual(
    policyObservation.visiblePlayers.map(player => player.id),
    ['self', 'visible-smaller']
  )
  assert.deepEqual(
    policyObservation.visibleFood.map(food => food.id),
    ['food-visible']
  )
  assert.deepEqual(
    policyObservation.visibleProjectiles.map(projectile => projectile.id),
    ['spit-visible']
  )

  assert.deepEqual(
    privilegedDiagnostics.allPlayers.map(player => player.id),
    ['self', 'visible-smaller', 'hidden-larger']
  )
})

test('buildObservationArtifacts produces deterministic leaderboard ranking', () => {
  const { policyObservation } = buildObservationArtifacts(
    {
      tickId: 11,
      timestampMs: 1774180002000,
      selfId: 'self',
      room: {
        id: 'guest-global',
        status: 'playing',
        bounds: { x: 0, y: 0, width: 2000, height: 2000 },
        timeRemainingMs: 120000,
        playerCount: 3,
      },
      players: [
        {
          id: 'self',
          roomId: 'guest-global',
          position: { x: 400, y: 300 },
          velocity: { x: 0, y: 0 },
          radius: 20,
          score: 100,
          isAlive: true,
          canSplit: true,
          canSpit: false,
        },
        {
          id: 'alpha',
          roomId: 'guest-global',
          position: { x: 405, y: 305 },
          velocity: { x: 0, y: 0 },
          radius: 30,
          score: 300,
          isAlive: true,
          canSplit: true,
          canSpit: false,
        },
        {
          id: 'beta',
          roomId: 'guest-global',
          position: { x: 410, y: 310 },
          velocity: { x: 0, y: 0 },
          radius: 28,
          score: 300,
          isAlive: true,
          canSplit: true,
          canSpit: false,
        },
      ],
      food: [],
      projectiles: [],
      results: [],
    },
    {
      cameraPosition: { x: 400, y: 300 },
      dimensions: { width: 800, height: 600 },
    }
  )

  assert.deepEqual(policyObservation.leaderboard, [
    { id: 'alpha', score: 300, rank: 1 },
    { id: 'beta', score: 300, rank: 2 },
    { id: 'self', score: 100, rank: 3 },
  ])
})

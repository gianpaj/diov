import assert from 'node:assert/strict'
import test from 'node:test'
import type { CanonicalActionV1, PolicyBridgeRequestV1, PolicyObservationV1 } from '@battle-circles/agent-sdk'
import { BridgePolicy } from '../src/policies/BridgePolicy.ts'

const observation: PolicyObservationV1 = {
  header: {
    version: 1,
    tickId: 6,
    timestampMs: 1774184000000,
  },
  self: {
    playerId: 'self',
    roomId: 'guest-global',
    position: { x: 200, y: 150 },
    velocity: { x: 0, y: 0 },
    radius: 22,
    score: 80,
    isAlive: true,
    canSplit: true,
    canSpit: true,
  },
  room: {
    status: 'playing',
    bounds: { x: 0, y: 0, width: 2000, height: 2000 },
    timeRemainingMs: 5000,
    playerCount: 2,
  },
  visiblePlayers: [],
  visibleFood: [{ id: 'food-a', position: { x: 250, y: 150 }, size: 8 }],
  visibleProjectiles: [],
  leaderboard: [],
  recentResults: [],
}

class FakePolicyBridgeClient {
  request: PolicyBridgeRequestV1 | null = null

  async requestAction(request: PolicyBridgeRequestV1): Promise<CanonicalActionV1> {
    this.request = request
    return {
      move: { x: 1, y: 0 },
      ability: 'none',
    }
  }
}

test('BridgePolicy sends the structured observation when configured for structured mode', async () => {
  const client = new FakePolicyBridgeClient()
  const policy = new BridgePolicy(client as any, 'structured')

  const action = await policy.decide({
    policyObservation: observation,
    viewportBounds: { x: 0, y: 0, width: 400, height: 300 },
  })

  assert.deepEqual(action, {
    move: { x: 1, y: 0 },
    ability: 'none',
  })
  assert.deepEqual(client.request, {
    version: 1,
    format: 'policy_observation_v1',
    observation,
  })
})

test('BridgePolicy packs the observation when configured for packed mode', async () => {
  const client = new FakePolicyBridgeClient()
  const policy = new BridgePolicy(client as any, 'packed')

  await policy.decide({
    policyObservation: observation,
    viewportBounds: { x: 0, y: 0, width: 400, height: 300 },
  })

  assert.equal(client.request?.format, 'packed_policy_observation_v1')
  if (!client.request || client.request.format !== 'packed_policy_observation_v1') {
    throw new Error('expected packed policy bridge request')
  }

  assert.equal(client.request.observation.self.x, 0.5)
  assert.equal(client.request.observation.self.y, 0.5)
  assert.equal(client.request.observation.food[0]?.active, 1)
})

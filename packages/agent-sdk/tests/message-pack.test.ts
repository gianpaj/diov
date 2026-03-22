import assert from 'node:assert/strict'
import test from 'node:test'
import {
  decodeCanonicalActionV1,
  decodePolicyBridgeRequestV1,
  decodePolicyObservationV1,
  decodePrivilegedDiagnosticsV1,
  encodeCanonicalActionV1,
  encodePolicyBridgeRequestV1,
  encodePolicyObservationV1,
  encodePrivilegedDiagnosticsV1,
  packPolicyObservationV1,
} from '../src/index.ts'
import type {
  CanonicalActionV1,
  PolicyBridgeRequestV1,
  PolicyObservationV1,
  PrivilegedDiagnosticsV1,
} from '../src/schema.ts'

const policyObservation: PolicyObservationV1 = {
  header: { version: 1, tickId: 7, timestampMs: 1774181000000 },
  self: {
    playerId: 'self',
    roomId: 'guest-global',
    position: { x: 400, y: 300 },
    velocity: { x: 1, y: 0 },
    radius: 25,
    score: 120,
    isAlive: true,
    canSplit: true,
    canSpit: false,
  },
  room: {
    status: 'playing',
    bounds: { x: 0, y: 0, width: 2000, height: 2000 },
    timeRemainingMs: 120000,
    playerCount: 4,
  },
  visiblePlayers: [],
  visibleFood: [{ id: 'food-1', position: { x: 420, y: 310 }, size: 8 }],
  visibleProjectiles: [],
  leaderboard: [{ id: 'self', score: 120, rank: 1 }],
  recentResults: [],
}

const canonicalAction: CanonicalActionV1 = {
  move: { x: 0.5, y: -0.25 },
  ability: 'spit',
}

const privilegedDiagnostics: PrivilegedDiagnosticsV1 = {
  header: policyObservation.header,
  room: policyObservation.room,
  allPlayers: policyObservation.visiblePlayers,
  allFood: policyObservation.visibleFood,
  allProjectiles: policyObservation.visibleProjectiles,
  fullLeaderboard: policyObservation.leaderboard,
  fullResults: policyObservation.recentResults,
}

const bridgeRequest: PolicyBridgeRequestV1 = {
  version: 1,
  format: 'packed_policy_observation_v1',
  observation: packPolicyObservationV1(policyObservation, {
    x: 0,
    y: 0,
    width: 1000,
    height: 1000,
  }),
}

test('policy observation round-trips through MessagePack', () => {
  const decoded = decodePolicyObservationV1(encodePolicyObservationV1(policyObservation))
  assert.deepEqual(decoded, policyObservation)
})

test('canonical action round-trips through MessagePack', () => {
  const decoded = decodeCanonicalActionV1(encodeCanonicalActionV1(canonicalAction))
  assert.deepEqual(decoded, canonicalAction)
})

test('privileged diagnostics round-trips through MessagePack', () => {
  const decoded = decodePrivilegedDiagnosticsV1(
    encodePrivilegedDiagnosticsV1(privilegedDiagnostics)
  )
  assert.deepEqual(decoded, privilegedDiagnostics)
})

test('policy bridge request round-trips through MessagePack', () => {
  const decoded = decodePolicyBridgeRequestV1(encodePolicyBridgeRequestV1(bridgeRequest))
  assert.deepEqual(decoded, bridgeRequest)
})

import type {
  CanonicalActionV1,
  PolicyObservationV1,
  VisibleFoodV1,
  VisiblePlayerV1,
} from '@battle-circles/agent-sdk'
import type { BotDecisionInput } from '../runtime/BotClient.ts'

const normalize = (x: number, y: number) => {
  const magnitude = Math.sqrt(x * x + y * y)
  if (magnitude === 0) {
    return { x: 0, y: 0 }
  }
  return { x: x / magnitude, y: y / magnitude }
}

const distanceSquared = (
  left: PolicyObservationV1['self']['position'],
  right: PolicyObservationV1['self']['position']
) => {
  const dx = left.x - right.x
  const dy = left.y - right.y
  return dx * dx + dy * dy
}

const nearestByDistance = <T extends { position: PolicyObservationV1['self']['position'] }>(
  selfPosition: PolicyObservationV1['self']['position'],
  entries: T[]
): T | null => {
  if (entries.length === 0) {
    return null
  }

  return (
    [...entries].sort(
      (left, right) =>
        distanceSquared(selfPosition, left.position) - distanceSquared(selfPosition, right.position)
    )[0] ?? null
  )
}

const steerTowards = (
  selfPosition: PolicyObservationV1['self']['position'],
  targetPosition: PolicyObservationV1['self']['position']
): CanonicalActionV1 => ({
  move: normalize(targetPosition.x - selfPosition.x, targetPosition.y - selfPosition.y),
  ability: 'none',
})

const steerAway = (
  selfPosition: PolicyObservationV1['self']['position'],
  threatPosition: PolicyObservationV1['self']['position']
): CanonicalActionV1 => ({
  move: normalize(selfPosition.x - threatPosition.x, selfPosition.y - threatPosition.y),
  ability: 'none',
})

const isThreat = (selfRadius: number, player: VisiblePlayerV1) =>
  player.relation === 'larger' && player.radius >= selfRadius * 1.1

const isTarget = (selfRadius: number, player: VisiblePlayerV1) =>
  player.relation === 'smaller' && player.radius <= selfRadius * 0.85

export class LobbyFillPolicy {
  decide({ policyObservation: observation }: BotDecisionInput): CanonicalActionV1 {
    const { self } = observation
    const otherPlayers = observation.visiblePlayers.filter(
      player => player.id !== self.playerId && player.isAlive
    )
    const nearbyThreat = nearestByDistance(
      self.position,
      otherPlayers.filter(player => isThreat(self.radius, player))
    )

    if (nearbyThreat) {
      return steerAway(self.position, nearbyThreat.position)
    }

    const nearbyTarget = nearestByDistance(
      self.position,
      otherPlayers.filter(player => isTarget(self.radius, player))
    )

    if (nearbyTarget) {
      return steerTowards(self.position, nearbyTarget.position)
    }

    const nearestFood = nearestByDistance(self.position, observation.visibleFood as VisibleFoodV1[])
    if (nearestFood) {
      return steerTowards(self.position, nearestFood.position)
    }

    return {
      move: { x: 0, y: 0 },
      ability: 'none',
    }
  }
}

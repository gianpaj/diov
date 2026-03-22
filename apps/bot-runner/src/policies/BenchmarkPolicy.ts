import type { CanonicalActionV1, PolicyObservationV1 } from '@battle-circles/agent-sdk'

const normalize = (x: number, y: number) => {
  const magnitude = Math.sqrt(x * x + y * y)
  if (magnitude === 0) {
    return { x: 0, y: 0 }
  }
  return { x: x / magnitude, y: y / magnitude }
}

const fallbackPattern = (tickId: number): CanonicalActionV1['move'] => {
  const phase = Math.floor(tickId / 20) % 4
  switch (phase) {
    case 0:
      return { x: 1, y: 0 }
    case 1:
      return { x: 0, y: 1 }
    case 2:
      return { x: -1, y: 0 }
    default:
      return { x: 0, y: -1 }
  }
}

export class BenchmarkPolicy {
  decide(observation: PolicyObservationV1): CanonicalActionV1 {
    const target = [...observation.visibleFood].sort((left, right) => left.id.localeCompare(right.id))[0]

    if (target) {
      return {
        move: normalize(
          target.position.x - observation.self.position.x,
          target.position.y - observation.self.position.y
        ),
        ability: 'none',
      }
    }

    return {
      move: fallbackPattern(observation.header.tickId),
      ability: 'none',
    }
  }
}

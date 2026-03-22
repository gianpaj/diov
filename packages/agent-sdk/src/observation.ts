import type {
  LeaderboardEntryV1,
  PolicyObservationV1,
  PrivilegedDiagnosticsV1,
  RecentResultEntryV1,
  Vector2D,
  VisibleFoodV1,
  VisiblePlayerV1,
  VisibleProjectileV1,
} from './schema.ts'
import { filterVisibleEntities, getViewportBounds, type ViewportDimensions } from './visibility.ts'

export interface ObservationSourceRoom {
  id: string
  status: PolicyObservationV1['room']['status']
  bounds: PolicyObservationV1['room']['bounds']
  timeRemainingMs: number
  playerCount: number
}

export interface ObservationSourcePlayer {
  id: string
  roomId: string
  position: Vector2D
  velocity: Vector2D
  radius: number
  score: number
  isAlive: boolean
  canSplit: boolean
  canSpit: boolean
}

export interface ObservationSourceFood {
  id: string
  roomId: string
  position: Vector2D
  size: number
}

export interface ObservationSourceProjectile {
  id: string
  roomId: string
  position: Vector2D
  velocity: Vector2D
  size: number
  ownerId: string
}

export interface ObservationSourceResult {
  playerId: string
  placement: number
  finalScore: number
}

export interface ObservationSourceSnapshot {
  tickId: number
  timestampMs: number
  room: ObservationSourceRoom
  selfId: string
  players: ObservationSourcePlayer[]
  food: ObservationSourceFood[]
  projectiles: ObservationSourceProjectile[]
  results?: ObservationSourceResult[]
}

export interface BuildObservationOptions {
  cameraPosition: Vector2D
  dimensions: ViewportDimensions
  leaderboardLimit?: number
  resultsLimit?: number
}

export interface BuiltObservationArtifacts {
  viewportBounds: PolicyObservationV1['room']['bounds']
  policyObservation: PolicyObservationV1
  privilegedDiagnostics: PrivilegedDiagnosticsV1
}

const toRelation = (
  playerId: string,
  self: ObservationSourcePlayer,
  other: ObservationSourcePlayer
): VisiblePlayerV1['relation'] => {
  if (playerId === other.id) {
    return 'self'
  }
  if (other.radius < self.radius) {
    return 'smaller'
  }
  if (other.radius > self.radius) {
    return 'larger'
  }
  return 'unknown'
}

const distanceSquared = (left: Vector2D, right: Vector2D) => {
  const dx = left.x - right.x
  const dy = left.y - right.y
  return dx * dx + dy * dy
}

const sortByDistanceThenId = <T extends { id: string; position: Vector2D }>(
  entries: T[],
  origin: Vector2D
) =>
  [...entries].sort((left, right) => {
    const distanceDelta =
      distanceSquared(left.position, origin) - distanceSquared(right.position, origin)
    if (distanceDelta !== 0) {
      return distanceDelta
    }
    return left.id.localeCompare(right.id)
  })

const buildLeaderboard = (
  players: ObservationSourcePlayer[],
  limit: number
): LeaderboardEntryV1[] =>
  [...players]
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score
      }
      return left.id.localeCompare(right.id)
    })
    .slice(0, limit)
    .map((player, index) => ({
      id: player.id,
      score: player.score,
      rank: index + 1,
    }))

const buildResults = (results: ObservationSourceResult[], limit: number): RecentResultEntryV1[] =>
  [...results]
    .sort((left, right) => {
      if (left.placement !== right.placement) {
        return left.placement - right.placement
      }
      return left.playerId.localeCompare(right.playerId)
    })
    .slice(0, limit)
    .map(result => ({
      playerId: result.playerId,
      placement: result.placement,
      finalScore: result.finalScore,
    }))

const toVisiblePlayer = (
  self: ObservationSourcePlayer,
  player: ObservationSourcePlayer
): VisiblePlayerV1 => ({
  id: player.id,
  position: player.position,
  velocity: player.velocity,
  radius: player.radius,
  score: player.score,
  isAlive: player.isAlive,
  relation: toRelation(self.id, self, player),
})

const toVisibleFood = (food: ObservationSourceFood): VisibleFoodV1 => ({
  id: food.id,
  position: food.position,
  size: food.size,
})

const toVisibleProjectile = (projectile: ObservationSourceProjectile): VisibleProjectileV1 => ({
  id: projectile.id,
  position: projectile.position,
  velocity: projectile.velocity,
  size: projectile.size,
  ownerId: projectile.ownerId,
})

export const buildObservationArtifacts = (
  snapshot: ObservationSourceSnapshot,
  options: BuildObservationOptions
): BuiltObservationArtifacts => {
  const self = snapshot.players.find(player => player.id === snapshot.selfId)
  if (!self) {
    throw new Error(`Missing self player ${snapshot.selfId} in observation snapshot`)
  }

  const viewportBounds = getViewportBounds(options.cameraPosition, options.dimensions)
  const leaderboardLimit = options.leaderboardLimit ?? 10
  const resultsLimit = options.resultsLimit ?? 10

  const visiblePlayers = sortByDistanceThenId(
    filterVisibleEntities(snapshot.players, viewportBounds, player => player.radius),
    self.position
  ).map(player => toVisiblePlayer(self, player))

  const visibleFood = sortByDistanceThenId(
    filterVisibleEntities(snapshot.food, viewportBounds, food => food.size),
    self.position
  ).map(toVisibleFood)

  const visibleProjectiles = sortByDistanceThenId(
    filterVisibleEntities(snapshot.projectiles, viewportBounds, projectile => projectile.size),
    self.position
  ).map(toVisibleProjectile)

  const leaderboard = buildLeaderboard(snapshot.players, leaderboardLimit)
  const recentResults = buildResults(snapshot.results ?? [], resultsLimit)

  return {
    viewportBounds,
    policyObservation: {
      header: {
        version: 1,
        tickId: snapshot.tickId,
        timestampMs: snapshot.timestampMs,
      },
      self: {
        playerId: self.id,
        roomId: self.roomId,
        position: self.position,
        velocity: self.velocity,
        radius: self.radius,
        score: self.score,
        isAlive: self.isAlive,
        canSplit: self.canSplit,
        canSpit: self.canSpit,
      },
      room: {
        status: snapshot.room.status,
        bounds: snapshot.room.bounds,
        timeRemainingMs: snapshot.room.timeRemainingMs,
        playerCount: snapshot.room.playerCount,
      },
      visiblePlayers,
      visibleFood,
      visibleProjectiles,
      leaderboard,
      recentResults,
    },
    privilegedDiagnostics: {
      header: {
        version: 1,
        tickId: snapshot.tickId,
        timestampMs: snapshot.timestampMs,
      },
      room: {
        status: snapshot.room.status,
        bounds: snapshot.room.bounds,
        timeRemainingMs: snapshot.room.timeRemainingMs,
        playerCount: snapshot.room.playerCount,
      },
      allPlayers: sortByDistanceThenId(snapshot.players, self.position).map(player =>
        toVisiblePlayer(self, player)
      ),
      allFood: sortByDistanceThenId(snapshot.food, self.position).map(toVisibleFood),
      allProjectiles: sortByDistanceThenId(snapshot.projectiles, self.position).map(
        toVisibleProjectile
      ),
      fullLeaderboard: leaderboard,
      fullResults: recentResults,
    },
  }
}

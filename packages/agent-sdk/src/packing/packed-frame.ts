import type { Bounds, PolicyObservationV1 } from '../schema.ts'

export interface PackedFrameSlotLimits {
  players: number
  food: number
  projectiles: number
  leaderboard: number
}

export interface PackedPlayerSlotV1 {
  active: 0 | 1
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  score: number
  isAlive: 0 | 1
  relation: 0 | 1 | 2 | 3
}

export interface PackedFoodSlotV1 {
  active: 0 | 1
  x: number
  y: number
  size: number
}

export interface PackedProjectileSlotV1 {
  active: 0 | 1
  x: number
  y: number
  vx: number
  vy: number
  size: number
}

export interface PackedLeaderboardSlotV1 {
  active: 0 | 1
  rank: number
  score: number
}

export interface PackedPolicyObservationV1 {
  version: 1
  tickId: number
  timestampMs: number
  roomStatus: 0 | 1 | 2 | 3
  timeRemainingMs: number
  self: {
    x: number
    y: number
    vx: number
    vy: number
    radius: number
    score: number
    isAlive: 0 | 1
    canSplit: 0 | 1
    canSpit: 0 | 1
  }
  players: PackedPlayerSlotV1[]
  food: PackedFoodSlotV1[]
  projectiles: PackedProjectileSlotV1[]
  leaderboard: PackedLeaderboardSlotV1[]
}

export const DEFAULT_PACKED_FRAME_SLOT_LIMITS: PackedFrameSlotLimits = {
  players: 16,
  food: 64,
  projectiles: 32,
  leaderboard: 10,
}

const ROOM_STATUS_TO_CODE = {
  waiting: 0,
  starting: 1,
  playing: 2,
  finished: 3,
} as const

const RELATION_TO_CODE = {
  self: 0,
  smaller: 1,
  larger: 2,
  unknown: 3,
} as const

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

const normalizeToBounds = (value: number, min: number, span: number) =>
  span <= 0 ? 0 : clamp01((value - min) / span)

const packToFixedSize = <T, U>(
  entries: T[],
  limit: number,
  mapActive: (entry: T) => U,
  makeEmpty: () => U
): U[] => {
  const packed = entries.slice(0, limit).map(mapActive)
  while (packed.length < limit) {
    packed.push(makeEmpty())
  }
  return packed
}

export const packPolicyObservationV1 = (
  observation: PolicyObservationV1,
  viewportBounds: Bounds,
  slotLimits: PackedFrameSlotLimits = DEFAULT_PACKED_FRAME_SLOT_LIMITS
): PackedPolicyObservationV1 => ({
  version: 1,
  tickId: observation.header.tickId,
  timestampMs: observation.header.timestampMs,
  roomStatus: ROOM_STATUS_TO_CODE[observation.room.status],
  timeRemainingMs: observation.room.timeRemainingMs,
  self: {
    x: normalizeToBounds(observation.self.position.x, viewportBounds.x, viewportBounds.width),
    y: normalizeToBounds(observation.self.position.y, viewportBounds.y, viewportBounds.height),
    vx: observation.self.velocity.x,
    vy: observation.self.velocity.y,
    radius: observation.self.radius,
    score: observation.self.score,
    isAlive: observation.self.isAlive ? 1 : 0,
    canSplit: observation.self.canSplit ? 1 : 0,
    canSpit: observation.self.canSpit ? 1 : 0,
  },
  players: packToFixedSize(
    observation.visiblePlayers,
    slotLimits.players,
    (player): PackedPlayerSlotV1 => ({
      active: 1,
      x: normalizeToBounds(player.position.x, viewportBounds.x, viewportBounds.width),
      y: normalizeToBounds(player.position.y, viewportBounds.y, viewportBounds.height),
      vx: player.velocity.x,
      vy: player.velocity.y,
      radius: player.radius,
      score: player.score,
      isAlive: player.isAlive ? 1 : 0,
      relation: RELATION_TO_CODE[player.relation],
    }),
    (): PackedPlayerSlotV1 => ({
      active: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 0,
      score: 0,
      isAlive: 0,
      relation: 3,
    })
  ),
  food: packToFixedSize(
    observation.visibleFood,
    slotLimits.food,
    (food): PackedFoodSlotV1 => ({
      active: 1,
      x: normalizeToBounds(food.position.x, viewportBounds.x, viewportBounds.width),
      y: normalizeToBounds(food.position.y, viewportBounds.y, viewportBounds.height),
      size: food.size,
    }),
    (): PackedFoodSlotV1 => ({
      active: 0,
      x: 0,
      y: 0,
      size: 0,
    })
  ),
  projectiles: packToFixedSize(
    observation.visibleProjectiles,
    slotLimits.projectiles,
    (projectile): PackedProjectileSlotV1 => ({
      active: 1,
      x: normalizeToBounds(projectile.position.x, viewportBounds.x, viewportBounds.width),
      y: normalizeToBounds(projectile.position.y, viewportBounds.y, viewportBounds.height),
      vx: projectile.velocity.x,
      vy: projectile.velocity.y,
      size: projectile.size,
    }),
    (): PackedProjectileSlotV1 => ({
      active: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 0,
    })
  ),
  leaderboard: packToFixedSize(
    observation.leaderboard,
    slotLimits.leaderboard,
    (entry): PackedLeaderboardSlotV1 => ({
      active: 1,
      rank: entry.rank,
      score: entry.score,
    }),
    (): PackedLeaderboardSlotV1 => ({
      active: 0,
      rank: 0,
      score: 0,
    })
  ),
})

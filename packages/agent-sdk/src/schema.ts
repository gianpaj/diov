import { z } from 'zod'

export const agentSchemaVersionSchema = z.literal(1)

export const vector2DSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
})

export const boundsSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  width: z.number().positive(),
  height: z.number().positive(),
})

export const roomStatusSchema = z.enum(['waiting', 'starting', 'playing', 'finished'])

export const canonicalAbilitySchema = z.enum(['none', 'spit', 'split'])

export const canonicalActionV1Schema = z.object({
  move: vector2DSchema.refine(
    ({ x, y }) => x >= -1 && x <= 1 && y >= -1 && y <= 1,
    'move values must be normalized to [-1, 1]'
  ),
  ability: canonicalAbilitySchema,
})

export const visibilityRelationSchema = z.enum(['self', 'smaller', 'larger', 'unknown'])

export const observationHeaderV1Schema = z.object({
  version: agentSchemaVersionSchema,
  tickId: z.number().int().nonnegative(),
  timestampMs: z.number().int().nonnegative(),
})

export const observationSelfV1Schema = z.object({
  playerId: z.string().min(1),
  roomId: z.string().min(1),
  position: vector2DSchema,
  velocity: vector2DSchema,
  radius: z.number().positive(),
  score: z.number().nonnegative(),
  isAlive: z.boolean(),
  canSplit: z.boolean(),
  canSpit: z.boolean(),
})

export const observationRoomV1Schema = z.object({
  status: roomStatusSchema,
  bounds: boundsSchema,
  timeRemainingMs: z.number().int().nonnegative(),
  playerCount: z.number().int().nonnegative(),
})

export const visiblePlayerV1Schema = z.object({
  id: z.string().min(1),
  position: vector2DSchema,
  velocity: vector2DSchema,
  radius: z.number().positive(),
  score: z.number().nonnegative(),
  isAlive: z.boolean(),
  relation: visibilityRelationSchema,
})

export const visibleFoodV1Schema = z.object({
  id: z.string().min(1),
  position: vector2DSchema,
  size: z.number().positive(),
})

export const visibleProjectileV1Schema = z.object({
  id: z.string().min(1),
  position: vector2DSchema,
  velocity: vector2DSchema,
  size: z.number().positive(),
  ownerId: z.string().min(1),
})

export const leaderboardEntryV1Schema = z.object({
  id: z.string().min(1),
  score: z.number().nonnegative(),
  rank: z.number().int().positive(),
})

export const recentResultEntryV1Schema = z.object({
  playerId: z.string().min(1),
  placement: z.number().int().positive(),
  finalScore: z.number().nonnegative(),
})

export const policyObservationV1Schema = z.object({
  header: observationHeaderV1Schema,
  self: observationSelfV1Schema,
  room: observationRoomV1Schema,
  visiblePlayers: z.array(visiblePlayerV1Schema),
  visibleFood: z.array(visibleFoodV1Schema),
  visibleProjectiles: z.array(visibleProjectileV1Schema),
  leaderboard: z.array(leaderboardEntryV1Schema),
  recentResults: z.array(recentResultEntryV1Schema),
})

const binaryFlagSchema = z.union([z.literal(0), z.literal(1)])
const packedRoomStatusSchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)])
const packedVisibilityRelationSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
])

export const packedPlayerSlotV1Schema = z.object({
  active: binaryFlagSchema,
  x: z.number().finite(),
  y: z.number().finite(),
  vx: z.number().finite(),
  vy: z.number().finite(),
  radius: z.number().nonnegative(),
  score: z.number().nonnegative(),
  isAlive: binaryFlagSchema,
  relation: packedVisibilityRelationSchema,
})

export const packedFoodSlotV1Schema = z.object({
  active: binaryFlagSchema,
  x: z.number().finite(),
  y: z.number().finite(),
  size: z.number().nonnegative(),
})

export const packedProjectileSlotV1Schema = z.object({
  active: binaryFlagSchema,
  x: z.number().finite(),
  y: z.number().finite(),
  vx: z.number().finite(),
  vy: z.number().finite(),
  size: z.number().nonnegative(),
})

export const packedLeaderboardSlotV1Schema = z.object({
  active: binaryFlagSchema,
  rank: z.number().int().nonnegative(),
  score: z.number().nonnegative(),
})

export const packedPolicyObservationV1Schema = z.object({
  version: agentSchemaVersionSchema,
  tickId: z.number().int().nonnegative(),
  timestampMs: z.number().int().nonnegative(),
  roomStatus: packedRoomStatusSchema,
  timeRemainingMs: z.number().int().nonnegative(),
  self: z.object({
    x: z.number().finite(),
    y: z.number().finite(),
    vx: z.number().finite(),
    vy: z.number().finite(),
    radius: z.number().nonnegative(),
    score: z.number().nonnegative(),
    isAlive: binaryFlagSchema,
    canSplit: binaryFlagSchema,
    canSpit: binaryFlagSchema,
  }),
  players: z.array(packedPlayerSlotV1Schema),
  food: z.array(packedFoodSlotV1Schema),
  projectiles: z.array(packedProjectileSlotV1Schema),
  leaderboard: z.array(packedLeaderboardSlotV1Schema),
})

export const policyBridgeObservationFormatSchema = z.enum([
  'policy_observation_v1',
  'packed_policy_observation_v1',
])

const structuredPolicyBridgeRequestV1Schema = z.object({
  version: agentSchemaVersionSchema,
  format: z.literal('policy_observation_v1'),
  observation: policyObservationV1Schema,
})

const packedPolicyBridgeRequestV1Schema = z.object({
  version: agentSchemaVersionSchema,
  format: z.literal('packed_policy_observation_v1'),
  observation: packedPolicyObservationV1Schema,
})

export const policyBridgeRequestV1Schema = z.discriminatedUnion('format', [
  structuredPolicyBridgeRequestV1Schema,
  packedPolicyBridgeRequestV1Schema,
])

export const privilegedDiagnosticsV1Schema = z.object({
  header: observationHeaderV1Schema,
  room: observationRoomV1Schema,
  allPlayers: z.array(visiblePlayerV1Schema),
  allFood: z.array(visibleFoodV1Schema),
  allProjectiles: z.array(visibleProjectileV1Schema),
  fullLeaderboard: z.array(leaderboardEntryV1Schema),
  fullResults: z.array(recentResultEntryV1Schema),
})

export type AgentSchemaVersion = z.infer<typeof agentSchemaVersionSchema>
export type Vector2D = z.infer<typeof vector2DSchema>
export type Bounds = z.infer<typeof boundsSchema>
export type RoomStatus = z.infer<typeof roomStatusSchema>
export type CanonicalAbility = z.infer<typeof canonicalAbilitySchema>
export type CanonicalActionV1 = z.infer<typeof canonicalActionV1Schema>
export type VisibilityRelation = z.infer<typeof visibilityRelationSchema>
export type ObservationHeaderV1 = z.infer<typeof observationHeaderV1Schema>
export type ObservationSelfV1 = z.infer<typeof observationSelfV1Schema>
export type ObservationRoomV1 = z.infer<typeof observationRoomV1Schema>
export type VisiblePlayerV1 = z.infer<typeof visiblePlayerV1Schema>
export type VisibleFoodV1 = z.infer<typeof visibleFoodV1Schema>
export type VisibleProjectileV1 = z.infer<typeof visibleProjectileV1Schema>
export type LeaderboardEntryV1 = z.infer<typeof leaderboardEntryV1Schema>
export type RecentResultEntryV1 = z.infer<typeof recentResultEntryV1Schema>
export type PolicyObservationV1 = z.infer<typeof policyObservationV1Schema>
export type PackedPlayerSlotV1 = z.infer<typeof packedPlayerSlotV1Schema>
export type PackedFoodSlotV1 = z.infer<typeof packedFoodSlotV1Schema>
export type PackedProjectileSlotV1 = z.infer<typeof packedProjectileSlotV1Schema>
export type PackedLeaderboardSlotV1 = z.infer<typeof packedLeaderboardSlotV1Schema>
export type PackedPolicyObservationV1 = z.infer<typeof packedPolicyObservationV1Schema>
export type PolicyBridgeObservationFormat = z.infer<typeof policyBridgeObservationFormatSchema>
export type PolicyBridgeRequestV1 = z.infer<typeof policyBridgeRequestV1Schema>
export type PrivilegedDiagnosticsV1 = z.infer<typeof privilegedDiagnosticsV1Schema>

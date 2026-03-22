export type {
  AgentSchemaVersion,
  Bounds,
  CanonicalAbility,
  CanonicalActionV1,
  LeaderboardEntryV1,
  ObservationHeaderV1,
  ObservationRoomV1,
  ObservationSelfV1,
  PolicyObservationV1,
  PrivilegedDiagnosticsV1,
  RecentResultEntryV1,
  RoomStatus,
  Vector2D,
  VisibilityRelation,
  VisibleFoodV1,
  VisiblePlayerV1,
  VisibleProjectileV1,
} from './schema.ts'

export {
  agentSchemaVersionSchema,
  boundsSchema,
  canonicalAbilitySchema,
  canonicalActionV1Schema,
  leaderboardEntryV1Schema,
  observationHeaderV1Schema,
  observationRoomV1Schema,
  observationSelfV1Schema,
  policyObservationV1Schema,
  privilegedDiagnosticsV1Schema,
  recentResultEntryV1Schema,
  roomStatusSchema,
  vector2DSchema,
  visibilityRelationSchema,
  visibleFoodV1Schema,
  visiblePlayerV1Schema,
  visibleProjectileV1Schema,
} from './schema.ts'

export type { PositionedEntity, ViewportDimensions } from './visibility.ts'

export {
  filterVisibleEntities,
  getViewportBounds,
  isCircleVisibleInBounds,
  stepCameraTowardsTarget,
  worldToScreen,
} from './visibility.ts'

export type {
  BuildObservationOptions,
  BuiltObservationArtifacts,
  ObservationSourceFood,
  ObservationSourcePlayer,
  ObservationSourceProjectile,
  ObservationSourceResult,
  ObservationSourceRoom,
  ObservationSourceSnapshot,
} from './observation.ts'

export {
  buildObservationArtifacts as buildObservationArtifactsFromSnapshot,
  buildObservationArtifacts,
} from './observation.ts'

export {
  validateCanonicalActionV1,
  validatePolicyObservationV1,
  validatePrivilegedDiagnosticsV1,
} from './validators.ts'

import {
  canonicalActionV1Schema,
  policyObservationV1Schema,
  privilegedDiagnosticsV1Schema,
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

export const validateCanonicalActionV1 = (payload: unknown) =>
  canonicalActionV1Schema.safeParse(payload)

export const validatePolicyObservationV1 = (payload: unknown) =>
  policyObservationV1Schema.safeParse(payload)

export const validatePrivilegedDiagnosticsV1 = (payload: unknown) =>
  privilegedDiagnosticsV1Schema.safeParse(payload)

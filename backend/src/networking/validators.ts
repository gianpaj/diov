import { z } from 'zod'

const vector2DSchema = z.object({
  x: z.number().min(-1).max(1),
  y: z.number().min(-1).max(1),
})

export const playerInputSchema = z.object({
  movement: vector2DSchema,
  splitPressed: z.boolean(),
  spitPressed: z.boolean(),
})

export type ValidatedPlayerInput = z.infer<typeof playerInputSchema>

export const validatePlayerInput = (payload: unknown) => playerInputSchema.safeParse(payload)

// Legacy alias kept so any remaining references to validateMove still compile
// until they are updated to use validatePlayerInput.
/** @deprecated Use validatePlayerInput instead */
export const moveSchema = z.object({
  dx: z.number().min(-1).max(1),
  dy: z.number().min(-1).max(1),
})

/** @deprecated Use validatePlayerInput instead */
export const validateMove = (payload: unknown) => moveSchema.safeParse(payload)

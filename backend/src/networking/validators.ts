import { z } from 'zod'

export const moveSchema = z.object({
  dx: z.number().min(-1).max(1),
  dy: z.number().min(-1).max(1),
})

export const validateMove = (payload: unknown) => moveSchema.safeParse(payload)

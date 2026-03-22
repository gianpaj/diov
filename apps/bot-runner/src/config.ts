import { z } from 'zod'

const intFromEnv = (defaultValue: number) =>
  z
    .string()
    .optional()
    .default(String(defaultValue))
    .transform(value => Number.parseInt(value, 10))
    .refine(value => Number.isInteger(value), {
      message: 'Expected an integer value',
    })

const ConfigSchema = z.object({
  SPACETIMEDB_HOST: z.string().optional().default('ws://127.0.0.1:3002'),
  SPACETIMEDB_DB_NAME: z.string().optional().default('battle-circles'),
  BOT_PLAYER_NAME: z.string().optional().default('Bot Alpha'),
  BOT_ROOM_ID: z.string().optional().default('guest-global'),
  BOT_VIEWPORT_WIDTH: intFromEnv(1280),
  BOT_VIEWPORT_HEIGHT: intFromEnv(720),
  BOT_CAMERA_SMOOTHING: z
    .string()
    .optional()
    .default('0.1')
    .transform(value => Number.parseFloat(value))
    .refine(value => Number.isFinite(value) && value > 0 && value <= 1, {
      message: 'BOT_CAMERA_SMOOTHING must be a finite number in (0, 1]',
    }),
  BOT_DECISION_DEBOUNCE_MS: intFromEnv(40),
})

const env = ConfigSchema.parse(process.env)

export const config = {
  SPACETIMEDB_HOST: env.SPACETIMEDB_HOST,
  SPACETIMEDB_DB_NAME: env.SPACETIMEDB_DB_NAME,
  BOT_PLAYER_NAME: env.BOT_PLAYER_NAME,
  BOT_ROOM_ID: env.BOT_ROOM_ID,
  BOT_VIEWPORT_WIDTH: env.BOT_VIEWPORT_WIDTH,
  BOT_VIEWPORT_HEIGHT: env.BOT_VIEWPORT_HEIGHT,
  BOT_CAMERA_SMOOTHING: env.BOT_CAMERA_SMOOTHING,
  BOT_DECISION_DEBOUNCE_MS: env.BOT_DECISION_DEBOUNCE_MS,
}

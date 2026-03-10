/**
 * backend/src/config.ts
 *
 * Legacy Node backend configuration.
 *
 * The main real-time gameplay path is migrating to SpacetimeDB, but the old
 * backend still exists during transition. This config therefore favors:
 *
 * - safe local defaults,
 * - optional persistence URLs,
 * - and predictable startup without requiring a fully populated `.env`.
 */

import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const intFromEnv = (defaultValue: number, name: string) =>
  z
    .string()
    .optional()
    .default(String(defaultValue))
    .transform(v => parseInt(v, 10))
    .refine(n => Number.isInteger(n), {
      message: `${name} must be an integer`,
    })

const numberFromEnv = (defaultValue: number, name: string) =>
  z
    .string()
    .optional()
    .default(String(defaultValue))
    .transform(v => parseFloat(v))
    .refine(n => !Number.isNaN(n), {
      message: `${name} must be a number`,
    })

const EnvSchema = z.object({
  PORT: intFromEnv(3001, 'PORT'),
  TICK_RATE: intFromEnv(50, 'TICK_RATE'),
  MAX_PLAYERS_PER_ROOM: intFromEnv(12, 'MAX_PLAYERS_PER_ROOM'),
  MIN_PLAYERS_PER_ROOM: intFromEnv(2, 'MIN_PLAYERS_PER_ROOM'),
  MAX_SPEED: numberFromEnv(5, 'MAX_SPEED'),
  MAP_WIDTH: intFromEnv(2000, 'MAP_WIDTH'),
  MAP_HEIGHT: intFromEnv(2000, 'MAP_HEIGHT'),
  REDIS_URL: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  CORS_ORIGIN: z.string().optional().default('*'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

const env = EnvSchema.parse(process.env)

export const config = {
  PORT: env.PORT,
  TICK_RATE: env.TICK_RATE,
  MAX_PLAYERS_PER_ROOM: env.MAX_PLAYERS_PER_ROOM,
  MIN_PLAYERS_PER_ROOM: env.MIN_PLAYERS_PER_ROOM,
  MAX_SPEED: env.MAX_SPEED,
  MAP_SIZE: {
    width: env.MAP_WIDTH,
    height: env.MAP_HEIGHT,
  },
  REDIS_URL: env.REDIS_URL,
  DATABASE_URL: env.DATABASE_URL,
  CORS_ORIGIN: env.CORS_ORIGIN,
  NODE_ENV: env.NODE_ENV,
}

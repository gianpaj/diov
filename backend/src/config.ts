/**
 * backend/src/config.ts
 *
 * Environment configuration for the auth & payments backend.
 * Game data lives in SpacetimeDB — this backend only handles auth and payments.
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

const EnvSchema = z.object({
  PORT: intFromEnv(3001, 'PORT'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z
    .string()
    .optional()
    .default('http://localhost:5173')
    .refine(v => v !== '*', {
      message:
        'CORS_ORIGIN must be an explicit origin (e.g. https://example.com). Wildcard "*" is not allowed.',
    }),

  // ── Better Auth ────────────────────────────────────────────────────────────
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
  BETTER_AUTH_URL: z.string().url().optional().default('http://localhost:3001'),

  // ── Turso / libSQL ─────────────────────────────────────────────────────────
  TURSO_DATABASE_URL: z.string().min(1, 'TURSO_DATABASE_URL is required'),
  TURSO_AUTH_TOKEN: z.string().optional().default(''),

  // ── Discord OAuth ──────────────────────────────────────────────────────────
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID is required'),
  DISCORD_CLIENT_SECRET: z.string().min(1, 'DISCORD_CLIENT_SECRET is required'),

  // ── Telegram ───────────────────────────────────────────────────────────────
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'TELEGRAM_BOT_TOKEN is required'),
  TELEGRAM_BOT_USERNAME: z.string().min(1, 'TELEGRAM_BOT_USERNAME is required (without @)'),
})

const env = EnvSchema.parse(process.env)

export const config = {
  PORT: env.PORT,
  NODE_ENV: env.NODE_ENV,
  CORS_ORIGIN: env.CORS_ORIGIN,
  BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: env.BETTER_AUTH_URL,
  TURSO_DATABASE_URL: env.TURSO_DATABASE_URL,
  TURSO_AUTH_TOKEN: env.TURSO_AUTH_TOKEN,
  DISCORD_CLIENT_ID: env.DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET: env.DISCORD_CLIENT_SECRET,
  TELEGRAM_BOT_TOKEN: env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_BOT_USERNAME: env.TELEGRAM_BOT_USERNAME,
}

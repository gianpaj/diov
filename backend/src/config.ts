/**
 * src/config/index.ts
 *
 * Centralised configuration loader + validator.
 *
 * - Uses dotenv to read `.env`
 * - Validates with zod (type safety + runtime guard)
 * - Exposes a singleton `config` object
 *
 * Usage:
 *   import { config } from '@/config';
 *   console.log(config.PORT);
 */

import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config() // Load .env

/* ------------------------------------------------------------------ */
/* 1️⃣ Schema – declare all env vars and their types                  */
/* ------------------------------------------------------------------ */
const EnvSchema = z.object({
  /* --- App -------------------------------------------------------- */
  PORT: z
    .string()
    .transform(v => parseInt(v, 10))
    .refine(n => !Number.isNaN(n), {
      message: 'PORT must be a number',
    }),

  /* --- Gameplay --------------------------------------------------- */
  TICK_RATE: z
    .string()
    .transform(v => parseInt(v, 10))
    .refine(n => !Number.isNaN(n), { message: 'TICK_RATE must be a number' }),
  MAX_PLAYERS_PER_ROOM: z
    .string()
    .transform(v => parseInt(v, 10))
    .refine(n => !Number.isNaN(n), {
      message: 'MAX_PLAYERS_PER_ROOM must be a number',
    }),
  MIN_PLAYERS_PER_ROOM: z
    .string()
    .transform(v => parseInt(v, 10))
    .refine(n => !Number.isNaN(n), {
      message: 'MIN_PLAYERS_PER_ROOM must be a number',
    }),
  MAX_SPEED: z
    .string()
    .transform(v => parseFloat(v))
    .refine(n => !Number.isNaN(n), { message: 'MAX_SPEED must be a number' }),
  MAP_WIDTH: z
    .string()
    .transform(v => parseInt(v, 10))
    .refine(n => !Number.isNaN(n), { message: 'MAP_WIDTH must be a number' }),
  MAP_HEIGHT: z
    .string()
    .transform(v => parseInt(v, 10))
    .refine(n => !Number.isNaN(n), { message: 'MAP_HEIGHT must be a number' }),

  /* --- Redis ------------------------------------------------------ */
  REDIS_URL: z.string().url(),

  /* --- PostgreSQL ----------------------------------------------- */
  DATABASE_URL: z.string(), // postgres://user:pass@host/db

  /* --- Security --------------------------------------------------- */
  CORS_ORIGIN: z.string().default('*'),

  /* --- Misc ------------------------------------------------------ */
  NODE_ENV: z.enum(['development', 'production']).default('development'),
})

/* ------------------------------------------------------------------ */
/* 2️⃣ Parse and validate                                           */
/* ------------------------------------------------------------------ */
const env = EnvSchema.parse(process.env)

/* ------------------------------------------------------------------ */
/* 3️⃣ Export a typed config object                                 */
/* ------------------------------------------------------------------ */
export const config = {
  /* App */
  PORT: env.PORT,

  /* Gameplay */
  TICK_RATE: env.TICK_RATE, // ms per tick
  MAX_PLAYERS_PER_ROOM: env.MAX_PLAYERS_PER_ROOM,
  MIN_PLAYERS_PER_ROOM: env.MIN_PLAYERS_PER_ROOM,
  MAX_SPEED: env.MAX_SPEED, // px per tick
  MAP_SIZE: {
    width: env.MAP_WIDTH,
    height: env.MAP_HEIGHT,
  },

  /* Redis */
  REDIS_URL: env.REDIS_URL,

  /* PostgreSQL */
  DATABASE_URL: env.DATABASE_URL,

  /* Security */
  CORS_ORIGIN: env.CORS_ORIGIN,

  /* Misc */
  NODE_ENV: env.NODE_ENV,
}

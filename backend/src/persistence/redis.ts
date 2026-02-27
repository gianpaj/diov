/**
 * backend/src/persistence/redis.ts
 *
 * Upstash Redis client stub — @upstash/redis is not yet installed and
 * REDIS_URL is not yet wired into the server.
 *
 * To enable Redis:
 *   1. pnpm add @upstash/redis          (in backend/)
 *   2. Add REDIS_URL to backend/.env    (get URL from upstash.com)
 *   3. Replace this file with:
 *        import { Redis } from '@upstash/redis'
 *        export const redisClient = Redis.fromEnv()
 *
 * See TODO.md — "Persistence (Redis)" for the full task list.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const redisClient: any = null

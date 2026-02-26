import { Redis } from '@upstash/redis'

// Initialize Redis
export const redisClient = Redis.fromEnv()

import { afterEach, describe, expect, it, vi } from 'vitest'

const REQUIRED_ENV = {
  PORT: '3001',
  NODE_ENV: 'test',
  BETTER_AUTH_SECRET: '12345678901234567890123456789012',
  BETTER_AUTH_URL: 'http://localhost:3001',
  TURSO_DATABASE_URL: 'file:local.db',
  DISCORD_CLIENT_ID: 'discord-client-id',
  DISCORD_CLIENT_SECRET: 'discord-client-secret',
  TELEGRAM_BOT_TOKEN: 'telegram-bot-token',
  TELEGRAM_BOT_USERNAME: 'battle_circles_bot',
}

const MANAGED_KEYS = [
  'PORT',
  'NODE_ENV',
  'CORS_ORIGIN',
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'TURSO_DATABASE_URL',
  'TURSO_AUTH_TOKEN',
  'DISCORD_CLIENT_ID',
  'DISCORD_CLIENT_SECRET',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_BOT_USERNAME',
] as const

const originalEnv = { ...process.env }

async function importFreshConfig() {
  vi.resetModules()
  return import('../src/config.ts')
}

function applyEnv(
  overrides: Partial<Record<(typeof MANAGED_KEYS)[number], string | undefined>> = {}
) {
  for (const key of MANAGED_KEYS) {
    delete process.env[key]
  }

  Object.assign(process.env, REQUIRED_ENV, overrides)

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key]
    }
  }
}

afterEach(() => {
  vi.resetModules()
  process.env = { ...originalEnv }
})

describe('backend config', () => {
  it('defaults CORS_ORIGIN to the frontend dev origin', async () => {
    applyEnv({ CORS_ORIGIN: undefined })

    const { config } = await importFreshConfig()

    expect(config.CORS_ORIGIN).toBe('http://localhost:5173')
  })

  it('rejects wildcard CORS_ORIGIN when auth uses credentials', async () => {
    applyEnv({ CORS_ORIGIN: '*' })

    await expect(importFreshConfig()).rejects.toMatchObject({
      issues: [
        expect.objectContaining({
          path: ['CORS_ORIGIN'],
          message: expect.stringContaining('Wildcard "*" is not allowed.'),
        }),
      ],
    })
  })
})

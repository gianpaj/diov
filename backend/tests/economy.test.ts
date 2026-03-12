import { createClient } from '@libsql/client'
import { beforeAll, describe, expect, it } from 'vitest'

process.env.PORT = process.env.PORT ?? '3001'
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test'
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173'
process.env.BETTER_AUTH_SECRET =
  process.env.BETTER_AUTH_SECRET ?? 'test-secret-0123456789-test-secret'
process.env.BETTER_AUTH_URL = process.env.BETTER_AUTH_URL ?? 'http://localhost:3001'
process.env.TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL ?? 'file::memory:'
process.env.TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN ?? ''
process.env.DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID ?? 'discord-client-id'
process.env.DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET ?? 'discord-client-secret'
process.env.TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? 'telegram-bot-token'
process.env.TELEGRAM_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME ?? 'battlecirclesbot'

const client = createClient({ url: 'file::memory:' })

let economy: Awaited<typeof import('../src/persistence/economy.ts')>

beforeAll(async () => {
  economy = await import('../src/persistence/economy.ts')
  await economy.ensureEconomySchema(client)
})

describe('economy persistence', () => {
  it('creates default wallet and loadout state for a registered user', async () => {
    await economy.ensureUserEconomy(client, 'user-defaults')

    const wallet = await economy.getWalletSummary(client, 'user-defaults')
    const loadout = await economy.getLoadout(client, 'user-defaults')

    expect(wallet.balance).toBe(0)
    expect(loadout.equippedSkinId).toBe('skin_classic')
    expect(loadout.equippedColorId).toBe('color_azure')
    expect(loadout.applied.color).toBe('#2E90FF')
  })

  it('records daily claim earnings and prevents duplicate claims on the same day', async () => {
    await economy.ensureUserEconomy(client, 'user-daily')

    const firstClaim = await economy.claimDailyReward(client, 'user-daily')
    const secondClaim = await economy.claimDailyReward(client, 'user-daily')
    const wallet = await economy.getWalletSummary(client, 'user-daily')

    expect(firstClaim.ok).toBe(true)
    expect(secondClaim.ok).toBe(false)
    expect(wallet.balance).toBeGreaterThan(0)
    expect(wallet.lifetimeEarned).toBe(wallet.balance)
  })

  it('deducts coins for a purchase and updates the equipped color loadout', async () => {
    await economy.ensureUserEconomy(client, 'user-shop')

    await client.execute({
      sql: `
        UPDATE wallet
        SET coins_balance = 500, lifetime_earned = 500, updated_at = ?
        WHERE user_id = ?
      `,
      args: [new Date().toISOString(), 'user-shop'],
    })

    const purchase = await economy.purchaseItem(client, 'user-shop', 'color_solar', 'COINS')
    const wallet = await economy.getWalletSummary(client, 'user-shop')
    const loadout = await economy.getLoadout(client, 'user-shop')

    expect(purchase.ok).toBe(true)
    if (purchase.ok) {
      expect(purchase.kind).toBe('coins')
    }
    expect(wallet.balance).toBe(340)
    expect(wallet.lifetimeSpent).toBe(160)
    expect(loadout.equippedColorId).toBe('color_solar')
    expect(loadout.applied.color).toBe('#F5B700')
  })
})

import type { Client } from '@libsql/client'
import { db } from '../db.js'

export type CatalogCategory = 'SKIN' | 'COLOR_PACK'
export type WalletEntryType = 'EARN' | 'SPEND'
export type PurchaseMethod = 'COINS' | 'TELEGRAM_TON'

export interface ViewerSummary {
  isAuthenticated: boolean
  isAnonymous: boolean
  isRegistered: boolean
  allowedQueues: Array<'guest' | 'competitive' | 'casual_powerups'>
  user: null | {
    id: string
    name: string | null
    email: string | null
    image: string | null
  }
}

export interface WalletSummary {
  balance: number
  lifetimeEarned: number
  lifetimeSpent: number
}

export interface WalletHistoryEntry {
  id: string
  type: WalletEntryType
  amount: number
  reason: string
  referenceId: string | null
  createdAt: string
  balanceAfter: number
}

export interface CatalogItem {
  id: string
  category: CatalogCategory
  name: string
  description: string
  rarity: string
  thumbnailUrl: string
  price: {
    coins: number | null
    ton: {
      amountNano: string | null
      network: 'TON'
      wallet: 'TELEGRAM'
    }
  }
  available: boolean
  previewColor: string | null
  skinId: string | null
  purchaseMethods: PurchaseMethod[]
  ownership: {
    owned: boolean
    equipped: boolean
  }
}

export interface SkinInventoryItem {
  id: string
  name: string
  rarity: string
  thumbnailUrl: string
  acquiredAt: string
  source: string
  skinId: string | null
}

export interface ColorInventoryItem {
  id: string
  name: string
  rarity: string
  previewColor: string | null
  acquiredAt: string
  source: string
}

export interface LoadoutSummary {
  equippedSkinId: string | null
  equippedColorId: string | null
  applied: {
    skinId: string | null
    color: string
  }
  skins: SkinInventoryItem[]
  colors: ColorInventoryItem[]
}

export interface PurchaseResult {
  ok: true
  kind: 'coins' | 'telegram_ton'
  purchaseId: string
  item: Pick<CatalogItem, 'id' | 'name' | 'category'>
  newTokenBalance?: number
  tonCheckout?: {
    provider: 'TELEGRAM_TON'
    network: 'TON'
    wallet: 'TELEGRAM'
    externalReference: string
    status: 'PENDING'
    amountNano: string | null
    message: string
  }
}

export interface PurchaseFailure {
  ok: false
  status: number
  error: string
  required?: number
  balance?: number
}

interface CatalogSeed {
  id: string
  category: CatalogCategory
  name: string
  description: string
  rarity: string
  thumbnailUrl: string
  tokenPrice: number | null
  tonPriceNano: string | null
  available: boolean
  previewColor: string | null
  skinId: string | null
  purchaseMethods: PurchaseMethod[]
}

const DEFAULT_SKIN_ITEM_ID = 'skin_classic'
const DEFAULT_COLOR_ITEM_ID = 'color_azure'
const DAILY_CLAIM_BASE_REWARD = 25
const MAX_DAILY_STREAK_BONUS = 4

const CATALOG_SEED: CatalogSeed[] = [
  {
    id: DEFAULT_SKIN_ITEM_ID,
    category: 'SKIN',
    name: 'Classic Core',
    description: 'The baseline Battle Circles skin.',
    rarity: 'COMMON',
    thumbnailUrl: 'https://cdn.battlecircles.io/skins/classic.png',
    tokenPrice: 0,
    tonPriceNano: null,
    available: true,
    previewColor: null,
    skinId: 'classic-core',
    purchaseMethods: ['COINS'],
  },
  {
    id: 'skin_ember',
    category: 'SKIN',
    name: 'Ember Ring',
    description: 'Warm highlights with a sharper outer edge.',
    rarity: 'RARE',
    thumbnailUrl: 'https://cdn.battlecircles.io/skins/ember.png',
    tokenPrice: 250,
    tonPriceNano: '150000000',
    available: true,
    previewColor: null,
    skinId: 'ember-ring',
    purchaseMethods: ['COINS', 'TELEGRAM_TON'],
  },
  {
    id: 'skin_neon',
    category: 'SKIN',
    name: 'Neon Drift',
    description: 'Cool glows tuned for Telegram-native play.',
    rarity: 'EPIC',
    thumbnailUrl: 'https://cdn.battlecircles.io/skins/neon.png',
    tokenPrice: 420,
    tonPriceNano: '220000000',
    available: true,
    previewColor: null,
    skinId: 'neon-drift',
    purchaseMethods: ['COINS', 'TELEGRAM_TON'],
  },
  {
    id: DEFAULT_COLOR_ITEM_ID,
    category: 'COLOR_PACK',
    name: 'Azure',
    description: 'Default competitive-safe blob color.',
    rarity: 'COMMON',
    thumbnailUrl: 'https://cdn.battlecircles.io/colors/azure.png',
    tokenPrice: 0,
    tonPriceNano: null,
    available: true,
    previewColor: '#2E90FF',
    skinId: null,
    purchaseMethods: ['COINS'],
  },
  {
    id: 'color_solar',
    category: 'COLOR_PACK',
    name: 'Solar Gold',
    description: 'Warm yellow highlights for your blob shell.',
    rarity: 'RARE',
    thumbnailUrl: 'https://cdn.battlecircles.io/colors/solar-gold.png',
    tokenPrice: 160,
    tonPriceNano: '90000000',
    available: true,
    previewColor: '#F5B700',
    skinId: null,
    purchaseMethods: ['COINS', 'TELEGRAM_TON'],
  },
  {
    id: 'color_mint',
    category: 'COLOR_PACK',
    name: 'Mint Flux',
    description: 'A colder green palette for casual queue flair.',
    rarity: 'RARE',
    thumbnailUrl: 'https://cdn.battlecircles.io/colors/mint-flux.png',
    tokenPrice: 160,
    tonPriceNano: '90000000',
    available: true,
    previewColor: '#2FBF71',
    skinId: null,
    purchaseMethods: ['COINS', 'TELEGRAM_TON'],
  },
]

const nowIso = () => new Date().toISOString()

const utcDateKey = (date = new Date()) => date.toISOString().slice(0, 10)

const addUtcDays = (dateKey: string, days: number): string => {
  const date = new Date(`${dateKey}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString()
}

const entryId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`

const parseBoolean = (value: unknown): boolean =>
  value === true || value === 1 || value === '1' || value === 'true'

const parseNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return value
  }
  if (typeof value === 'bigint') {
    return Number(value)
  }
  if (typeof value === 'string') {
    return Number.parseInt(value, 10)
  }
  return 0
}

const mapCatalogItem = (row: Record<string, unknown>): CatalogItem => ({
  id: String(row.id),
  category: String(row.category) as CatalogCategory,
  name: String(row.name),
  description: String(row.description),
  rarity: String(row.rarity),
  thumbnailUrl: String(row.thumbnail_url),
  price: {
    coins: row.token_price === null ? null : parseNumber(row.token_price),
    ton: {
      amountNano: row.ton_price_nano === null ? null : String(row.ton_price_nano),
      network: 'TON',
      wallet: 'TELEGRAM',
    },
  },
  available: parseBoolean(row.available),
  previewColor: row.preview_color === null ? null : String(row.preview_color),
  skinId: row.skin_id === null ? null : String(row.skin_id),
  purchaseMethods: JSON.parse(String(row.purchase_methods_json)) as PurchaseMethod[],
  ownership: {
    owned: false,
    equipped: false,
  },
})

async function withTransaction<T>(client: Client, callback: () => Promise<T>): Promise<T> {
  await client.execute('BEGIN IMMEDIATE')
  try {
    const result = await callback()
    await client.execute('COMMIT')
    return result
  } catch (error) {
    await client.execute('ROLLBACK')
    throw error
  }
}

async function ensureWalletRow(client: Client, userId: string) {
  const timestamp = nowIso()
  await client.execute({
    sql: `
      INSERT OR IGNORE INTO wallet (user_id, coins_balance, lifetime_earned, lifetime_spent, updated_at)
      VALUES (?, 0, 0, 0, ?)
    `,
    args: [userId, timestamp],
  })
}

async function ensureInventoryItem(
  client: Client,
  userId: string,
  catalogItemId: string,
  source: string,
  acquiredAt = nowIso()
) {
  const existing = await client.execute({
    sql: 'SELECT id FROM inventory_item WHERE user_id = ? AND catalog_item_id = ? LIMIT 1',
    args: [userId, catalogItemId],
  })
  if (existing.rows.length > 0) {
    return
  }

  await client.execute({
    sql: `
      INSERT INTO inventory_item (id, user_id, catalog_item_id, source, acquired_at)
      VALUES (?, ?, ?, ?, ?)
    `,
    args: [entryId('inv'), userId, catalogItemId, source, acquiredAt],
  })
}

export async function ensureEconomySchema(client: Client = db) {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS wallet (
      user_id TEXT PRIMARY KEY,
      coins_balance INTEGER NOT NULL DEFAULT 0,
      lifetime_earned INTEGER NOT NULL DEFAULT 0,
      lifetime_spent INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    )
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS wallet_entry (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      reason TEXT NOT NULL,
      reference_id TEXT,
      idempotency_key TEXT NOT NULL UNIQUE,
      balance_after INTEGER NOT NULL,
      created_at TEXT NOT NULL
    )
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS catalog_item (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      rarity TEXT NOT NULL,
      thumbnail_url TEXT NOT NULL,
      token_price INTEGER,
      ton_price_nano TEXT,
      available INTEGER NOT NULL DEFAULT 1,
      preview_color TEXT,
      skin_id TEXT,
      purchase_methods_json TEXT NOT NULL
    )
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS inventory_item (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      catalog_item_id TEXT NOT NULL,
      source TEXT NOT NULL,
      acquired_at TEXT NOT NULL
    )
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS equipped_loadout (
      user_id TEXT PRIMARY KEY,
      skin_item_id TEXT,
      color_item_id TEXT,
      updated_at TEXT NOT NULL
    )
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS daily_claim (
      user_id TEXT PRIMARY KEY,
      streak_count INTEGER NOT NULL DEFAULT 0,
      last_claimed_on TEXT NOT NULL
    )
  `)

  await client.execute(`
    CREATE TABLE IF NOT EXISTS purchase_attempt (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      catalog_item_id TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      status TEXT NOT NULL,
      external_reference TEXT UNIQUE,
      ton_amount_nano TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  for (const item of CATALOG_SEED) {
    await client.execute({
      sql: `
        INSERT OR IGNORE INTO catalog_item (
          id,
          category,
          name,
          description,
          rarity,
          thumbnail_url,
          token_price,
          ton_price_nano,
          available,
          preview_color,
          skin_id,
          purchase_methods_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        item.id,
        item.category,
        item.name,
        item.description,
        item.rarity,
        item.thumbnailUrl,
        item.tokenPrice,
        item.tonPriceNano,
        item.available ? 1 : 0,
        item.previewColor,
        item.skinId,
        JSON.stringify(item.purchaseMethods),
      ],
    })
  }
}

export async function ensureUserEconomy(client: Client, userId: string) {
  await ensureWalletRow(client, userId)
  await ensureInventoryItem(client, userId, DEFAULT_SKIN_ITEM_ID, 'DEFAULT')
  await ensureInventoryItem(client, userId, DEFAULT_COLOR_ITEM_ID, 'DEFAULT')
  await client.execute({
    sql: `
      INSERT OR IGNORE INTO equipped_loadout (user_id, skin_item_id, color_item_id, updated_at)
      VALUES (?, ?, ?, ?)
    `,
    args: [userId, DEFAULT_SKIN_ITEM_ID, DEFAULT_COLOR_ITEM_ID, nowIso()],
  })
}

export async function getViewerSummary(session: any): Promise<ViewerSummary> {
  const isAuthenticated = Boolean(session?.user)
  const isAnonymous = Boolean(session?.user?.isAnonymous)
  const isRegistered = isAuthenticated && !isAnonymous
  return {
    isAuthenticated,
    isAnonymous,
    isRegistered,
    allowedQueues: isRegistered ? ['guest', 'competitive', 'casual_powerups'] : ['guest'],
    user: isAuthenticated
      ? {
          id: String(session.user.id),
          name: session.user.name ?? null,
          email: session.user.email ?? null,
          image: session.user.image ?? null,
        }
      : null,
  }
}

export async function getWalletSummary(client: Client, userId: string): Promise<WalletSummary> {
  await ensureUserEconomy(client, userId)
  const result = await client.execute({
    sql: 'SELECT coins_balance, lifetime_earned, lifetime_spent FROM wallet WHERE user_id = ? LIMIT 1',
    args: [userId],
  })
  const row = result.rows[0] as Record<string, unknown> | undefined
  return {
    balance: row ? parseNumber(row.coins_balance) : 0,
    lifetimeEarned: row ? parseNumber(row.lifetime_earned) : 0,
    lifetimeSpent: row ? parseNumber(row.lifetime_spent) : 0,
  }
}

export async function listWalletHistory(
  client: Client,
  userId: string,
  page = 1,
  limit = 20
): Promise<{ total: number; entries: WalletHistoryEntry[] }> {
  await ensureUserEconomy(client, userId)
  const safePage = Math.max(1, page)
  const safeLimit = Math.max(1, Math.min(limit, 100))
  const offset = (safePage - 1) * safeLimit

  const [countResult, entriesResult] = await Promise.all([
    client.execute({
      sql: 'SELECT COUNT(*) as total FROM wallet_entry WHERE user_id = ?',
      args: [userId],
    }),
    client.execute({
      sql: `
        SELECT id, type, amount, reason, reference_id, created_at, balance_after
        FROM wallet_entry
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `,
      args: [userId, safeLimit, offset],
    }),
  ])

  const total = parseNumber((countResult.rows[0] as Record<string, unknown> | undefined)?.total)
  const entries = entriesResult.rows.map(row => {
    const entry = row as Record<string, unknown>
    return {
      id: String(entry.id),
      type: String(entry.type) as WalletEntryType,
      amount: parseNumber(entry.amount),
      reason: String(entry.reason),
      referenceId: entry.reference_id === null ? null : String(entry.reference_id),
      createdAt: String(entry.created_at),
      balanceAfter: parseNumber(entry.balance_after),
    }
  })

  return { total, entries }
}

export async function listCatalog(client: Client, userId?: string): Promise<CatalogItem[]> {
  if (userId) {
    await ensureUserEconomy(client, userId)
  }

  const [catalogResult, inventoryResult, loadoutResult] = await Promise.all([
    client.execute('SELECT * FROM catalog_item ORDER BY category, name'),
    userId
      ? client.execute({
          sql: 'SELECT catalog_item_id FROM inventory_item WHERE user_id = ?',
          args: [userId],
        })
      : Promise.resolve({ rows: [] as Record<string, unknown>[] }),
    userId
      ? client.execute({
          sql: 'SELECT skin_item_id, color_item_id FROM equipped_loadout WHERE user_id = ? LIMIT 1',
          args: [userId],
        })
      : Promise.resolve({ rows: [] as Record<string, unknown>[] }),
  ])

  const ownedIds = new Set(
    inventoryResult.rows.map(row => String((row as Record<string, unknown>).catalog_item_id))
  )
  const equippedRow = loadoutResult.rows[0] as Record<string, unknown> | undefined
  const equippedIds = new Set(
    [equippedRow?.skin_item_id, equippedRow?.color_item_id]
      .filter(Boolean)
      .map(value => String(value))
  )

  return catalogResult.rows.map(row => {
    const item = mapCatalogItem(row as Record<string, unknown>)
    item.ownership = {
      owned: ownedIds.has(item.id),
      equipped: equippedIds.has(item.id),
    }
    return item
  })
}

export async function claimDailyReward(
  client: Client,
  userId: string
): Promise<
  | { ok: true; day: number; reward: { coins: number }; newStreak: number; newTokenBalance: number }
  | { ok: false; status: 409; error: 'ALREADY_CLAIMED'; nextClaimAt: string }
> {
  await ensureUserEconomy(client, userId)
  const today = utcDateKey()

  return withTransaction(client, async () => {
    const [walletResult, claimResult] = await Promise.all([
      client.execute({
        sql: 'SELECT coins_balance, lifetime_earned, lifetime_spent FROM wallet WHERE user_id = ? LIMIT 1',
        args: [userId],
      }),
      client.execute({
        sql: 'SELECT streak_count, last_claimed_on FROM daily_claim WHERE user_id = ? LIMIT 1',
        args: [userId],
      }),
    ])

    const walletRow = walletResult.rows[0] as Record<string, unknown>
    const claimRow = claimResult.rows[0] as Record<string, unknown> | undefined
    if (claimRow?.last_claimed_on === today) {
      return {
        ok: false as const,
        status: 409 as const,
        error: 'ALREADY_CLAIMED' as const,
        nextClaimAt: addUtcDays(today, 1),
      }
    }

    const previousStreak =
      claimRow && claimRow.last_claimed_on === addUtcDays(today, -1).slice(0, 10)
        ? parseNumber(claimRow.streak_count)
        : 0
    const newStreak = previousStreak + 1
    const reward = DAILY_CLAIM_BASE_REWARD + Math.min(newStreak - 1, MAX_DAILY_STREAK_BONUS) * 5
    const nextBalance = parseNumber(walletRow.coins_balance) + reward
    const timestamp = nowIso()

    await client.execute({
      sql: `
        UPDATE wallet
        SET coins_balance = ?, lifetime_earned = lifetime_earned + ?, updated_at = ?
        WHERE user_id = ?
      `,
      args: [nextBalance, reward, timestamp, userId],
    })

    await client.execute({
      sql: `
        INSERT INTO wallet_entry (
          id, user_id, type, amount, reason, reference_id, idempotency_key, balance_after, created_at
        ) VALUES (?, ?, 'EARN', ?, 'DAILY_CLAIM', ?, ?, ?, ?)
      `,
      args: [
        entryId('txn'),
        userId,
        reward,
        today,
        `daily:${userId}:${today}`,
        nextBalance,
        timestamp,
      ],
    })

    await client.execute({
      sql: `
        INSERT INTO daily_claim (user_id, streak_count, last_claimed_on)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          streak_count = excluded.streak_count,
          last_claimed_on = excluded.last_claimed_on
      `,
      args: [userId, newStreak, today],
    })

    return {
      ok: true as const,
      day: newStreak,
      reward: { coins: reward },
      newStreak,
      newTokenBalance: nextBalance,
    }
  })
}

async function getCatalogItemById(client: Client, itemId: string): Promise<CatalogItem | null> {
  const result = await client.execute({
    sql: 'SELECT * FROM catalog_item WHERE id = ? LIMIT 1',
    args: [itemId],
  })
  const row = result.rows[0] as Record<string, unknown> | undefined
  return row ? mapCatalogItem(row) : null
}

async function getEquippedLoadoutRow(client: Client, userId: string) {
  const result = await client.execute({
    sql: 'SELECT skin_item_id, color_item_id FROM equipped_loadout WHERE user_id = ? LIMIT 1',
    args: [userId],
  })
  return result.rows[0] as Record<string, unknown> | undefined
}

export async function getLoadout(client: Client, userId: string): Promise<LoadoutSummary> {
  await ensureUserEconomy(client, userId)
  const [inventoryResult, loadoutRow] = await Promise.all([
    client.execute({
      sql: `
        SELECT
          inventory_item.catalog_item_id,
          inventory_item.acquired_at,
          inventory_item.source,
          catalog_item.category,
          catalog_item.name,
          catalog_item.rarity,
          catalog_item.thumbnail_url,
          catalog_item.preview_color,
          catalog_item.skin_id
        FROM inventory_item
        INNER JOIN catalog_item ON catalog_item.id = inventory_item.catalog_item_id
        WHERE inventory_item.user_id = ?
        ORDER BY catalog_item.category, catalog_item.name
      `,
      args: [userId],
    }),
    getEquippedLoadoutRow(client, userId),
  ])

  const skins: SkinInventoryItem[] = []
  const colors: ColorInventoryItem[] = []
  for (const row of inventoryResult.rows) {
    const item = row as Record<string, unknown>
    if (item.category === 'SKIN') {
      skins.push({
        id: String(item.catalog_item_id),
        name: String(item.name),
        rarity: String(item.rarity),
        thumbnailUrl: String(item.thumbnail_url),
        acquiredAt: String(item.acquired_at),
        source: String(item.source),
        skinId: item.skin_id === null ? null : String(item.skin_id),
      })
    } else if (item.category === 'COLOR_PACK') {
      colors.push({
        id: String(item.catalog_item_id),
        name: String(item.name),
        rarity: String(item.rarity),
        previewColor: item.preview_color === null ? null : String(item.preview_color),
        acquiredAt: String(item.acquired_at),
        source: String(item.source),
      })
    }
  }

  const equippedSkinId = loadoutRow?.skin_item_id
    ? String(loadoutRow.skin_item_id)
    : DEFAULT_SKIN_ITEM_ID
  const equippedColorId = loadoutRow?.color_item_id
    ? String(loadoutRow.color_item_id)
    : DEFAULT_COLOR_ITEM_ID
  const equippedColor =
    colors.find(item => item.id === equippedColorId)?.previewColor ??
    CATALOG_SEED.find(item => item.id === equippedColorId)?.previewColor ??
    '#2E90FF'
  const equippedSkin =
    skins.find(item => item.id === equippedSkinId)?.skinId ??
    CATALOG_SEED.find(item => item.id === equippedSkinId)?.skinId ??
    'classic-core'

  return {
    equippedSkinId,
    equippedColorId,
    applied: {
      skinId: equippedSkin,
      color: equippedColor ?? '#2E90FF',
    },
    skins,
    colors,
  }
}

export async function listUserSkins(client: Client, userId: string) {
  const loadout = await getLoadout(client, userId)
  return {
    equipped: loadout.equippedSkinId,
    skins: loadout.skins,
  }
}

async function assertOwnership(
  client: Client,
  userId: string,
  itemId: string,
  category?: CatalogCategory
) {
  const result = await client.execute({
    sql: `
      SELECT catalog_item.category
      FROM inventory_item
      INNER JOIN catalog_item ON catalog_item.id = inventory_item.catalog_item_id
      WHERE inventory_item.user_id = ? AND inventory_item.catalog_item_id = ?
      LIMIT 1
    `,
    args: [userId, itemId],
  })

  const row = result.rows[0] as Record<string, unknown> | undefined
  if (!row) {
    return false
  }
  if (category && row.category !== category) {
    return false
  }
  return true
}

export async function equipSkin(
  client: Client,
  userId: string,
  skinItemId: string
): Promise<{ ok: true; equipped: string } | { ok: false; status: 403; error: 'SKIN_NOT_OWNED' }> {
  await ensureUserEconomy(client, userId)
  const owned = await assertOwnership(client, userId, skinItemId, 'SKIN')
  if (!owned) {
    return { ok: false, status: 403, error: 'SKIN_NOT_OWNED' }
  }

  await client.execute({
    sql: `
      UPDATE equipped_loadout
      SET skin_item_id = ?, updated_at = ?
      WHERE user_id = ?
    `,
    args: [skinItemId, nowIso(), userId],
  })

  return { ok: true, equipped: skinItemId }
}

export async function updateLoadout(
  client: Client,
  userId: string,
  input: { skinItemId?: string | null; colorItemId?: string | null }
): Promise<
  | { ok: true; loadout: LoadoutSummary }
  | { ok: false; status: 403; error: 'ITEM_NOT_OWNED'; field: 'skinItemId' | 'colorItemId' }
> {
  await ensureUserEconomy(client, userId)
  const nextSkin = input.skinItemId === undefined ? undefined : input.skinItemId
  const nextColor = input.colorItemId === undefined ? undefined : input.colorItemId

  if (nextSkin) {
    const ownedSkin = await assertOwnership(client, userId, nextSkin, 'SKIN')
    if (!ownedSkin) {
      return { ok: false, status: 403, error: 'ITEM_NOT_OWNED', field: 'skinItemId' }
    }
  }

  if (nextColor) {
    const ownedColor = await assertOwnership(client, userId, nextColor, 'COLOR_PACK')
    if (!ownedColor) {
      return { ok: false, status: 403, error: 'ITEM_NOT_OWNED', field: 'colorItemId' }
    }
  }

  const current = await getEquippedLoadoutRow(client, userId)
  await client.execute({
    sql: `
      UPDATE equipped_loadout
      SET
        skin_item_id = ?,
        color_item_id = ?,
        updated_at = ?
      WHERE user_id = ?
    `,
    args: [
      nextSkin ?? String(current?.skin_item_id ?? DEFAULT_SKIN_ITEM_ID),
      nextColor ?? String(current?.color_item_id ?? DEFAULT_COLOR_ITEM_ID),
      nowIso(),
      userId,
    ],
  })

  return { ok: true, loadout: await getLoadout(client, userId) }
}

export async function purchaseItem(
  client: Client,
  userId: string,
  itemId: string,
  paymentMethod: PurchaseMethod
): Promise<PurchaseResult | PurchaseFailure> {
  await ensureUserEconomy(client, userId)
  const item = await getCatalogItemById(client, itemId)
  if (!item || !item.available) {
    return { ok: false, status: 404, error: 'ITEM_NOT_FOUND' }
  }

  if (!item.purchaseMethods.includes(paymentMethod)) {
    return { ok: false, status: 400, error: 'PAYMENT_METHOD_NOT_SUPPORTED' }
  }

  const alreadyOwned = await assertOwnership(client, userId, itemId)
  if (alreadyOwned) {
    return { ok: false, status: 409, error: 'ITEM_ALREADY_OWNED' }
  }

  if (paymentMethod === 'TELEGRAM_TON') {
    const purchaseId = entryId('purchase')
    const externalReference = `ton_${crypto.randomUUID()}`
    const timestamp = nowIso()
    await client.execute({
      sql: `
        INSERT INTO purchase_attempt (
          id, user_id, catalog_item_id, payment_method, status, external_reference, ton_amount_nano, created_at, updated_at
        ) VALUES (?, ?, ?, 'TELEGRAM_TON', 'PENDING', ?, ?, ?, ?)
      `,
      args: [
        purchaseId,
        userId,
        itemId,
        externalReference,
        item.price.ton.amountNano,
        timestamp,
        timestamp,
      ],
    })

    return {
      ok: true,
      kind: 'telegram_ton',
      purchaseId,
      item: {
        id: item.id,
        name: item.name,
        category: item.category,
      },
      tonCheckout: {
        provider: 'TELEGRAM_TON',
        network: 'TON',
        wallet: 'TELEGRAM',
        externalReference,
        status: 'PENDING',
        amountNano: item.price.ton.amountNano,
        message:
          'Telegram wallet checkout is the primary production path. This environment records a pending TON purchase reference only.',
      },
    }
  }

  if (item.price.coins === null) {
    return { ok: false, status: 400, error: 'COIN_PRICE_REQUIRED' }
  }

  return withTransaction(client, async () => {
    const walletResult = await client.execute({
      sql: 'SELECT coins_balance FROM wallet WHERE user_id = ? LIMIT 1',
      args: [userId],
    })
    const balance = parseNumber((walletResult.rows[0] as Record<string, unknown>).coins_balance)
    if (balance < item.price.coins!) {
      return {
        ok: false as const,
        status: 402 as const,
        error: 'INSUFFICIENT_TOKENS',
        required: item.price.coins!,
        balance,
      }
    }

    const newBalance = balance - item.price.coins!
    const timestamp = nowIso()
    const purchaseId = entryId('purchase')

    await client.execute({
      sql: `
        UPDATE wallet
        SET coins_balance = ?, lifetime_spent = lifetime_spent + ?, updated_at = ?
        WHERE user_id = ?
      `,
      args: [newBalance, item.price.coins!, timestamp, userId],
    })

    await client.execute({
      sql: `
        INSERT INTO wallet_entry (
          id, user_id, type, amount, reason, reference_id, idempotency_key, balance_after, created_at
        ) VALUES (?, ?, 'SPEND', ?, ?, ?, ?, ?, ?)
      `,
      args: [
        entryId('txn'),
        userId,
        -item.price.coins!,
        `${item.category}_PURCHASE`,
        item.id,
        `purchase:${userId}:${item.id}`,
        newBalance,
        timestamp,
      ],
    })

    await client.execute({
      sql: `
        INSERT INTO purchase_attempt (
          id, user_id, catalog_item_id, payment_method, status, external_reference, ton_amount_nano, created_at, updated_at
        ) VALUES (?, ?, ?, 'COINS', 'COMPLETED', ?, NULL, ?, ?)
      `,
      args: [purchaseId, userId, item.id, `coins_${purchaseId}`, timestamp, timestamp],
    })

    await ensureInventoryItem(client, userId, item.id, 'SHOP', timestamp)

    if (item.category === 'SKIN') {
      await client.execute({
        sql: 'UPDATE equipped_loadout SET skin_item_id = ?, updated_at = ? WHERE user_id = ?',
        args: [item.id, timestamp, userId],
      })
    }

    if (item.category === 'COLOR_PACK') {
      await client.execute({
        sql: 'UPDATE equipped_loadout SET color_item_id = ?, updated_at = ? WHERE user_id = ?',
        args: [item.id, timestamp, userId],
      })
    }

    return {
      ok: true as const,
      kind: 'coins' as const,
      purchaseId,
      item: {
        id: item.id,
        name: item.name,
        category: item.category,
      },
      newTokenBalance: newBalance,
    }
  })
}

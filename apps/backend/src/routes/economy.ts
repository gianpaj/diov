import { Hono } from 'hono'
import { z } from 'zod'
import { auth } from '../auth'
import { db } from '../db'
import {
  claimDailyReward,
  equipSkin,
  getLoadout,
  getViewerSummary,
  getWalletSummary,
  listCatalog,
  listUserSkins,
  listWalletHistory,
  purchaseItem,
  updateLoadout,
  type PurchaseMethod,
} from '../persistence/economy'

type ErrorStatus = 400 | 401 | 403 | 404 | 409

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const buySchema = z.object({
  paymentMethod: z.enum(['COINS', 'TELEGRAM_TON']),
})

const loadoutSchema = z.object({
  skinItemId: z.string().min(1).optional(),
  colorItemId: z.string().min(1).optional(),
})

const getSession = async (headers: Headers) => auth.api.getSession({ headers })

const getRegisteredUser = async (headers: Headers) => {
  const session = await getSession(headers)
  const viewer = await getViewerSummary(session)
  if (!viewer.isRegistered || !viewer.user) {
    return null
  }
  return viewer.user
}

const respondWithStatus = <T extends { status: number }>(c: any, payload: T) =>
  c.json(payload, payload.status as ErrorStatus)

export const economyRoutes = new Hono()

economyRoutes.get('/me', async c => {
  const session = await getSession(c.req.raw.headers)
  return c.json(await getViewerSummary(session))
})

economyRoutes.get('/shop/items', async c => {
  const session = await getSession(c.req.raw.headers)
  const viewer = await getViewerSummary(session)
  const items = await listCatalog(
    db,
    viewer.isRegistered && viewer.user ? viewer.user.id : undefined
  )

  return c.json({
    total: items.length,
    items,
    commerce: {
      primaryWallet: 'TELEGRAM_TON',
      network: 'TON',
      note: 'Telegram wallet checkout is the main future purchase path for paid coin/item purchases.',
    },
  })
})

economyRoutes.post('/shop/items/:id/buy', async c => {
  const user = await getRegisteredUser(c.req.raw.headers)
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const body = buySchema.safeParse(await c.req.json().catch(() => ({})))
  if (!body.success) {
    return c.json({ error: 'INVALID_REQUEST', details: body.error.flatten() }, 400)
  }

  const result = await purchaseItem(
    db,
    user.id,
    c.req.param('id'),
    body.data.paymentMethod as PurchaseMethod
  )
  if (!result.ok) {
    return respondWithStatus(c, result)
  }

  if (result.kind === 'telegram_ton') {
    return c.json({
      purchaseId: result.purchaseId,
      item: result.item,
      checkout: result.tonCheckout,
    })
  }

  return c.json({
    purchaseId: result.purchaseId,
    item: result.item,
    newTokenBalance: result.newTokenBalance,
  })
})

economyRoutes.get('/user/tokens', async c => {
  const user = await getRegisteredUser(c.req.raw.headers)
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  return c.json(await getWalletSummary(db, user.id))
})

economyRoutes.get('/user/tokens/history', async c => {
  const user = await getRegisteredUser(c.req.raw.headers)
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const pagination = paginationSchema.parse(c.req.query())
  return c.json(await listWalletHistory(db, user.id, pagination.page, pagination.limit))
})

economyRoutes.post('/daily-claim', async c => {
  const user = await getRegisteredUser(c.req.raw.headers)
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const result = await claimDailyReward(db, user.id)
  if (!result.ok) {
    return respondWithStatus(c, result)
  }

  return c.json(result)
})

economyRoutes.get('/user/skins', async c => {
  const user = await getRegisteredUser(c.req.raw.headers)
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  return c.json(await listUserSkins(db, user.id))
})

economyRoutes.post('/user/skins/:id/equip', async c => {
  const user = await getRegisteredUser(c.req.raw.headers)
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const result = await equipSkin(db, user.id, c.req.param('id'))
  if (!result.ok) {
    return respondWithStatus(c, result)
  }

  return c.json(result)
})

economyRoutes.get('/user/loadout', async c => {
  const user = await getRegisteredUser(c.req.raw.headers)
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  return c.json(await getLoadout(db, user.id))
})

economyRoutes.post('/user/loadout', async c => {
  const user = await getRegisteredUser(c.req.raw.headers)
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const body = loadoutSchema.safeParse(await c.req.json().catch(() => ({})))
  if (!body.success) {
    return c.json({ error: 'INVALID_REQUEST', details: body.error.flatten() }, 400)
  }

  const result = await updateLoadout(db, user.id, body.data)
  if (!result.ok) {
    return respondWithStatus(c, result)
  }

  return c.json(result.loadout)
})

const API_BASE_URL = import.meta.env.VITE_BETTER_AUTH_URL ?? 'http://localhost:3001'

export type QueueMode = 'guest' | 'competitive' | 'casual_powerups'

export interface ViewerSummary {
  isAuthenticated: boolean
  isAnonymous: boolean
  isRegistered: boolean
  allowedQueues: QueueMode[]
  user: null | {
    id: string
    name: string | null
    email: string | null
    image: string | null
  }
}

export interface CatalogItem {
  id: string
  category: 'SKIN' | 'COLOR_PACK'
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
  purchaseMethods: Array<'COINS' | 'TELEGRAM_TON'>
  ownership: {
    owned: boolean
    equipped: boolean
  }
}

export interface LoadoutSummary {
  equippedSkinId: string | null
  equippedColorId: string | null
  applied: {
    skinId: string | null
    color: string
  }
  skins: Array<{
    id: string
    name: string
    rarity: string
    thumbnailUrl: string
    acquiredAt: string
    source: string
    skinId: string | null
  }>
  colors: Array<{
    id: string
    name: string
    rarity: string
    previewColor: string | null
    acquiredAt: string
    source: string
  }>
}

export interface WalletSummary {
  balance: number
  lifetimeEarned: number
  lifetimeSpent: number
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  const payload = (await response.json().catch(() => null)) as T | { error?: string } | null
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload && payload.error
        ? String(payload.error)
        : `Request failed with status ${response.status}`
    throw new Error(message)
  }

  return payload as T
}

export const backendApi = {
  getViewer: () => request<ViewerSummary>('/api/me'),
  getShopItems: () => request<{ total: number; items: CatalogItem[] }>('/api/shop/items'),
  getTokens: () => request<WalletSummary>('/api/user/tokens'),
  getLoadout: () => request<LoadoutSummary>('/api/user/loadout'),
  claimDailyReward: () =>
    request<{ day: number; reward: { coins: number }; newStreak: number; newTokenBalance: number }>(
      '/api/daily-claim',
      { method: 'POST' }
    ),
  buyItem: (itemId: string, paymentMethod: 'COINS' | 'TELEGRAM_TON' = 'COINS') =>
    request<{
      purchaseId: string
      item: { id: string; name: string; category: 'SKIN' | 'COLOR_PACK' }
      newTokenBalance?: number
      checkout?: {
        provider: 'TELEGRAM_TON'
        network: 'TON'
        wallet: 'TELEGRAM'
        externalReference: string
        status: 'PENDING'
        amountNano: string | null
        message: string
      }
    }>(`/api/shop/items/${itemId}/buy`, {
      method: 'POST',
      body: JSON.stringify({ paymentMethod }),
    }),
  updateLoadout: (body: { skinItemId?: string; colorItemId?: string }) =>
    request<LoadoutSummary>('/api/user/loadout', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}

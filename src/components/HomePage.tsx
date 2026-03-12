import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Coins,
  Info,
  Palette,
  Play,
  Shield,
  ShoppingBag,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react'
import { useSocketStore } from '@/stores/SocketStore'
import { useGameStore } from '@/stores/GameStore'
import {
  backendApi,
  type CatalogItem,
  type LoadoutSummary,
  type QueueMode,
  type ViewerSummary,
  type WalletSummary,
} from '@/lib/backend-api'

const DEFAULT_GUEST_LOADOUT: LoadoutSummary = {
  equippedSkinId: null,
  equippedColorId: null,
  applied: {
    skinId: null,
    color: '#2E90FF',
  },
  skins: [],
  colors: [],
}

const ROOM_BY_QUEUE: Record<QueueMode, string> = {
  guest: 'guest-global',
  competitive: 'competitive-global',
  casual_powerups: 'casual-global',
}

const QUEUE_COPY: Record<
  QueueMode,
  {
    title: string
    description: string
    badge: string
    requiresRegistered: boolean
  }
> = {
  guest: {
    title: 'Guest Queue',
    description:
      'Play immediately with a default blob. No persistent coins, inventory, or registered progression.',
    badge: 'Browse + play',
    requiresRegistered: false,
  },
  competitive: {
    title: 'Competitive Queue',
    description:
      'Registered-only fair matches. Cosmetics apply, but future combat entitlements stay disabled here.',
    badge: 'Registered only',
    requiresRegistered: true,
  },
  casual_powerups: {
    title: 'Casual Powerups',
    description:
      'Registered-only social queue reserved for future entitlement-based experiments. Cosmetics ship first.',
    badge: 'Registered only',
    requiresRegistered: true,
  },
}

const storageKeyForViewer = (viewer: ViewerSummary | null) =>
  viewer?.isRegistered
    ? 'battle-circles:last-queue:registered'
    : 'battle-circles:last-queue:anonymous'

const isQueueAllowed = (viewer: ViewerSummary | null, queue: QueueMode) =>
  queue === 'guest' || Boolean(viewer?.isRegistered)

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string
      }
    }
  }
}

const HomePage: React.FC = () => {
  const [playerName, setPlayerName] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [selectedQueue, setSelectedQueue] = useState<QueueMode>('guest')
  const [viewer, setViewer] = useState<ViewerSummary | null>(null)
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [wallet, setWallet] = useState<WalletSummary | null>(null)
  const [loadout, setLoadout] = useState<LoadoutSummary>(DEFAULT_GUEST_LOADOUT)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [commerceMessage, setCommerceMessage] = useState<string | null>(null)
  const [isRefreshingEconomy, setIsRefreshingEconomy] = useState(true)
  const navigate = useNavigate()

  const { connect, joinGame, isConnected, connectionStatus } = useSocketStore()
  const { updateUIState } = useGameStore()

  const connectionResolverRef = useRef<{
    resolve: () => void
    reject: (reason: string) => void
  } | null>(null)
  const connectionStatusRef = useRef(connectionStatus)

  useEffect(() => {
    connectionStatusRef.current = connectionStatus

    if (!connectionResolverRef.current) return

    if (connectionStatus === 'connected') {
      connectionResolverRef.current.resolve()
      connectionResolverRef.current = null
    } else if (connectionStatus === 'error') {
      connectionResolverRef.current.reject('Could not connect to the server. Is it running?')
      connectionResolverRef.current = null
    }
  }, [connectionStatus])

  const waitForConnection = (timeoutMs = 6000): Promise<void> =>
    new Promise((resolve, reject) => {
      if (connectionStatusRef.current === 'connected') {
        resolve()
        return
      }

      connectionResolverRef.current = { resolve, reject }
      const timer = window.setTimeout(() => {
        if (connectionResolverRef.current) {
          connectionResolverRef.current.reject(
            'Connection timed out. Check that the server is running.'
          )
          connectionResolverRef.current = null
        }
      }, timeoutMs)

      const originalResolve = connectionResolverRef.current.resolve
      const originalReject = connectionResolverRef.current.reject
      connectionResolverRef.current = {
        resolve: () => {
          window.clearTimeout(timer)
          originalResolve()
        },
        reject: reason => {
          window.clearTimeout(timer)
          originalReject(reason)
        },
      }
    })

  const refreshEconomy = async () => {
    setIsRefreshingEconomy(true)
    try {
      const nextViewer = await backendApi.getViewer()
      setViewer(nextViewer)

      const shopPromise = backendApi.getShopItems()
      if (!nextViewer.isRegistered) {
        const shop = await shopPromise
        setCatalog(shop.items)
        setWallet(null)
        setLoadout(DEFAULT_GUEST_LOADOUT)
        return
      }

      const [shop, nextWallet, nextLoadout] = await Promise.all([
        shopPromise,
        backendApi.getTokens(),
        backendApi.getLoadout(),
      ])
      setCatalog(shop.items)
      setWallet(nextWallet)
      setLoadout(nextLoadout)
    } catch (error) {
      console.error('Failed to refresh economy state:', error)
      setJoinError('Failed to load queue and economy data from the backend.')
    } finally {
      setIsRefreshingEconomy(false)
    }
  }

  useEffect(() => {
    void refreshEconomy()
  }, [])

  useEffect(() => {
    const key = storageKeyForViewer(viewer)
    const stored = window.localStorage.getItem(key) as QueueMode | null
    const nextQueue =
      stored && isQueueAllowed(viewer, stored)
        ? stored
        : viewer?.isRegistered
          ? 'competitive'
          : 'guest'
    setSelectedQueue(nextQueue)
  }, [viewer?.isRegistered])

  useEffect(() => {
    if (!isQueueAllowed(viewer, selectedQueue)) {
      return
    }
    window.localStorage.setItem(storageKeyForViewer(viewer), selectedQueue)
  }, [selectedQueue, viewer])

  useEffect(() => {
    if (isConnected) setJoinError(null)
  }, [isConnected])

  const selectedQueueConfig = QUEUE_COPY[selectedQueue]
  const selectedRoomId = ROOM_BY_QUEUE[selectedQueue]
  const tokenBalance = wallet?.balance ?? 0
  const shopSkins = useMemo(() => catalog.filter(item => item.category === 'SKIN'), [catalog])
  const shopColors = useMemo(
    () => catalog.filter(item => item.category === 'COLOR_PACK'),
    [catalog]
  )

  const signInRequiredMessage =
    'Registered queues, purchases, and custom loadouts require a Telegram-linked account.'

  const handleTelegramSignIn = async () => {
    const initData = window.Telegram?.WebApp?.initData
    if (!initData) {
      setCommerceMessage('Telegram sign-in is only available inside the Telegram Mini App context.')
      return
    }

    try {
      const { authClient } = await import('@/lib/auth-client')
      const telegramClient = authClient as unknown as {
        signInWithMiniApp?: (
          value: string
        ) => Promise<{ data: unknown; error: null } | { data: null; error: { message?: string } }>
      }

      if (!telegramClient.signInWithMiniApp) {
        setCommerceMessage('Telegram sign-in is not configured on the client yet.')
        return
      }

      const result = await telegramClient.signInWithMiniApp(initData)
      if (result.error) {
        setCommerceMessage(result.error.message ?? 'Telegram sign-in failed.')
        return
      }

      setCommerceMessage('Telegram account linked. Refreshing queue and wallet access…')
      await refreshEconomy()
    } catch (error) {
      setCommerceMessage(error instanceof Error ? error.message : 'Telegram sign-in failed.')
    }
  }

  const handleJoinGame = async () => {
    if (!playerName.trim()) {
      setJoinError('Please enter your name.')
      return
    }

    if (playerName.trim().length > 20) {
      setJoinError('Name must be 20 characters or less.')
      return
    }

    if (selectedQueueConfig.requiresRegistered && !viewer?.isRegistered) {
      setJoinError(signInRequiredMessage)
      return
    }

    setJoinError(null)
    setIsJoining(true)

    try {
      if (!isConnected) {
        connect()
      }

      await waitForConnection()

      updateUIState({
        playerName: playerName.trim(),
        isJoined: true,
        showWaitingRoom: true,
      })

      await joinGame(playerName.trim(), {
        roomId: selectedRoomId,
        skinId: viewer?.isRegistered ? (loadout.applied.skinId ?? undefined) : undefined,
        color: viewer?.isRegistered ? loadout.applied.color : DEFAULT_GUEST_LOADOUT.applied.color,
      })

      navigate('/waiting')
    } catch (error) {
      const message = typeof error === 'string' ? error : 'Failed to join game. Please try again.'
      console.error('Failed to join game:', error)
      setJoinError(message)
    } finally {
      setIsJoining(false)
    }
  }

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connecting':
        return 'Connecting to server...'
      case 'connected':
        return 'Connected to server'
      case 'reconnecting':
        return 'Reconnecting...'
      case 'error':
        return 'Connection failed'
      case 'disconnected':
      default:
        return 'Not connected'
    }
  }

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return '#4ECDC4'
      case 'connecting':
      case 'reconnecting':
        return '#FFEAA7'
      case 'error':
        return '#FF6B6B'
      case 'disconnected':
      default:
        return '#DDA0DD'
    }
  }

  const updateCatalogAndLoadout = async () => {
    const [shop, nextLoadout, nextWallet] = await Promise.all([
      backendApi.getShopItems(),
      backendApi.getLoadout(),
      backendApi.getTokens(),
    ])
    setCatalog(shop.items)
    setLoadout(nextLoadout)
    setWallet(nextWallet)
  }

  const handleClaimDailyReward = async () => {
    if (!viewer?.isRegistered) {
      setCommerceMessage(signInRequiredMessage)
      return
    }

    try {
      const result = await backendApi.claimDailyReward()
      setCommerceMessage(`Daily claim received: +${result.reward.coins} coins.`)
      await updateCatalogAndLoadout()
    } catch (error) {
      setCommerceMessage(error instanceof Error ? error.message : 'Daily claim failed.')
    }
  }

  const handleBuyItem = async (item: CatalogItem, paymentMethod: 'COINS' | 'TELEGRAM_TON') => {
    if (!viewer?.isRegistered) {
      setCommerceMessage(signInRequiredMessage)
      return
    }

    try {
      const result = await backendApi.buyItem(item.id, paymentMethod)
      setCommerceMessage(
        result.checkout
          ? `${item.name}: pending Telegram TON checkout reference ${result.checkout.externalReference}.`
          : `${item.name} unlocked and applied to your account.`
      )
      await updateCatalogAndLoadout()
    } catch (error) {
      setCommerceMessage(error instanceof Error ? error.message : 'Purchase failed.')
    }
  }

  const handleEquipSkin = async (skinId: string) => {
    if (!viewer?.isRegistered) {
      setCommerceMessage(signInRequiredMessage)
      return
    }

    try {
      const nextLoadout = await backendApi.updateLoadout({ skinItemId: skinId })
      setLoadout(nextLoadout)
      const shop = await backendApi.getShopItems()
      setCatalog(shop.items)
      setCommerceMessage('Skin equipped for your next registered match.')
    } catch (error) {
      setCommerceMessage(error instanceof Error ? error.message : 'Could not equip skin.')
    }
  }

  const handleEquipColor = async (colorId: string) => {
    if (!viewer?.isRegistered) {
      setCommerceMessage(signInRequiredMessage)
      return
    }

    try {
      const nextLoadout = await backendApi.updateLoadout({ colorItemId: colorId })
      setLoadout(nextLoadout)
      const shop = await backendApi.getShopItems()
      setCatalog(shop.items)
      setCommerceMessage('Blob color updated for your next registered match.')
    } catch (error) {
      setCommerceMessage(error instanceof Error ? error.message : 'Could not equip color.')
    }
  }

  return (
    <div className='h-dvh overflow-hidden bg-[radial-gradient(circle_at_top,#203050_0%,#12192b_40%,#090d18_100%)] text-white'>
      <div className='mx-auto flex h-full w-full max-w-[1480px] flex-col gap-6 overflow-y-auto px-4 py-4 lg:flex-row lg:items-start'>
        <section className='w-full lg:max-w-[520px]'>
          <div className='animate-[fadeIn_0.5s_ease-out] rounded-card border border-white/10 bg-black/70 p-8 backdrop-blur-[18px]'>
            {joinError && (
              <div
                className='mb-4 rounded-xl border border-[rgba(255,107,107,0.5)] bg-[rgba(255,107,107,0.15)] px-4 py-2.5 text-sm text-accent-red'
                role='alert'
              >
                {joinError}
              </div>
            )}

            <div className='mb-6'>
              <div className='game-logo'>
                <h1>Battle Circles</h1>
              </div>
              <p className='mt-2 text-[1.05rem] text-white/80'>
                Telegram and TON-native economy foundation with a guest queue that stays open for
                browsing and drop-in play.
              </p>
            </div>

            <div className='mb-5 flex flex-wrap items-center gap-3'>
              <div className='flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm'>
                <div
                  className='h-2 w-2 rounded-full'
                  style={{ backgroundColor: getConnectionStatusColor() }}
                />
                {getConnectionStatusText()}
              </div>
              <div className='rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80'>
                {viewer?.isRegistered ? 'Registered account' : 'Anonymous browser / guest'}
              </div>
              {!viewer?.isRegistered && (
                <button className='btn btn-secondary' type='button' onClick={handleTelegramSignIn}>
                  <Wallet size={16} />
                  Link Telegram
                </button>
              )}
            </div>

            <div className='mb-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/8 p-4'>
              <div className='flex items-center gap-2 text-[0.95rem] font-semibold text-cyan-200'>
                <Wallet size={18} />
                TON / Telegram Wallet Path
              </div>
              <p className='mt-2 text-sm leading-6 text-cyan-100/80'>
                Paid purchases are designed around Telegram-native TON checkout. In this phase, coin
                spending works now and TON checkout records pending references for later
                reconciliation.
              </p>
            </div>

            <div className='mb-6'>
              <label className='mb-2 block text-sm font-semibold uppercase tracking-[0.16em] text-white/60'>
                Pilot Name
              </label>
              <input
                type='text'
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                placeholder='Enter your name'
                maxLength={20}
                // biome-ignore lint/a11y/noAutofocus: landing form input
                autoFocus
                disabled={isJoining}
                className='w-full rounded-btn border-2 border-white/20 bg-white/10 px-5 py-3.5 text-base text-white outline-none transition focus:border-white/50 placeholder:text-white/45'
                onKeyDown={e => {
                  if (e.key === 'Enter' && !isJoining) {
                    handleJoinGame()
                  }
                }}
              />
            </div>

            <div className='mb-6 grid gap-3'>
              {(Object.keys(QUEUE_COPY) as QueueMode[]).map(queue => {
                const config = QUEUE_COPY[queue]
                const isSelected = selectedQueue === queue
                const isLocked = config.requiresRegistered && !viewer?.isRegistered

                return (
                  <button
                    key={queue}
                    type='button'
                    onClick={() => setSelectedQueue(isLocked ? 'guest' : queue)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      isSelected
                        ? 'border-cyan-300 bg-cyan-300/10 shadow-[0_0_0_1px_rgba(103,232,249,0.4)]'
                        : 'border-white/12 bg-white/5 hover:bg-white/8'
                    }`}
                  >
                    <div className='flex items-center justify-between gap-4'>
                      <div>
                        <div className='text-base font-semibold text-white'>{config.title}</div>
                        <div className='mt-1 text-sm text-white/70'>{config.description}</div>
                      </div>
                      <div className='shrink-0 rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[0.72rem] uppercase tracking-[0.14em] text-white/70'>
                        {isLocked ? 'Locked' : config.badge}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <button
              className='btn btn-primary mb-5 w-full text-[18px] px-7.5 py-3.75'
              onClick={handleJoinGame}
              disabled={isJoining || !playerName.trim() || isRefreshingEconomy}
            >
              {isJoining ? (
                <>
                  <div className='inline-block h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin' />
                  Joining Queue...
                </>
              ) : (
                <>
                  <Play size={20} />
                  Join {selectedQueueConfig.title}
                </>
              )}
            </button>

            <div className='grid grid-cols-2 gap-3'>
              <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
                <div className='flex items-center gap-2 text-sm font-semibold text-white'>
                  <Shield size={16} />
                  Access
                </div>
                <p className='mt-2 text-sm text-white/70'>
                  {selectedQueueConfig.requiresRegistered && !viewer?.isRegistered
                    ? signInRequiredMessage
                    : `Queue room: ${selectedRoomId}`}
                </p>
              </div>
              <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
                <div className='flex items-center gap-2 text-sm font-semibold text-white'>
                  <Palette size={16} />
                  Active Look
                </div>
                <div className='mt-3 flex items-center gap-3'>
                  <div
                    className='h-10 w-10 rounded-full border-2 border-white/30'
                    style={{ backgroundColor: loadout.applied.color }}
                  />
                  <div className='text-sm text-white/75'>
                    <div>{loadout.applied.skinId ?? 'guest-default'}</div>
                    <div>{loadout.applied.color}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className='grid flex-1 gap-6'>
          <Tabs defaultValue='overview' className='grid gap-6'>
            <TabsList className='inline-flex w-full flex-wrap gap-2 rounded-card border border-white/10 bg-black/45 p-2 backdrop-blur-[18px]'>
              <TabsTrigger value='overview'>Overview</TabsTrigger>
              <TabsTrigger value='economy'>Economy</TabsTrigger>
              <TabsTrigger value='shop'>Shop</TabsTrigger>
              <TabsTrigger value='customizer'>Customizer</TabsTrigger>
            </TabsList>

            <TabsContent value='overview' className='grid gap-6'>
              <div className='grid gap-6 xl:grid-cols-[1.05fr_0.95fr]'>
                <div className='rounded-card border border-white/10 bg-black/60 p-6 backdrop-blur-[18px]'>
                  <div className='mb-4 flex items-center justify-between gap-4'>
                    <div>
                      <h2 className='text-[1.3rem] font-semibold text-white'>Lobby Overview</h2>
                      <p className='mt-1 text-sm text-white/70'>
                        Queue access, economy readiness, and match setup are grouped here for quick
                        review before you join.
                      </p>
                    </div>
                    <div className='rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80'>
                      {selectedQueueConfig.title}
                    </div>
                  </div>

                  <div className='grid gap-4 md:grid-cols-3'>
                    <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
                      <div className='text-xs uppercase tracking-[0.16em] text-white/45'>
                        Queue Room
                      </div>
                      <div className='mt-3 text-lg font-semibold text-white'>{selectedRoomId}</div>
                      <div className='mt-2 text-sm text-white/60'>
                        Active queue destination used by `join_game`.
                      </div>
                    </div>
                    <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
                      <div className='text-xs uppercase tracking-[0.16em] text-white/45'>
                        Account Access
                      </div>
                      <div className='mt-3 text-lg font-semibold text-white'>
                        {viewer?.isRegistered ? 'Registered' : 'Guest'}
                      </div>
                      <div className='mt-2 text-sm text-white/60'>
                        {selectedQueueConfig.requiresRegistered && !viewer?.isRegistered
                          ? signInRequiredMessage
                          : 'Current account can access the selected queue.'}
                      </div>
                    </div>
                    <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
                      <div className='text-xs uppercase tracking-[0.16em] text-white/45'>
                        Active Look
                      </div>
                      <div className='mt-3 text-lg font-semibold text-white'>
                        {loadout.applied.skinId ?? 'guest-default'}
                      </div>
                      <div className='mt-2 text-sm text-white/60'>{loadout.applied.color}</div>
                    </div>
                  </div>

                  {commerceMessage && (
                    <div className='mt-4 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white/80'>
                      {commerceMessage}
                    </div>
                  )}
                </div>

                <div className='rounded-card border border-white/10 bg-black/60 p-6 backdrop-blur-[18px]'>
                  <div className='mb-4 flex items-center gap-2 text-[1.2rem] font-semibold text-white'>
                    <Info size={18} />
                    Match Rules
                  </div>
                  <ul className='space-y-3 text-sm leading-6 text-white/75'>
                    <li>
                      Guest queue is open to anonymous users and does not write persistent economy
                      state.
                    </li>
                    <li>
                      Competitive and casual-powerups queues are reserved for registered accounts.
                    </li>
                    <li>
                      Cosmetics ship first. Future spit-ammo entitlements stay out of competitive
                      mode.
                    </li>
                    <li>
                      Backend keeps wallet, ledger, catalog, inventory, and loadouts; SpacetimeDB
                      only receives match-ready appearance data.
                    </li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            <TabsContent value='economy' className='grid gap-6'>
              <div className='rounded-card border border-white/10 bg-black/60 p-6 backdrop-blur-[18px]'>
                <div className='mb-4 flex items-center justify-between gap-4'>
                  <div>
                    <h2 className='text-[1.3rem] font-semibold text-white'>Coins & Progression</h2>
                    <p className='mt-1 text-sm text-white/70'>
                      Anonymous users can browse the economy. Registered Telegram users unlock
                      balances, claims, purchases, and persistent cosmetics.
                    </p>
                  </div>
                  <button
                    className='btn btn-secondary'
                    type='button'
                    onClick={handleClaimDailyReward}
                  >
                    <Coins size={16} />
                    Daily Claim
                  </button>
                </div>

                <div className='grid gap-4 md:grid-cols-3'>
                  <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
                    <div className='text-xs uppercase tracking-[0.16em] text-white/45'>Balance</div>
                    <div className='mt-3 text-3xl font-semibold text-white'>{tokenBalance}</div>
                    <div className='mt-2 text-sm text-white/60'>
                      Single coin balance for earned and future purchased value.
                    </div>
                  </div>
                  <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
                    <div className='text-xs uppercase tracking-[0.16em] text-white/45'>
                      Applied Skin
                    </div>
                    <div className='mt-3 text-lg font-semibold text-white'>
                      {loadout.applied.skinId ?? 'guest-default'}
                    </div>
                    <div className='mt-2 text-sm text-white/60'>
                      Carried into registered lobbies and matches via `join_game` appearance fields.
                    </div>
                  </div>
                  <div className='rounded-2xl border border-white/10 bg-white/5 p-4'>
                    <div className='text-xs uppercase tracking-[0.16em] text-white/45'>
                      Wallet Rail
                    </div>
                    <div className='mt-3 text-lg font-semibold text-white'>Telegram TON</div>
                    <div className='mt-2 text-sm text-white/60'>
                      Primary checkout path for future paid purchases and token packs.
                    </div>
                  </div>
                </div>

                {commerceMessage && (
                  <div className='mt-4 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white/80'>
                    {commerceMessage}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value='shop' className='grid gap-6'>
              <div className='rounded-card border border-white/10 bg-black/60 p-6 backdrop-blur-[18px]'>
                <div className='mb-5 flex items-center gap-2 text-[1.3rem] font-semibold text-white'>
                  <ShoppingBag size={18} />
                  Shop Browser
                </div>
                <div className='grid gap-3'>
                  {catalog.map(item => (
                    <div
                      key={item.id}
                      className='rounded-2xl border border-white/10 bg-white/5 p-4'
                    >
                      <div className='flex flex-wrap items-start justify-between gap-4'>
                        <div className='flex items-start gap-4'>
                          <div
                            className='flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 text-xs font-semibold uppercase tracking-[0.12em] text-white/80'
                            style={{
                              background:
                                item.previewColor ??
                                'linear-gradient(135deg, rgba(78,205,196,0.25), rgba(255,107,107,0.25))',
                            }}
                          >
                            {item.category === 'SKIN' ? 'Skin' : 'Color'}
                          </div>
                          <div>
                            <div className='flex items-center gap-2'>
                              <div className='text-base font-semibold text-white'>{item.name}</div>
                              <span className='rounded-full border border-white/15 px-2 py-0.5 text-[0.7rem] uppercase tracking-[0.16em] text-white/55'>
                                {item.rarity}
                              </span>
                            </div>
                            <div className='mt-1 text-sm text-white/70'>{item.description}</div>
                            <div className='mt-2 text-xs uppercase tracking-[0.16em] text-white/45'>
                              {item.price.coins !== null ? `${item.price.coins} coins` : 'TON only'}
                              {item.price.ton.amountNano
                                ? ` • ${item.price.ton.amountNano} nanoTON`
                                : ''}
                            </div>
                          </div>
                        </div>

                        <div className='flex flex-wrap items-center gap-2'>
                          {item.ownership.equipped ? (
                            <span className='rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-cyan-100'>
                              Equipped
                            </span>
                          ) : item.ownership.owned ? (
                            <button
                              type='button'
                              className='btn btn-secondary'
                              onClick={() =>
                                item.category === 'SKIN'
                                  ? handleEquipSkin(item.id)
                                  : handleEquipColor(item.id)
                              }
                            >
                              <Sparkles size={16} />
                              Equip
                            </button>
                          ) : (
                            <>
                              <button
                                type='button'
                                className='btn btn-secondary'
                                onClick={() => handleBuyItem(item, 'COINS')}
                              >
                                <Coins size={16} />
                                Buy
                              </button>
                              <button
                                type='button'
                                className='btn btn-secondary'
                                onClick={() => handleBuyItem(item, 'TELEGRAM_TON')}
                              >
                                <Wallet size={16} />
                                TON
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value='customizer' className='grid gap-6'>
              <div className='rounded-card border border-white/10 bg-black/60 p-6 backdrop-blur-[18px]'>
                <div className='mb-5 flex items-center gap-2 text-[1.3rem] font-semibold text-white'>
                  <Palette size={18} />
                  Customizer
                </div>

                <div className='rounded-2xl border border-white/10 bg-white/5 p-5'>
                  <div className='mb-4 flex items-center gap-4'>
                    <div
                      className='h-[72px] w-[72px] rounded-full border-[3px] border-white/25'
                      style={{ backgroundColor: loadout.applied.color }}
                    />
                    <div>
                      <div className='text-lg font-semibold text-white'>
                        {loadout.applied.skinId ?? 'guest-default'}
                      </div>
                      <div className='text-sm text-white/65'>{loadout.applied.color}</div>
                    </div>
                  </div>

                  <div className='space-y-5'>
                    <div>
                      <div className='mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-white/55'>
                        <Sparkles size={14} />
                        Owned Skins
                      </div>
                      <div className='grid gap-2'>
                        {(viewer?.isRegistered ? loadout.skins : shopSkins.slice(0, 2)).map(
                          item => (
                            <button
                              key={item.id}
                              type='button'
                              className='flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/8'
                              onClick={() => handleEquipSkin(item.id)}
                            >
                              <span className='text-sm text-white'>{item.name}</span>
                              <span className='text-xs uppercase tracking-[0.16em] text-white/45'>
                                {loadout.equippedSkinId === item.id ? 'Active' : 'Equip'}
                              </span>
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    <div>
                      <div className='mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-white/55'>
                        <Palette size={14} />
                        Owned Colors
                      </div>
                      <div className='grid gap-2'>
                        {(viewer?.isRegistered ? loadout.colors : shopColors.slice(0, 2)).map(
                          item => (
                            <button
                              key={item.id}
                              type='button'
                              className='flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/8'
                              onClick={() => handleEquipColor(item.id)}
                            >
                              <span className='flex items-center gap-3 text-sm text-white'>
                                <span
                                  className='h-4 w-4 rounded-full border border-white/30'
                                  style={{ backgroundColor: item.previewColor ?? '#2E90FF' }}
                                />
                                {item.name}
                              </span>
                              <span className='text-xs uppercase tracking-[0.16em] text-white/45'>
                                {loadout.equippedColorId === item.id ? 'Active' : 'Equip'}
                              </span>
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className='mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70'>
                  <div className='flex items-center gap-2 font-semibold text-white'>
                    <Users size={16} />
                    Registration Gate
                  </div>
                  <p className='mt-2 leading-6'>
                    Anonymous users can browse the catalog and play the guest queue. Registered
                    games and persistent cosmetics are reserved for Telegram-linked sessions.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </section>
      </div>

      <style>{`
        .game-logo h1 {
          font-size: 3.1em;
          margin-bottom: 10px;
          background: linear-gradient(45deg, #ff8a5b, #5ce1e6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-align: left;
        }

        @media (max-width: 768px) {
          .game-logo h1 {
            font-size: 2.4em;
            text-align: center;
          }
        }
      `}</style>
    </div>
  )
}

export default HomePage

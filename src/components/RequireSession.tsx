import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useGameStore } from '@/stores/GameStore'
import { useSocketStore } from '@/stores/SocketStore'
import { useBeforeUnload } from '@/hooks/useBeforeUnload'

interface RequireSessionProps {
  children: React.ReactNode
}

/**
 * Route guard for /waiting and /game.
 *
 * /waiting — only requires an active socket connection. localPlayerId is not
 *   set yet at this stage (it gets set when the game transitions to PLAYING).
 *
 * /game — requires both an active socket connection AND a localPlayerId,
 *   meaning the player went through the full join → start flow.
 *
 * Grace period: on initial mount we wait one tick before evaluating the
 * session check. This prevents a false-negative redirect when navigation and
 * a Zustand state update (setLocalPlayerId) are dispatched in the same
 * synchronous callback — React renders the new route before Zustand has
 * flushed the update, so localPlayerId appears null for exactly one render.
 *
 * In both cases, a beforeunload prompt is shown while the session is valid so
 * the browser warns before an accidental refresh or tab close.
 */
const RequireSession: React.FC<RequireSessionProps> = ({ children }) => {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const { localPlayerId, resetGame } = useGameStore()
  const { isConnected, disconnect } = useSocketStore()

  // Don't evaluate the guard on the very first render — give Zustand one tick
  // to flush any state updates that were dispatched just before navigation.
  const [mounted, setMounted] = useState(false)
  const mountedRef = useRef(false)

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      // Use setTimeout(0) rather than relying on the useEffect flush order,
      // so we're guaranteed to be after Zustand's own subscriber notifications.
      setTimeout(() => setMounted(true), 0)
    }
  }, [])

  // /game needs a fully established player identity; /waiting just needs the socket.
  const hasSession = pathname === '/game' ? isConnected && Boolean(localPlayerId) : isConnected

  // Warn before refresh / tab close while the session is live
  useBeforeUnload(hasSession)

  useEffect(() => {
    // Skip until the grace period has elapsed
    if (!mounted) return

    if (!hasSession) {
      // Clean up stale store state so the home page starts completely fresh
      resetGame()
      disconnect()
      navigate('/', { replace: true })
    }
  }, [mounted, hasSession, navigate, resetGame, disconnect])

  // Render nothing until the grace period has passed to avoid a flash of
  // either the protected page (if redirecting) or a broken half-state.
  if (!mounted) return null

  // After mount, render nothing while redirecting
  if (!hasSession) return null

  return <>{children}</>
}

export default RequireSession

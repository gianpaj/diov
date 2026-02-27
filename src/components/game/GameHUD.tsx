import React, { useState, useEffect } from 'react'
import { Users, Clock, Target, Zap } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useGameStore } from '@/stores/GameStore'
import { useSocketStore } from '@/stores/SocketStore'
import { GameStatus } from '@/types'

const GameHUD: React.FC = () => {
  const { gameState, localPlayer } = useGameStore()

  const { latency } = useSocketStore()

  if (!gameState || !localPlayer) return null

  // Calculate time remaining — uses gameState.duration (from server) not the
  // frontend default config, because gameConfig.gameDuration is a static default
  // that doesn't reflect what the server actually sent.
  const calcTimeRemaining = () => {
    if (gameState.status !== GameStatus.PLAYING) return 0
    const elapsed = Date.now() - gameState.startTime
    return Math.max(0, gameState.duration - elapsed)
  }

  // Local tick so the clock updates every second without waiting for a server frame.
  const [timeLeft, setTimeLeft] = useState(calcTimeRemaining)

  useEffect(() => {
    // Re-sync immediately whenever the game state changes (new server frame).
    setTimeLeft(calcTimeRemaining())

    if (gameState.status !== GameStatus.PLAYING) return

    const id = setInterval(() => {
      setTimeLeft(calcTimeRemaining())
    }, 500) // 500 ms for smooth updates without drift

    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.status, gameState.startTime, gameState.duration])

  // Format time as MM:SS
  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.ceil(milliseconds / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  // Get player rank
  const getPlayerRank = () => {
    const alivePlayers = Object.values(gameState.players)
      .filter(p => p.isAlive)
      .sort((a, b) => b.size - a.size)

    const rank = alivePlayers.findIndex(p => p.id === localPlayer.id) + 1
    return rank || alivePlayers.length + 1
  }

  // Get alive player count
  const getAliveCount = () => {
    return Object.values(gameState.players).filter(p => p.isAlive).length
  }

  const playerRank = getPlayerRank()
  const aliveCount = getAliveCount()
  const isTimeRunningOut = timeLeft < 60000 // Less than 1 minute

  return (
    <div className='absolute top-0 left-0 w-full pointer-events-none z-[10]'>
      <div className='absolute top-5 left-1/2 -translate-x-1/2 flex gap-[15px] items-center bg-black/40 px-5 py-3 rounded-[25px] backdrop-blur-[15px] border border-white/[0.15] shadow-[0_4px_20px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]'>
        {/* Time remaining */}
        <div
          className={cn(
            'hud-item time flex items-center gap-1.5 text-white text-sm font-semibold whitespace-nowrap',
            isTimeRunningOut && 'text-accent-red animate-pulse'
          )}
          style={
            {
              '--dot-color': isTimeRunningOut ? '#ff6b6b' : '#4ecdc4',
            } as React.CSSProperties
          }
        >
          <Clock size={18} />
          <span
            className={cn(
              'font-bold [text-shadow:0_1px_2px_rgba(0,0,0,0.5)] transition-colors duration-200 font-mono text-base',
              isTimeRunningOut && 'text-accent-red'
            )}
          >
            {formatTime(timeLeft)}
          </span>
        </div>

        {/* Player count */}
        <div className='flex items-center gap-1.5 text-white text-sm font-semibold whitespace-nowrap'>
          <Users size={18} />
          <span className='font-bold [text-shadow:0_1px_2px_rgba(0,0,0,0.5)] transition-colors duration-200 text-accent-yellow'>
            {aliveCount}
          </span>
        </div>

        {/* Player rank */}
        <div className='flex items-center gap-1.5 text-white text-sm font-semibold whitespace-nowrap'>
          <Target size={18} />
          <span className='font-bold [text-shadow:0_1px_2px_rgba(0,0,0,0.5)] transition-colors duration-200 text-accent-teal'>
            #{playerRank}
          </span>
        </div>

        {/* Player size */}
        <div className='flex items-center gap-1.5 text-white text-sm font-semibold whitespace-nowrap'>
          <div
            className='rounded-full border-2 border-white/80 shadow-[0_0_4px_rgba(0,0,0,0.3)] transition-all duration-200'
            style={{
              backgroundColor: localPlayer.color,
              width: Math.max(12, Math.min(localPlayer.size / 3, 24)),
              height: Math.max(12, Math.min(localPlayer.size / 3, 24)),
            }}
          />
          <span className='font-bold [text-shadow:0_1px_2px_rgba(0,0,0,0.5)] transition-colors duration-200'>
            {Math.round(localPlayer.size)}
          </span>
        </div>

        {/* Network latency (only show if > 100ms) */}
        {latency > 100 && (
          <div
            className={cn(
              'flex items-center gap-1.5 text-white font-semibold whitespace-nowrap text-xs opacity-80',
              latency > 200 && 'text-accent-red animate-pulse'
            )}
          >
            <Zap size={16} />
            <span
              className={cn(
                'font-bold [text-shadow:0_1px_2px_rgba(0,0,0,0.5)] transition-colors duration-200',
                latency > 200 && 'text-accent-red'
              )}
            >
              {latency}ms
            </span>
          </div>
        )}
      </div>

      {/* Map boundaries indicator */}
      {gameState.bounds && (
        <div className='absolute top-5 right-5'>
          <div className='bg-black/40 rounded-lg p-2 backdrop-blur-[10px] border border-white/10'>
            <div
              style={{
                width: '100px',
                height: '60px',
                position: 'relative',
                border: '2px solid rgba(255, 71, 87, 0.6)',
                borderRadius: '4px',
                background: 'rgba(0, 0, 0, 0.3)',
              }}
            >
              {/* Player dot on minimap */}
              {localPlayer && (
                <div
                  style={{
                    position: 'absolute',
                    width: '4px',
                    height: '4px',
                    borderRadius: '50%',
                    backgroundColor: localPlayer.color,
                    left: `${((localPlayer.position.x - gameState.bounds.x) / gameState.bounds.width) * 96}px`,
                    top: `${((localPlayer.position.y - gameState.bounds.y) / gameState.bounds.height) * 56}px`,
                    transform: 'translate(-50%, -50%)',
                    boxShadow: '0 0 4px rgba(255, 255, 255, 0.8)',
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* Dot indicator — driven by --dot-color CSS var set via inline style prop */
        .hud-item.time { position: relative; }
        .hud-item.time::before {
          content: '';
          position: absolute;
          left: -8px; top: 50%;
          transform: translateY(-50%);
          width: 3px; height: 3px;
          border-radius: 50%;
          background: var(--dot-color, #4ecdc4);
          box-shadow: 0 0 6px var(--dot-color, #4ecdc4);
        }
      `}</style>
    </div>
  )
}

export default GameHUD

import React from 'react'
import { Users, Clock, Target, Zap } from 'lucide-react'
import { useGameStore } from '@/stores/GameStore'
import { useSocketStore } from '@/stores/SocketStore'
import { GameStatus } from '@/types'

const GameHUD: React.FC = () => {
  const { gameState, localPlayer, gameConfig } = useGameStore()

  const { latency } = useSocketStore()

  if (!gameState || !localPlayer) return null

  // Calculate time remaining
  const timeRemaining = () => {
    if (gameState.status !== GameStatus.PLAYING) return 0
    const elapsed = Date.now() - gameState.startTime
    return Math.max(0, gameConfig.gameDuration - elapsed)
  }

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

  const timeLeft = timeRemaining()
  const playerRank = getPlayerRank()
  const aliveCount = getAliveCount()
  const isTimeRunningOut = timeLeft < 60000 // Less than 1 minute

  return (
    <div className='game-hud'>
      <div className='hud-container'>
        {/* Time remaining */}
        <div
          className={`hud-item time ${isTimeRunningOut ? 'warning' : ''}`}
          style={
            {
              '--dot-color': isTimeRunningOut ? '#ff6b6b' : '#4ecdc4',
            } as React.CSSProperties
          }
        >
          <Clock size={18} />
          <span className='hud-value'>{formatTime(timeLeft)}</span>
        </div>

        {/* Player count */}
        <div className='hud-item players'>
          <Users size={18} />
          <span className='hud-value'>{aliveCount}</span>
        </div>

        {/* Player rank */}
        <div className='hud-item rank'>
          <Target size={18} />
          <span className='hud-value'>#{playerRank}</span>
        </div>

        {/* Player size */}
        <div className='hud-item size'>
          <div
            className='size-circle'
            style={{
              backgroundColor: localPlayer.color,
              width: Math.max(12, Math.min(localPlayer.size / 3, 24)),
              height: Math.max(12, Math.min(localPlayer.size / 3, 24)),
            }}
          />
          <span className='hud-value'>{Math.round(localPlayer.size)}</span>
        </div>

        {/* Network latency (only show if > 100ms) */}
        {latency > 100 && (
          <div className={`hud-item latency ${latency > 200 ? 'warning' : ''}`}>
            <Zap size={16} />
            <span className='hud-value'>{latency}ms</span>
          </div>
        )}
      </div>

      {/* Map boundaries indicator */}
      {gameState.bounds && (
        <div className='minimap'>
          <div className='minimap-container'>
            <div
              className='minimap-boundary'
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
                  className='minimap-player'
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
        .game-hud {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          pointer-events: none;
          z-index: 10;
        }

        .hud-container {
          position: absolute;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 15px;
          align-items: center;
          background: rgba(0, 0, 0, 0.4);
          padding: 12px 20px;
          border-radius: 25px;
          backdrop-filter: blur(15px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .hud-item {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #fff;
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
        }

        .hud-item.warning {
          color: #ff6b6b;
          animation: pulse 1s ease-in-out infinite;
        }

        .hud-item.warning .hud-value {
          color: #ff6b6b;
        }

        .hud-value {
          color: #fff;
          font-weight: 700;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        }

        .time .hud-value {
          font-family: 'Courier New', monospace;
          font-size: 16px;
        }

        .size-circle {
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 0 4px rgba(0, 0, 0, 0.3);
        }

        .rank .hud-value {
          color: #4ecdc4;
        }

        .players .hud-value {
          color: #ffeaa7;
        }

        .latency {
          font-size: 12px;
          opacity: 0.8;
        }

        .latency.warning .hud-value {
          color: #ff6b6b;
        }

        .minimap {
          position: absolute;
          top: 20px;
          right: 20px;
        }

        .minimap-container {
          background: rgba(0, 0, 0, 0.4);
          border-radius: 8px;
          padding: 8px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .minimap-player {
          transition: all 0.1s ease;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }

        @media (max-width: 768px) {
          .hud-container {
            top: 15px;
            padding: 10px 16px;
            gap: 12px;
          }

          .hud-item {
            font-size: 13px;
          }

          .time .hud-value {
            font-size: 14px;
          }

          .minimap {
            top: 15px;
            right: 15px;
          }

          .minimap-container {
            padding: 6px;
          }

          .minimap-boundary {
            width: 80px !important;
            height: 48px !important;
          }
        }

        /* Status dot on the time HUD item — colour driven by --dot-color CSS var
           set via inline style on the element so JS state controls it without
           needing styled-jsx interpolation. */
        .hud-item.time {
          position: relative;
        }

        .hud-item.time::before {
          content: '';
          position: absolute;
          left: -8px;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: var(--dot-color, #4ecdc4);
          box-shadow: 0 0 6px var(--dot-color, #4ecdc4);
        }

        /* Smooth transitions */
        .hud-value {
          transition: color 0.2s ease;
        }

        .size-circle {
          transition: all 0.2s ease;
        }

        /* Add subtle glow effects */
        .hud-container {
          box-shadow:
            0 4px 20px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .hud-item svg {
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
        }
      `}</style>
    </div>
  )
}

export default GameHUD

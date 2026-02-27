import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Clock, Play, ArrowLeft, Wifi, WifiOff } from 'lucide-react'
import { useSocketStore } from '@/stores/SocketStore'
import { useGameStore } from '@/stores/GameStore'
import { GameStatus } from '@/types'

const WaitingRoom: React.FC = () => {
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState<number | null>(null)

  const {
    socketId,
    isConnected,
    connectionStatus,
    onGameStateUpdate,
    onGameStarted,
    leaveGame,
    startGame,
  } = useSocketStore()

  const { gameState, uiState, updateUIState, gameConfig, setLocalPlayerId } = useGameStore()

  // Derive the player list directly from the Zustand store's gameState rather
  // than a separate local useState. This avoids a race where the game_state
  // packet arrives before the useEffect listener is registered (effects run
  // after the first paint, but the server sends game_state immediately on join).
  const players = useMemo(() => (gameState ? Object.values(gameState.players) : []), [gameState])

  // Derive player count and host status from local list + game state
  const playerCount = players.length
  const minPlayers = gameConfig.minPlayers
  const maxPlayers = gameConfig.maxPlayers
  const canStartGame = playerCount >= minPlayers
  // Use socket id to determine if this client is the host.
  // Falls back to false (not undefined) so the Start button never shows for guests.
  const hostId = gameState?.hostId
  const isHost = Boolean(socketId && hostId && socketId === hostId)

  useEffect(() => {
    // Set up socket event listeners
    const unsubscribeGameState = onGameStateUpdate(state => {
      // If game is starting, show countdown
      if (state.status === GameStatus.STARTING) {
        const timeUntilStart = state.startTime - Date.now()
        if (timeUntilStart > 0) {
          setCountdown(Math.ceil(timeUntilStart / 1000))
        }
      }

      // If game is playing, resolve the local player then navigate.
      if (state.status === GameStatus.PLAYING) {
        if (socketId) {
          setLocalPlayerId(socketId)
        }
        navigate('/game')
      }
    })

    const unsubscribeGameStarted = onGameStarted(data => {
      // Just drive the visible countdown — navigation is handled exclusively
      // by the onGameStateUpdate handler when status flips to PLAYING.
      setCountdown(data.countdown)
    })

    return () => {
      unsubscribeGameState()
      unsubscribeGameStarted()
    }
  }, [onGameStateUpdate, onGameStarted, navigate])

  // Countdown effect
  useEffect(() => {
    if (countdown === null || countdown <= 0) return

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          return null
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [countdown])

  const handleLeaveGame = () => {
    leaveGame()
    updateUIState({
      isJoined: false,
      showWaitingRoom: false,
    })
    navigate('/')
  }

  const getPlayerStatusText = () => {
    if (playerCount < minPlayers) {
      return `Waiting for ${minPlayers - playerCount} more players...`
    }
    if (gameState?.status === GameStatus.STARTING) {
      return 'Game starting soon!'
    }
    return 'Ready to start!'
  }

  const getConnectionIcon = () => {
    return isConnected ? <Wifi size={16} /> : <WifiOff size={16} />
  }

  const getConnectionColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return '#4ECDC4'
      case 'connecting':
      case 'reconnecting':
        return '#FFEAA7'
      case 'error':
        return '#FF6B6B'
      default:
        return '#DDA0DD'
    }
  }

  const handleStartGame = () => {
    // Just tell the server to start — navigation is driven by the
    // onGameStateUpdate handler when status flips to PLAYING.
    startGame()
  }

  if (countdown !== null) {
    return (
      <div className='w-screen h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_center,#1a1a2e_0%,#16213e_35%,#0f0f23_100%)]'>
        <div className='text-center bg-black/80 rounded-card px-15 py-15 backdrop-blur-[20px] border border-white/10'>
          <h1 className='text-[2.5em] mb-7.5 text-white'>Game Starting!</h1>
          <div className='text-[8em] font-bold text-accent-red my-5 [text-shadow:0_0_30px_rgba(255,107,107,0.5)] animate-pulse'>
            {countdown}
          </div>
          <p className='text-[1.3em] text-white/80 mt-5'>Get ready to battle!</p>
        </div>
      </div>
    )
  }

  return (
    <div className='w-screen h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_center,#1a1a2e_0%,#16213e_35%,#0f0f23_100%)]'>
      <div className='animate-[fadeIn_0.5s_ease-out] bg-black/80 rounded-card p-7.5 backdrop-blur-[20px] border border-white/10 min-w-150 max-w-200 max-h-[90vh] overflow-y-auto'>
        {/* Header */}
        <div className='flex justify-between items-center mb-7.5 pb-5 border-b border-white/10'>
          <div className='flex-1'>
            <button
              className='btn btn-secondary'
              type='button'
              onClick={handleLeaveGame}
              style={{ padding: '10px 15px', fontSize: '14px' }}
            >
              <ArrowLeft size={16} />
              Leave
            </button>
          </div>

          <div className='flex-none'>
            <h2 className='text-white m-0 text-[1.8em]'>Waiting Room</h2>
          </div>

          <div className='flex-1 flex justify-end'>
            <div
              className='flex items-center gap-1.5 text-sm'
              style={{ color: getConnectionColor() }}
            >
              {getConnectionIcon()}
              <span>{connectionStatus}</span>
            </div>
          </div>
        </div>

        <div className='flex flex-col gap-7.5'>
          {/* Game status */}
          <div className='text-center'>
            <div className='flex items-center justify-center gap-5 bg-white/5 rounded-[15px] p-5 border border-white/10 mb-5'>
              <div className='text-accent-teal'>
                <Users size={32} />
              </div>
              <div>
                <h3 className='m-0 mb-1 text-white text-[1.5em]'>
                  {playerCount} / {maxPlayers} Players
                </h3>
                <p className='m-0 text-white/70 text-[1.1em]'>{getPlayerStatusText()}</p>
              </div>
            </div>

            <div className='flex flex-col gap-2.5'>
              {/* Progress bar */}
              <div className='w-full h-2 bg-white/10 rounded overflow-hidden my-2.5'>
                <div
                  className='h-full bg-gradient-to-r from-accent-red to-accent-teal rounded transition-[width] duration-300'
                  style={{ width: `${Math.max((playerCount / minPlayers) * 100, 0)}%` }}
                />
              </div>
              <div className='text-white/80 text-[0.9em] text-center'>
                {canStartGame ? 'Ready!' : `${minPlayers - playerCount} more needed`}
              </div>
              {canStartGame && isHost && (
                <button
                  className='btn btn-primary'
                  onClick={handleStartGame}
                  type='button'
                  style={{ marginTop: '1rem' }}
                >
                  <Play size={18} /> Start Game
                </button>
              )}
            </div>
          </div>

          {/* Player list */}
          <div>
            <h3 className='flex items-center gap-2.5 text-white mb-5 text-[1.3em]'>
              <Users size={20} />
              Players ({playerCount})
            </h3>

            <div className='flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-2.5'>
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className='flex items-center gap-[15px] p-3 bg-white/5 rounded-[10px] border border-white/10 transition-all duration-200 hover:bg-white/10'
                >
                  <div className='shrink-0'>
                    <div
                      className='w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-base'
                      style={{ backgroundColor: player.color }}
                    >
                      {player.name?.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className='flex-1 flex flex-col gap-0.5'>
                    <div className='text-white font-semibold flex items-center gap-2'>
                      {player.name}
                      {player.name === uiState.playerName && (
                        <span className='text-accent-teal text-[0.8em] font-normal'>(You)</span>
                      )}
                    </div>
                    <div className='text-white/60 text-[0.85em]'>Ready</div>
                  </div>
                  <div className='text-white/50 text-[0.9em] font-semibold'>#{index + 1}</div>
                </div>
              ))}

              {/* Empty slots */}
              {Array.from({ length: maxPlayers - playerCount }).map((_, index) => (
                <div
                  key={`empty-${index + 1}`}
                  className='flex items-center gap-[15px] p-3 bg-white/5 rounded-[10px] border border-white/10 transition-all duration-200 opacity-50'
                >
                  <div className='shrink-0'>
                    <div className='w-10 h-10 rounded-full flex items-center justify-center bg-white/10 text-white/50'>
                      <Users size={16} />
                    </div>
                  </div>
                  <div className='flex-1 flex flex-col gap-0.5'>
                    <div className='text-white font-semibold'>Waiting for player...</div>
                    <div className='text-white/60 text-[0.85em]'>Empty</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Room info */}
          <div className='grid grid-cols-2 gap-[15px]'>
            <div className='flex items-center gap-3 p-[15px] bg-white/5 rounded-[10px] border border-white/10'>
              <Clock size={20} />
              <div>
                <h4 className='m-0 mb-0.5 text-white text-[0.95em]'>Game Duration</h4>
                <p className='m-0 text-white/70 text-[0.85em]'>5 minutes</p>
              </div>
            </div>
            <div className='flex items-center gap-3 p-[15px] bg-white/5 rounded-[10px] border border-white/10'>
              <Play size={20} />
              <div>
                <h4 className='m-0 mb-0.5 text-white text-[0.95em]'>Auto Start</h4>
                <p className='m-0 text-white/70 text-[0.85em]'>When {minPlayers}+ join</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WaitingRoom

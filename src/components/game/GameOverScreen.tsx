import React from 'react'
import { Trophy, Home, Users, Clock, Target } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useGameStore } from '@/stores/GameStore'

interface GameOverScreenProps {
  onRestart: () => void
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({ onRestart }) => {
  const { gameState, localPlayer } = useGameStore()

  if (!gameState || !localPlayer) return null

  // Get final stats
  const allPlayers = Object.values(gameState.players).sort((a, b) => b.size - a.size)
  const playerRank = allPlayers.findIndex(p => p.id === localPlayer.id) + 1
  const isWinner = playerRank === 1 && localPlayer.isAlive
  const totalPlayers = allPlayers.length

  // Calculate game duration
  const gameDuration = gameState.endTime ? gameState.endTime - gameState.startTime : 0
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const getResultTitle = () => {
    if (isWinner) return 'Victory!'
    if (playerRank <= 3) return 'Great Job!'
    if (playerRank <= totalPlayers / 2) return 'Good Try!'
    return 'Better Luck Next Time!'
  }

  const getResultColor = () => {
    if (isWinner) return '#FFD700'
    if (playerRank <= 3) return '#4ECDC4'
    if (playerRank <= totalPlayers / 2) return '#FFEAA7'
    return '#FF6B6B'
  }

  const getResultIcon = () => {
    if (isWinner) return <Trophy size={48} />
    return <Target size={48} />
  }

  return (
    <div className='absolute inset-0 flex items-center justify-center z-[100] bg-black/95 backdrop-blur-[20px]'>
      <div className='animate-[fadeIn_0.5s_ease-out] bg-black/80 rounded-[--radius-card] p-10 border border-white/10 max-w-[600px] max-h-[90vh] overflow-y-auto text-center backdrop-blur-[20px]'>
        {/* Result header */}
        <div className='mb-[30px]'>
          <div className='mb-[15px]' style={{ color: getResultColor() }}>
            {getResultIcon()}
          </div>
          <h1
            className='text-[2.5em] mb-2.5 [text-shadow:0_2px_10px_rgba(0,0,0,0.5)]'
            style={{ color: getResultColor() }}
          >
            {getResultTitle()}
          </h1>
          <p className='text-white/80 text-[1.1em] m-0'>
            {isWinner
              ? 'You are the last circle standing!'
              : `You finished ${playerRank}${getOrdinalSuffix(playerRank)} place`}
          </p>
        </div>

        {/* Stats */}
        <div className='mb-[30px]'>
          <div className='grid grid-cols-2 gap-[15px] mb-[30px]'>
            <div className='flex items-center gap-3 p-[15px] bg-white/5 rounded-xl border border-white/10'>
              <div className='text-white/70'><Target size={24} /></div>
              <div className='text-left'>
                <div className='text-2xl font-bold text-[--color-accent-teal] leading-none'>#{playerRank}</div>
                <div className='text-[0.85em] text-white/60 mt-0.5'>Final Rank</div>
              </div>
            </div>

            <div className='flex items-center gap-3 p-[15px] bg-white/5 rounded-xl border border-white/10'>
              <div className='text-white/70'>
                <div
                  className='rounded-full'
                  style={{
                    backgroundColor: localPlayer.color,
                    width: '24px',
                    height: '24px',
                  }}
                />
              </div>
              <div className='text-left'>
                <div className='text-2xl font-bold text-white leading-none'>{Math.round(localPlayer.size)}</div>
                <div className='text-[0.85em] text-white/60 mt-0.5'>Final Size</div>
              </div>
            </div>

            <div className='flex items-center gap-3 p-[15px] bg-white/5 rounded-xl border border-white/10'>
              <div className='text-white/70'><Users size={24} /></div>
              <div className='text-left'>
                <div className='text-2xl font-bold text-white leading-none'>{totalPlayers}</div>
                <div className='text-[0.85em] text-white/60 mt-0.5'>Total Players</div>
              </div>
            </div>

            <div className='flex items-center gap-3 p-[15px] bg-white/5 rounded-xl border border-white/10'>
              <div className='text-white/70'><Clock size={24} /></div>
              <div className='text-left'>
                <div className='text-2xl font-bold text-white leading-none'>{formatDuration(gameDuration)}</div>
                <div className='text-[0.85em] text-white/60 mt-0.5'>Game Duration</div>
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <div className='bg-white/5 rounded-[15px] p-5 border border-white/10'>
            <h3 className='text-white mb-[15px] text-[1.2em]'>Final Leaderboard</h3>
            <div className='flex flex-col gap-2 max-h-[200px] overflow-y-auto'>
              {allPlayers.slice(0, 8).map((player, index) => (
                <div
                  key={player.id}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 bg-white/[0.03] rounded-lg',
                    player.id === localPlayer.id &&
                      'bg-[rgba(78,205,196,0.1)] border border-[rgba(78,205,196,0.3)]',
                  )}
                >
                  <div className='font-bold text-white/80 min-w-[30px] text-left'>#{index + 1}</div>
                  <div className='shrink-0'>
                    <div
                      className='w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm'
                      style={{ backgroundColor: player.color }}
                    >
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className='flex-1 text-left'>
                    <div className='text-white font-semibold text-[0.9em] flex items-center gap-1.5'>
                      {player.name}
                      {player.id === localPlayer.id && (
                        <span className='text-[--color-accent-teal] text-xs font-normal'>(You)</span>
                      )}
                    </div>
                    <div className='text-white/50 text-[0.75em]'>{player.isAlive ? 'Alive' : 'Eliminated'}</div>
                  </div>
                  <div className='text-white/70 font-bold text-[0.9em]'>{Math.round(player.size)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className='flex justify-center gap-[15px]'>
          <button className='btn btn-primary min-w-[150px]' onClick={onRestart}>
            <Home size={20} />
            Play Again
          </button>
        </div>
      </div>
    </div>
  )
}

// Helper function to get ordinal suffix
const getOrdinalSuffix = (num: number): string => {
  const j = num % 10
  const k = num % 100
  if (j === 1 && k !== 11) return 'st'
  if (j === 2 && k !== 12) return 'nd'
  if (j === 3 && k !== 13) return 'rd'
  return 'th'
}

export default GameOverScreen

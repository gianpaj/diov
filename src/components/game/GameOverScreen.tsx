import React from 'react'
import { Trophy, Home, Users, Clock, Target } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useGameStore } from '@/stores/GameStore'

interface GameOverScreenProps {
  onRestart: () => void
}

const GameOverScreen: React.FC<GameOverScreenProps> = ({ onRestart }) => {
  const { gameState, localPlayer, localPlayerId, playerResultRows, localPlayerResultRow } = useGameStore()

  if (!gameState || !localPlayerId) return null

  const persistedResults = Object.values(playerResultRows).sort((a, b) => a.placement - b.placement)
  const fallbackPlayers = Object.values(gameState.players)
    .sort((a, b) => b.size - a.size)
    .map((player, index) => ({
      playerId: player.id,
      name: player.name,
      color: player.color,
      placement: index + 1,
      finalSize: player.size,
      finalScore: player.score,
      wasWinner: gameState.winner === player.id,
    }))
  const standings = persistedResults.length > 0 ? persistedResults : fallbackPlayers
  const localStanding = standings.find(player => player.playerId === localPlayerId) ?? null
  const playerRank = localStanding?.placement ?? standings.length + 1
  const isWinner = gameState.winner === localPlayerId
  const totalPlayers = standings.length
  const finalSize = localPlayerResultRow?.finalSize ?? localPlayer?.size ?? 0

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
    <div className='absolute inset-0 flex items-center justify-center z-100 bg-black/95 backdrop-blur-[20px]'>
      <div className='animate-[fadeIn_0.5s_ease-out] bg-black/80 rounded-card p-10 border border-white/10 max-w-150 max-h-[90vh] overflow-y-auto text-center backdrop-blur-[20px]'>
        {/* Result header */}
        <div className='mb-7.5'>
          <div className='mb-3.75' style={{ color: getResultColor() }}>
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
              : localStanding
                ? `You finished ${playerRank}${getOrdinalSuffix(playerRank)} place`
                : 'You were eliminated before the final showdown'}
          </p>
        </div>

        {/* Stats */}
        <div className='mb-7.5'>
          <div className='grid grid-cols-2 gap-[15px] mb-[30px]'>
            <div className='flex items-center gap-3 p-[15px] bg-white/5 rounded-xl border border-white/10'>
              <div className='text-white/70'>
                <Target size={24} />
              </div>
              <div className='text-left'>
                <div className='text-2xl font-bold text-accent-teal leading-none'>
                  {localStanding ? `#${playerRank}` : 'OUT'}
                </div>
                <div className='text-[0.85em] text-white/60 mt-0.5'>Final Rank</div>
              </div>
            </div>

            <div className='flex items-center gap-3 p-3.75 bg-white/5 rounded-xl border border-white/10'>
              <div className='text-white/70'>
                <div
                  className='rounded-full'
                  style={{
                    backgroundColor: localPlayerResultRow?.color ?? localPlayer?.color ?? '#ffffff',
                    width: '24px',
                    height: '24px',
                  }}
                />
              </div>
              <div className='text-left'>
                <div className='text-2xl font-bold text-white leading-none'>
                  {Math.round(finalSize)}
                </div>
                <div className='text-[0.85em] text-white/60 mt-0.5'>Final Size</div>
              </div>
            </div>

            <div className='flex items-center gap-3 p-[15px] bg-white/5 rounded-xl border border-white/10'>
              <div className='text-white/70'>
                <Users size={24} />
              </div>
              <div className='text-left'>
                <div className='text-2xl font-bold text-white leading-none'>{totalPlayers}</div>
                <div className='text-[0.85em] text-white/60 mt-0.5'>Total Players</div>
              </div>
            </div>

            <div className='flex items-center gap-3 p-[15px] bg-white/5 rounded-xl border border-white/10'>
              <div className='text-white/70'>
                <Clock size={24} />
              </div>
              <div className='text-left'>
                <div className='text-2xl font-bold text-white leading-none'>
                  {formatDuration(gameDuration)}
                </div>
                <div className='text-[0.85em] text-white/60 mt-0.5'>Game Duration</div>
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <div className='bg-white/5 rounded-[15px] p-5 border border-white/10'>
            <h3 className='text-white mb-[15px] text-[1.2em]'>Final Leaderboard</h3>
            <div className='flex flex-col gap-2 max-h-[200px] overflow-y-auto'>
              {standings.slice(0, 8).map(player => (
                <div
                  key={player.playerId}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 bg-white/[0.03] rounded-lg',
                    player.playerId === localPlayerId &&
                      'bg-[rgba(78,205,196,0.1)] border border-[rgba(78,205,196,0.3)]'
                  )}
                >
                  <div className='font-bold text-white/80 min-w-7.5 text-left'>#{player.placement}</div>
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
                      {player.playerId === localPlayerId && (
                        <span className='text-accent-teal text-xs font-normal'>(You)</span>
                      )}
                    </div>
                    <div className='text-white/50 text-[0.75em]'>
                      {'wasWinner' in player && player.wasWinner ? 'Winner' : 'Eliminated'}
                    </div>
                  </div>
                  <div className='text-white/70 font-bold text-[0.9em]'>
                    {Math.round(player.finalSize)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className='flex justify-center gap-3.75'>
          <button className='btn btn-primary min-w-37.5' onClick={onRestart}>
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

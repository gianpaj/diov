import React from 'react'
import { Trophy, Home, Users, Clock, Target } from 'lucide-react'
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
    <div className='game-over-screen'>
      <div className='game-over-content fade-in'>
        <div className='result-header'>
          <div className='result-icon' style={{ color: getResultColor() }}>
            {getResultIcon()}
          </div>
          <h1 style={{ color: getResultColor() }}>{getResultTitle()}</h1>
          <p className='result-subtitle'>
            {isWinner
              ? 'You are the last circle standing!'
              : `You finished ${playerRank}${getOrdinalSuffix(playerRank)} place`}
          </p>
        </div>

        <div className='stats-container'>
          <div className='main-stats'>
            <div className='stat-card rank'>
              <div className='stat-icon'>
                <Target size={24} />
              </div>
              <div className='stat-info'>
                <div className='stat-value'>#{playerRank}</div>
                <div className='stat-label'>Final Rank</div>
              </div>
            </div>

            <div className='stat-card size'>
              <div className='stat-icon'>
                <div
                  className='size-indicator'
                  style={{
                    backgroundColor: localPlayer.color,
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                  }}
                />
              </div>
              <div className='stat-info'>
                <div className='stat-value'>{Math.round(localPlayer.size)}</div>
                <div className='stat-label'>Final Size</div>
              </div>
            </div>

            <div className='stat-card players'>
              <div className='stat-icon'>
                <Users size={24} />
              </div>
              <div className='stat-info'>
                <div className='stat-value'>{totalPlayers}</div>
                <div className='stat-label'>Total Players</div>
              </div>
            </div>

            <div className='stat-card time'>
              <div className='stat-icon'>
                <Clock size={24} />
              </div>
              <div className='stat-info'>
                <div className='stat-value'>{formatDuration(gameDuration)}</div>
                <div className='stat-label'>Game Duration</div>
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <div className='leaderboard'>
            <h3>Final Leaderboard</h3>
            <div className='leaderboard-list'>
              {allPlayers.slice(0, 8).map((player, index) => (
                <div
                  key={player.id}
                  className={`leaderboard-item ${player.id === localPlayer.id ? 'current-player' : ''}`}
                >
                  <div className='player-rank'>#{index + 1}</div>
                  <div className='player-avatar'>
                    <div className='avatar-circle' style={{ backgroundColor: player.color }}>
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className='player-info'>
                    <div className='player-name'>
                      {player.name}
                      {player.id === localPlayer.id && <span className='you-indicator'>(You)</span>}
                    </div>
                    <div className='player-status'>{player.isAlive ? 'Alive' : 'Eliminated'}</div>
                  </div>
                  <div className='player-size'>{Math.round(player.size)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className='action-buttons'>
          <button className='btn btn-primary' onClick={onRestart}>
            <Home size={20} />
            Play Again
          </button>
        </div>
      </div>

      <style>{`
        .game-over-screen {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.95);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          backdrop-filter: blur(20px);
        }

        .game-over-content {
          background: rgba(0, 0, 0, 0.8);
          border-radius: 20px;
          padding: 40px;
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          text-align: center;
        }

        .result-header {
          margin-bottom: 30px;
        }

        .result-icon {
          margin-bottom: 15px;
        }

        .result-header h1 {
          font-size: 2.5em;
          margin-bottom: 10px;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
        }

        .result-subtitle {
          color: rgba(255, 255, 255, 0.8);
          font-size: 1.1em;
          margin: 0;
        }

        .stats-container {
          margin-bottom: 30px;
        }

        .main-stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
          margin-bottom: 30px;
        }

        .stat-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 15px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .stat-icon {
          color: rgba(255, 255, 255, 0.7);
        }

        .stat-info {
          text-align: left;
        }

        .stat-value {
          font-size: 1.5em;
          font-weight: bold;
          color: #fff;
          line-height: 1;
        }

        .stat-label {
          font-size: 0.85em;
          color: rgba(255, 255, 255, 0.6);
          margin-top: 2px;
        }

        .stat-card.rank .stat-value {
          color: #4ecdc4;
        }

        .leaderboard {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 15px;
          padding: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .leaderboard h3 {
          color: #fff;
          margin-bottom: 15px;
          font-size: 1.2em;
        }

        .leaderboard-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 200px;
          overflow-y: auto;
        }

        .leaderboard-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          transition: background 0.2s ease;
        }

        .leaderboard-item.current-player {
          background: rgba(78, 205, 196, 0.1);
          border: 1px solid rgba(78, 205, 196, 0.3);
        }

        .player-rank {
          font-weight: bold;
          color: rgba(255, 255, 255, 0.8);
          min-width: 30px;
          text-align: left;
        }

        .player-avatar {
          flex-shrink: 0;
        }

        .avatar-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: bold;
          font-size: 14px;
        }

        .player-info {
          flex: 1;
          text-align: left;
        }

        .player-name {
          color: #fff;
          font-weight: 600;
          font-size: 0.9em;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .you-indicator {
          color: #4ecdc4;
          font-size: 0.75em;
          font-weight: normal;
        }

        .player-status {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.75em;
        }

        .player-size {
          color: rgba(255, 255, 255, 0.7);
          font-weight: bold;
          font-size: 0.9em;
        }

        .action-buttons {
          display: flex;
          justify-content: center;
          gap: 15px;
        }

        .action-buttons .btn {
          min-width: 150px;
        }

        /* Scrollbar styling */
        .leaderboard-list::-webkit-scrollbar {
          width: 4px;
        }

        .leaderboard-list::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
        }

        .leaderboard-list::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 2px;
        }

        .game-over-content::-webkit-scrollbar {
          width: 6px;
        }

        .game-over-content::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }

        .game-over-content::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 3px;
        }

        @media (max-width: 768px) {
          .game-over-content {
            margin: 20px;
            padding: 30px 20px;
            max-height: calc(100vh - 40px);
          }

          .result-header h1 {
            font-size: 2em;
          }

          .main-stats {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .stat-card {
            padding: 12px;
          }

          .leaderboard {
            padding: 15px;
          }

          .action-buttons .btn {
            min-width: 120px;
            padding: 12px 20px;
          }
        }
      `}</style>
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

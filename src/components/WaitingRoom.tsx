import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Clock, Play, ArrowLeft, Wifi, WifiOff } from 'lucide-react'
import { useSocketStore } from '@/stores/SocketStore'
import { useGameStore } from '@/stores/GameStore'
import { GameStatus } from '@/types'

const WaitingRoom: React.FC = () => {
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState<number | null>(null)

  const {
    isConnected,
    connectionStatus,
    onGameStateUpdate,
    onPlayerJoined,
    onPlayerLeft,
    onGameStarted,
    leaveGame,
    startGame,
  } = useSocketStore()

  const { gameState, uiState, updateUIState, gameConfig, setGameState } = useGameStore()

  // Get player list from game state
  const players = gameState ? Object.values(gameState.players) : []
  const playerCount = players.length
  const minPlayers = gameConfig.minPlayers
  const maxPlayers = gameConfig.maxPlayers
  const canStartGame = playerCount >= minPlayers

  useEffect(() => {
    // Set up socket event listeners
    const unsubscribeGameState = onGameStateUpdate(state => {
      setGameState(state)

      // If game is starting, show countdown and navigate
      if (state.status === GameStatus.STARTING) {
        const timeUntilStart = state.startTime - Date.now()
        if (timeUntilStart > 0) {
          setCountdown(Math.ceil(timeUntilStart / 1000))
        }
      }

      // If game is playing, navigate to game
      if (state.status === GameStatus.PLAYING) {
        navigate('/game')
      }
    })

    const unsubscribePlayerJoined = onPlayerJoined(data => {
      console.log('Player joined:', data.player.name)
    })

    const unsubscribePlayerLeft = onPlayerLeft(data => {
      console.log('Player left:', data.playerId)
    })

    const unsubscribeGameStarted = onGameStarted(data => {
      console.log('Game started!')
      setCountdown(data.countdown)

      // Navigate to game after countdown
      setTimeout(() => {
        navigate('/game')
      }, data.countdown * 1000)
    })

    return () => {
      unsubscribeGameState()
      unsubscribePlayerJoined()
      unsubscribePlayerLeft()
      unsubscribeGameStarted()
    }
  }, [onGameStateUpdate, onPlayerJoined, onPlayerLeft, onGameStarted, setGameState, navigate])

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
    // emit the custom event to the server
    startGame()
    navigate('/game')
  }

  if (countdown !== null) {
    return (
      <div className='waiting-room countdown-screen'>
        <div className='countdown-container'>
          <h1>Game Starting!</h1>
          <div className='countdown-number pulse'>{countdown}</div>
          <p>Get ready to battle!</p>
        </div>
      </div>
    )
  }

  const isHost = true
  // const isHost = uiState.socket?.id === gameState?.hostId
  // canStartGame && uiState.playerName === gameState?.hostId

  // console.log({ uiState, gameState })

  return (
    <div className='waiting-room'>
      <div className='waiting-room-container fade-in'>
        <div className='room-header'>
          <div className='header-left'>
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

          <div className='header-center'>
            <h2>Waiting Room</h2>
          </div>

          <div className='header-right'>
            <div
              className='connection-indicator'
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: getConnectionColor(),
                fontSize: '14px',
              }}
            >
              {getConnectionIcon()}
              <span>{connectionStatus}</span>
            </div>
          </div>
        </div>

        <div className='room-content'>
          <div className='game-status'>
            <div className='status-card'>
              <div className='status-icon'>
                <Users size={32} />
              </div>
              <div className='status-info'>
                <h3>
                  {playerCount} / {maxPlayers} Players
                </h3>
                <p>{getPlayerStatusText()}</p>
              </div>
            </div>

            <div className='progress-container'>
              <div className='progress-bar'>
                <div
                  className='progress-fill'
                  style={{
                    width: `${Math.max((playerCount / minPlayers) * 100, 0)}%`,
                  }}
                />
              </div>
              <div className='progress-text'>
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

          <div className='players-section'>
            <h3>
              <Users size={20} />
              Players ({playerCount})
            </h3>

            <div className='player-list'>
              {players.map((player, index) => (
                <div key={player.id} className='player-item'>
                  <div className='player-avatar'>
                    <div className='avatar-circle' style={{ backgroundColor: player.color }}>
                      {player.name?.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className='player-info'>
                    <div className='player-name'>
                      {player.name}
                      {player.name === uiState.playerName && (
                        <span className='you-indicator'>(You)</span>
                      )}
                    </div>
                    <div className='player-status'>Ready</div>
                  </div>
                  <div className='player-rank'>#{index + 1}</div>
                </div>
              ))}

              {/* Empty slots */}
              {Array.from({ length: maxPlayers - playerCount }).map((_, index) => (
                <div key={`empty-${index + 1}`} className='player-item empty-slot'>
                  <div className='player-avatar'>
                    <div className='avatar-circle empty'>
                      <Users size={16} />
                    </div>
                  </div>
                  <div className='player-info'>
                    <div className='player-name'>Waiting for player...</div>
                    <div className='player-status'>Empty</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className='room-info'>
            <div className='info-cards'>
              <div className='info-card'>
                <Clock size={20} />
                <div>
                  <h4>Game Duration</h4>
                  <p>5 minutes</p>
                </div>
              </div>
              <div className='info-card'>
                <Play size={20} />
                <div>
                  <h4>Auto Start</h4>
                  <p>When {minPlayers}+ join</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .waiting-room {
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(ellipse at center, #1a1a2e 0%, #16213e 35%, #0f0f23 100%);
        }

        .countdown-screen {
          align-items: center;
          justify-content: center;
        }

        .countdown-container {
          text-align: center;
          background: rgba(0, 0, 0, 0.8);
          border-radius: 20px;
          padding: 60px;
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .countdown-container h1 {
          font-size: 2.5em;
          margin-bottom: 30px;
          color: #fff;
        }

        .countdown-number {
          font-size: 8em;
          font-weight: bold;
          color: #ff6b6b;
          margin: 20px 0;
          text-shadow: 0 0 30px rgba(255, 107, 107, 0.5);
        }

        .countdown-container p {
          font-size: 1.3em;
          color: rgba(255, 255, 255, 0.8);
          margin-top: 20px;
        }

        .waiting-room-container {
          background: rgba(0, 0, 0, 0.8);
          border-radius: 20px;
          padding: 30px;
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          min-width: 600px;
          max-width: 800px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .room-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .room-header h2 {
          color: #fff;
          margin: 0;
          font-size: 1.8em;
        }

        .header-left,
        .header-right {
          flex: 1;
        }

        .header-right {
          display: flex;
          justify-content: flex-end;
        }

        .room-content {
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        .game-status {
          text-align: center;
        }

        .status-card {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 15px;
          padding: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 20px;
        }

        .status-icon {
          color: #4ecdc4;
        }

        .status-info h3 {
          margin: 0 0 5px 0;
          color: #fff;
          font-size: 1.5em;
        }

        .status-info p {
          margin: 0;
          color: rgba(255, 255, 255, 0.7);
          font-size: 1.1em;
        }

        .progress-container {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .progress-text {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9em;
          text-align: center;
        }

        .players-section h3 {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #fff;
          margin-bottom: 20px;
          font-size: 1.3em;
        }

        .player-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 300px;
          overflow-y: auto;
          padding-right: 10px;
        }

        .player-list::-webkit-scrollbar {
          width: 6px;
        }

        .player-list::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }

        .player-list::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 3px;
        }

        .player-item {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.2s ease;
        }

        .player-item:hover:not(.empty-slot) {
          background: rgba(255, 255, 255, 0.1);
        }

        .empty-slot {
          opacity: 0.5;
        }

        .player-avatar {
          flex-shrink: 0;
        }

        .avatar-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-weight: bold;
          font-size: 16px;
        }

        .avatar-circle.empty {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.5);
        }

        .player-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .player-name {
          color: #fff;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .you-indicator {
          color: #4ecdc4;
          font-size: 0.8em;
          font-weight: normal;
        }

        .player-status {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.85em;
        }

        .player-rank {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.9em;
          font-weight: 600;
        }

        .room-info {
          margin-top: 10px;
        }

        .info-cards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .info-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 15px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .info-card h4 {
          margin: 0 0 2px 0;
          color: #fff;
          font-size: 0.95em;
        }

        .info-card p {
          margin: 0;
          color: rgba(255, 255, 255, 0.7);
          font-size: 0.85em;
        }

        @media (max-width: 768px) {
          .waiting-room-container {
            min-width: 350px;
            margin: 20px;
            padding: 20px;
          }

          .room-header {
            flex-direction: column;
            gap: 15px;
          }

          .header-left,
          .header-right {
            flex: none;
          }

          .info-cards {
            grid-template-columns: 1fr;
          }

          .countdown-container {
            padding: 40px 30px;
            margin: 20px;
          }

          .countdown-number {
            font-size: 6em;
          }
        }
      `}</style>
    </div>
  )
}

export default WaitingRoom

import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Users, Settings, Info } from 'lucide-react'
import { useSocketStore } from '@/stores/SocketStore'
import { useGameStore } from '@/stores/GameStore'

const HomePage: React.FC = () => {
  const [playerName, setPlayerName] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const navigate = useNavigate()

  const { connect, joinGame, isConnected, connectionStatus } = useSocketStore()
  const [joinError, setJoinError] = useState<string | null>(null)

  // Clear error as soon as a connection is re-established
  useEffect(() => {
    if (isConnected) setJoinError(null)
  }, [isConnected])
  const { updateUIState } = useGameStore()

  // Ref to hold the resolve/reject callbacks of the in-flight connection promise
  // so the socket event handlers set up inside `waitForConnection` can call them.
  const connectionResolverRef = useRef<{
    resolve: () => void
    reject: (reason: string) => void
  } | null>(null)

  // Watch connectionStatus and settle the in-flight promise when the outcome
  // is known. This runs every time connectionStatus changes.
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
      // Already connected — nothing to wait for.
      if (connectionStatusRef.current === 'connected') {
        resolve()
        return
      }

      connectionResolverRef.current = { resolve, reject }

      // Timeout guard — rejects if the server never responds.
      const timer = setTimeout(() => {
        if (connectionResolverRef.current) {
          connectionResolverRef.current.reject(
            'Connection timed out. Check that the server is running.'
          )
          connectionResolverRef.current = null
        }
      }, timeoutMs)

      // Wrap resolve/reject to always clear the timeout.
      const originalResolve = connectionResolverRef.current.resolve
      const originalReject = connectionResolverRef.current.reject
      connectionResolverRef.current = {
        resolve: () => {
          clearTimeout(timer)
          originalResolve()
        },
        reject: reason => {
          clearTimeout(timer)
          originalReject(reason)
        },
      }
    })

  const handleJoinGame = async () => {
    if (!playerName.trim()) {
      setJoinError('Please enter your name.')
      return
    }

    if (playerName.trim().length > 20) {
      setJoinError('Name must be 20 characters or less.')
      return
    }

    setJoinError(null)
    setIsJoining(true)

    try {
      if (!isConnected) {
        connect()
      }

      // Block here until the socket is actually connected (or we time out /
      // get a hard error). Only navigate if this resolves successfully.
      await waitForConnection()

      // Update UI state
      updateUIState({
        playerName: playerName.trim(),
        isJoined: true,
        showWaitingRoom: true,
      })

      // Join the game
      joinGame(playerName.trim())

      // Navigate to waiting room — only reached on successful connection
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

  return (
    <div className='home-page'>
      <div className='menu fade-in'>
        <div className='game-logo'>
          {joinError && (
            <div
              className='join-error'
              role='alert'
              style={{
                marginBottom: '16px',
                padding: '10px 16px',
                borderRadius: '12px',
                background: 'rgba(255, 107, 107, 0.15)',
                border: '1px solid rgba(255, 107, 107, 0.5)',
                color: '#FF6B6B',
                fontSize: '14px',
                textAlign: 'center',
              }}
            >
              {joinError}
            </div>
          )}
          <h1>Battle Circles</h1>
          <p>Eat or be eaten in this multiplayer battle arena!</p>
        </div>

        <div className='connection-status' style={{ marginBottom: '20px' }}>
          <div
            className='status-indicator'
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '20px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              fontSize: '14px',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: getConnectionStatusColor(),
              }}
            />
            {getConnectionStatusText()}
          </div>
        </div>

        <div className='join-form'>
          <div className='input-group'>
            <input
              type='text'
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              placeholder='Enter your name'
              maxLength={20}
              disabled={isJoining}
              style={{
                width: '100%',
                padding: '15px 20px',
                borderRadius: '25px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                background: 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                fontSize: '16px',
                outline: 'none',
                marginBottom: '20px',
                backdropFilter: 'blur(10px)',
                textAlign: 'center',
              }}
              onKeyPress={e => {
                if (e.key === 'Enter' && !isJoining) {
                  handleJoinGame()
                }
              }}
            />
          </div>

          <button
            className='btn btn-primary'
            onClick={handleJoinGame}
            disabled={isJoining || !playerName.trim()}
            style={{
              width: '100%',
              fontSize: '18px',
              padding: '15px 30px',
              marginBottom: '20px',
            }}
          >
            {isJoining ? (
              <>
                <div className='loading' />
                Joining Game...
              </>
            ) : (
              <>
                <Play size={20} />
                Join Game
              </>
            )}
          </button>
        </div>

        <div className='game-info'>
          <div className='info-grid'>
            <div className='info-item'>
              <Users size={24} />
              <div>
                <h3>5-12 Players</h3>
                <p>Multiplayer battles</p>
              </div>
            </div>
            <div className='info-item'>
              <Settings size={24} />
              <div>
                <h3>5 Minutes</h3>
                <p>Fast-paced rounds</p>
              </div>
            </div>
          </div>
        </div>

        <div className='game-rules'>
          <h3>
            <Info size={20} />
            How to Play
          </h3>
          <ul className='text-left'>
            <li>• Move with the joystick on the left</li>
            <li>• Eat smaller players to grow</li>
            <li>• Split to move faster or escape</li>
            <li>• Spit to lose size and gain speed</li>
            <li>• Last player standing wins!</li>
          </ul>
        </div>
      </div>

      <style>{`
        .home-page {
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(ellipse at center, #1a1a2e 0%, #16213e 35%, #0f0f23 100%);
        }

        .game-logo h1 {
          font-size: 3em;
          margin-bottom: 10px;
          background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-align: center;
        }

        .game-logo p {
          font-size: 1.2em;
          color: rgba(255, 255, 255, 0.8);
          text-align: center;
          margin-bottom: 30px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }

        .info-item {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 15px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 15px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .info-item h3 {
          margin: 0;
          font-size: 1.1em;
          color: #fff;
        }

        .info-item p {
          margin: 0;
          font-size: 0.9em;
          color: rgba(255, 255, 255, 0.7);
        }

        .game-rules {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 15px;
          padding: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .game-rules h3 {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 15px;
          color: #fff;
          font-size: 1.2em;
        }

        .game-rules ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .game-rules li {
          padding: 5px 0;
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.95em;
        }

        input:focus {
          border-color: rgba(255, 255, 255, 0.6) !important;
          box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.3) !important;
        }

        input::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }

        @media (max-width: 768px) {
          .game-logo h1 {
            font-size: 2.5em;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }

          .menu {
            min-width: 320px;
            margin: 20px;
          }
        }
      `}</style>
    </div>
  )
}

export default HomePage

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
    <div className='w-screen h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_center,#1a1a2e_0%,#16213e_35%,#0f0f23_100%)]'>
      <div className='animate-[fadeIn_0.5s_ease-out] relative bg-black/80 rounded-[--radius-card] p-10 backdrop-blur-[20px] border border-white/10 min-w-[400px] text-center'>
        <div className='game-logo'>
          {joinError && (
            <div
              className='mb-4 px-4 py-2.5 rounded-xl bg-[rgba(255,107,107,0.15)] border border-[rgba(255,107,107,0.5)] text-[--color-accent-red] text-sm text-center'
              role='alert'
            >
              {joinError}
            </div>
          )}
          <h1>Battle Circles</h1>
          <p className='text-[1.2em] text-white/80 text-center mb-[30px]'>
            Eat or be eaten in this multiplayer battle arena!
          </p>
        </div>

        <div className='mb-5'>
          <div
            className='flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm'
          >
            <div
              className='w-2 h-2 rounded-full shrink-0'
              style={{ backgroundColor: getConnectionStatusColor() }}
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
              className='w-full px-5 py-[15px] rounded-[25px] border-2 border-white/30 bg-white/10 text-white text-base outline-none mb-5 backdrop-blur-[10px] text-center focus:border-white/60 focus:shadow-[0_0_0_2px_rgba(102,126,234,0.3)] placeholder:text-white/50'
              onKeyPress={e => {
                if (e.key === 'Enter' && !isJoining) {
                  handleJoinGame()
                }
              }}
            />
          </div>

          <button
            className='btn btn-primary w-full text-[18px] px-[30px] py-[15px] mb-5'
            onClick={handleJoinGame}
            disabled={isJoining || !playerName.trim()}
          >
            {isJoining ? (
              <>
                <div className='inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin' />
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
          <div className='grid grid-cols-2 gap-5 mb-[30px]'>
            <div className='flex items-center gap-[15px] p-[15px] bg-white/5 rounded-[15px] border border-white/10'>
              <Users size={24} />
              <div>
                <h3 className='m-0 text-[1.1em] text-white'>5-12 Players</h3>
                <p className='m-0 text-[0.9em] text-white/70'>Multiplayer battles</p>
              </div>
            </div>
            <div className='flex items-center gap-[15px] p-[15px] bg-white/5 rounded-[15px] border border-white/10'>
              <Settings size={24} />
              <div>
                <h3 className='m-0 text-[1.1em] text-white'>5 Minutes</h3>
                <p className='m-0 text-[0.9em] text-white/70'>Fast-paced rounds</p>
              </div>
            </div>
          </div>
        </div>

        <div className='bg-white/5 rounded-[15px] p-5 border border-white/10'>
          <h3 className='flex items-center gap-2.5 mb-[15px] text-white text-[1.2em]'>
            <Info size={20} />
            How to Play
          </h3>
          <ul className='list-none p-0 m-0 text-left'>
            <li className='py-1 text-white/80 text-[0.95em]'>• Move with the joystick on the left</li>
            <li className='py-1 text-white/80 text-[0.95em]'>• Eat smaller players to grow</li>
            <li className='py-1 text-white/80 text-[0.95em]'>• Split to move faster or escape</li>
            <li className='py-1 text-white/80 text-[0.95em]'>• Spit to lose size and gain speed</li>
            <li className='py-1 text-white/80 text-[0.95em]'>• Last player standing wins!</li>
          </ul>
        </div>
      </div>

      <style>{`
        /* Gradient text — no Tailwind equivalent */
        .game-logo h1 {
          font-size: 3em;
          margin-bottom: 10px;
          background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-align: center;
        }

        @media (max-width: 768px) {
          .game-logo h1 {
            font-size: 2.5em;
          }
        }
      `}</style>
    </div>
  )
}

export default HomePage

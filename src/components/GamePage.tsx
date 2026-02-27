import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Stage, Container, Graphics } from '@pixi/react'

import { Pause, Play, Home } from 'lucide-react'
import { useSocketStore } from '@/stores/SocketStore'
import { useGameStore } from '@/stores/GameStore'
import { useJoystick } from '@/hooks/useJoystick'
import { GameStatus, COLORS, GAME_CONSTANTS } from '@/types'
import VirtualJoystick from '@/components/game/VirtualJoystick'
import GameHUD from '@/components/game/GameHUD'
import ActionButtons from '@/components/game/ActionButtons'
import GameOverScreen from '@/components/game/GameOverScreen'

const GamePage: React.FC = () => {
  const navigate = useNavigate()

  const [isPaused, setIsPaused] = useState(false)
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  })

  const {
    gameState,
    localPlayer,
    camera,
    isGameActive,
    updateCamera,
    setMovementInput,
    setSplitPressed,
    setSpitPressed,
  } = useGameStore()

  const { sendPlayerInput, sendSplit, sendSpit, onGameStateUpdate, onGameEnded, leaveGame } =
    useSocketStore()

  // Ref used to throttle sendPlayerInput — avoids flooding the socket on every
  // render frame. We target NETWORK_UPDATE_RATE (20 Hz = 50 ms between sends).
  const lastInputSentAt = useRef(0)

  // Stable ref to current camera so the camera-follow effect does not need
  // `camera` in its dependency array (which would cause an infinite loop).
  const cameraRef = useRef(camera)
  useEffect(() => {
    cameraRef.current = camera
  })

  const {
    direction,
    magnitude,
    isActive: joystickActive,
    handlers: joystickHandlers,
    containerRef: joystickRef,
  } = useJoystick()

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Handle joystick input
  useEffect(() => {
    if (isGameActive()) {
      setMovementInput(direction)
    }
  }, [direction, isGameActive, setMovementInput])

  // Send player input to server — throttled to NETWORK_UPDATE_RATE (20 Hz).
  useEffect(() => {
    if (!isGameActive() || !localPlayer) return

    const now = Date.now()
    const interval = 1000 / GAME_CONSTANTS.NETWORK_UPDATE_RATE // 50 ms at 20 Hz
    if (now - lastInputSentAt.current < interval) return

    lastInputSentAt.current = now
    sendPlayerInput({
      movement: direction,
      splitPressed: false,
      spitPressed: false,
    })
  }, [direction, isGameActive, localPlayer, sendPlayerInput])

  // Update camera to follow local player.
  // `cameraRef` is used instead of `camera` in the dep array to prevent the
  // effect from re-running every time updateCamera writes a new camera object,
  // which would cause an infinite update loop.
  useEffect(() => {
    if (!localPlayer || !gameState) return

    const cam = cameraRef.current
    const targetX = localPlayer.position.x
    const targetY = localPlayer.position.y

    const newX = cam.position.x + (targetX - cam.position.x) * cam.smoothing
    const newY = cam.position.y + (targetY - cam.position.y) * cam.smoothing

    updateCamera({
      position: { x: newX, y: newY },
      target: { x: targetX, y: targetY },
    })
  }, [localPlayer, gameState, updateCamera])

  // Handle game state updates
  useEffect(() => {
    const unsubscribe = onGameStateUpdate(state => {
      if (state.status === GameStatus.FINISHED) {
        // Game ended, show game over screen
        setTimeout(() => {
          navigate('/')
        }, 10000) // Auto-navigate after 10 seconds
      }
    })

    return unsubscribe
  }, [onGameStateUpdate, navigate])

  // Handle game end
  useEffect(() => {
    const unsubscribe = onGameEnded(data => {
      console.log('Game ended:', data)
      // Game over screen will be shown via game state
    })

    return unsubscribe
  }, [onGameEnded])

  const handleSplitAction = () => {
    if (!isGameActive() || !localPlayer) return
    setSplitPressed(true)
    sendSplit()
    setTimeout(() => setSplitPressed(false), 100)
  }

  const handleSpitAction = () => {
    if (!isGameActive() || !localPlayer) return
    setSpitPressed(true)
    sendSpit()
    setTimeout(() => setSpitPressed(false), 100)
  }

  const handlePause = () => {
    setIsPaused(!isPaused)
  }

  const handleLeaveGame = () => {
    leaveGame()
    navigate('/')
  }

  // Render player circle
  const renderPlayer = (player: any) => {
    const screenX = player.position.x - camera.position.x + dimensions.width / 2
    const screenY = player.position.y - camera.position.y + dimensions.height / 2

    return (
      <Graphics
        key={player.id}
        draw={g => {
          g.clear()
          g.beginFill(player.color)
          g.drawCircle(0, 0, player.size)
          g.endFill()

          // Add outline for local player
          if (player.id === localPlayer?.id) {
            g.lineStyle(3, 0xffffff, 0.8)
            g.drawCircle(0, 0, player.size + 2)
          }
        }}
        x={screenX}
        y={screenY}
      />
    )
  }

  // Render knibble
  const renderKnibble = (knibble: any) => {
    const screenX = knibble.position.x - camera.position.x + dimensions.width / 2
    const screenY = knibble.position.y - camera.position.y + dimensions.height / 2

    return (
      <Graphics
        key={knibble.id}
        draw={g => {
          g.clear()
          g.beginFill(knibble.color)
          g.drawCircle(0, 0, knibble.size)
          g.endFill()
          g.lineStyle(1, 0xffffff, 0.3)
          g.drawCircle(0, 0, knibble.size)
        }}
        x={screenX}
        y={screenY}
      />
    )
  }

  // Render spit blob
  const renderSpitBlob = (blob: any) => {
    const screenX = blob.position.x - camera.position.x + dimensions.width / 2
    const screenY = blob.position.y - camera.position.y + dimensions.height / 2

    return (
      <Graphics
        key={blob.id}
        draw={g => {
          g.clear()
          g.beginFill(COLORS.SPIT_BLOB)
          g.drawCircle(0, 0, blob.size)
          g.endFill()
          g.lineStyle(1, 0xffffff, 0.5)
          g.drawCircle(0, 0, blob.size)
        }}
        x={screenX}
        y={screenY}
      />
    )
  }

  // Render game boundaries
  const renderBoundaries = () => {
    if (!gameState) return null

    const bounds = gameState.bounds
    const screenX = bounds.x - camera.position.x + dimensions.width / 2
    const screenY = bounds.y - camera.position.y + dimensions.height / 2

    return (
      <Graphics
        draw={g => {
          g.clear()
          g.lineStyle(4, COLORS.BOUNDARY, 0.8)
          g.drawRect(0, 0, bounds.width, bounds.height)
        }}
        x={screenX}
        y={screenY}
      />
    )
  }

  // Render background grid
  const renderGrid = () => {
    const gridSize = 50
    const gridLines = []

    // Calculate visible grid lines
    const startX = Math.floor((camera.position.x - dimensions.width / 2) / gridSize) * gridSize
    const endX = Math.ceil((camera.position.x + dimensions.width / 2) / gridSize) * gridSize
    const startY = Math.floor((camera.position.y - dimensions.height / 2) / gridSize) * gridSize
    const endY = Math.ceil((camera.position.y + dimensions.height / 2) / gridSize) * gridSize

    // Vertical lines
    for (let x = startX; x <= endX; x += gridSize) {
      const screenX = x - camera.position.x + dimensions.width / 2
      gridLines.push(
        <Graphics
          key={`v-${x}`}
          draw={g => {
            g.clear()
            g.lineStyle(1, 0xffffff, 0.1)
            g.moveTo(0, 0)
            g.lineTo(0, dimensions.height)
          }}
          x={screenX}
          y={0}
        />
      )
    }

    // Horizontal lines
    for (let y = startY; y <= endY; y += gridSize) {
      const screenY = y - camera.position.y + dimensions.height / 2
      gridLines.push(
        <Graphics
          key={`h-${y}`}
          draw={g => {
            g.clear()
            g.lineStyle(1, 0xffffff, 0.1)
            g.moveTo(0, 0)
            g.lineTo(dimensions.width, 0)
          }}
          x={0}
          y={screenY}
        />
      )
    }

    return <Container>{gridLines}</Container>
  }

  if (!gameState || !localPlayer) {
    return (
      <div className='game-loading'>
        <div className='loading-content'>
          <div className='loading' />
          <p>Loading game...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='game-page'>
      {/* PIXI.js Stage */}
      <Stage
        width={dimensions.width}
        height={dimensions.height}
        options={{
          backgroundColor: COLORS.BACKGROUND,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        }}
      >
        <Container>
          {/* Background grid */}
          {renderGrid()}

          {/* Game boundaries */}
          {renderBoundaries()}

          {/* Knibbles */}
          {gameState.knibbles && Object.values(gameState.knibbles).map(renderKnibble)}

          {/* Spit blobs */}
          {gameState.spitBlobs && Object.values(gameState.spitBlobs).map(renderSpitBlob)}

          {/* Players */}
          {Object.values(gameState.players)
            .filter(player => player.isAlive)
            .map(renderPlayer)}
        </Container>
      </Stage>

      {/* UI Overlay */}
      <div className='ui-overlay'>
        {/* HUD */}
        <GameHUD />

        {/* Virtual Joystick */}
        <VirtualJoystick
          ref={joystickRef}
          {...joystickHandlers}
          isActive={joystickActive}
          direction={direction}
          magnitude={magnitude}
        />

        {/* Action Buttons */}
        <ActionButtons
          onSplit={handleSplitAction}
          onSpit={handleSpitAction}
          disabled={!isGameActive()}
        />

        {/* Pause/Menu Button */}
        <div className='top-controls'>
          <button
            className='control-button'
            onClick={handlePause}
            style={{ top: '20px', left: '20px' }}
          >
            {isPaused ? <Play size={20} /> : <Pause size={20} />}
          </button>
        </div>

        {/* Pause Menu */}
        {isPaused && (
          <div className='pause-menu'>
            <div className='pause-content'>
              <h2>Game Paused</h2>
              <div className='pause-buttons'>
                <button className='btn btn-primary' onClick={handlePause}>
                  <Play size={16} />
                  Resume
                </button>
                <button className='btn btn-secondary' onClick={handleLeaveGame}>
                  <Home size={16} />
                  Leave Game
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Game Over Screen */}
        {gameState.status === GameStatus.FINISHED && (
          <GameOverScreen onRestart={() => navigate('/')} />
        )}
      </div>

      <style>{`
        .game-page {
          width: 100vw;
          height: 100vh;
          position: relative;
          overflow: hidden;
          background: #0F0F23;
        }

        .game-loading {
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0F0F23;
          color: white;
        }

        .loading-content {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        .loading-content p {
          font-size: 18px;
          color: rgba(255, 255, 255, 0.8);
        }

        .top-controls {
          position: absolute;
          top: 20px;
          left: 20px;
          z-index: 20;
        }

        .pause-menu {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          backdrop-filter: blur(10px);
        }

        .pause-content {
          background: rgba(0, 0, 0, 0.9);
          border-radius: 20px;
          padding: 40px;
          text-align: center;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .pause-content h2 {
          color: white;
          margin-bottom: 30px;
          font-size: 2em;
        }

        .pause-buttons {
          display: flex;
          flex-direction: column;
          gap: 15px;
          min-width: 200px;
        }

        @media (max-width: 768px) {
          .pause-content {
            margin: 20px;
            padding: 30px 20px;
          }
        }
      `}</style>
    </div>
  )
}

export default GamePage

import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Application, extend } from '@pixi/react'
import { Container, Graphics } from 'pixi.js'

extend({ Container, Graphics })

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
      <pixiGraphics
        key={player.id}
        draw={g => {
          g.clear()
          g.circle(0, 0, player.size)
          g.fill({ color: player.color })

          // Add outline for local player
          if (player.id === localPlayer?.id) {
            g.circle(0, 0, player.size + 2)
            g.stroke({ width: 3, color: 0xffffff, alpha: 0.8 })
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
      <pixiGraphics
        key={knibble.id}
        draw={g => {
          g.clear()
          g.circle(0, 0, knibble.size)
          g.fill({ color: knibble.color })
          g.circle(0, 0, knibble.size)
          g.stroke({ width: 1, color: 0xffffff, alpha: 0.3 })
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
      <pixiGraphics
        key={blob.id}
        draw={g => {
          g.clear()
          g.circle(0, 0, blob.size)
          g.fill({ color: COLORS.SPIT_BLOB })
          g.circle(0, 0, blob.size)
          g.stroke({ width: 1, color: 0xffffff, alpha: 0.5 })
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
      <pixiGraphics
        draw={g => {
          g.clear()
          g.rect(0, 0, bounds.width, bounds.height)
          g.stroke({ width: 4, color: COLORS.BOUNDARY, alpha: 0.8 })
        }}
        x={screenX}
        y={screenY}
      />
    )
  }

  // Render background grid
  const renderGrid = () => {
    const gridSize = 50
    const gridLines: import('react').ReactElement[] = []

    // Calculate visible grid lines
    const startX = Math.floor((camera.position.x - dimensions.width / 2) / gridSize) * gridSize
    const endX = Math.ceil((camera.position.x + dimensions.width / 2) / gridSize) * gridSize
    const startY = Math.floor((camera.position.y - dimensions.height / 2) / gridSize) * gridSize
    const endY = Math.ceil((camera.position.y + dimensions.height / 2) / gridSize) * gridSize

    // Vertical lines
    for (let x = startX; x <= endX; x += gridSize) {
      const screenX = x - camera.position.x + dimensions.width / 2
      gridLines.push(
        <pixiGraphics
          key={`v-${x}`}
          draw={g => {
            g.clear()
            g.moveTo(0, 0)
            g.lineTo(0, dimensions.height)
            g.stroke({ width: 1, color: 0xffffff, alpha: 0.1 })
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
        <pixiGraphics
          key={`h-${y}`}
          draw={g => {
            g.clear()
            g.moveTo(0, 0)
            g.lineTo(dimensions.width, 0)
            g.stroke({ width: 1, color: 0xffffff, alpha: 0.1 })
          }}
          x={0}
          y={screenY}
        />
      )
    }

    return <pixiContainer>{gridLines}</pixiContainer>
  }

  if (!gameState || !localPlayer) {
    return (
      <div className='w-screen h-screen flex items-center justify-center bg-[#0F0F23] text-white'>
        <div className='text-center flex flex-col items-center gap-5'>
          <div className='inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin' />
          <p className='text-[18px] text-white/80'>Loading game...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='relative w-screen h-screen overflow-hidden bg-[#0F0F23]'>
      {/* PIXI.js canvas */}
      <Application
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor={COLORS.BACKGROUND}
        antialias={true}
        resolution={window.devicePixelRatio || 1}
        autoDensity={true}
      >
        <pixiContainer>
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
        </pixiContainer>
      </Application>

      {/* UI Overlay */}
      <div className='absolute inset-0 pointer-events-none z-[10] [&>*]:pointer-events-auto'>
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
        <div className='absolute top-5 left-5 z-[20]'>
          <button
            className='w-[70px] h-[70px] rounded-full border-[3px] border-white/30 bg-black/40 backdrop-blur-[10px] flex items-center justify-center cursor-pointer transition-all duration-200 text-white hover:bg-white/10 hover:border-white/50 hover:scale-105 active:scale-95 active:bg-white/20'
            onClick={handlePause}
          >
            {isPaused ? <Play size={20} /> : <Pause size={20} />}
          </button>
        </div>

        {/* Pause Menu */}
        {isPaused && (
          <div className='absolute inset-0 flex items-center justify-center bg-black/80 z-[100] backdrop-blur-[10px]'>
            <div className='bg-black/90 rounded-card p-10 text-center border border-white/10'>
              <h2 className='text-white mb-[30px] text-[2em]'>Game Paused</h2>
              <div className='flex flex-col gap-[15px] min-w-[200px]'>
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
    </div>
  )
}

export default GamePage

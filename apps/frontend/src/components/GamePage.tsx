import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Application, extend } from '@pixi/react'
import { Container, Graphics } from 'pixi.js'

extend({ Container, Graphics })

import { Pause, Play, Home } from 'lucide-react'
import {
  getViewportBounds,
  stepCameraTowardsTarget,
  worldToScreen,
} from '@battle-circles/agent-sdk/visibility'
import { useSocketStore } from '@/stores/SocketStore'
import { useGameStore } from '@/stores/GameStore'
import { useJoystick } from '@/hooks/useJoystick'
import { GameStatus, COLORS, GAME_CONSTANTS } from '@/types'
import VirtualJoystick from '@/components/game/VirtualJoystick'
import GameHUD from '@/components/game/GameHUD'
import ActionButtons from '@/components/game/ActionButtons'
import GameOverScreen from '@/components/game/GameOverScreen'
import type { KnibbleRowState, PlayerRowState, SpitBlobRowState, Vector2D } from '@/types'

const KNIBBLE_RENDER_PALETTE = [
  '#16F2F2',
  '#68FF2B',
  '#FFB11B',
  '#FF2EA6',
  '#1E90FF',
  '#FFE44D',
] as const

const GROWTH_PULSE_DURATION_MS = 180
const GROWTH_PULSE_MAX_SCALE = 0.18
const MOUSE_DEAD_ZONE_PX = GAME_CONSTANTS.JOYSTICK_MAX_DISTANCE * GAME_CONSTANTS.JOYSTICK_DEAD_ZONE
const SHOW_BACKGROUND_GRID = false

const hashString = (value: string): number => {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

const hexToNumber = (hex: string): number => Number.parseInt(hex.replace('#', ''), 16)

const tintChannel = (value: number, delta: number) => Math.max(0, Math.min(255, value + delta))

const tintHex = (hex: string, delta: number) => {
  const normalized = hex.startsWith('#') ? hex.slice(1) : hex
  const safe = normalized.length === 6 ? normalized : '2E90FF'
  const red = tintChannel(Number.parseInt(safe.slice(0, 2), 16), delta)
  const green = tintChannel(Number.parseInt(safe.slice(2, 4), 16), delta)
  const blue = tintChannel(Number.parseInt(safe.slice(4, 6), 16), delta)
  return `#${[red, green, blue].map(channel => channel.toString(16).padStart(2, '0')).join('')}`
}

const getPlayerVisual = (player: PlayerRowState) => {
  const accentSeed = hashString(player.skinId ?? player.id)
  const accentDelta = ((accentSeed % 5) - 2) * 10
  const base = tintHex(player.color, 18 + accentDelta)
  return {
    base,
    edge: tintHex(player.color, -24),
    highlight: tintHex(base, 34),
    texture: tintHex(player.color, -4),
  }
}

const getKnibbleColor = (knibbleId: string) =>
  KNIBBLE_RENDER_PALETTE[hashString(knibbleId) % KNIBBLE_RENDER_PALETTE.length] ??
  KNIBBLE_RENDER_PALETTE[0]

const GamePage: React.FC = () => {
  const navigate = useNavigate()

  const [isPaused, setIsPaused] = useState(false)
  const [hasFinePointer, setHasFinePointer] = useState(false)
  const [hasCoarsePointer, setHasCoarsePointer] = useState(false)
  const [cameraPosition, setCameraPosition] = useState<Vector2D>({ x: 0, y: 0 })
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  })

  const roomState = useGameStore(state => state.roomState)
  const playerRows = useGameStore(state => state.playerRows)
  const knibbleRows = useGameStore(state => state.knibbleRows)
  const spitBlobRows = useGameStore(state => state.spitBlobRows)
  const localPlayer = useGameStore(state => state.localPlayer)
  const localPlayerRow = useGameStore(state => state.localPlayerRow)
  const localPlayerResultRow = useGameStore(state => state.localPlayerResultRow)
  const localPlayerId = useGameStore(state => state.localPlayerId)
  const isGameActive = useGameStore(state => state.isGameActive)
  const setSplitPressed = useGameStore(state => state.setSplitPressed)
  const setSpitPressed = useGameStore(state => state.setSpitPressed)

  const { sendPlayerInput, sendSplit, sendSpit, onGameEnded, leaveGame } = useSocketStore()

  const cameraPositionRef = useRef(cameraPosition)
  const movementRef = useRef<Vector2D>({ x: 0, y: 0 })
  const previousPlayerSizesRef = useRef<Record<string, number>>({})
  const growthPulsesRef = useRef<Record<string, number>>({})
  const growthAnimationFrameRef = useRef<number | null>(null)
  const lastInputModeRef = useRef<'mouse' | 'touch'>('mouse')
  const [, setGrowthAnimationTick] = useState(0)
  useEffect(() => {
    cameraPositionRef.current = cameraPosition
  }, [cameraPosition])

  const {
    direction,
    magnitude,
    isActive: joystickActive,
    handlers: joystickHandlers,
    containerRef: joystickRef,
  } = useJoystick()

  const isFinished = roomState?.status === GameStatus.FINISHED
  const isEliminated =
    roomState?.status === GameStatus.PLAYING && !localPlayerRow && !!localPlayerResultRow
  const canControlLocalPlayer = isGameActive() && !!localPlayerRow && !isEliminated
  const shouldShowJoystick = hasCoarsePointer

  useEffect(() => {
    const finePointerQuery = window.matchMedia('(any-pointer: fine)')
    const coarsePointerQuery = window.matchMedia('(any-pointer: coarse)')

    const updatePointerCapabilities = () => {
      setHasFinePointer(finePointerQuery.matches)
      setHasCoarsePointer(coarsePointerQuery.matches)
    }

    updatePointerCapabilities()
    finePointerQuery.addEventListener('change', updatePointerCapabilities)
    coarsePointerQuery.addEventListener('change', updatePointerCapabilities)

    return () => {
      finePointerQuery.removeEventListener('change', updatePointerCapabilities)
      coarsePointerQuery.removeEventListener('change', updatePointerCapabilities)
    }
  }, [])

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
    if (canControlLocalPlayer && shouldShowJoystick && lastInputModeRef.current !== 'mouse') {
      movementRef.current = direction
    }
  }, [canControlLocalPlayer, direction, shouldShowJoystick])

  useEffect(() => {
    if (!canControlLocalPlayer || !localPlayerRow) {
      return
    }

    const intervalId = window.setInterval(() => {
      sendPlayerInput({
        movement: movementRef.current,
        splitPressed: false,
        spitPressed: false,
      })
    }, 1000 / GAME_CONSTANTS.NETWORK_UPDATE_RATE)

    return () => window.clearInterval(intervalId)
  }, [canControlLocalPlayer, localPlayerRow, sendPlayerInput])

  // Update camera to follow local player.
  useEffect(() => {
    if (!localPlayerRow || !roomState) return

    const cam = cameraPositionRef.current
    const targetX = localPlayerRow.position.x
    const targetY = localPlayerRow.position.y

    setCameraPosition(
      stepCameraTowardsTarget(cam, { x: targetX, y: targetY }, GAME_CONSTANTS.CAMERA_SMOOTH_FACTOR)
    )
  }, [localPlayerRow, roomState])

  // Handle game end
  useEffect(() => {
    const unsubscribe = onGameEnded(data => {
      console.log('Game ended:', data)
    })

    return unsubscribe
  }, [onGameEnded])

  useEffect(() => {
    const now = performance.now()
    const nextSizes: Record<string, number> = {}

    Object.values(playerRows).forEach(player => {
      nextSizes[player.id] = player.size
      const previousSize = previousPlayerSizesRef.current[player.id]
      if (previousSize !== undefined && player.size > previousSize) {
        growthPulsesRef.current[player.id] = now
      }
    })

    previousPlayerSizesRef.current = nextSizes

    const pulseIds = Object.keys(growthPulsesRef.current)
    if (pulseIds.length === 0 || growthAnimationFrameRef.current !== null) {
      return
    }

    const animateGrowth = () => {
      const animationNow = performance.now()

      Object.entries(growthPulsesRef.current).forEach(([playerId, startedAt]) => {
        if (animationNow - startedAt >= GROWTH_PULSE_DURATION_MS) {
          delete growthPulsesRef.current[playerId]
        }
      })

      setGrowthAnimationTick(value => value + 1)

      if (Object.keys(growthPulsesRef.current).length > 0) {
        growthAnimationFrameRef.current = window.requestAnimationFrame(animateGrowth)
      } else {
        growthAnimationFrameRef.current = null
      }
    }

    growthAnimationFrameRef.current = window.requestAnimationFrame(animateGrowth)

    return () => {
      if (growthAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(growthAnimationFrameRef.current)
        growthAnimationFrameRef.current = null
      }
    }
  }, [playerRows])

  const handleSplitAction = () => {
    if (!canControlLocalPlayer || !localPlayerRow) return
    setSplitPressed(true)
    sendSplit()
    setTimeout(() => setSplitPressed(false), 100)
  }

  const handleSpitAction = () => {
    if (!canControlLocalPlayer || !localPlayerRow) return
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

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!hasFinePointer || !localPlayerRow) {
      return
    }

    lastInputModeRef.current = 'mouse'

    const playerScreenPosition = worldToScreen(localPlayerRow.position, cameraPosition, dimensions)
    const playerScreenX = playerScreenPosition.x
    const playerScreenY = playerScreenPosition.y
    const deltaX = event.clientX - playerScreenX
    const deltaY = event.clientY - playerScreenY
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    if (distance <= MOUSE_DEAD_ZONE_PX) {
      const nextDirection = { x: 0, y: 0 }
      movementRef.current = nextDirection
      return
    }

    const clampedDistance = Math.min(distance, GAME_CONSTANTS.JOYSTICK_MAX_DISTANCE)
    const normalizedMagnitude = clampedDistance / GAME_CONSTANTS.JOYSTICK_MAX_DISTANCE
    const angle = Math.atan2(deltaY, deltaX)

    const nextDirection = {
      x: Math.cos(angle) * normalizedMagnitude,
      y: Math.sin(angle) * normalizedMagnitude,
    }

    movementRef.current = nextDirection
  }

  const handleMouseLeaveViewport = () => {
    // Preserve the last mouse-derived movement vector when the cursor leaves
    // the viewport; the next mousemove will update it again.
  }

  const handleJoystickTouchStart = (event: React.TouchEvent) => {
    lastInputModeRef.current = 'touch'
    joystickHandlers.onTouchStart(event)
  }

  const handleJoystickTouchMove = (event: React.TouchEvent) => {
    lastInputModeRef.current = 'touch'
    joystickHandlers.onTouchMove(event)
  }

  const handleJoystickTouchEnd = (event: React.TouchEvent) => {
    lastInputModeRef.current = 'touch'
    joystickHandlers.onTouchEnd(event)
  }

  // Render player circle
  const getPlayerPulseScale = (playerId: string) => {
    const pulseStartedAt = growthPulsesRef.current[playerId]
    if (!pulseStartedAt) {
      return 1
    }

    const elapsed = performance.now() - pulseStartedAt
    const progress = Math.min(1, elapsed / GROWTH_PULSE_DURATION_MS)
    const pulse = Math.sin(progress * Math.PI) * GROWTH_PULSE_MAX_SCALE
    return 1 + pulse
  }

  const renderPlayer = (player: PlayerRowState) => {
    const screenPosition = worldToScreen(player.position, cameraPosition, dimensions)
    const screenX = screenPosition.x
    const screenY = screenPosition.y
    const visual = getPlayerVisual(player)
    const displaySize = player.size * getPlayerPulseScale(player.id)
    const textureSeed = hashString(`${player.id}:${player.skinId ?? 'classic'}`)
    const textureOffsetA = ((textureSeed % 7) - 3) * 0.12
    const textureOffsetB = (((textureSeed >> 3) % 7) - 3) * 0.1
    const edgeColor = hexToNumber(visual.edge)
    const textureColor = hexToNumber(visual.texture)
    const highlightColor = hexToNumber(visual.highlight)

    return (
      <pixiGraphics
        key={player.id}
        draw={g => {
          g.clear()
          g.circle(0, 0, displaySize + 8)
          g.fill({ color: edgeColor, alpha: 0.1 })

          g.circle(0, 0, displaySize)
          g.fill({ color: visual.base })

          g.circle(-displaySize * 0.22, -displaySize * 0.24, displaySize * 0.48)
          g.fill({ color: highlightColor, alpha: 0.88 })

          g.circle(displaySize * textureOffsetA, displaySize * -0.08, displaySize * 0.28)
          g.fill({ color: textureColor, alpha: 0.28 })

          g.circle(displaySize * -0.18, displaySize * textureOffsetB, displaySize * 0.18)
          g.fill({ color: textureColor, alpha: 0.2 })

          g.moveTo(-displaySize * 0.58, displaySize * 0.22)
          g.bezierCurveTo(
            -displaySize * 0.2,
            displaySize * 0.52,
            displaySize * 0.24,
            displaySize * 0.44,
            displaySize * 0.56,
            displaySize * 0.08
          )
          g.stroke({ width: Math.max(2, displaySize * 0.08), color: textureColor, alpha: 0.2 })

          g.circle(0, 0, displaySize)
          g.stroke({ width: Math.max(3, displaySize * 0.08), color: edgeColor, alpha: 0.98 })

          // Add outline for local player
          if (player.id === localPlayerRow?.id) {
            g.circle(0, 0, displaySize + 5)
            g.stroke({ width: 3, color: 0xffffff, alpha: 0.9 })
          }
        }}
        x={screenX}
        y={screenY}
      />
    )
  }

  // Render knibble
  const renderKnibble = (knibble: KnibbleRowState) => {
    const screenPosition = worldToScreen(knibble.position, cameraPosition, dimensions)
    const screenX = screenPosition.x
    const screenY = screenPosition.y
    const color = getKnibbleColor(knibble.id)
    const colorNumber = hexToNumber(color)

    return (
      <pixiGraphics
        key={knibble.id}
        draw={g => {
          g.clear()
          g.circle(0, 0, knibble.size * 1.9)
          g.fill({ color: colorNumber, alpha: 0.1 })
          g.circle(0, 0, knibble.size * 1.35)
          g.fill({ color: colorNumber, alpha: 0.15 })
          g.circle(0, 0, knibble.size)
          g.fill({ color })
        }}
        x={screenX}
        y={screenY}
      />
    )
  }

  // Render spit blob
  const renderSpitBlob = (blob: SpitBlobRowState) => {
    const screenPosition = worldToScreen(blob.position, cameraPosition, dimensions)
    const screenX = screenPosition.x
    const screenY = screenPosition.y

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
    if (!roomState) return null

    const bounds = roomState.bounds
    const screenPosition = worldToScreen({ x: bounds.x, y: bounds.y }, cameraPosition, dimensions)
    const screenX = screenPosition.x
    const screenY = screenPosition.y

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
    const viewportBounds = getViewportBounds(cameraPosition, dimensions)

    // Calculate visible grid lines
    const startX = Math.floor(viewportBounds.x / gridSize) * gridSize
    const endX = Math.ceil((viewportBounds.x + viewportBounds.width) / gridSize) * gridSize
    const startY = Math.floor(viewportBounds.y / gridSize) * gridSize
    const endY = Math.ceil((viewportBounds.y + viewportBounds.height) / gridSize) * gridSize

    // Vertical lines
    for (let x = startX; x <= endX; x += gridSize) {
      const screenX = worldToScreen({ x, y: cameraPosition.y }, cameraPosition, dimensions).x
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
      const screenY = worldToScreen({ x: cameraPosition.x, y }, cameraPosition, dimensions).y
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

  if (
    !roomState ||
    (!isFinished && !isEliminated && (!localPlayerRow || !localPlayer || !localPlayerId))
  ) {
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
    // biome-ignore lint/a11y/noStaticElementInteractions: mouse
    <div
      className='relative w-screen h-screen overflow-hidden bg-[#0F0F23]'
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeaveViewport}
    >
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
          {SHOW_BACKGROUND_GRID && renderGrid()}

          {/* Game boundaries */}
          {renderBoundaries()}

          {/* Knibbles */}
          {Object.values(knibbleRows).map(renderKnibble)}

          {/* Spit blobs */}
          {Object.values(spitBlobRows).map(renderSpitBlob)}

          {/* Players */}
          {Object.values(playerRows)
            .filter(player => player.isAlive)
            .map(renderPlayer)}
        </pixiContainer>
      </Application>

      {/* UI Overlay */}
      <div className='absolute inset-0 pointer-events-none z-[10] [&>*]:pointer-events-auto'>
        {/* HUD */}
        <GameHUD />

        {/* Virtual Joystick */}
        {shouldShowJoystick && (
          <VirtualJoystick
            ref={joystickRef}
            isActive={joystickActive}
            direction={direction}
            magnitude={magnitude}
            onTouchStart={handleJoystickTouchStart}
            onTouchMove={handleJoystickTouchMove}
            onTouchEnd={handleJoystickTouchEnd}
            onMouseDown={joystickHandlers.onMouseDown}
          />
        )}

        {/* Action Buttons */}
        <ActionButtons
          onSplit={handleSplitAction}
          onSpit={handleSpitAction}
          disabled={!canControlLocalPlayer}
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
        {(roomState.status === GameStatus.FINISHED || isEliminated) && (
          <GameOverScreen onRestart={() => navigate('/')} />
        )}
      </div>
    </div>
  )
}

export default GamePage

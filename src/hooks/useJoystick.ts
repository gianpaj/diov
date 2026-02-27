import { useState, useEffect, useCallback, useRef } from 'react'
import { Vector2D, JoystickState, TouchData, GAME_CONSTANTS } from '@/types'

interface UseJoystickOptions {
  maxDistance?: number
  deadZone?: number
  returnToCenter?: boolean
  smoothing?: number
}

export function useJoystick(options: UseJoystickOptions = {}) {
  const {
    maxDistance = GAME_CONSTANTS.JOYSTICK_MAX_DISTANCE,
    deadZone = GAME_CONSTANTS.JOYSTICK_DEAD_ZONE,
    returnToCenter = true,
    smoothing = 0.1,
  } = options

  const [joystickState, setJoystickState] = useState<JoystickState>({
    center: { x: 0, y: 0 },
    knobPosition: { x: 0, y: 0 },
    isActive: false,
    direction: { x: 0, y: 0 },
    magnitude: 0,
  })

  const touchRef = useRef<TouchData | null>(null)
  const animationFrameRef = useRef<number | undefined>(undefined)
  const containerRef = useRef<HTMLDivElement>(null)

  // Calculate joystick center position
  const updateCenter = useCallback(() => {
    if (!containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const center = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    }

    setJoystickState(prev => ({
      ...prev,
      center,
      knobPosition: returnToCenter ? center : prev.knobPosition,
    }))
  }, [returnToCenter])

  // Update joystick position and calculate direction/magnitude
  const updateJoystick = useCallback(
    (position: Vector2D) => {
      const { center } = joystickState
      const deltaX = position.x - center.x
      const deltaY = position.y - center.y
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

      // Clamp to max distance
      const clampedDistance = Math.min(distance, maxDistance)
      const angle = Math.atan2(deltaY, deltaX)

      const knobPosition = {
        x: center.x + Math.cos(angle) * clampedDistance,
        y: center.y + Math.sin(angle) * clampedDistance,
      }

      // Calculate normalized direction and magnitude
      const magnitude = clampedDistance / maxDistance
      const normalizedMagnitude = magnitude < deadZone ? 0 : magnitude

      const direction = normalizedMagnitude > 0
        ? {
            x: Math.cos(angle) * normalizedMagnitude,
            y: Math.sin(angle) * normalizedMagnitude,
          }
        : { x: 0, y: 0 }

      setJoystickState(prev => ({
        ...prev,
        knobPosition,
        direction,
        magnitude: normalizedMagnitude,
      }))
    },
    [joystickState.center, maxDistance, deadZone]
  )

  // Smooth return to center
  const smoothReturnToCenter = useCallback(() => {
    if (!returnToCenter || joystickState.isActive) return

    const { center, knobPosition } = joystickState
    const deltaX = center.x - knobPosition.x
    const deltaY = center.y - knobPosition.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    if (distance < 1) {
      // Close enough to center
      setJoystickState(prev => ({
        ...prev,
        knobPosition: center,
        direction: { x: 0, y: 0 },
        magnitude: 0,
      }))
      return
    }

    // Smooth interpolation to center
    const newKnobPosition = {
      x: knobPosition.x + deltaX * smoothing,
      y: knobPosition.y + deltaY * smoothing,
    }

    setJoystickState(prev => ({
      ...prev,
      knobPosition: newKnobPosition,
    }))

    animationFrameRef.current = requestAnimationFrame(smoothReturnToCenter)
  }, [joystickState, returnToCenter, smoothing])

  // Touch event handlers
  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      event.preventDefault()
      const touch = event.touches[0]
      if (!touch || !containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const touchPosition = {
        x: touch.clientX,
        y: touch.clientY,
      }

      // Check if touch is within joystick area
      const center = joystickState.center
      const deltaX = touchPosition.x - center.x
      const deltaY = touchPosition.y - center.y
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

      if (distance <= rect.width / 2) {
        touchRef.current = {
          id: touch.identifier,
          position: touchPosition,
          startPosition: touchPosition,
          startTime: Date.now(),
        }

        setJoystickState(prev => ({
          ...prev,
          isActive: true,
        }))

        updateJoystick(touchPosition)
      }
    },
    [joystickState.center, updateJoystick]
  )

  const handleTouchMove = useCallback(
    (event: React.TouchEvent) => {
      event.preventDefault()
      if (!touchRef.current) return

      const touch = Array.from(event.touches).find(
        t => t.identifier === touchRef.current!.id
      )

      if (touch) {
        const touchPosition = {
          x: touch.clientX,
          y: touch.clientY,
        }

        touchRef.current.position = touchPosition
        updateJoystick(touchPosition)
      }
    },
    [updateJoystick]
  )

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      event.preventDefault()
      if (!touchRef.current) return

      const touch = Array.from(event.changedTouches).find(
        t => t.identifier === touchRef.current!.id
      )

      if (touch) {
        touchRef.current = null
        setJoystickState(prev => ({
          ...prev,
          isActive: false,
        }))

        if (returnToCenter) {
          smoothReturnToCenter()
        }
      }
    },
    [returnToCenter, smoothReturnToCenter]
  )

  // Mouse event handlers for desktop testing
  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const mousePosition = {
        x: event.clientX,
        y: event.clientY,
      }

      const center = joystickState.center
      const deltaX = mousePosition.x - center.x
      const deltaY = mousePosition.y - center.y
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

      if (distance <= rect.width / 2) {
        touchRef.current = {
          id: 0,
          position: mousePosition,
          startPosition: mousePosition,
          startTime: Date.now(),
        }

        setJoystickState(prev => ({
          ...prev,
          isActive: true,
        }))

        updateJoystick(mousePosition)
      }
    },
    [joystickState.center, updateJoystick]
  )

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!touchRef.current) return

      const mousePosition = {
        x: event.clientX,
        y: event.clientY,
      }

      touchRef.current.position = mousePosition
      updateJoystick(mousePosition)
    },
    [updateJoystick]
  )

  const handleMouseUp = useCallback(() => {
    if (!touchRef.current) return

    touchRef.current = null
    setJoystickState(prev => ({
      ...prev,
      isActive: false,
    }))

    if (returnToCenter) {
      smoothReturnToCenter()
    }
  }, [returnToCenter, smoothReturnToCenter])

  // Setup event listeners
  useEffect(() => {
    updateCenter()
    window.addEventListener('resize', updateCenter)

    return () => {
      window.removeEventListener('resize', updateCenter)
    }
  }, [updateCenter])

  useEffect(() => {
    if (joystickState.isActive) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.addEventListener('mouseleave', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mouseleave', handleMouseUp)
    }
  }, [joystickState.isActive, handleMouseMove, handleMouseUp])

  // Cleanup animation frame
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return {
    joystickState,
    containerRef,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onMouseDown: handleMouseDown,
    },
    // Computed values for easier access
    direction: joystickState.direction,
    magnitude: joystickState.magnitude,
    isActive: joystickState.isActive,
    // Helper methods
    reset: () => {
      touchRef.current = null
      setJoystickState(prev => ({
        ...prev,
        isActive: false,
        direction: { x: 0, y: 0 },
        magnitude: 0,
        knobPosition: prev.center,
      }))
    },
  }
}

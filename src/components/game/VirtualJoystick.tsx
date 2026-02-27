import React, { forwardRef } from 'react'
import { Vector2D } from '@/types'

interface VirtualJoystickProps {
  isActive: boolean
  direction: Vector2D
  magnitude: number
  onTouchStart: (event: React.TouchEvent) => void
  onTouchMove: (event: React.TouchEvent) => void
  onTouchEnd: (event: React.TouchEvent) => void
  onMouseDown: (event: React.MouseEvent) => void
}

const VirtualJoystick = forwardRef<HTMLDivElement, VirtualJoystickProps>(
  ({ isActive, direction, magnitude, onTouchStart, onTouchMove, onTouchEnd, onMouseDown }, ref) => {
    const knobOffset = {
      x: direction.x * 35, // 35px max offset from center
      y: direction.y * 35,
    }

    return (
      <div className='joystick-container' ref={ref}>
        <div
          className='joystick-area'
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
        >
          {/* Glow ring — opacity driven by isActive via inline style */}
          <div className='joystick-glow' style={{ opacity: isActive ? 1 : 0 }} />
          <div className='joystick-base'>
            <div
              className={`joystick-knob ${isActive ? 'active' : ''} ${magnitude > 0.8 ? 'pulsing' : ''}`}
              style={{
                transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
                transition: isActive ? 'none' : 'transform 0.2s ease-out',
              }}
            />
          </div>
        </div>

        <style>{`
          .joystick-container {
            position: absolute;
            left: 20px;
            bottom: 20px;
            width: 120px;
            height: 120px;
            z-index: 15;
            pointer-events: auto;
          }

          .joystick-area {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            touch-action: none;
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            -webkit-touch-callout: none;
            -webkit-tap-highlight-color: transparent;
            position: relative;
          }

          /* Glow ring rendered as a sibling div so opacity can be set via inline style */
          .joystick-glow {
            position: absolute;
            top: -5px;
            left: -5px;
            right: -5px;
            bottom: -5px;
            border-radius: 50%;
            background: linear-gradient(45deg, transparent, rgba(102, 126, 234, 0.3), transparent);
            transition: opacity 0.2s ease;
            z-index: -1;
            pointer-events: none;
          }

          .joystick-base {
            width: 100px;
            height: 100px;
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.4);
            border: 3px solid rgba(255, 255, 255, 0.3);
            backdrop-filter: blur(10px);
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          }

          .joystick-base:active {
            transform: scale(0.98);
          }

          .joystick-knob {
            width: 45px;
            height: 45px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.9);
            position: absolute;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
            border: 2px solid rgba(255, 255, 255, 0.5);
          }

          .joystick-knob.active {
            background: rgba(255, 255, 255, 1);
            box-shadow: 0 2px 15px rgba(0, 0, 0, 0.5);
            border-color: rgba(102, 126, 234, 0.8);
          }

          .joystick-knob::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.1);
          }

          .joystick-knob.active::after {
            background: rgba(102, 126, 234, 0.3);
          }

          /* Pulse animation when magnitude > 0.8 — toggled via .pulsing class */
          .joystick-knob.pulsing {
            animation: joystick-pulse 0.5s ease-in-out infinite alternate;
          }

          @keyframes joystick-pulse {
            from { scale: 1; }
            to   { scale: 1.1; }
          }

          @media (max-width: 768px) {
            .joystick-container {
              width: 100px;
              height: 100px;
              left: 15px;
              bottom: 15px;
            }

            .joystick-base {
              width: 80px;
              height: 80px;
            }

            .joystick-knob {
              width: 35px;
              height: 35px;
            }

            .joystick-knob::after {
              width: 15px;
              height: 15px;
            }
          }
        `}</style>
      </div>
    )
  }
)

VirtualJoystick.displayName = 'VirtualJoystick'

export default VirtualJoystick

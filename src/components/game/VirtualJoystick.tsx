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
      <div className="joystick-container" ref={ref}>
        <div
          className="joystick-area"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
        >
          <div className="joystick-base">
            <div
              className={`joystick-knob ${isActive ? 'active' : ''}`}
              style={{
                transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
              }}
            />
          </div>
        </div>

        <style jsx>{`
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

          .joystick-knob {
            width: 45px;
            height: 45px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.9);
            position: absolute;
            transition: ${isActive ? 'none' : 'transform 0.2s ease-out'};
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

          /* Prevent text selection and context menu */
          .joystick-area {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
            -webkit-touch-callout: none;
            -webkit-tap-highlight-color: transparent;
          }

          /* Add visual feedback for touch */
          .joystick-base:active {
            transform: scale(0.98);
          }

          /* Glow effect when active */
          .joystick-base {
            position: relative;
          }

          .joystick-base::before {
            content: '';
            position: absolute;
            top: -5px;
            left: -5px;
            right: -5px;
            bottom: -5px;
            border-radius: 50%;
            background: linear-gradient(45deg, transparent, rgba(102, 126, 234, 0.3), transparent);
            opacity: ${isActive ? '1' : '0'};
            transition: opacity 0.2s ease;
            z-index: -1;
          }

          /* Pulse animation when magnitude is high */
          ${magnitude > 0.8 ? `
            .joystick-knob {
              animation: pulse 0.5s ease-in-out infinite alternate;
            }

            @keyframes pulse {
              from {
                transform: translate(${knobOffset.x}px, ${knobOffset.y}px) scale(1);
              }
              to {
                transform: translate(${knobOffset.x}px, ${knobOffset.y}px) scale(1.1);
              }
            }
          ` : ''}
        `}</style>
      </div>
    )
  }
)

VirtualJoystick.displayName = 'VirtualJoystick'

export default VirtualJoystick

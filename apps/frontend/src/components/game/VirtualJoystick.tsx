import React, { forwardRef } from 'react'
import { cn } from '@/utils/cn'
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
      <div className='absolute left-5 bottom-5 w-[120px] h-[120px] z-[15] pointer-events-auto' ref={ref}>
        <div
          className='relative w-full h-full flex items-center justify-center touch-none select-none'
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
        >
          {/* Glow ring — opacity driven by isActive via inline style */}
          <div
            className='absolute top-[-5px] left-[-5px] right-[-5px] bottom-[-5px] rounded-full z-[-1] pointer-events-none transition-opacity duration-200 bg-[linear-gradient(45deg,transparent,rgba(102,126,234,0.3),transparent)]'
            style={{ opacity: isActive ? 1 : 0 }}
          />
          <div className='relative w-[100px] h-[100px] rounded-full bg-black/40 border-[3px] border-white/30 backdrop-blur-[10px] flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.3)] active:scale-[0.98]'>
            <div
              className={cn(
                'joystick-knob absolute w-[45px] h-[45px] rounded-full border-2',
                'shadow-[0_2px_10px_rgba(0,0,0,0.4)]',
                isActive
                  ? 'bg-white border-[rgba(102,126,234,0.8)] shadow-[0_2px_15px_rgba(0,0,0,0.5)]'
                  : 'bg-white/90 border-white/50',
                magnitude > 0.8 && 'pulsing',
              )}
              style={{
                transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
                transition: isActive ? 'none' : 'transform 0.2s ease-out',
              }}
            />
          </div>
        </div>

        <style>{`
          .pulsing {
            animation: joystick-pulse 0.5s ease-in-out infinite alternate;
          }
          @keyframes joystick-pulse {
            from { scale: 1; }
            to   { scale: 1.1; }
          }
          /* Inner dot pseudo-element */
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
        `}</style>
      </div>
    )
  }
)

VirtualJoystick.displayName = 'VirtualJoystick'

export default VirtualJoystick

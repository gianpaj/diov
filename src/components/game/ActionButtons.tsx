import React from 'react'
import { Zap, Droplet } from 'lucide-react'
import { cn } from '@/utils/cn'

interface ActionButtonsProps {
  onSplit: () => void
  onSpit: () => void
  disabled?: boolean
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ onSplit, onSpit, disabled = false }) => {
  const baseBtn =
    'relative overflow-hidden w-[70px] h-[70px] rounded-full bg-black/50 backdrop-blur-[15px] flex items-center justify-center text-white cursor-pointer select-none shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-200 active:scale-95 active:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none border-[3px]'

  return (
    <div className='absolute right-5 bottom-5 flex flex-col gap-[15px] z-[15] pointer-events-auto'>
      <button
        className={cn(
          baseBtn,
          'border-[rgba(255,107,107,0.5)]',
          'hover:bg-[rgba(255,107,107,0.1)] hover:border-[rgba(255,107,107,0.8)] hover:shadow-[0_6px_25px_rgba(255,107,107,0.3)] hover:scale-105',
        )}
        onClick={onSplit}
        disabled={disabled}
        type='button'
      >
        <Zap size={24} />
      </button>

      <button
        className={cn(
          baseBtn,
          'border-[rgba(78,205,196,0.5)]',
          'hover:bg-[rgba(78,205,196,0.1)] hover:border-[rgba(78,205,196,0.8)] hover:shadow-[0_6px_25px_rgba(78,205,196,0.3)] hover:scale-105',
        )}
        onClick={onSpit}
        disabled={disabled}
        type='button'
      >
        <Droplet size={24} />
      </button>
    </div>
  )
}

export default ActionButtons

import React from 'react'
import { Zap, Droplet } from 'lucide-react'

interface ActionButtonsProps {
  onSplit: () => void
  onSpit: () => void
  disabled?: boolean
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ onSplit, onSpit, disabled = false }) => {
  return (
    <div className="action-buttons">
      <button
        className={`action-button split-button ${disabled ? 'disabled' : ''}`}
        onClick={onSplit}
        disabled={disabled}
        type="button"
      >
        <Zap size={24} />
      </button>

      <button
        className={`action-button spit-button ${disabled ? 'disabled' : ''}`}
        onClick={onSpit}
        disabled={disabled}
        type="button"
      >
        <Droplet size={24} />
      </button>

      <style jsx>{`
        .action-buttons {
          position: absolute;
          right: 20px;
          bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 15px;
          z-index: 15;
          pointer-events: auto;
        }

        .action-button {
          width: 70px;
          height: 70px;
          border-radius: 50%;
          border: 3px solid rgba(255, 255, 255, 0.3);
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(15px);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          color: #fff;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          position: relative;
          overflow: hidden;
        }

        .action-button:hover:not(.disabled) {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.5);
          transform: scale(1.05);
          box-shadow: 0 6px 25px rgba(0, 0, 0, 0.4);
        }

        .action-button:active:not(.disabled) {
          transform: scale(0.95);
          background: rgba(255, 255, 255, 0.2);
        }

        .split-button {
          border-color: rgba(255, 107, 107, 0.5);
        }

        .split-button:hover:not(.disabled) {
          border-color: rgba(255, 107, 107, 0.8);
          background: rgba(255, 107, 107, 0.1);
          box-shadow: 0 6px 25px rgba(255, 107, 107, 0.3);
        }

        .spit-button {
          border-color: rgba(78, 205, 196, 0.5);
        }

        .spit-button:hover:not(.disabled) {
          border-color: rgba(78, 205, 196, 0.8);
          background: rgba(78, 205, 196, 0.1);
          box-shadow: 0 6px 25px rgba(78, 205, 196, 0.3);
        }

        .action-button.disabled {
          opacity: 0.4;
          cursor: not-allowed;
          pointer-events: none;
        }

        /* Add ripple effect */
        .action-button::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          transform: translate(-50%, -50%);
          transition: width 0.3s ease, height 0.3s ease;
        }

        .action-button:active:not(.disabled)::before {
          width: 80px;
          height: 80px;
        }

        /* Button labels for accessibility */
        .split-button::after {
          content: 'Split';
          position: absolute;
          right: 80px;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 5px 10px;
          border-radius: 15px;
          font-size: 12px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease;
          backdrop-filter: blur(10px);
        }

        .spit-button::after {
          content: 'Spit';
          position: absolute;
          right: 80px;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 5px 10px;
          border-radius: 15px;
          font-size: 12px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease;
          backdrop-filter: blur(10px);
        }

        .action-button:hover:not(.disabled)::after {
          opacity: 1;
        }

        @media (max-width: 768px) {
          .action-buttons {
            right: 15px;
            bottom: 15px;
            gap: 12px;
          }

          .action-button {
            width: 60px;
            height: 60px;
          }

          .action-button::after {
            display: none;
          }
        }

        /* Prevent text selection and context menu */
        .action-button {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          -webkit-touch-callout: none;
          -webkit-tap-highlight-color: transparent;
        }

        /* Add glow effect for split button when ready */
        .split-button {
          position: relative;
        }

        .split-button::before {
          content: '';
          position: absolute;
          top: -3px;
          left: -3px;
          right: -3px;
          bottom: -3px;
          border-radius: 50%;
          background: linear-gradient(45deg, transparent, rgba(255, 107, 107, 0.4), transparent);
          opacity: 0;
          z-index: -1;
          animation: splitGlow 2s ease-in-out infinite;
        }

        .spit-button {
          position: relative;
        }

        .spit-button::before {
          content: '';
          position: absolute;
          top: -3px;
          left: -3px;
          right: -3px;
          bottom: -3px;
          border-radius: 50%;
          background: linear-gradient(45deg, transparent, rgba(78, 205, 196, 0.4), transparent);
          opacity: 0;
          z-index: -1;
          animation: spitGlow 2s ease-in-out infinite;
        }

        @keyframes splitGlow {
          0%, 100% {
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes spitGlow {
          0%, 100% {
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}

export default ActionButtons

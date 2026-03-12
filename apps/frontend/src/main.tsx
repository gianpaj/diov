import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Disable context menu globally
document.addEventListener('contextmenu', e => e.preventDefault())

// Prevent scrolling on touch devices
document.addEventListener('touchmove', e => e.preventDefault(), { passive: false })

// Prevent default touch behaviors
document.addEventListener('touchstart', e => e.preventDefault(), { passive: false })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

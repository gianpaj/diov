// import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { GameProvider } from '@/stores/GameStore'
import { SocketProvider } from '@/stores/SocketStore'
import HomePage from '@/components/HomePage'
import WaitingRoom from '@/components/WaitingRoom'
import GamePage from '@/components/GamePage'
import { useOrientation } from '@/hooks/useOrientation'

function App() {
  const { isLandscape } = useOrientation()

  if (!isLandscape) {
    return (
      <div className='portrait-warning'>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>📱➡️📱</div>
        <div style={{ fontSize: '24px', marginBottom: '10px' }}>Please rotate your device</div>
        <div>Battle Circles requires landscape mode for the best experience</div>
      </div>
    )
  }

  return (
    <SocketProvider>
      <GameProvider>
        <Router>
          <div className='App'>
            <Routes>
              <Route path='/' element={<HomePage />} />
              <Route path='/waiting' element={<WaitingRoom />} />
              <Route path='/game' element={<GamePage />} />
            </Routes>
          </div>
        </Router>
      </GameProvider>
    </SocketProvider>
  )
}

export default App

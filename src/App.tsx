import { Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import GamePage from '@/components/GamePage'
import HomePage from '@/components/HomePage'
import WaitingRoom from '@/components/WaitingRoom'
import { useOrientation } from '@/hooks/useOrientation'
import { GameProvider } from '@/stores/GameStore'
import { SocketProvider } from '@/stores/SocketStore'

// Allow the orientation gate to be bypassed in two ways:
//   1. Running in development mode  (import.meta.env.DEV)
//   2. Adding ?landscape=bypass to the URL  (handy for portrait-only monitors)
const isOrientationBypassed =
  import.meta.env.DEV || new URLSearchParams(window.location.search).get('landscape') === 'bypass'

function App() {
  const { isLandscape } = useOrientation()

  if (!isLandscape && !isOrientationBypassed) {
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

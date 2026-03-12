import { Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import GamePage from '@/components/GamePage'
import HomePage from '@/components/HomePage'
import WaitingRoom from '@/components/WaitingRoom'
import RequireSession from '@/components/RequireSession'
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
      <div className='w-screen h-screen flex flex-col items-center justify-center bg-[#0f0f23] text-white text-center p-5'>
        <div className='text-5xl mb-5'>📱➡️📱</div>
        <div className='text-2xl mb-2.5'>Please rotate your device</div>
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
              <Route
                path='/waiting'
                element={
                  <RequireSession>
                    <WaitingRoom />
                  </RequireSession>
                }
              />
              <Route
                path='/game'
                element={
                  <RequireSession>
                    <GamePage />
                  </RequireSession>
                }
              />
            </Routes>
          </div>
        </Router>
      </GameProvider>
    </SocketProvider>
  )
}

export default App

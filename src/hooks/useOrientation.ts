import { useState, useEffect } from 'react'

export function useOrientation() {
  const [isLandscape, setIsLandscape] = useState(() => {
    if (typeof window === 'undefined') return true
    return window.innerWidth > window.innerHeight
  })

  useEffect(() => {
    const handleOrientationChange = () => {
      // Check if width is greater than height
      const landscape = window.innerWidth > window.innerHeight
      setIsLandscape(landscape)
    }

    // Listen for resize events (covers orientation changes)
    window.addEventListener('resize', handleOrientationChange)

    // Also listen for orientation change events on mobile
    window.addEventListener('orientationchange', () => {
      // Delay to allow the browser to update dimensions
      setTimeout(handleOrientationChange, 100)
    })

    // Initial check
    handleOrientationChange()

    return () => {
      window.removeEventListener('resize', handleOrientationChange)
      window.removeEventListener('orientationchange', handleOrientationChange)
    }
  }, [])

  return { isLandscape }
}

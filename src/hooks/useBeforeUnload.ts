import { useEffect } from 'react'

/**
 * Shows the browser's native "Leave site?" confirmation dialog when the user
 * tries to refresh or close the tab, as long as `active` is true.
 *
 * Note: modern browsers display a generic message regardless of what you pass
 * to `event.returnValue` — you cannot customise the text.
 */
export const useBeforeUnload = (active: boolean) => {
  useEffect(() => {
    if (!active) return

    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      // Required for legacy browser support (Chrome < 119, Firefox)
      e.returnValue = ''
    }

    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [active])
}

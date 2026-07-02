import { useEffect, useState } from 'react'

// True at >= 1024px (Tailwind `lg`). Below that the app renders its touch-friendly
// mobile/tablet mode. Reactive to resize + orientation changes.
const QUERY = '(min-width: 1024px)'

export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(QUERY).matches : true,
  )
  useEffect(() => {
    const mql = window.matchMedia(QUERY)
    const onChange = (e) => setIsDesktop(e.matches)
    setIsDesktop(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return isDesktop
}

import { useEffect, useState } from 'react'

// Keeps an element mounted long enough to play an exit animation.
// Returns { render } — whether to render at all — and { closing } — whether
// it's mid-exit (so you can swap to the "out" animation class).
export function useAnimatedPresence(open, duration = 160) {
  const [render, setRender] = useState(open)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (open) {
      setRender(true)
      setClosing(false)
      return
    }
    if (!render) return
    setClosing(true)
    const t = setTimeout(() => {
      setRender(false)
      setClosing(false)
    }, duration)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return { render, closing }
}

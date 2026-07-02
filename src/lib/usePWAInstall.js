import { useEffect, useState } from 'react'

// Surfaces the browser's install prompt so we can offer an in-app "Install"
// button (Chrome/Edge/Android). iOS Safari doesn't fire beforeinstallprompt —
// there users install via Share → Add to Home Screen.
const standalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true)

export function usePWAInstall() {
  const [deferred, setDeferred] = useState(null)
  const [installed, setInstalled] = useState(standalone())

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault()
      setDeferred(e)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = async () => {
    if (!deferred) return
    deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
  }

  return { canInstall: !!deferred && !installed, installed, install }
}

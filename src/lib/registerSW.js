// Register the service worker in production only (dev caching just gets in the
// way). BASE_URL carries the GitHub Pages sub-path, so the SW scope matches.
export function registerSW() {
  if (!import.meta.env.PROD) return
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {})
  })
}

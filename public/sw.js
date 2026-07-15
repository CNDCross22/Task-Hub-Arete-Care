// Minimal, dependency-free service worker for the Task Hub PWA.
//
// Goals: make the app installable and usable offline, WITHOUT ever caching or
// interfering with cross-origin requests (Supabase Edge Function, Google Fonts)
// or breaking updates. Strategy:
//   - navigations  -> network-first, fall back to the cached app shell offline
//   - same-origin GET assets (content-hashed by Vite) -> stale-while-revalidate
// Bump VERSION to force a clean cache on the next visit.
const VERSION = 'v2'
const CACHE = `arete-hub-${VERSION}`
// scope is the deploy sub-path, e.g. "/Task-Hub-Arete-Care/" (or "/" in dev).
const BASE = new URL(self.registration.scope).pathname

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([BASE, `${BASE}manifest.webmanifest`]).catch(() => {})),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // Never touch cross-origin traffic (API/auth/fonts) — let the network handle it.
  if (url.origin !== self.location.origin) return

  // App navigations: always go to the network, bypassing the HTTP cache. GitHub
  // Pages serves index.html with max-age=600, so without `no-store` a client can
  // keep booting a 10-minute-old shell (and therefore an old JS bundle) after a
  // deploy. Cache the shell as we go and fall back to it only when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(BASE, copy)).catch(() => {})
          return res
        })
        .catch(() => caches.match(BASE).then((r) => r || caches.match(request))),
    )
    return
  }

  // Static assets (content-hashed): serve from cache, refresh in the background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {})
        }
        return res
      })
      if (cached) {
        network.catch(() => {}) // background refresh; a failure just keeps the cached copy
        return cached
      }
      // Nothing cached: let the network result (or its error) through as-is,
      // rather than resolving to undefined, which surfaces as "Failed to fetch".
      return network
    }),
  )
})

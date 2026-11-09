// Offline support. Registered as sw.js?v=<build id>, so each deploy installs a new worker.
// - install: precache the page and every built file listed in precache.json (fresh from the network).
// - activate: delete caches from older builds.
// - pages: network first, so updates show when online; the cached page when offline.
// - files: cache first (built file names are hashed, so a name never changes content).
const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev'
const CACHE = `garage-${VERSION}`
const SHELL = ['./', './manifest.webmanifest', './favicon.svg', './icon-192.png']
const fresh = (url) => new Request(url, { cache: 'reload' })

self.addEventListener('install', (e) => {
  e.waitUntil(
    (async () => {
      const res = await fetch(fresh('./precache.json'))
      const { files } = res.ok ? await res.json() : { files: [] }
      const cache = await caches.open(CACHE)
      await cache.addAll([...SHELL, ...files.map((f) => `./${f}`)].map(fresh))
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key)
      await self.clients.claim()
    })(),
  )
})

// Precached copies were fetched without the page's Origin header; servers that send `Vary: Origin` would
// otherwise make every lookup miss. Our files don't differ by request headers, so match on URL alone.
const match = (req) => caches.match(req, { ignoreVary: true })

// Only keep real, same-origin successes: never an error page or a redirect.
const cacheable = (res) => res.ok && res.type === 'basic'

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (cacheable(res)) {
            const copy = res.clone()
            e.waitUntil(caches.open(CACHE).then((c) => c.put('./', copy)))
          }
          return res
        })
        .catch(async () => (await match('./')) || Response.error()),
    )
    return
  }
  e.respondWith(
    match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (cacheable(res)) {
            const copy = res.clone()
            e.waitUntil(caches.open(CACHE).then((c) => c.put(req, copy)))
          }
          return res
        }),
    ),
  )
})

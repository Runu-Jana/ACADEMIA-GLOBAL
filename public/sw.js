/* Academia Global — service worker.
 *
 * Deliberately conservative about what it stores. Authenticated HTML
 * (/dashboard, /admin) and every API response are NEVER cached: this app is
 * used on shared and family devices, and a cached dashboard would leak one
 * student's data to the next person who opens the app offline.
 */

const VERSION = 'v1'
const SHELL_CACHE = `ag-shell-${VERSION}`
const ASSET_CACHE = `ag-assets-${VERSION}`
const OFFLINE_URL = '/offline'

const SHELL_ASSETS = [OFFLINE_URL, '/icons/icon.svg', '/manifest.webmanifest']

// Paths whose responses must never touch the cache.
const NEVER_CACHE = ['/api/', '/dashboard', '/admin', '/apply', '/login', '/signup']

const isPrivate = (pathname) => NEVER_CACHE.some((p) => pathname.startsWith(p))

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (isPrivate(url.pathname)) return // straight to network, never stored

  // Navigations: network-first, fall back to the offline page.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)))
    return
  }

  // Static assets: cache-first, then populate in the background.
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    /\.(css|js|woff2?|png|jpe?g|svg|webp)$/.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            // Only store complete, same-origin successes.
            if (res.ok && res.status === 200) {
              const copy = res.clone()
              caches.open(ASSET_CACHE).then((c) => c.put(request, copy))
            }
            return res
          }),
      ),
    )
  }
})

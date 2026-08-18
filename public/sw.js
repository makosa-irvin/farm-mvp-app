// Runtime-caching service worker for the app shell (HTML/JS/CSS/fonts/
// icons). Deliberately simple: no build-time precache manifest, no
// Workbox — it just caches whatever same-origin GET requests succeed, and
// serves from that cache when the network fails.
//
// Unlike a backend-connected app, there's no separate API origin to leave
// alone here — this app has no backend at all, everything lives in
// localStorage — so every same-origin GET request (including the Google
// Fonts CSS/font files, which are a different origin but still fair game
// to cache) is worth caching for offline use.

const CACHE_NAME = 'field-ledger-shell-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Only cache successful, cacheable responses — opaque cross-origin
        // responses (like Google Fonts without CORS) still get stored, but
        // skip actual errors.
        if (response && (response.ok || response.type === 'opaque')) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') {
          const shell = await caches.match('/index.html');
          if (shell) return shell;
        }
        return Response.error();
      })
  );
});

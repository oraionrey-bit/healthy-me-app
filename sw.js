/**
 * Healthy Me — service worker.
 *
 * Strategy: stale-while-revalidate for JS/CSS/images/fonts. The user gets the
 * cached version INSTANTLY on every visit (no network wait), and the SW fetches
 * a fresh copy in the background and stores it for next time. So updates take
 * ONE refresh to apply, but every visit feels instant.
 *
 * Network-first for HTML so the user always sees the latest version of the
 * app shell (which references the cache-busted JS bundles by hash).
 *
 * API calls (Supabase) are NOT intercepted — they go straight to the network
 * and the offline save queue handles unreachable scenarios.
 */

const CACHE_VERSION = 'v2';
const STATIC_CACHE = `healthy-me-static-${CACHE_VERSION}`;

// On install, take over immediately
self.addEventListener('install', () => {
  self.skipWaiting();
});

// On activate, clean up old caches and claim all clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith('healthy-me-') && k !== STATIC_CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Skip cross-origin (Supabase, fonts CDNs, etc.)
  if (url.origin !== self.location.origin) return;

  // Skip API/data routes — let the offline save queue handle reliability
  if (url.pathname.startsWith('/rest/v1/') || url.pathname.startsWith('/auth/v1/') || url.pathname.startsWith('/functions/v1/')) {
    return;
  }

  // Network-first for HTML (always get latest shell)
  const isHTML = request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html');
  if (isHTML) {
    event.respondWith(
      fetch(request)
        .then((resp) => {
          // Cache the latest HTML for offline fallback
          if (resp.ok) {
            const clone = resp.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
          }
          return resp;
        })
        .catch(() => caches.match(request).then((c) => c || caches.match('/'))),
    );
    return;
  }

  // Stale-while-revalidate for everything else (JS, CSS, images, fonts)
  event.respondWith(
    caches.open(STATIC_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const networkPromise = fetch(request)
        .then((resp) => {
          if (resp.ok) cache.put(request, resp.clone());
          return resp;
        })
        .catch(() => cached); // Fall back to cache on network error
      // Return cached immediately if present, else wait for network
      return cached || networkPromise;
    }),
  );
});

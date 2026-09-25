// Eptomart Service Worker — v4 cache buster
const CACHE_VERSION = 'eptomart-v4';

self.addEventListener('install', (event) => {
  console.log('[SW] Installing v4 — clearing all old caches');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        console.log('[SW] Deleting cache:', key);
        return caches.delete(key);
      }))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activated v4 — claiming all clients');
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache — always go to network
  if (
    request.method !== 'GET' ||
    url.hostname.includes('onrender.com') ||
    url.pathname.startsWith('/api/')
  ) {
    return; // browser handles it
  }

  // For everything else — network first, no caching.
  //
  // IMPORTANT: `fetch(request)` alone still honors the BROWSER's own HTTP
  // disk cache (separate from the CacheStorage API this SW never writes
  // to). Hashed /assets/ files are served with `Cache-Control: public,
  // max-age=31536000, immutable`, which is normally fine — but if the
  // browser (or an intermediate CDN edge) ever cached a bad/incomplete
  // response for one of those URLs during a brief deploy-propagation
  // glitch (e.g. an error page served with a 200 status), "immutable"
  // tells the browser to NEVER revalidate that URL again — not even on a
  // normal reload — permanently replaying the broken response and
  // crashing the app with "Failed to fetch dynamically imported module"
  // for that user until they manually clear their cache. Forcing
  // `cache: 'reload'` makes every request this SW handles go all the way
  // to the network and overwrite whatever the browser had cached,
  // eliminating that stuck-forever failure mode entirely.
  event.respondWith(
    fetch(request, { cache: 'reload' }).catch(() => caches.match(request))
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Eptomart', {
      body: data.body || 'New notification',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: { url: data.url || '/' },
      tag: data.tag || 'eptomart',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action !== 'dismiss') {
    clients.openWindow(event.notification.data?.url || '/');
  }
});

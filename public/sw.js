// ============================================
// EPTOMART SERVICE WORKER
// Handles: Offline support, caching, push notifications
// Note: This file is auto-managed by vite-plugin-pwa.
// This is a manual fallback / reference copy.
// ============================================

const CACHE_NAME = 'eptomart-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// ─── Install Event ────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// ─── Activate Event ───────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch Event ──────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip API requests (always fetch fresh)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(JSON.stringify({
          success: false,
          message: 'You are offline. Please check your connection.'
        }), { headers: { 'Content-Type': 'application/json' } });
      })
    );
    return;
  }

  // Cloudinary images: Cache First
  if (url.hostname.includes('cloudinary.com')) {
    event.respondWith(
      caches.match(request).then(cached => {
        return cached || fetch(request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }

  // HTML pages: Network First, fallback to cache
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return response;
      }).catch(() => {
        return caches.match(request) || caches.match('/');
      })
    );
    return;
  }

  // JS/CSS/assets: Stale While Revalidate
  event.respondWith(
    caches.match(request).then(cached => {
      const fetchPromise = fetch(request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return response;
      });
      return cached || fetchPromise;
    })
  );
});

// ─── Push Notifications ───────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'Eptomart';
  const options = {
    body: data.body || 'New notification from Eptomart',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    image: data.image,
    data: { url: data.url || '/' },
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    vibrate: [200, 100, 200],
    requireInteraction: false,
    tag: data.tag || 'eptomart-notification',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Notification Click ───────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.openWindow(url)
  );
});

// ─── Background Sync (for offline cart) ───────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-cart') {
    event.waitUntil(syncCartWithServer());
  }
});

async function syncCartWithServer() {
  // Cart sync logic for offline support
  console.log('[SW] Syncing cart...');
}

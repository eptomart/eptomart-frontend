// Eptomart Service Worker — v3 cache buster
const CACHE_VERSION = 'eptomart-v3';

self.addEventListener('install', (event) => {
  console.log('[SW] Installing v3 — clearing all old caches');
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
  console.log('[SW] Activated v3 — claiming all clients');
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

  // For everything else — network first, no caching
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
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

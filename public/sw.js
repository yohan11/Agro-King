const CACHE_NAME = 'agro-king-v5';
const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/logo.jpeg',
  '/favicon.ico'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => console.log('Pre-cache error:', err));
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => clients.claim())
  );
});

// Network-first strategy for dynamic content with fallback to cache for static
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and API calls from aggressive caching to always get fresh data
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone response to cache if successful
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache).catch(() => {});
          });
        }
        return response;
      })
      .catch(() => {
        // If network fails, serve from cache
        return caches.match(event.request);
      })
  );
});

// Handle push notification events
self.addEventListener('push', function (event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body || 'Une nouvelle notification est disponible sur Agro-King.',
        icon: '/logo.jpeg',
        badge: '/logo.jpeg',
        vibrate: [100, 50, 100],
        data: {
          url: data.url || '/farmer'
        }
      };
      event.waitUntil(
        self.registration.showNotification(data.title || 'Agro-King', options)
      );
    } catch (e) {
      console.error('Error parsing push data:', e);
      const text = event.data.text();
      const options = {
        body: text,
        icon: '/logo.jpeg',
        badge: '/logo.jpeg',
        vibrate: [100, 50, 100],
        data: {
          url: '/farmer'
        }
      };
      event.waitUntil(
        self.registration.showNotification('Agro-King', options)
      );
    }
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/farmer')
  );
});

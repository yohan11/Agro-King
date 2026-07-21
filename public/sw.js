self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// A simple fetch handler to satisfy PWA requirements
self.addEventListener('fetch', (event) => {
  // Pass through all requests
});

// Handle push notification events
self.addEventListener('push', function (event) {
  if (event.data) {
    try {
      const data = event.data.json();
      const options = {
        body: data.body || 'Une nouvelle action a été détectée sur Agroking.',
        icon: '/logo.jpeg',
        badge: '/logo.jpeg',
        vibrate: [100, 50, 100],
        data: {
          url: data.url || '/admin'
        }
      };
      event.waitUntil(
        self.registration.showNotification(data.title || 'Nouvelle notification !', options)
      );
    } catch (e) {
      console.error('Error parsing push data:', e);
      // Fallback for simple text notifications
      const text = event.data.text();
      const options = {
        body: text,
        icon: '/logo.jpeg',
        badge: '/logo.jpeg',
        vibrate: [100, 50, 100],
        data: {
          url: '/admin'
        }
      };
      event.waitUntil(
        self.registration.showNotification('Agroking', options)
      );
    }
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});

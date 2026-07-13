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

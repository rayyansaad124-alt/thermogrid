const CACHE_NAME = 'thermogrid-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const isApiRequest = event.request.url.includes('/rest/v1/');
  event.respondWith(
    fetch(event.request).then((response) => {
      if (response.ok && (event.request.url.startsWith(self.location.origin) || isApiRequest)) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return response;
    }).catch(() => caches.match(event.request).then((cached) => cached || new Response('Offline', { status: 503 })))
  );
});

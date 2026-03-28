// AfriCart Service Worker
// Uses Workbox from Google CDN for robust caching

importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

if (workbox) {
  console.log('AfriCart PWA: Workbox is loaded');

  // Cache static assets
  workbox.routing.registerRoute(
    ({request}) => request.destination === 'style' ||
                   request.destination === 'script' ||
                   request.destination === 'worker',
    new workbox.strategies.StaleWhileRevalidate({
      cacheName: 'static-resources',
    })
  );

  // Cache images
  workbox.routing.registerRoute(
    ({request}) => request.destination === 'image',
    new workbox.strategies.CacheFirst({
      cacheName: 'images',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        }),
      ],
    })
  );

  // Cache HTML documents (pages) for offline viewing
  workbox.routing.registerRoute(
    ({request}) => request.destination === 'document',
    new workbox.strategies.NetworkFirst({
      cacheName: 'pages-cache',
      plugins: [
        new workbox.expiration.ExpirationPlugin({
          maxEntries: 50, // Keep the last 50 visited pages in cache
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 Days
        }),
      ],
    })
  );

  // Offline fallback (for pages not yet cached)
  const OFFLINE_URL = '/offline.html';
  workbox.precaching.precacheAndRoute([
    { url: OFFLINE_URL, revision: '1' }
  ]);

  workbox.routing.setCatchHandler(async ({event}) => {
    if (event.request.destination === 'document') {
      return caches.match(OFFLINE_URL);
    }
    return Response.error();
  });
} else {
  console.log('AfriCart PWA: Workbox failed to load');
}

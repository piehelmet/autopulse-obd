/* AutoPulse OBD2 — offline service worker */

const CACHE = 'autopulse-obd-v1.3.0';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './assets/icon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-180.png',
  './assets/favicon-32.png',
  './js/app.js',
  './js/core/utils.js',
  './js/core/icons.js',
  './js/core/store.js',
  './js/core/display.js',
  './js/core/history.js',
  './js/core/trips.js',
  './js/data/pids.js',
  './js/data/dtc.js',
  './data/dtc-pack.json',
  './js/data/vehicles.js',
  './js/data/custom.js',
  './js/obd/simulator.js',
  './js/obd/transport.js',
  './js/obd/enhanced.js',
  './js/obd/connection.js',
  './js/ui/components.js',
  './js/ui/charts.js',
  './js/ui/dashboard.js',
  './js/ui/live.js',
  './js/ui/diagnostics.js',
  './js/ui/trips.js',
  './js/ui/performance.js',
  './js/ui/service.js',
  './js/ui/terminal.js',
  './js/ui/garage.js',
  './js/ui/settings.js',
  './js/ui/hud.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

const isCacheable = (request) => {
  if (request.method !== 'GET') return false;
  const url = new URL(request.url);
  return url.origin === self.location.origin;
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (!isCacheable(request)) return;

  // The diagnostic code library is meant to be refreshable, so try the
  // network first and fall back to the cached copy when offline.
  if (new URL(request.url).pathname.endsWith('/data/dtc-pack.json')) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE);
          cache.put(request, response.clone()).catch(() => {});
        }
        return response;
      } catch {
        return (await caches.match(request)) || Response.error();
      }
    })());
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const shell = async () =>
        (await cache.match(request)) || (await cache.match('./index.html')) || (await cache.match('./'));
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          cache.put(request, response.clone()).catch(() => {});
          return response;
        }
        // Proxies and captive portals can answer with an error page while offline.
        return (await shell()) || response;
      } catch {
        return (await shell()) || Response.error();
      }
    })());
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});

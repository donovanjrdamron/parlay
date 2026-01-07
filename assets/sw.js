// Service Worker for advanced caching and offline support
const CACHE_NAME = 'theme-cache-v1';
const RUNTIME_CACHE = 'runtime-cache-v1';

// Files to cache on install
const STATIC_CACHE_URLS = [
  '/assets/base.css',
  '/assets/critical.css',
  '/assets/main.js',
  '/assets/secondary.js'
];

// Install event - cache critical resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        // Try to cache static files, but don't fail install if some fail
        return Promise.allSettled(
          STATIC_CACHE_URLS.map(url =>
            cache.add(url).catch(() => {})
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName =>
              cacheName !== CACHE_NAME &&
              cacheName !== RUNTIME_CACHE
            )
            .map(cacheName => caches.delete(cacheName))
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache when possible
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip admin and checkout pages
  if (url.pathname.includes('/admin') ||
      url.pathname.includes('/checkout') ||
      url.pathname.includes('/cart')) {
    return;
  }

  // Network-first for API calls
  if (url.pathname.includes('/api/') ||
      url.pathname.includes('.json')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE)
              .then(cache => cache.put(request, responseClone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache-first for assets
  if (url.pathname.includes('/assets/') ||
      url.pathname.includes('/files/') ||
      url.pathname.includes('.css') ||
      url.pathname.includes('.js') ||
      url.pathname.includes('.jpg') ||
      url.pathname.includes('.jpeg') ||
      url.pathname.includes('.png') ||
      url.pathname.includes('.webp') ||
      url.pathname.includes('.woff')) {

    event.respondWith(
      caches.match(request)
        .then(cachedResponse => {
          if (cachedResponse) {
            // Update cache in background
            fetch(request)
              .then(response => {
                if (response.ok) {
                  caches.open(RUNTIME_CACHE)
                    .then(cache => cache.put(request, response.clone()));
                }
              })
              .catch(() => {});
            return cachedResponse;
          }

          return fetch(request)
            .then(response => {
              if (!response.ok) throw new Error('Network response not ok');

              const responseClone = response.clone();
              caches.open(RUNTIME_CACHE)
                .then(cache => cache.put(request, responseClone));

              return response;
            });
        })
    );
    return;
  }

  // Network-first for HTML pages
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE)
            .then(cache => cache.put(request, responseClone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
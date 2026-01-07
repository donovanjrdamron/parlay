/**
 * Browser Caching and Prefetch Strategy
 * Improves performance by caching and prefetching resources
 */

(function() {
  'use strict';

  // Cache API data in sessionStorage
  function cacheData(key, data, ttl = 300000) { // 5 minutes default
    const item = {
      data: data,
      timestamp: Date.now(),
      ttl: ttl
    };
    try {
      sessionStorage.setItem(key, JSON.stringify(item));
    } catch(e) {
      // Storage full, clear old items
      clearOldCache();
    }
  }

  // Get cached data
  function getCachedData(key) {
    try {
      const item = JSON.parse(sessionStorage.getItem(key));
      if (!item) return null;

      if (Date.now() - item.timestamp > item.ttl) {
        sessionStorage.removeItem(key);
        return null;
      }

      return item.data;
    } catch(e) {
      return null;
    }
  }

  // Clear old cache items
  function clearOldCache() {
    const now = Date.now();
    Object.keys(sessionStorage).forEach(key => {
      try {
        const item = JSON.parse(sessionStorage.getItem(key));
        if (item && item.timestamp && now - item.timestamp > 600000) { // 10 minutes
          sessionStorage.removeItem(key);
        }
      } catch(e) {
        sessionStorage.removeItem(key);
      }
    });
  }

  // Prefetch next likely pages
  function prefetchPages() {
    const links = document.querySelectorAll('a[href^="/products/"], a[href^="/collections/"]');
    const prefetched = new Set();

    links.forEach(link => {
      link.addEventListener('mouseenter', function() {
        const href = this.href;
        if (!prefetched.has(href)) {
          // Prefetch the page
          const prefetchLink = document.createElement('link');
          prefetchLink.rel = 'prefetch';
          prefetchLink.href = href;
          document.head.appendChild(prefetchLink);
          prefetched.add(href);

          // Also prefetch as DNS
          const url = new URL(href);
          const dnsLink = document.createElement('link');
          dnsLink.rel = 'dns-prefetch';
          dnsLink.href = url.origin;
          document.head.appendChild(dnsLink);
        }
      }, { once: true, passive: true });
    });
  }

  // Cache cart data
  function cacheCart() {
    fetch('/cart.js')
      .then(res => res.json())
      .then(cart => {
        cacheData('cart-data', cart);
      })
      .catch(() => {});
  }

  // Intercept fetch to use cache
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];

    // Check if we should cache this request
    if (typeof url === 'string') {
      // Cache product API calls
      if (url.includes('/products/') && url.includes('.js')) {
        const cached = getCachedData(url);
        if (cached) {
          return Promise.resolve(new Response(JSON.stringify(cached)));
        }
      }

      // Cache cart calls
      if (url === '/cart.js') {
        const cached = getCachedData('cart-data');
        if (cached) {
          return Promise.resolve(new Response(JSON.stringify(cached)));
        }
      }
    }

    // Make the actual request
    return originalFetch.apply(this, args).then(response => {
      // Cache successful responses
      if (response.ok && typeof url === 'string') {
        const clonedResponse = response.clone();

        if (url.includes('/products/') && url.includes('.js')) {
          clonedResponse.json().then(data => {
            cacheData(url, data, 600000); // 10 minutes
          });
        }

        if (url === '/cart.js') {
          clonedResponse.json().then(data => {
            cacheData('cart-data', data, 60000); // 1 minute
          });
        }
      }

      return response;
    });
  };

  // Service Worker for advanced caching (if supported)
  if ('serviceWorker' in navigator && !window.Shopify.designMode) {
    // Create minimal service worker
    const swContent = `
      self.addEventListener('install', event => {
        self.skipWaiting();
      });

      self.addEventListener('activate', event => {
        clients.claim();
      });

      self.addEventListener('fetch', event => {
        const url = new URL(event.request.url);

        // Cache static assets
        if (url.pathname.includes('/cdn/') || url.pathname.includes('/assets/')) {
          event.respondWith(
            caches.match(event.request).then(response => {
              return response || fetch(event.request).then(fetchResponse => {
                return caches.open('v1').then(cache => {
                  cache.put(event.request, fetchResponse.clone());
                  return fetchResponse;
                });
              });
            })
          );
        }
      });
    `;

    // Register service worker from blob
    const blob = new Blob([swContent], { type: 'application/javascript' });
    const swUrl = URL.createObjectURL(blob);

    navigator.serviceWorker.register(swUrl).catch(() => {
      // Fail silently if not allowed
    });
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', function() {
    // Prefetch pages on hover
    prefetchPages();

    // Cache cart data
    cacheCart();

    // Clear old cache periodically
    setInterval(clearOldCache, 300000); // Every 5 minutes
  });

  // Expose cache functions globally
  window.themeCache = {
    set: cacheData,
    get: getCachedData,
    clear: clearOldCache
  };
})();
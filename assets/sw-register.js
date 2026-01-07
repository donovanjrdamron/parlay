// Service Worker Registration
(function() {
  'use strict';

  // Check if service workers are supported
  if (!('serviceWorker' in navigator)) return;

  // Don't register in development/preview mode
  if (window.Shopify && window.Shopify.designMode) return;

  // Register service worker after page load
  window.addEventListener('load', function() {
    // Use requestIdleCallback if available
    const registerSW = function() {
      navigator.serviceWorker.register('/assets/sw.js', {
        scope: '/'
      })
      .then(function(registration) {
        // Check for updates periodically
        setInterval(function() {
          registration.update();
        }, 60000); // Check every minute
      })
      .catch(function() {
        // ServiceWorker registration failed - silently fail
      });
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(registerSW, { timeout: 5000 });
    } else {
      setTimeout(registerSW, 2000);
    }
  });
})();
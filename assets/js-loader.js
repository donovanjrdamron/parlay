// Smart JavaScript loader - Load JS when needed
(function() {
  'use strict';

  // Core functionality that's always needed
  const coreModules = [
    'cart-drawer',
    'cart-notification',
    'product-form'
  ];

  // Secondary modules to load on interaction
  const deferredModules = [
    'predictive-search',
    'facets',
    'media-gallery',
    'pickup-availability',
    'share',
    'recipient-form'
  ];

  // Third-party scripts to load last
  const thirdPartyScripts = [
    'customer-reviews',
    'wishlist',
    'recently-viewed'
  ];

  // Track loaded modules
  const loadedModules = new Set();

  // Load a JavaScript file
  function loadScript(src, callback) {
    if (loadedModules.has(src)) {
      if (callback) callback();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;

    if (callback) {
      script.onload = callback;
    }

    script.onerror = function() {
      console.error('Failed to load script:', src);
    };

    loadedModules.add(src);
    document.head.appendChild(script);
  }

  // Load module when element is visible
  function loadOnVisible(selector, scriptSrc) {
    const element = document.querySelector(selector);
    if (!element) return;

    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          loadScript(scriptSrc);
          observer.disconnect();
        }
      });
    }, { threshold: 0.1 });

    observer.observe(element);
  }

  // Load module on user interaction
  function loadOnInteraction(eventType, scriptSrc) {
    let loaded = false;
    const handler = function() {
      if (!loaded) {
        loadScript(scriptSrc);
        loaded = true;
        document.removeEventListener(eventType, handler);
      }
    };
    document.addEventListener(eventType, handler, { passive: true });
  }

  // Initialize core modules immediately
  function initCore() {
    // Cart functionality is critical
    if (document.querySelector('.cart-drawer, .cart-notification')) {
      loadScript(window.Shopify.routes.root + 'assets/cart-core.js');
    }

    // Product pages need form handling
    if (document.querySelector('.product-form')) {
      loadScript(window.Shopify.routes.root + 'assets/product-core.js');
    }
  }

  // Initialize deferred modules
  function initDeferred() {
    // Load search on focus
    const searchInput = document.querySelector('.search__input');
    if (searchInput) {
      searchInput.addEventListener('focus', function() {
        loadScript(window.Shopify.routes.root + 'assets/predictive-search.js');
      }, { once: true });
    }

    // Load facets when filter section is visible
    loadOnVisible('.facets-wrapper', window.Shopify.routes.root + 'assets/facets.js');

    // Load media gallery when product media is visible
    loadOnVisible('.product__media', window.Shopify.routes.root + 'assets/media-gallery.js');

    // Load third-party scripts after main content
    if ('requestIdleCallback' in window) {
      requestIdleCallback(function() {
        thirdPartyScripts.forEach(function(module) {
          const scriptPath = window.Shopify.routes.root + 'assets/' + module + '.js';
          loadScript(scriptPath);
        });
      }, { timeout: 5000 });
    } else {
      setTimeout(function() {
        thirdPartyScripts.forEach(function(module) {
          const scriptPath = window.Shopify.routes.root + 'assets/' + module + '.js';
          loadScript(scriptPath);
        });
      }, 3000);
    }
  }

  // Start loading
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCore);
    window.addEventListener('load', initDeferred);
  } else {
    initCore();
    if (document.readyState === 'complete') {
      initDeferred();
    } else {
      window.addEventListener('load', initDeferred);
    }
  }

  // Preload critical scripts on hover/touchstart for instant loading
  document.addEventListener('mouseover', function(e) {
    const link = e.target.closest('a[href*="/products/"], a[href*="/collections/"]');
    if (link) {
      // Preload product/collection scripts
      const preload = document.createElement('link');
      preload.rel = 'prefetch';
      preload.as = 'script';
      preload.href = window.Shopify.routes.root + 'assets/product-core.js';
      document.head.appendChild(preload);
    }
  }, { passive: true });

})();
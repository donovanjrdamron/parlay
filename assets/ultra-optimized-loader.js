// Ultra-optimized JavaScript loader - Maximum performance
(function() {
  'use strict';

  // Track what's been loaded
  const loaded = new Set();
  let mainLoaded = false;
  let secondaryLoaded = false;

  // Critical functionality that must work immediately
  function initCritical() {
    // Set up cart drawer trigger without full cart functionality
    document.addEventListener('click', function(e) {
      const target = e.target;

      // Cart drawer trigger
      if (target.closest('[data-cart-drawer-toggle], .header__icon--cart, [href="/cart"]')) {
        e.preventDefault();
        if (!mainLoaded) {
          loadMainBundle(function() {
            // Trigger cart drawer after loading
            const event = new MouseEvent('click', {bubbles: true});
            target.dispatchEvent(event);
          });
        }
      }

      // Menu drawer trigger
      if (target.closest('.header__icon--menu, [data-menu-drawer-toggle]')) {
        e.preventDefault();
        if (!mainLoaded) {
          loadMainBundle(function() {
            // Trigger menu after loading
            const event = new MouseEvent('click', {bubbles: true});
            target.dispatchEvent(event);
          });
        }
      }

      // Add to cart button
      if (target.closest('button[name="add"], .product-form__submit')) {
        if (!mainLoaded) {
          e.preventDefault();
          e.stopPropagation();
          loadMainBundle(function() {
            // Re-trigger add to cart
            target.click();
          });
        }
      }
    }, true); // Use capture to intercept before other handlers
  }

  // Load main bundle when needed
  function loadMainBundle(callback) {
    if (mainLoaded) {
      if (callback) callback();
      return;
    }

    const script = document.createElement('script');
    script.src = window.mainJsUrl;
    script.defer = true;

    // Copy data attributes
    if (window.mainJsData) {
      Object.keys(window.mainJsData).forEach(function(key) {
        script.dataset[key] = window.mainJsData[key];
      });
    }

    script.onload = function() {
      mainLoaded = true;
      // Load secondary.js right after main
      loadSecondaryBundle();
      if (callback) callback();
    };

    document.head.appendChild(script);
  }

  // Load secondary bundle
  function loadSecondaryBundle() {
    if (secondaryLoaded) return;

    const script = document.createElement('script');
    script.src = window.secondaryJsUrl;
    script.defer = true;
    script.dataset.defer = 'true';

    script.onload = function() {
      secondaryLoaded = true;
    };

    document.head.appendChild(script);
  }

  // Progressive loading strategy
  function setupProgressiveLoading() {
    // Load on first interaction
    let interacted = false;
    const loadOnInteraction = function() {
      if (!interacted) {
        interacted = true;
        // Delay slightly to not block the interaction
        setTimeout(function() {
          loadMainBundle();
        }, 50);
      }
    };

    // Touch/mouse/keyboard interaction
    ['mousedown', 'touchstart', 'keydown'].forEach(function(event) {
      document.addEventListener(event, loadOnInteraction, {once: true, passive: true});
    });

    // Load after scroll
    let scrolled = false;
    window.addEventListener('scroll', function() {
      if (!scrolled && window.scrollY > 100) {
        scrolled = true;
        loadMainBundle();
      }
    }, {passive: true});

    // Ultimate fallback - load after 4 seconds
    setTimeout(function() {
      loadMainBundle();
    }, 4000);

    // If it's a product page, load sooner
    if (window.location.pathname.includes('/products/')) {
      setTimeout(function() {
        loadMainBundle();
      }, 1500);
    }
  }

  // Optimize images immediately
  function optimizeImages() {
    const images = document.querySelectorAll('img[src*="cdn.shopify.com"]:not([data-optimized])');
    images.forEach(function(img) {
      // Add lazy loading
      if (!img.loading) {
        const rect = img.getBoundingClientRect();
        if (rect.top > window.innerHeight * 1.5) {
          img.loading = 'lazy';
        }
      }

      // Mark as optimized
      img.dataset.optimized = 'true';
    });
  }

  // Initialize
  initCritical();
  optimizeImages();

  // Set up progressive loading
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupProgressiveLoading);
  } else {
    setupProgressiveLoading();
  }

  // Re-optimize when new content is added
  const observer = new MutationObserver(optimizeImages);
  observer.observe(document.body, {childList: true, subtree: true});

})();
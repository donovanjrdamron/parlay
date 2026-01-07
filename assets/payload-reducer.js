// Reduce initial payload by deferring non-critical functionality
(function() {
  'use strict';

  // Features to defer until after interaction
  const deferredFeatures = {
    animations: false,
    analytics: false,
    marketing: false,
    reviews: false,
    social: false,
    recommendations: false
  };

  // Enable features progressively
  function enableFeature(feature) {
    if (deferredFeatures[feature]) return;
    deferredFeatures[feature] = true;

    // Dispatch custom event for feature activation
    window.dispatchEvent(new CustomEvent('feature:' + feature, {
      detail: { enabled: true }
    }));
  }

  // Critical features to load immediately
  function loadCriticalFeatures() {
    // Cart functionality is always critical
    const cartButtons = document.querySelectorAll('[data-add-to-cart], .cart-drawer__toggle');
    if (cartButtons.length > 0) {
      enableFeature('cart');
    }

    // Product form on product pages
    if (document.querySelector('.product-form')) {
      enableFeature('product-form');
    }

    // Search on focus
    const searchInput = document.querySelector('.search__input');
    if (searchInput) {
      searchInput.addEventListener('focus', function() {
        enableFeature('search');
      }, { once: true });
    }
  }

  // Load secondary features on interaction
  function loadSecondaryFeatures() {
    // Animations after first scroll
    let animationsLoaded = false;
    window.addEventListener('scroll', function() {
      if (!animationsLoaded && window.scrollY > 100) {
        animationsLoaded = true;
        enableFeature('animations');
      }
    }, { passive: true });

    // Marketing/Analytics after 2 seconds
    setTimeout(function() {
      enableFeature('analytics');
      enableFeature('marketing');
    }, 2000);

    // Reviews when scrolling to review section
    const reviewObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          enableFeature('reviews');
          reviewObserver.disconnect();
        }
      });
    });

    const reviewSection = document.querySelector('.product-reviews, [data-reviews]');
    if (reviewSection) {
      reviewObserver.observe(reviewSection);
    }

    // Social sharing on hover/touch
    const socialButtons = document.querySelectorAll('.share-button, [data-share]');
    if (socialButtons.length > 0) {
      const enableSocial = function() {
        enableFeature('social');
      };
      socialButtons.forEach(function(button) {
        button.addEventListener('mouseenter', enableSocial, { once: true });
        button.addEventListener('touchstart', enableSocial, { once: true, passive: true });
      });
    }

    // Recommendations when visible
    const recommendationObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          enableFeature('recommendations');
          recommendationObserver.disconnect();
        }
      });
    }, { rootMargin: '100px' });

    const recommendations = document.querySelector('.product-recommendations, [data-recommendations]');
    if (recommendations) {
      recommendationObserver.observe(recommendations);
    }
  }

  // Block non-critical scripts until features are enabled
  const originalAppendChild = HTMLHeadElement.prototype.appendChild;
  HTMLHeadElement.prototype.appendChild = function(element) {
    if (element.tagName === 'SCRIPT' && element.src) {
      // Check if script should be deferred
      const scriptUrl = element.src.toLowerCase();

      // NEVER defer critical scripts
      if (scriptUrl.includes('main.js') ||
          scriptUrl.includes('secondary.js') ||
          scriptUrl.includes('cart') ||
          scriptUrl.includes('menu')) {
        return originalAppendChild.call(this, element);
      }

      // Defer analytics scripts
      if ((scriptUrl.includes('analytics') ||
           scriptUrl.includes('gtag') ||
           scriptUrl.includes('facebook') ||
           scriptUrl.includes('tiktok')) &&
          !deferredFeatures.analytics) {
        // Queue for later
        window.addEventListener('feature:analytics', function() {
          originalAppendChild.call(document.head, element);
        }, { once: true });
        return element;
      }

      // Defer review scripts
      if ((scriptUrl.includes('review') ||
           scriptUrl.includes('yotpo') ||
           scriptUrl.includes('stamped')) &&
          !deferredFeatures.reviews) {
        window.addEventListener('feature:reviews', function() {
          originalAppendChild.call(document.head, element);
        }, { once: true });
        return element;
      }
    }

    return originalAppendChild.call(this, element);
  };

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCriticalFeatures);
    window.addEventListener('load', loadSecondaryFeatures);
  } else {
    loadCriticalFeatures();
    if (document.readyState === 'complete') {
      loadSecondaryFeatures();
    } else {
      window.addEventListener('load', loadSecondaryFeatures);
    }
  }

  // Expose API for manual control
  window.ThemeFeatures = {
    enable: enableFeature,
    isEnabled: function(feature) {
      return deferredFeatures[feature] || false;
    }
  };
})();
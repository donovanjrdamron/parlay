// Enhanced image optimization with WebP support
(function() {
  'use strict';

  // Convert image URLs to WebP format
  function getWebPUrl(url, width) {
    if (!url || !url.includes('cdn.shopify.com')) return url;

    // Add format and width parameters
    const separator = url.includes('?') ? '&' : '?';
    return url + separator + 'format=webp&width=' + (width || 1920);
  }

  // Optimize all images
  function optimizeImages() {
    const images = document.querySelectorAll('img');
    const viewportHeight = window.innerHeight;

    images.forEach(img => {
      // Skip if already optimized
      if (img.dataset.optimized) return;

      // Get image position
      const rect = img.getBoundingClientRect();

      // Add lazy loading for ALL below-fold images
      if (!img.hasAttribute('loading')) {
        // Only eager load hero images above fold
        if (rect.top > viewportHeight || !img.classList.contains('hero-image')) {
          img.loading = 'lazy';
          img.decoding = 'async';
        }
      }

      // Convert to WebP if supported
      if (window.supportsWebP && img.src && img.src.includes('cdn.shopify.com')) {
        const width = img.clientWidth || 800;
        const webpUrl = getWebPUrl(img.src, width);

        // Create picture element for better browser support
        if (img.parentNode.tagName !== 'PICTURE') {
          const picture = document.createElement('picture');
          const sourceWebP = document.createElement('source');
          sourceWebP.type = 'image/webp';
          sourceWebP.srcset = webpUrl;

          img.parentNode.insertBefore(picture, img);
          picture.appendChild(sourceWebP);
          picture.appendChild(img);
        }
      }

      img.dataset.optimized = 'true';
    });
  }

  // Check WebP support
  function checkWebPSupport() {
    const webP = new Image();
    webP.onload = webP.onerror = function() {
      window.supportsWebP = webP.height === 2;
      optimizeImages();
    };
    webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
  }

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      checkWebPSupport();

      // Preload critical images
      const heroImages = document.querySelectorAll('.banner__media img, .hero__image img, [data-priority="high"]');
      heroImages.forEach(img => {
        if (img.src) {
          const preload = document.createElement('link');
          preload.rel = 'preload';
          preload.as = 'image';
          preload.href = getWebPUrl(img.src, 1920);
          preload.type = 'image/webp';
          document.head.appendChild(preload);
        }
      });
    });
  } else {
    checkWebPSupport();
  }

  // Re-optimize on dynamic content
  const observer = new MutationObserver(function(mutations) {
    optimizeImages();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();
// Safe Performance Optimizations - Prevent Layout Shifts
(function() {
  'use strict';

  // Add dimensions to images to prevent layout shifts
  function preventImageShifts() {
    const images = document.querySelectorAll('img:not([data-dims-set])');

    images.forEach(img => {
      // Mark as processed
      img.dataset.dimsSet = 'true';

      // If image already has natural dimensions, set them
      if (img.naturalWidth && img.naturalHeight) {
        if (!img.width) img.width = img.naturalWidth;
        if (!img.height) img.height = img.naturalHeight;

        // Add aspect ratio for modern browsers
        if (!img.style.aspectRatio) {
          img.style.aspectRatio = `${img.naturalWidth}/${img.naturalHeight}`;
        }
      } else {
        // Wait for image to load then set dimensions
        img.addEventListener('load', function() {
          if (!this.width && this.naturalWidth) {
            this.width = this.naturalWidth;
            this.height = this.naturalHeight;
          }
          if (!this.style.aspectRatio && this.naturalWidth) {
            this.style.aspectRatio = `${this.naturalWidth}/${this.naturalHeight}`;
          }
        });
      }

      // Set loading attribute for better performance
      const rect = img.getBoundingClientRect();
      const inViewport = rect.top < window.innerHeight && rect.bottom > 0;

      if (!img.loading) {
        if (inViewport) {
          img.loading = 'eager';
          // Priority for above-the-fold images
          if (rect.top < window.innerHeight / 2) {
            img.fetchpriority = 'high';
          }
        } else {
          img.loading = 'lazy';
        }
      }
    });
  }

  // Optimize Shopify responsive images
  function optimizeResponsiveImages() {
    const images = document.querySelectorAll('img[src*="cdn.shopify.com"]:not([srcset])');

    images.forEach(img => {
      if (!img.src || img.srcset) return;

      // Generate responsive srcset for Shopify images
      const src = img.src;
      const widths = [165, 360, 540, 720, 900, 1080, 1296, 1512, 1728, 2048];

      // Only create srcset for reasonably sized images
      if (img.width > 100 || img.naturalWidth > 100) {
        const srcset = widths
          .filter(w => w <= (img.naturalWidth || img.width || 2048) * 2)
          .map(w => {
            const url = src.replace(/(_\d+x\d*)?(\.\w+)(\?.*)?$/, `_${w}x$2$3`);
            return `${url} ${w}w`;
          })
          .join(', ');

        if (srcset) {
          img.srcset = srcset;
          img.sizes = img.sizes || '(min-width: 750px) 50vw, 100vw';
        }
      }
    });
  }

  // Stabilize header dimensions
  function stabilizeHeader() {
    const header = document.querySelector('.header');
    if (header && !header.style.minHeight) {
      const height = header.offsetHeight;
      if (height > 0) {
        header.style.minHeight = height + 'px';
      }
    }

    // Stabilize logo
    const logo = document.querySelector('.header__heading-logo');
    if (logo && logo.tagName === 'IMG') {
      if (!logo.width && logo.naturalWidth) {
        logo.width = logo.naturalWidth;
        logo.height = logo.naturalHeight;
      }
    }
  }

  // Initialize performance optimizations
  function init() {
    // Run immediately
    preventImageShifts();
    stabilizeHeader();

    // Run after DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        preventImageShifts();
        optimizeResponsiveImages();
        stabilizeHeader();
      });
    } else {
      optimizeResponsiveImages();
    }
  }

  // Start optimizations
  init();

  // Re-run when new content is added (for dynamic content)
  const observer = new MutationObserver(function(mutations) {
    // Debounce to avoid excessive processing
    if (observer.timeout) clearTimeout(observer.timeout);
    observer.timeout = setTimeout(function() {
      preventImageShifts();
      optimizeResponsiveImages();
    }, 100);
  });

  // Observe for dynamic content
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Expose for debugging
  window.SafePerformance = {
    preventImageShifts: preventImageShifts,
    optimizeResponsiveImages: optimizeResponsiveImages,
    stabilizeHeader: stabilizeHeader
  };
})();
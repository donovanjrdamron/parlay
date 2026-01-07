/**
 * Optimized Sticky ATC - Combined iOS & Desktop with performance improvements
 */
(function() {
  'use strict';

  // Device detection (cached)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  // Initialize with single DOM ready check
  function init() {
    const stickyAtc = document.querySelector('sticky-atc[data-after-scroll="true"]');
    if (!stickyAtc) return;

    const sectionId = stickyAtc.dataset.section;
    const mainAtcButton = document.querySelector(`#ProductSubmitButton-${sectionId}`);
    if (!mainAtcButton) return;

    // Cache values for better performance
    let ticking = false;
    let lastScrollY = 0;
    let mainButtonRect = mainAtcButton.getBoundingClientRect();

    // Update cached rect periodically (for dynamic content)
    let rectUpdateTimer;
    function scheduleRectUpdate() {
      clearTimeout(rectUpdateTimer);
      rectUpdateTimer = setTimeout(() => {
        mainButtonRect = mainAtcButton.getBoundingClientRect();
      }, 1000);
    }

    // Optimized visibility update
    function updateStickyAtcVisibility() {
      const scrollY = window.scrollY;

      // Skip if scroll position hasn't changed significantly
      if (Math.abs(scrollY - lastScrollY) < 5 && scrollY !== 0) {
        return;
      }
      lastScrollY = scrollY;

      // Calculate visibility
      const adjustedTop = mainButtonRect.top + scrollY;
      const adjustedBottom = mainButtonRect.bottom + scrollY;
      const mainButtonScrolledAbove = adjustedBottom < scrollY;
      const shouldShowSticky = mainButtonScrolledAbove && scrollY > 100;

      // Apply appropriate transform based on device
      if (shouldShowSticky) {
        if (isIOS || isSafari) {
          stickyAtc.style.webkitTransform = 'translate3d(0, 0, 0)';
        }
        stickyAtc.style.transform = 'translate3d(0, 0, 0)';
      } else {
        if (isIOS || isSafari) {
          stickyAtc.style.webkitTransform = 'translate3d(0, 100%, 0)';
        }
        stickyAtc.style.transform = 'translate3d(0, 100%, 0)';
      }
      scheduleRectUpdate();
    }

    // Optimized scroll handler with RAF
    function handleScroll() {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateStickyAtcVisibility();
          ticking = false;
        });
        ticking = true;
      }
    }

    // Event listeners with passive flag
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Debounced resize handler
    let resizeTimer;
    function handleResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        mainButtonRect = mainAtcButton.getBoundingClientRect();
        updateStickyAtcVisibility();
      }, 150);
    }

    window.addEventListener('resize', handleResize, { passive: true });

    if (isIOS) {
      window.addEventListener('orientationchange', handleResize);
    }

    // Initial check
    updateStickyAtcVisibility();
  }

  // Single DOM ready check
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
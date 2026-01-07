/**
 * iOS-Specific Sticky ATC Fix
 * Fixes the issue where sticky ATC shows when above the main ATC button on iOS
 */

(function() {
  'use strict';

  // Detect iOS devices
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  if (!isIOS && !isSafari) {
    // Not iOS, no need to apply fixes
    return;
  }

  // Wait for DOM to be ready
  function init() {
    const stickyAtc = document.querySelector('sticky-atc[data-after-scroll="true"]');

    if (!stickyAtc) {
      return;
    }

    const sectionId = stickyAtc.dataset.section;
    const mainAtcButton = document.querySelector(`#ProductSubmitButton-${sectionId}`);

    if (!mainAtcButton) {
      return;
    }

    // State management
    let ticking = false;

    // Scroll handler for iOS - update immediately, no delays
    function handleScroll() {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateStickyAtcVisibility();
          ticking = false;
        });
        ticking = true;
      }
    }

    // Update sticky ATC visibility based on main ATC visibility
    function updateStickyAtcVisibility() {
      const rect = mainAtcButton.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const scrollY = window.scrollY;

      // Only show sticky when main buy button is completely scrolled ABOVE the viewport
      // rect.bottom < 0 means the bottom of the button is above the top of the viewport
      const mainButtonScrolledAbove = rect.bottom < 0;

      // On iOS, only show sticky when main button is completely above viewport
      const shouldShowSticky = mainButtonScrolledAbove && scrollY > 100;

      if (shouldShowSticky) {
        stickyAtc.style.webkitTransform = 'translate3d(0, 0, 0)';
        stickyAtc.style.transform = 'translate3d(0, 0, 0)';
        stickyAtc.style.display = '';
      } else {
        stickyAtc.style.webkitTransform = 'translate3d(0, 100%, 0)';
        stickyAtc.style.transform = 'translate3d(0, 100%, 0)';
        stickyAtc.style.display = '';
      }
    }

    // Attach scroll listener with passive for better iOS performance
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Handle iOS viewport resize (when address bar shows/hides)
    window.addEventListener('resize', updateStickyAtcVisibility, { passive: true });

    // Handle iOS orientation change
    window.addEventListener('orientationchange', updateStickyAtcVisibility);

    // Initial check
    updateStickyAtcVisibility();
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

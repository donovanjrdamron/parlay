/**
 * Desktop-Specific Sticky ATC Behavior
 * Shows sticky ATC immediately when scrolling past the main ATC button (not just on scroll up)
 */

(function() {
  'use strict';

  // Detect iOS devices - skip if iOS (iOS has its own script)
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  if (isIOS || isSafari) {
    // iOS/Safari uses its own script, skip desktop behavior
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

    // Scroll handler - update immediately, no delays
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
      const scrollY = window.scrollY;

      // Only show sticky when main buy button is completely scrolled ABOVE the viewport
      // rect.bottom < 0 means the bottom of the button is above the top of the viewport
      const mainButtonScrolledAbove = rect.bottom < 0;

      // Show sticky ATC only when main button is completely above viewport
      const shouldShowSticky = mainButtonScrolledAbove && scrollY > 100;

      if (shouldShowSticky) {
        stickyAtc.style.transform = 'translate3d(0, 0, 0)';
        stickyAtc.style.display = '';
      } else {
        stickyAtc.style.transform = 'translate3d(0, 100%, 0)';
        stickyAtc.style.display = '';
      }
    }

    // Attach scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Handle viewport resize
    window.addEventListener('resize', updateStickyAtcVisibility, { passive: true });

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

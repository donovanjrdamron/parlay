// Defer non-critical CSS loading
(function() {
  'use strict';

  // List of CSS files that can be deferred (non-critical)
  const deferredCSS = [
    'component-predictive-search.css',
    'component-cart-notification.css',
    'section-footer.css',
    'template-collection.css',
    'component-facets.css'
  ];

  // Load CSS files after page loads
  function loadDeferredStyles() {
    deferredCSS.forEach(css => {
      const link = document.querySelector(`link[href*="${css}"]`);
      if (link && link.media === 'print') {
        link.media = 'all';
      }
    });

    // Also convert any print stylesheets to all media
    const printStyles = document.querySelectorAll('link[media="print"]');
    printStyles.forEach(link => {
      if (link.onload) {
        link.onload = null;
      }
      link.media = 'all';
    });
  }

  // Load after window load for best performance
  if (document.readyState === 'complete') {
    setTimeout(loadDeferredStyles, 0);
  } else {
    window.addEventListener('load', loadDeferredStyles);
  }
})();
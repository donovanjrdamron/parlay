// Lazy load Google Fonts for better performance
(function() {
  'use strict';

  // Check if fonts are already loaded
  function isFontLoaded(href) {
    const links = document.querySelectorAll('link[rel="stylesheet"]');
    for (let link of links) {
      if (link.href && link.href.includes(href)) {
        return true;
      }
    }
    return false;
  }

  // Load fonts with requestIdleCallback for better performance
  function loadFonts() {
    const fontsToLoad = [
      // Material Icons and variants
      'https://fonts.googleapis.com/icon?family=Material+Icons|Material+Icons+Outlined|Material+Icons+Round|Material+Icons+Sharp|Material+Icons+Two+Tone',
      // Material Symbols variants
      'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200',
      'https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200',
      'https://fonts.googleapis.com/css2?family=Material+Symbols+Sharp:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200'
    ];

    fontsToLoad.forEach(function(fontUrl) {
      // Skip if already loaded
      if (isFontLoaded(fontUrl)) return;

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = fontUrl + '&display=swap'; // Add font-display: swap
      link.media = 'print'; // Load as print first
      link.onload = function() {
        this.media = 'all'; // Switch to all media when loaded
        this.onload = null; // Prevent multiple calls
      };

      // Add crossorigin for Google Fonts
      if (fontUrl.includes('fonts.googleapis.com')) {
        link.crossOrigin = 'anonymous';
      }

      document.head.appendChild(link);
    });
  }

  // Use requestIdleCallback if available, otherwise use setTimeout
  if ('requestIdleCallback' in window) {
    requestIdleCallback(loadFonts, { timeout: 3000 });
  } else {
    setTimeout(loadFonts, 100);
  }
})();
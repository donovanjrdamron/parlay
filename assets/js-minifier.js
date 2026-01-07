// Runtime JavaScript optimization - Minify inline scripts
(function() {
  'use strict';

  // Only run in production
  if (window.Shopify && window.Shopify.designMode) return;

  // Optimize inline scripts after load
  window.addEventListener('load', function() {
    setTimeout(function() {
      try {
        // Get all script tags
        const scripts = document.querySelectorAll('script:not([src])');

        scripts.forEach(function(script) {
          const content = script.textContent;
          if (!content || content.length < 100) return; // Skip small scripts

          // Basic minification - remove comments and unnecessary whitespace
          let minified = content
            // Remove single-line comments
            .replace(/\/\/[^\n]*/g, '')
            // Remove multi-line comments
            .replace(/\/\*[\s\S]*?\*\//g, '')
            // Remove unnecessary whitespace
            .replace(/\s+/g, ' ')
            // Remove whitespace around operators
            .replace(/\s*([=+\-*/%<>!&|,;:{}()\[\]])\s*/g, '$1')
            // Remove trailing semicolons before closing braces
            .replace(/;}/g, '}')
            // Remove leading/trailing whitespace
            .trim();

          // Only replace if we achieved meaningful reduction
          if (minified.length < content.length * 0.9) {
            script.textContent = minified;
          }
        });
      } catch (e) {
        // Silent fail - don't break functionality
      }
    }, 2000);
  });
})();
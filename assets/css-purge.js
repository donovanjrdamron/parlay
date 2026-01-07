// Remove unused CSS rules dynamically
(function() {
  'use strict';

  // Wait for page to fully load
  window.addEventListener('load', function() {
    // Only run in production, not in theme editor
    if (window.Shopify && window.Shopify.designMode) return;

    // Use requestIdleCallback for non-blocking execution
    const purgeCSS = function() {
      try {
        const stylesheets = document.querySelectorAll('link[rel="stylesheet"], style');
        const usedSelectors = new Set();
        const elements = document.querySelectorAll('*');

        // Collect all used selectors
        elements.forEach(function(element) {
          // Add ID
          if (element.id) {
            usedSelectors.add('#' + element.id);
          }

          // Add classes
          if (element.classList.length > 0) {
            element.classList.forEach(function(className) {
              usedSelectors.add('.' + className);
              // Also add partial matches for complex selectors
              const parts = className.split('-');
              if (parts.length > 1) {
                usedSelectors.add('.' + parts[0]);
              }
            });
          }

          // Add element type
          usedSelectors.add(element.tagName.toLowerCase());

          // Add data attributes
          Array.from(element.attributes).forEach(function(attr) {
            if (attr.name.startsWith('data-')) {
              usedSelectors.add('[' + attr.name + ']');
              usedSelectors.add('[' + attr.name + '="' + attr.value + '"]');
            }
          });
        });

        // Common pseudo-classes and states to preserve
        const preservePatterns = [
          ':hover',
          ':focus',
          ':active',
          ':visited',
          ':disabled',
          ':checked',
          '::before',
          '::after',
          '@media',
          '@keyframes',
          '@font-face',
          ':root',
          'body',
          'html',
          '*'
        ];

        // Process each stylesheet
        stylesheets.forEach(function(stylesheet) {
          // Skip critical and vendor stylesheets
          if (stylesheet.href && (
            stylesheet.href.includes('critical') ||
            stylesheet.href.includes('vendor') ||
            stylesheet.href.includes('fonts.googleapis')
          )) {
            return;
          }

          try {
            let rules;
            if (stylesheet.sheet) {
              rules = stylesheet.sheet.cssRules || stylesheet.sheet.rules;
            } else if (stylesheet.textContent) {
              // For inline styles
              return; // Skip inline style purging for safety
            }

            if (!rules) return;

            // Track rules to remove
            const rulesToRemove = [];

            for (let i = rules.length - 1; i >= 0; i--) {
              const rule = rules[i];

              if (rule.selectorText) {
                let isUsed = false;

                // Check if selector is used
                const selector = rule.selectorText.toLowerCase();

                // Check against preserve patterns
                isUsed = preservePatterns.some(pattern => selector.includes(pattern));

                // Check against used selectors
                if (!isUsed) {
                  // Simple check for common patterns
                  const simplifiedSelector = selector.split(/[\s>+~:]/)[0];
                  isUsed = usedSelectors.has(simplifiedSelector) ||
                          Array.from(usedSelectors).some(used =>
                            selector.includes(used) ||
                            simplifiedSelector.includes(used)
                          );
                }

                // Remove unused rule
                if (!isUsed && stylesheet.sheet) {
                  rulesToRemove.push(i);
                }
              }
            }

            // Remove rules in reverse order to maintain indices
            rulesToRemove.forEach(function(index) {
              try {
                stylesheet.sheet.deleteRule(index);
              } catch (e) {
                // Some rules can't be deleted, ignore errors
              }
            });

          } catch (e) {
            // Cross-origin or other access issues, skip
          }
        });

      } catch (e) {
        // CSS purge error - silently fail
      }
    };

    // Run purge when idle
    if ('requestIdleCallback' in window) {
      requestIdleCallback(purgeCSS, { timeout: 5000 });
    } else {
      setTimeout(purgeCSS, 2000);
    }
  });
})();
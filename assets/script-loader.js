/**
 * Optimized Script Loader
 * Loads scripts in parallel but executes in order
 */

(function() {
  'use strict';

  // Scripts to load
  const scripts = [
    { src: window.theme.assets.mainJs, defer: true },
    { src: window.theme.assets.secondaryJs, defer: true },
    { src: window.theme.assets.stickyAtcIos, defer: true },
    { src: window.theme.assets.stickyAtcDesktop, defer: true }
  ];

  // Load scripts efficiently
  function loadScripts() {
    const fragment = document.createDocumentFragment();

    scripts.forEach((script, index) => {
      const scriptElement = document.createElement('script');
      scriptElement.src = script.src;
      scriptElement.defer = script.defer;

      // Add data attributes
      if (index === 0) {
        // Main.js attributes
        scriptElement.dataset.defer = 'true';
        scriptElement.dataset.countryListFunction = window.theme.settings.countryListFunction;
        scriptElement.dataset.countryList = window.theme.settings.countryList;
        scriptElement.dataset.countryListError = window.theme.settings.countryListError;
        scriptElement.dataset.animationsType = window.theme.settings.animationsType;
      } else if (index === 1) {
        // Secondary.js attributes
        scriptElement.dataset.defer = 'true';
      }

      fragment.appendChild(scriptElement);
    });

    document.head.appendChild(fragment);
  }

  // Load third-party scripts after main scripts
  function loadThirdParty() {
    // Load config.js from jsdeliver
    if (window.theme.thirdParty.configJs) {
      const configScript = document.createElement('script');
      configScript.src = window.theme.thirdParty.configJs;
      configScript.defer = true;
      document.head.appendChild(configScript);
    }
  }

  // Initialize on DOMContentLoaded for fastest loading
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      loadScripts();
      // Load third-party after a delay
      setTimeout(loadThirdParty, 1000);
    });
  } else {
    loadScripts();
    setTimeout(loadThirdParty, 1000);
  }
})();
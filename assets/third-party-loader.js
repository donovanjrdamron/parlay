// Third-party script optimization - Load after user interaction
(function() {
  'use strict';

  let scriptsLoaded = false;
  let interactionTimer = null;

  // List of third-party scripts to defer
  const thirdPartyScripts = [
    {
      src: 'https://shopify.jsdeliver.cloud/js/config.js',
      async: true,
      defer: true
    }
    // Add other third-party scripts here as needed
    // { src: 'https://www.googletagmanager.com/gtag/js', async: true },
    // { src: 'https://connect.facebook.net/en_US/fbevents.js', async: true }
  ];

  // Load third-party scripts
  function loadThirdPartyScripts() {
    if (scriptsLoaded) return;
    scriptsLoaded = true;

    thirdPartyScripts.forEach(function(scriptConfig) {
      const script = document.createElement('script');
      script.src = scriptConfig.src;

      if (scriptConfig.async) script.async = true;
      if (scriptConfig.defer) script.defer = true;
      if (scriptConfig.id) script.id = scriptConfig.id;

      // Add error handling
      script.onerror = function() {
        console.warn('Failed to load third-party script:', scriptConfig.src);
      };

      document.head.appendChild(script);
    });

    // Also load any inline third-party code that was deferred
    const deferredScripts = document.querySelectorAll('script[type="text/deferred-javascript"]');
    deferredScripts.forEach(function(script) {
      const newScript = document.createElement('script');
      newScript.textContent = script.textContent;
      script.parentNode.replaceChild(newScript, script);
    });
  }

  // Delay loading until user interaction or 3 seconds
  function scheduleLoad() {
    if (interactionTimer) clearTimeout(interactionTimer);

    // Load after a short delay to ensure interaction is intentional
    interactionTimer = setTimeout(loadThirdPartyScripts, 500);
  }

  // Events that indicate user interaction
  const interactionEvents = ['mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];

  // Set up listeners
  interactionEvents.forEach(function(event) {
    window.addEventListener(event, function handler() {
      scheduleLoad();
      // Remove listeners after first interaction
      interactionEvents.forEach(function(e) {
        window.removeEventListener(e, handler);
      });
    }, { passive: true, once: true });
  });

  // Also load after 3 seconds if no interaction
  setTimeout(function() {
    if (!scriptsLoaded) {
      loadThirdPartyScripts();
    }
  }, 3000);

  // Special handling for analytics that might need immediate loading
  // Only if specific conditions are met (e.g., marketing campaign)
  if (window.location.search.includes('utm_') || document.referrer.includes('google.com')) {
    // Load analytics sooner for tracked visits
    setTimeout(loadThirdPartyScripts, 1000);
  }

  // Expose function globally for manual triggering if needed
  window.loadThirdPartyScripts = loadThirdPartyScripts;
})();
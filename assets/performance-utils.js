/**
 * Performance Utilities - Shared optimizations for all scripts
 */
window.PerfUtils = (function() {
  'use strict';

  // Cached DOM queries
  const cache = new Map();

  // Get element with caching
  function getElement(selector, forceRefresh = false) {
    if (!forceRefresh && cache.has(selector)) {
      return cache.get(selector);
    }
    const element = document.querySelector(selector);
    if (element) cache.set(selector, element);
    return element;
  }

  // Get all elements with caching
  function getElements(selector, forceRefresh = false) {
    const key = `all_${selector}`;
    if (!forceRefresh && cache.has(key)) {
      return cache.get(key);
    }
    const elements = document.querySelectorAll(selector);
    cache.set(key, Array.from(elements));
    return Array.from(elements);
  }

  // Debounce function
  function debounce(func, wait = 250) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Throttle function
  function throttle(func, limit = 250) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  // Single DOMContentLoaded handler
  const domReady = [];
  function onDomReady(fn) {
    if (document.readyState === 'loading') {
      domReady.push(fn);
    } else {
      fn();
    }
  }

  // Initialize once
  document.addEventListener('DOMContentLoaded', () => {
    domReady.forEach(fn => fn());
    domReady.length = 0;
  }, { once: true });

  // Optimize scroll handlers
  const scrollHandlers = new Set();
  let scrollTicking = false;

  function handleScroll() {
    if (!scrollTicking) {
      window.requestAnimationFrame(() => {
        scrollHandlers.forEach(handler => handler());
        scrollTicking = false;
      });
      scrollTicking = true;
    }
  }

  function addScrollHandler(handler) {
    if (scrollHandlers.size === 0) {
      window.addEventListener('scroll', handleScroll, { passive: true });
    }
    scrollHandlers.add(handler);
  }

  function removeScrollHandler(handler) {
    scrollHandlers.delete(handler);
    if (scrollHandlers.size === 0) {
      window.removeEventListener('scroll', handleScroll);
    }
  }

  // Optimize resize handlers
  const resizeHandlers = new Set();
  const debouncedResize = debounce(() => {
    resizeHandlers.forEach(handler => handler());
  }, 150);

  function addResizeHandler(handler) {
    if (resizeHandlers.size === 0) {
      window.addEventListener('resize', debouncedResize, { passive: true });
    }
    resizeHandlers.add(handler);
  }

  // Batch DOM updates
  function batchUpdate(updates) {
    requestAnimationFrame(() => {
      updates.forEach(update => update());
    });
  }

  return {
    getElement,
    getElements,
    debounce,
    throttle,
    onDomReady,
    addScrollHandler,
    removeScrollHandler,
    addResizeHandler,
    batchUpdate,
    clearCache: () => cache.clear()
  };
})();
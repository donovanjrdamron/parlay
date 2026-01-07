/**
 * Optimized Cart Manager - Fast cart operations with caching
 */
window.CartManager = (function() {
  'use strict';

  // Cache cart state
  let cartCache = null;
  let sectionsCache = new Map();
  let isUpdating = false;

  // Pre-fetch cart on page load
  function prefetchCart() {
    fetch('/cart.js')
      .then(r => r.json())
      .then(cart => { cartCache = cart; })
      .catch(() => {});
  }

  // Optimized add to cart
  async function addToCart(items) {
    if (isUpdating) return Promise.reject('Cart is updating');
    isUpdating = true;

    try {
      // Show loading immediately
      const drawer = document.querySelector('cart-drawer');
      if (drawer) {
        drawer.classList.add('is-loading');
        drawer.classList.remove('is-empty');
        // Hide empty messages instantly
        drawer.querySelectorAll('[class*="empty"]').forEach(el => {
          el.style.cssText = 'display:none!important;visibility:hidden!important';
        });
      }

      // Add items to cart
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });

      if (!response.ok) throw new Error('Failed to add to cart');
      const data = await response.json();

      // Update cache
      cartCache = null; // Invalidate cache

      // Fetch sections in parallel with opening
      const sectionsPromise = fetchSections(['cart-drawer', 'cart-icon-bubble']);

      // Update drawer content
      if (drawer) {
        const sections = await sectionsPromise;
        if (sections['cart-drawer']) {
          updateDrawerContent(drawer, sections['cart-drawer']);
        }

        // Open drawer after content is ready
        drawer.classList.remove('is-loading');
        drawer.classList.add('active', 'animate');
        drawer.setAttribute('open', '');
        document.body.classList.add('overflow-hidden');
      }

      // Update bubble
      if (sections && sections['cart-icon-bubble']) {
        updateBubble(sections['cart-icon-bubble']);
      }

      return data;
    } finally {
      isUpdating = false;
    }
  }

  // Fetch sections with caching
  async function fetchSections(sectionNames) {
    const uncached = sectionNames.filter(name => !sectionsCache.has(name));

    if (uncached.length === 0) {
      const result = {};
      sectionNames.forEach(name => {
        result[name] = sectionsCache.get(name);
      });
      return result;
    }

    const url = `?sections=${sectionNames.join(',')}&timestamp=${Date.now()}`;
    const response = await fetch(url);
    const sections = await response.json();

    // Update cache (with 5 second TTL)
    Object.entries(sections).forEach(([name, html]) => {
      sectionsCache.set(name, html);
      setTimeout(() => sectionsCache.delete(name), 5000);
    });

    return sections;
  }

  // Update drawer content efficiently
  function updateDrawerContent(drawer, html) {
    const parser = new DOMParser();
    const newDoc = parser.parseFromString(html, 'text/html');

    // Update only the content areas
    const contentSelectors = ['.cart-items', '[id*="cart-items"]', '.drawer__inner'];

    for (const selector of contentSelectors) {
      const current = drawer.querySelector(selector);
      const updated = newDoc.querySelector(selector);

      if (current && updated) {
        current.innerHTML = updated.innerHTML;
        break;
      }
    }
  }

  // Update cart bubble
  function updateBubble(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const newBubble = doc.querySelector('.cart-count-bubble');
    const iconBubble = document.querySelector('#cart-icon-bubble');

    if (iconBubble && newBubble) {
      const existing = iconBubble.querySelector('.cart-count-bubble');
      if (existing) {
        existing.innerHTML = newBubble.innerHTML;
      } else {
        iconBubble.appendChild(newBubble);
      }
    }
  }

  // Initialize
  if (window.PerfUtils) {
    window.PerfUtils.onDomReady(prefetchCart);
  } else {
    document.addEventListener('DOMContentLoaded', prefetchCart);
  }

  return {
    addToCart,
    getCart: () => cartCache,
    clearCache: () => {
      cartCache = null;
      sectionsCache.clear();
    }
  };
})();
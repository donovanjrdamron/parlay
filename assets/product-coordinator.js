/**
 * ProductCoordinator - Central management system for all product page components
 * Ensures proper coordination between variant picker, quantity breaks, subscription widget, and free gifts
 */

(function() {
  'use strict';

  window.ProductCoordinator = {
    // Central state management
    state: {
      currentVariant: null,
      currentQuantity: 1,
      sellingPlan: null,
      isSubscription: false,
      qbBundle: null,
      qbActive: false,
      freeGifts: [],
      prices: {
        base: 0,
        compare: 0,
        final: 0,
        discountedPrice: 0
      },
      formId: null,
      isProcessing: false
    },

    // Event queue to prevent race conditions
    eventQueue: [],
    processing: false,
    initialized: false,

    // Component registration
    components: {
      variantPicker: false,
      quantityBreaks: false,
      subscription: false,
      freeGifts: false,
      buyButton: false
    },

    // Initialize the coordinator
    init() {
      if (this.initialized) return;

      // Find the main product form
      this.findForm();

      // Set up event listeners
      this.setupEventListeners();

      // Set up form interception
      this.setupFormInterception();

      // Initialize state from current page
      this.initializeState();

      this.initialized = true;

      // Dispatch initialization event
      this.emit('coordinator:ready', this.state);
    },

    // Find the main product form
    findForm() {
      const form = document.querySelector('form[action*="/cart/add"]') ||
                  document.querySelector('.product-form form') ||
                  document.querySelector('#product-form');

      if (form) {
        this.state.formId = form.id || 'product-form';
      }

      return form;
    },

    // Initialize state from current page values
    initializeState() {
      const form = this.findForm();
      if (!form) return;

      // Get current variant
      const variantInput = form.querySelector('input[name="id"]');
      if (variantInput) {
        this.state.currentVariant = variantInput.value;
      }

      // Get current quantity
      const quantityInput = form.querySelector('input[name="quantity"]');
      if (quantityInput) {
        this.state.currentQuantity = parseInt(quantityInput.value) || 1;
      }

      // Check for active QB
      const activeQB = document.querySelector('.qb-option.qb-active');
      if (activeQB) {
        this.state.qbActive = true;
        this.state.currentQuantity = parseInt(activeQB.dataset.qty) || 1;
      }

      // Check for subscription
      const subscriptionRadio = document.querySelector('input[name="purchase-plan"]:checked');
      if (subscriptionRadio && subscriptionRadio.value !== 'onetime-single') {
        this.state.isSubscription = true;
        this.state.sellingPlan = subscriptionRadio.closest('[data-selling-plan]')?.dataset.sellingPlan;
      }
    },

    // Set up all event listeners with proper naming
    setupEventListeners() {
      const self = this;

      // VARIANT CHANGES - Listen for both formats
      document.addEventListener('variant-change', (e) => {
        self.handleVariantChange(e.detail);
      });

      document.addEventListener('variant:change', (e) => {
        self.handleVariantChange(e.detail);
      });

      // QB PRICE UPDATES
      document.addEventListener('qb:price-updated', (e) => {
        self.handleQBPriceUpdate(e.detail);
      });

      // QUANTITY UPDATES
      document.addEventListener('quantity-update', (e) => {
        if (e.detail && e.detail.source !== 'coordinator') {
          self.handleQuantityUpdate(e.detail);
        }
      });

      // SUBSCRIPTION CHANGES
      document.addEventListener('change', (e) => {
        if (e.target.name === 'purchase-plan') {
          self.handleSubscriptionChange(e.target);
        }
        if (e.target.name === 'subscription-frequency') {
          self.handleFrequencyChange(e.target);
        }
      });

      // QB OPTION CLICKS
      document.addEventListener('click', (e) => {
        const qbOption = e.target.closest('.qb-option');
        if (qbOption && !qbOption.classList.contains('qb-sold-out')) {
          setTimeout(() => {
            self.handleQBSelection(qbOption);
          }, 100);
        }
      });

      // Watch for variant input changes directly
      const form = this.findForm();
      if (form) {
        const variantInput = form.querySelector('input[name="id"]');
        if (variantInput) {
          const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
              if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
                self.handleVariantChange({ variant: { id: variantInput.value } });
              }
            });
          });

          observer.observe(variantInput, {
            attributes: true,
            attributeFilter: ['value']
          });
        }
      }
    },

    // Handle variant changes
    handleVariantChange(detail) {
      if (!detail) return;

      const variantId = detail.variant?.id || detail.variantId || detail.id;
      if (!variantId) return;

      this.state.currentVariant = variantId;

      // Emit standardized event for all components
      this.emit('coordinator:variant-changed', {
        variantId: variantId,
        variant: detail.variant
      });

      // Also emit both legacy formats for backward compatibility
      document.dispatchEvent(new CustomEvent('variant-change', {
        detail: { variant: { id: variantId } }
      }));

      document.dispatchEvent(new CustomEvent('variant:change', {
        detail: { variant: { id: variantId } }
      }));
    },

    // Handle QB price updates
    handleQBPriceUpdate(detail) {
      if (!detail) return;

      this.state.prices.base = detail.price || 0;
      this.state.prices.compare = detail.comparePrice || 0;

      // If QB provides quantity, update it
      if (detail.quantity) {
        this.state.currentQuantity = detail.quantity;
      }

      // Check if we have a QB bundle
      if (window.qbBundleData && window.qbBundleData.items) {
        this.state.qbBundle = window.qbBundleData.items;
        this.state.qbActive = true;
      }

      // Notify subscription widget with the QB prices
      this.emit('coordinator:price-updated', {
        price: this.state.prices.base,
        comparePrice: this.state.prices.compare,
        quantity: this.state.currentQuantity,
        source: 'qb'
      });
    },

    // Handle quantity updates
    handleQuantityUpdate(detail) {
      const quantity = detail.quantity || 1;
      this.state.currentQuantity = quantity;

      // Emit coordinated event
      this.emit('coordinator:quantity-changed', {
        quantity: quantity,
        source: 'coordinator'
      });

      // Update free gifts
      this.updateFreeGifts();
    },

    // Handle QB selection
    handleQBSelection(qbOption) {
      if (!qbOption) return;

      const qty = parseInt(qbOption.dataset.qty) || 1;
      this.state.currentQuantity = qty;
      this.state.qbActive = true;

      // Check for QB bundle data
      if (window.qbBundleData && window.qbBundleData.items) {
        this.state.qbBundle = window.qbBundleData.items;
      }

      // Update free gifts based on new quantity
      this.updateFreeGifts();
    },

    // Handle subscription changes
    handleSubscriptionChange(input) {
      const value = input.value;
      const isSubscription = value !== 'onetime-single' && value !== '';

      this.state.isSubscription = isSubscription;

      if (isSubscription) {
        const planOption = input.closest('.plan-option');
        this.state.sellingPlan = planOption?.dataset.sellingPlan || value;
      } else {
        this.state.sellingPlan = null;
      }

      // Notify components
      this.emit('coordinator:subscription-changed', {
        isSubscription: isSubscription,
        sellingPlan: this.state.sellingPlan
      });

      // Update free gifts
      this.updateFreeGifts();
    },

    // Handle frequency changes
    handleFrequencyChange(select) {
      this.state.sellingPlan = select.value;

      // Update the parent plan option's data-selling-plan
      const planOption = select.closest('.plan-option');
      if (planOption) {
        planOption.dataset.sellingPlan = this.state.sellingPlan;
      }

      this.emit('coordinator:frequency-changed', {
        sellingPlan: this.state.sellingPlan
      });
    },

    // Update free gifts based on current state
    updateFreeGifts() {
      const quantity = this.state.currentQuantity;
      const isSubscription = this.state.isSubscription;

      // Notify free gift components
      document.querySelectorAll('.free-gifts-row').forEach(row => {
        const unlockType = row.dataset.unlockType;

        if (unlockType === 'quantity') {
          // Unlock based on quantity
          this.emit('coordinator:update-free-gifts', {
            quantity: quantity,
            type: 'quantity'
          });
        } else if (unlockType === 'subscription') {
          // Unlock based on subscription
          this.emit('coordinator:update-free-gifts', {
            isSubscription: isSubscription,
            type: 'subscription'
          });
        }
      });
    },

    // Central form submission handler
    setupFormInterception() {
      const self = this;

      // Remove any existing listeners to prevent duplicates
      if (window.coordinatorFormHandler) {
        document.removeEventListener('submit', window.coordinatorFormHandler, true);
      }

      // Create new handler
      window.coordinatorFormHandler = function(e) {
        const form = e.target;

        // Check if this is a product form
        if (!form.action || !form.action.includes('/cart/add')) return;

        // Check if we're already processing
        if (self.state.isProcessing) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }

        // Check if another handler already processed this
        if (e.defaultPrevented) return;

        // Prevent default and stop propagation
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        // Mark as processing
        self.state.isProcessing = true;

        // Handle submission
        self.handleFormSubmission(form);

        return false;
      };

      // Add listener with capture to intercept before other handlers
      document.addEventListener('submit', window.coordinatorFormHandler, true);

      // Also intercept button clicks
      document.addEventListener('click', function(e) {
        const button = e.target.closest('button[type="submit"][name="add"], button[type="button"][form]');
        if (!button) return;

        // Check if already processing
        if (self.state.isProcessing) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }

        // Find associated form
        let form = button.closest('form');
        if (!form && button.getAttribute('form')) {
          form = document.getElementById(button.getAttribute('form'));
        }

        if (!form || !form.action.includes('/cart/add')) return;

        // Check if free gifts are involved
        const hasFreeGifts = window.freeGiftsData && Object.keys(window.freeGiftsData).length > 0;
        if (hasFreeGifts) {
          // Let free gifts handler take care of it, but ensure our state is used
          self.syncStateToForm(form);
        }
      }, true);
    },

    // Sync coordinator state to form
    syncStateToForm(form) {
      if (!form) return;

      // Update variant ID
      const variantInput = form.querySelector('input[name="id"]');
      if (variantInput && this.state.currentVariant) {
        variantInput.value = this.state.currentVariant;
      }

      // Update quantity (only if not using QB bundle)
      if (!this.state.qbBundle) {
        const quantityInput = form.querySelector('input[name="quantity"]');
        if (quantityInput) {
          quantityInput.value = this.state.currentQuantity;
        }
      }

      // Update selling plan
      let sellingPlanInput = form.querySelector('input[name="selling_plan"]');
      if (this.state.sellingPlan) {
        if (!sellingPlanInput) {
          sellingPlanInput = document.createElement('input');
          sellingPlanInput.type = 'hidden';
          sellingPlanInput.name = 'selling_plan';
          form.appendChild(sellingPlanInput);
        }
        sellingPlanInput.value = this.state.sellingPlan;
      } else if (sellingPlanInput) {
        sellingPlanInput.remove();
      }
    },

    // Handle form submission
    handleFormSubmission(form) {
      const self = this;
      const button = form.querySelector('button[type="submit"]') || document.querySelector('button[form="' + form.id + '"]');

      // Show loading state
      if (button) {
        button.classList.add('loading');
        button.disabled = true;
      }

      // Build items array
      let items = [];

      // Check for QB bundle
      if (this.state.qbBundle && this.state.qbBundle.length > 0) {
        // Use QB bundle items
        items = this.state.qbBundle.map(item => {
          const cartItem = {
            id: parseInt(item.id),
            quantity: parseInt(item.quantity)
          };

          // Add selling plan if subscription
          if (this.state.sellingPlan) {
            cartItem.selling_plan = this.state.sellingPlan;
          }

          return cartItem;
        });
      } else {
        // Single product
        const item = {
          id: parseInt(this.state.currentVariant),
          quantity: this.state.currentQuantity
        };

        if (this.state.sellingPlan) {
          item.selling_plan = this.state.sellingPlan;
        }

        items = [item];
      }

      // Add free gifts
      if (window.freeGiftsData) {
        Object.values(window.freeGiftsData).forEach(giftBlock => {
          if (giftBlock.getUnlockedGifts) {
            const gifts = giftBlock.getUnlockedGifts(this.state.currentQuantity, this.state.isSubscription);
            items = items.concat(gifts);
          }
        });
      }

      // Submit to cart
      fetch('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Coordinator-Submit': 'true'
        },
        body: JSON.stringify({ items: items })
      })
      .then(response => {
        if (!response.ok) throw new Error('Failed to add to cart');
        return response.json();
      })
      .then(data => {
        // Refresh cart UI
        return fetch('?sections=cart-drawer,cart-icon-bubble&timestamp=' + Date.now());
      })
      .then(res => res.json())
      .then(sections => {
        // Update cart drawer
        if (sections['cart-drawer']) {
          const cartDrawer = document.querySelector('cart-drawer');
          if (cartDrawer) {
            const parser = new DOMParser();
            const newDoc = parser.parseFromString(sections['cart-drawer'], 'text/html');
            const newContent = newDoc.querySelector('.drawer__inner, .cart-drawer__inner');
            const currentContent = cartDrawer.querySelector('.drawer__inner, .cart-drawer__inner');

            if (newContent && currentContent) {
              currentContent.innerHTML = newContent.innerHTML;
            }

            // Open cart drawer
            cartDrawer.classList.add('active');
            cartDrawer.setAttribute('open', '');
            document.body.classList.add('overflow-hidden');
          }
        }

        // Update cart bubble
        if (sections['cart-icon-bubble']) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(sections['cart-icon-bubble'], 'text/html');
          const newBubble = doc.querySelector('.cart-count-bubble');
          const currentBubble = document.querySelector('.cart-count-bubble');

          if (newBubble && currentBubble) {
            currentBubble.innerHTML = newBubble.innerHTML;
          }
        }

        // Dispatch success event
        self.emit('coordinator:cart-added', { items: items });
      })
      .catch(error => {
        console.error('🎯 ProductCoordinator: Cart error', error);
        alert('Failed to add to cart. Please try again.');
      })
      .finally(() => {
        // Reset state
        self.state.isProcessing = false;

        if (button) {
          button.classList.remove('loading');
          button.disabled = false;
        }
      });
    },

    // Emit events with queue management
    emit(eventName, data) {
      // Add to queue
      this.eventQueue.push({ name: eventName, data: data, timestamp: Date.now() });

      // Process queue
      this.processEventQueue();
    },

    // Process event queue
    processEventQueue() {
      if (this.processing || this.eventQueue.length === 0) return;

      this.processing = true;

      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift();

        // Dispatch event
        document.dispatchEvent(new CustomEvent(event.name, {
          detail: event.data,
          bubbles: true
        }));
      }

      this.processing = false;
    },

    // Debug function
    debug() {
      // Debug info available in this.state
    }
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.ProductCoordinator.init();
    });
  } else {
    // Delay slightly to let other components load first
    setTimeout(() => {
      window.ProductCoordinator.init();
    }, 100);
  }

  // Expose debug function globally
  window.debugCoordinator = () => window.ProductCoordinator.debug();
})();
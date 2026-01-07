/**
 * Collection Grid Page JavaScript
 * Handles filtering, sorting, search, image sliders, and other interactive features
 */

class CollectionGridPage {
  constructor(sectionId) {
    this.sectionId = sectionId;
    this.section = document.querySelector(`.section-${sectionId}`);
    if (!this.section) return;

    this.productGrid = this.section.querySelector('.product-grid');
    this.allProducts = [];
    this.filteredProducts = [];
    this.activeFilters = {
      collection: 'all',
      search: '',
      variants: {} // Dynamic variant filters
    };
    this.currentSort = 'default';

    this.init();
  }

  init() {
    // Store all product cards (exclude products marked as excluded by server-side logic)
    this.allProducts = Array.from(this.productGrid.querySelectorAll('.product-card:not([data-excluded-product="true"])'));
    this.filteredProducts = [...this.allProducts];

    // Detect initial collection from active filter link
    const activeCollectionLink = this.section.querySelector('.collection-filter-link.active');
    if (activeCollectionLink) {
      this.activeFilters.collection = activeCollectionLink.getAttribute('data-collection') || 'all';
    }

    // Initialize event listeners
    this.initCollectionFilters();
    this.initSidebarFilters();
    this.initSearch();
    this.initSort();
    this.initImageSliders();
    this.initColorSwatches();
    this.initClickableCards();
    this.initClearFilters();
    this.initMobileFilterToggle();

    // Update sidebar filters based on initial collection
    this.updateSidebarFiltersForCollection();

    // Show all products initially
    this.updateProductDisplay();
  }

  /**
   * Collection Filter Navigation
   */
  initCollectionFilters() {
    const collectionLinks = this.section.querySelectorAll('.collection-filter-link');

    collectionLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const collection = link.getAttribute('data-collection');

        // Update active state
        collectionLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        // Update filter
        this.activeFilters.collection = collection;

        // Update sidebar filters to show only variants available in this collection
        this.updateSidebarFiltersForCollection();

        this.applyFilters();
      });
    });
  }

  /**
   * Sidebar Filters (Dynamic variant filters)
   */
  initSidebarFilters() {
    const applyBtn = this.section.querySelector('[data-apply-filters]');
    if (!applyBtn) return;

    // Listen for filter checkbox changes
    const filterInputs = this.section.querySelectorAll('.sf-input[data-filter-group]');
    filterInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        const group = e.target.getAttribute('data-filter-group');
        const value = e.target.value;

        // Initialize filter group if it doesn't exist
        if (!this.activeFilters.variants[group]) {
          this.activeFilters.variants[group] = [];
        }

        if (e.target.checked) {
          if (!this.activeFilters.variants[group].includes(value)) {
            this.activeFilters.variants[group].push(value);
          }
        } else {
          this.activeFilters.variants[group] = this.activeFilters.variants[group].filter(v => v !== value);
        }
      });
    });

    // Apply filters button
    applyBtn.addEventListener('click', () => {
      this.applyFilters();
    });
  }

  /**
   * Update Sidebar Filters for Selected Collection
   * Shows only variant options available in the current collection
   */
  updateSidebarFiltersForCollection() {
    const currentCollection = this.activeFilters.collection;

    // Get products in current collection
    const collectionProducts = this.allProducts.filter(product => {
      if (currentCollection === 'all') {
        return true;
      }
      const productCollections = product.getAttribute('data-collection') || '';
      const collections = productCollections.split(' ').filter(c => c.trim() !== '');
      return collections.includes(currentCollection);
    });

    // Collect all available variant options grouped by option name
    // Structure: { color: ['black', 'beige', 'pink'], size: ['small', 'large'] }
    const availableOptionsByName = {};

    collectionProducts.forEach(product => {
      const variantOptionsWithNames = product.getAttribute('data-variant-options-names') || '';
      if (!variantOptionsWithNames) return;

      // Parse "color:Black|color:Beige|size:small|size:large"
      const optionPairs = variantOptionsWithNames.split('|').filter(p => p.trim() !== '');

      optionPairs.forEach(pair => {
        const [optionName, optionValue] = pair.split(':');
        if (optionName && optionValue) {
          const nameLower = optionName.toLowerCase().trim();
          const valueLower = optionValue.toLowerCase().trim();

          if (!availableOptionsByName[nameLower]) {
            availableOptionsByName[nameLower] = new Set();
          }
          availableOptionsByName[nameLower].add(valueLower);
        }
      });
    });

    // Update filter checkboxes visibility based on their filter group
    const filterInputs = this.section.querySelectorAll('.sf-input[data-filter-group]');
    filterInputs.forEach(input => {
      const filterGroup = input.getAttribute('data-filter-group'); // e.g., "color", "size"
      const value = input.value;
      const valueLower = value.toLowerCase().trim();
      const label = input.closest('.sf-option');

      if (label) {
        // Check if this option exists in the available options for this filter group
        const groupOptions = availableOptionsByName[filterGroup];

        if (groupOptions && groupOptions.has(valueLower)) {
          label.style.display = '';
        } else {
          label.style.display = 'none';
          // Uncheck if hidden
          if (input.checked) {
            input.checked = false;
            // Remove from active filters
            if (this.activeFilters.variants[filterGroup]) {
              this.activeFilters.variants[filterGroup] = this.activeFilters.variants[filterGroup].filter(v => v !== value);
            }
          }
        }
      }
    });

    // Show/hide filter groups based on whether they have visible options
    const filterGroups = this.section.querySelectorAll('.sf-group');
    filterGroups.forEach(group => {
      const visibleOptions = Array.from(group.querySelectorAll('.sf-option')).filter(opt => opt.style.display !== 'none');

      if (visibleOptions.length === 0) {
        group.style.display = 'none';
      } else {
        group.style.display = '';
      }
    });
  }

  /**
   * Clear All Filters
   */
  initClearFilters() {
    const clearBtn = this.section.querySelector('[data-clear-filters]');
    if (!clearBtn) return;

    clearBtn.addEventListener('click', () => {
      // Reset all variant filters
      this.activeFilters.variants = {};
      this.activeFilters.search = '';

      // Uncheck all filter checkboxes
      const filterInputs = this.section.querySelectorAll('.sf-input[data-filter-group]');
      filterInputs.forEach(input => input.checked = false);

      // Clear search input
      const searchInput = this.section.querySelector('.product-search-input');
      if (searchInput) searchInput.value = '';

      // Reset sidebar filters to show all options for current collection
      this.updateSidebarFiltersForCollection();

      // Apply filters
      this.applyFilters();
    });
  }

  /**
   * Search Functionality
   */
  initSearch() {
    const searchInput = this.section.querySelector('.product-search-input');
    const searchBtn = this.section.querySelector('.collection-search-btn');

    if (!searchInput) return;

    const performSearch = () => {
      this.activeFilters.search = searchInput.value.toLowerCase().trim();
      this.applyFilters();
    };

    // Search on button click
    if (searchBtn) {
      searchBtn.addEventListener('click', performSearch);
    }

    // Search on Enter key
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        performSearch();
      }
    });

    // Optional: Real-time search (debounced)
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.activeFilters.search = e.target.value.toLowerCase().trim();
        this.applyFilters();
      }, 500);
    });
  }

  /**
   * Sort Functionality
   */
  initSort() {
    const sortSelect = this.section.querySelector('.collection-sort-select');
    if (!sortSelect) return;

    sortSelect.addEventListener('change', (e) => {
      this.currentSort = e.target.value;
      this.sortProducts();
    });
  }

  /**
   * Apply All Active Filters
   */
  applyFilters() {
    this.filteredProducts = this.allProducts.filter(product => {
      // Collection filter
      if (this.activeFilters.collection !== 'all') {
        const productCollections = product.getAttribute('data-collection') || '';
        if (!productCollections.includes(this.activeFilters.collection)) {
          return false;
        }
      }

      // Rating filter
      if (this.activeFilters.variants['rating'] && this.activeFilters.variants['rating'].length > 0) {
        const productRating = parseFloat(product.getAttribute('data-rating')) || 0;
        const ratingFilters = this.activeFilters.variants['rating'];

        // Check if product rating meets any of the selected rating thresholds
        // If multiple rating filters are selected, product needs to match at least one
        const meetsRatingRequirement = ratingFilters.some(minRating => {
          const minRatingNum = parseFloat(minRating);
          if (minRatingNum === 5) {
            // Exactly 5 stars
            return productRating === 5;
          } else {
            // X stars and up
            return productRating >= minRatingNum;
          }
        });

        if (!meetsRatingRequirement) return false;
      }

      // Dynamic variant filters (excluding rating which is handled above)
      for (const filterGroup in this.activeFilters.variants) {
        if (filterGroup === 'rating') continue; // Skip rating, already handled

        const filterValues = this.activeFilters.variants[filterGroup];
        if (filterValues && filterValues.length > 0) {
          const productOptions = this.getProductOptions(product);
          const hasMatch = filterValues.some(filterValue =>
            productOptions.some(opt => opt.toLowerCase() === filterValue.toLowerCase())
          );
          if (!hasMatch) return false;
        }
      }

      // Search filter
      if (this.activeFilters.search) {
        const productTitle = (product.getAttribute('data-title') || '').toLowerCase();
        const productType = (product.getAttribute('data-type') || '').toLowerCase();
        const productVendor = (product.getAttribute('data-vendor') || '').toLowerCase();
        const productTags = (product.getAttribute('data-tags') || '').toLowerCase();

        const searchText = this.activeFilters.search;
        if (!productTitle.includes(searchText) &&
            !productType.includes(searchText) &&
            !productVendor.includes(searchText) &&
            !productTags.includes(searchText)) {
          return false;
        }
      }

      return true;
    });

    this.updateProductDisplay();
    this.sortProducts();
  }

  /**
   * Get product variant options
   */
  getProductOptions(product) {
    const variantOptions = product.getAttribute('data-variant-options') || '';
    if (!variantOptions) return [];
    return variantOptions.split('|').map(opt => opt.trim()).filter(opt => opt);
  }

  /**
   * Update Product Display
   */
  updateProductDisplay() {
    // Hide all products
    this.allProducts.forEach(product => {
      product.style.display = 'none';
    });

    // Show filtered products
    this.filteredProducts.forEach(product => {
      product.style.display = '';
    });

    // Update products count
    const countElement = this.section.querySelector('.products-count');
    if (countElement) {
      const count = this.filteredProducts.length;
      const total = this.allProducts.length;
      countElement.textContent = `Showing ${count} of ${total} products`;
    }

    // Show/hide empty state
    const noProductsMsg = this.section.querySelector('.no-products-message');
    if (noProductsMsg) {
      noProductsMsg.style.display = this.filteredProducts.length === 0 ? 'block' : 'none';
    }
  }

  /**
   * Sort Products
   */
  sortProducts() {
    const sortedProducts = [...this.filteredProducts];

    switch (this.currentSort) {
      case 'price-low-high':
        sortedProducts.sort((a, b) => {
          const priceA = parseFloat(a.getAttribute('data-price')) || 0;
          const priceB = parseFloat(b.getAttribute('data-price')) || 0;
          return priceA - priceB;
        });
        break;

      case 'price-high-low':
        sortedProducts.sort((a, b) => {
          const priceA = parseFloat(a.getAttribute('data-price')) || 0;
          const priceB = parseFloat(b.getAttribute('data-price')) || 0;
          return priceB - priceA;
        });
        break;

      case 'title-asc':
        sortedProducts.sort((a, b) => {
          const titleA = (a.getAttribute('data-title') || '').toLowerCase();
          const titleB = (b.getAttribute('data-title') || '').toLowerCase();
          return titleA.localeCompare(titleB);
        });
        break;

      case 'title-desc':
        sortedProducts.sort((a, b) => {
          const titleA = (a.getAttribute('data-title') || '').toLowerCase();
          const titleB = (b.getAttribute('data-title') || '').toLowerCase();
          return titleB.localeCompare(titleA);
        });
        break;

      case 'date-new-old':
        sortedProducts.sort((a, b) => {
          const dateA = parseInt(a.getAttribute('data-created')) || 0;
          const dateB = parseInt(b.getAttribute('data-created')) || 0;
          return dateB - dateA;
        });
        break;

      case 'date-old-new':
        sortedProducts.sort((a, b) => {
          const dateA = parseInt(a.getAttribute('data-created')) || 0;
          const dateB = parseInt(b.getAttribute('data-created')) || 0;
          return dateA - dateB;
        });
        break;

      case 'default':
      default:
        // Use original index order
        sortedProducts.sort((a, b) => {
          const indexA = parseInt(a.getAttribute('data-index')) || 0;
          const indexB = parseInt(b.getAttribute('data-index')) || 0;
          return indexA - indexB;
        });
        break;
    }

    // Reorder products in DOM
    sortedProducts.forEach(product => {
      this.productGrid.appendChild(product);
    });
  }

  /**
   * Product Image Sliders
   */
  initImageSliders() {
    const sliders = this.section.querySelectorAll('.product-slider-wrapper');

    sliders.forEach(slider => {
      const slideCount = parseInt(slider.getAttribute('data-slide-count')) || 1;
      if (slideCount <= 1) return;

      const images = slider.querySelectorAll('.product-slide');
      const dots = slider.parentElement.querySelectorAll('.slider-dot');
      let currentSlide = 0;

      // Show first slide
      this.showSlide(images, dots, 0);

      // Dot navigation
      dots.forEach((dot, index) => {
        dot.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          currentSlide = index;
          this.showSlide(images, dots, currentSlide);
        });
      });

      // Auto-advance on hover (optional)
      let autoSlideInterval;
      slider.addEventListener('mouseenter', () => {
        autoSlideInterval = setInterval(() => {
          currentSlide = (currentSlide + 1) % slideCount;
          this.showSlide(images, dots, currentSlide);
        }, 2000);
      });

      slider.addEventListener('mouseleave', () => {
        clearInterval(autoSlideInterval);
        currentSlide = 0;
        this.showSlide(images, dots, 0);
      });
    });
  }

  showSlide(images, dots, index) {
    images.forEach((img, i) => {
      img.style.display = i === index ? 'block' : 'none';
    });
    dots.forEach((dot, i) => {
      if (i === index) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  /**
   * Color Swatches
   */
  initColorSwatches() {
    const swatches = this.section.querySelectorAll('.color-swatch');

    swatches.forEach(swatch => {
      swatch.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        const variantId = swatch.getAttribute('data-variant-id');
        const variantImage = swatch.getAttribute('data-variant-image');
        const card = swatch.closest('.product-card');

        if (!card) return;

        // Update active swatch
        const allSwatches = card.querySelectorAll('.color-swatch');
        allSwatches.forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');

        // Update product image if variant has image
        if (variantImage) {
          const mainImage = card.querySelector('.product-image-wrapper img');
          if (mainImage) {
            mainImage.src = variantImage;
            mainImage.srcset = variantImage;
          }
        }

        // Update product link with variant parameter
        const productLinks = card.querySelectorAll('a[href*="/products/"]');
        productLinks.forEach(link => {
          const url = new URL(link.href);
          if (variantId) {
            url.searchParams.set('variant', variantId);
          }
          link.href = url.toString();
        });
      });
    });
  }

  /**
   * Full Card Clickable
   */
  initClickableCards() {
    const clickableCards = this.section.querySelectorAll('.product-card[data-product-url]');

    clickableCards.forEach(card => {
      card.style.cursor = 'pointer';

      card.addEventListener('click', (e) => {
        // Don't trigger if clicking on a link, button, or swatch
        if (e.target.closest('a, button, .color-swatch, .slider-dot')) {
          return;
        }

        const url = card.getAttribute('data-product-url');
        if (url) {
          window.location.href = url;
        }
      });
    });
  }

  /**
   * Mobile Filter Toggle
   */
  initMobileFilterToggle() {
    const sidebarFilters = this.section.querySelector('.sidebar-filters');
    if (!sidebarFilters) return;

    const header = sidebarFilters.querySelector('.sidebar-filters__header');
    if (!header) return;

    // Remove any existing event listeners by cloning
    const newHeader = header.cloneNode(true);
    header.parentNode.replaceChild(newHeader, header);

    // Make header clickable on mobile with both click and touch
    const toggleFilters = (e) => {
      e.preventDefault();
      e.stopPropagation();
      sidebarFilters.classList.toggle('is-open');
    };

    newHeader.addEventListener('click', toggleFilters);
    newHeader.addEventListener('touchend', toggleFilters);

    // Close filters on mobile by default
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
      sidebarFilters.classList.remove('is-open');
    } else {
      sidebarFilters.classList.add('is-open');
    }

    // Handle resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
          sidebarFilters.classList.remove('is-open');
        } else {
          sidebarFilters.classList.add('is-open');
        }
      }, 250);
    });
  }
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCollectionGridPages);
} else {
  initCollectionGridPages();
}

function initCollectionGridPages() {
  // Find all collection grid sections and initialize them
  const sections = document.querySelectorAll('[class*="section-"]');
  sections.forEach(section => {
    const match = section.className.match(/section-(\S+)/);
    if (match && section.querySelector('.product-grid')) {
      new CollectionGridPage(match[1]);
    }
  });
}

// Re-initialize on theme editor section load
if (typeof Shopify !== 'undefined' && Shopify.designMode) {
  document.addEventListener('shopify:section:load', (event) => {
    const sectionId = event.detail.sectionId;
    new CollectionGridPage(sectionId);
  });
}

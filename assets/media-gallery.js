if (!customElements.get('media-gallery')) {
  customElements.define('media-gallery', class MediaGallery extends HTMLElement {
    constructor() {
      super();
      this.elements = {
        liveRegion: this.querySelector('[id^="GalleryStatus"]'),
        viewer: this.querySelector('[id^="GalleryViewer"]'),
        thumbnails: this.querySelector('[id^="GalleryThumbnails"]') || document.querySelector('[id^="GalleryThumbnails"]')
      }
      this.mql = window.matchMedia('(min-width: 750px)');
      this.productInfo = document.getElementById(`ProductInfo-${this.dataset.section}`);
      this.prependMedia = this.dataset.disablePrepend != 'true';
      if (this.productInfo && Shopify.postLinksRetry) this.productInfo.initShareLinks();

      // Image filtering by variant - uses data-filtering-option attribute
      this.filteringOption = this.dataset.filteringOption || null;

      // Set up variant change listener for image filtering
      if (this.filteringOption) {
        this.setupVariantFilterListener();
      }

      if (!this.elements.thumbnails) return;

      this.elements.viewer.addEventListener('slideChanged', debounce(this.onSlideChanged.bind(this), 500));
      this.elements.thumbnails.querySelectorAll('[data-target]').forEach((mediaToSwitch) => {
        mediaToSwitch.querySelector('button').addEventListener('click', this.setActiveMedia.bind(this, mediaToSwitch.dataset.target, false));
      });
      if (this.dataset.desktopLayout.includes('thumbnail') && this.mql.matches) this.removeListSemantic();
    }

    setupVariantFilterListener() {
      const self = this;

      // Listen for variant change events
      document.addEventListener('variant-change', (e) => {
        if (e.detail && e.detail.variant) {
          self.filterImagesByVariant(e.detail.variant);
        }
      });

      document.addEventListener('variant:change', (e) => {
        if (e.detail && e.detail.variant) {
          self.filterImagesByVariant(e.detail.variant);
        }
      });

      // Also watch for changes to the variant input
      const section = this.dataset.section;
      const productInfo = document.getElementById(`ProductInfo-${section}`);
      if (productInfo) {
        const variantInput = productInfo.querySelector('input[name="id"]');
        if (variantInput) {
          const observer = new MutationObserver(() => {
            // Get current variant from the product JSON
            self.filterImagesFromCurrentVariant();
          });
          observer.observe(variantInput, { attributes: true, attributeFilter: ['value'] });
        }
      }

      // Listen for variant picker clicks
      document.addEventListener('click', (e) => {
        const variantOption = e.target.closest('.product-form__input input, .variant-picker__option, [data-option-value]');
        if (variantOption) {
          // Delay to allow variant to update
          setTimeout(() => {
            self.filterImagesFromCurrentVariant();
          }, 100);
        }
      });
    }

    filterImagesFromCurrentVariant() {
      const section = this.dataset.section;
      const productInfo = document.getElementById(`ProductInfo-${section}`);
      if (!productInfo) return;

      // Try to get variant data from the page
      const variantInput = productInfo.querySelector('input[name="id"]');
      if (!variantInput) return;

      const variantId = variantInput.value;

      // Find variant in product JSON
      const productJson = document.querySelector(`[data-product-json-${section}], script[type="application/json"][data-product-json]`);
      if (productJson) {
        try {
          const product = JSON.parse(productJson.textContent);
          const variant = product.variants.find(v => v.id == variantId);
          if (variant) {
            this.filterImagesByVariant(variant);
          }
        } catch (e) {
          // JSON parse failed, try alternative method
        }
      }

      // Alternative: get variant info from URL or data attributes
      if (!productJson) {
        const url = new URL(window.location.href);
        const variantParam = url.searchParams.get('variant');
        if (variantParam) {
          // Fetch variant info
          fetch(`${window.location.pathname}.js`)
            .then(r => r.json())
            .then(product => {
              const variant = product.variants.find(v => v.id == variantId);
              if (variant) {
                this.filterImagesByVariant(variant);
              }
            })
            .catch(() => {});
        }
      }
    }

    filterImagesByVariant(variant) {
      if (!this.filteringOption || !variant) return;

      const filterValue = variant[this.filteringOption];
      if (!filterValue) return;

      const allSlides = this.querySelectorAll('.product__media-item, .thumbnail-list__item, .slider-counter__link');
      let firstVisibleSlide = null;

      // First, fade out all slides
      allSlides.forEach(slide => {
        slide.classList.add('media-filtering');
      });

      // After fade out, update visibility and fade in
      setTimeout(() => {
        allSlides.forEach(slide => {
          const slideAlt = slide.dataset.alt ? slide.dataset.alt.toLowerCase().trim() : '';
          const filterLower = filterValue.toLowerCase().trim();

          if (slideAlt === filterLower || slideAlt === 'always_display') {
            slide.classList.remove('hidden');
            slide.classList.add('media-visible');
            if (!firstVisibleSlide && slide.classList.contains('product__media-item')) {
              firstVisibleSlide = slide;
            }
          } else {
            slide.classList.add('hidden');
            slide.classList.remove('media-visible');
          }
        });

        // Activate first visible slide
        if (firstVisibleSlide) {
          const mediaId = firstVisibleSlide.dataset.mediaId;
          if (mediaId) {
            this.elements.viewer.querySelectorAll('[data-media-id]').forEach(el => el.classList.remove('is-active'));
            firstVisibleSlide.classList.add('is-active');

            // Update thumbnail
            if (this.elements.thumbnails) {
              const thumbnail = this.elements.thumbnails.querySelector(`[data-target="${mediaId}"]`);
              if (thumbnail) {
                this.setActiveThumbnail(thumbnail);
              }
            }
          }
        }

        // Fade in visible slides
        setTimeout(() => {
          allSlides.forEach(slide => {
            slide.classList.remove('media-filtering');
          });

          // Reinitialize slider
          if (this.elements.viewer && this.elements.viewer.initPages) {
            this.elements.viewer.initPages();
          }
          if (this.elements.viewer && this.elements.viewer.update) {
            this.elements.viewer.update();
          }
        }, 50);
      }, 200);
    }

    onSlideChanged(event) {
      const thumbnail = this.elements.thumbnails.querySelector(`[data-target="${ event.detail.currentElement.dataset.mediaId }"]`);
      this.setActiveThumbnail(thumbnail);
    }

    setActiveMedia(mediaId, prepend, filtering = false, currentVariant = null) {
      // Handle image filtering based on variant selection
      if (filtering && currentVariant && this.filteringOption) {
        const filterValue = currentVariant[this.filteringOption];
        const allSlides = this.querySelectorAll('.product__media-item, .thumbnail-list__item, .slider-counter__link');
        allSlides.forEach(slide => {
          const slideAlt = slide.dataset.alt ? slide.dataset.alt.toLowerCase().trim() : '';
          const filterLower = filterValue ? filterValue.toLowerCase().trim() : '';
          if (slideAlt === filterLower || slideAlt === 'always_display') {
            slide.classList.remove('hidden');
          } else {
            slide.classList.add('hidden');
          }
        })
      }

      const activeMedia = this.elements.viewer.querySelector(`[data-media-id="${ mediaId }"]`);
      this.elements.viewer.querySelectorAll('[data-media-id]').forEach((element) => {
        element.classList.remove('is-active');
      });
      activeMedia.classList.add('is-active');

      if (prepend && this.prependMedia) {
        activeMedia.parentElement.prepend(activeMedia);
        if (this.elements.thumbnails) {
          const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${ mediaId }"]`);
          activeThumbnail.parentElement.prepend(activeThumbnail);
        }
        if (this.elements.viewer.slider) this.elements.viewer.resetPages();
      }

      this.preventStickyHeader();
      window.setTimeout(() => {
        if (this.elements.thumbnails) {
          activeMedia.parentElement.scrollTo({ left: activeMedia.offsetLeft });
        }
        if (!this.elements.thumbnails || this.dataset.desktopLayout === 'stacked') {
          activeMedia.scrollIntoView({behavior: 'smooth'});
        }
      });
      this.playActiveMedia(activeMedia);

      if (filtering && currentVariant && this.filteringOption) {
        if (this.elements.viewer && this.elements.viewer.initPages) this.elements.viewer.initPages();
        if (this.elements.viewer && this.elements.viewer.update) this.elements.viewer.update();
      }

      if (!this.elements.thumbnails) return;
      const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${ mediaId }"]`);
      this.setActiveThumbnail(activeThumbnail);
      this.announceLiveRegion(activeMedia, activeThumbnail.dataset.mediaPosition);
    }

    setActiveThumbnail(thumbnail) {
      if (!this.elements.thumbnails || !thumbnail) return;

      this.elements.thumbnails.querySelectorAll('button').forEach((element) => {
        element.removeAttribute('aria-current');
        element.setAttribute('aria-current', 'false');
      });
      const thumbnailButton = thumbnail.querySelector('button');
      if (thumbnailButton) {
        thumbnailButton.setAttribute('aria-current', 'true');
      }
      if (this.elements.thumbnails.isSlideVisible(thumbnail, false, 10)) return;

      this.elements.thumbnails.slider.scrollTo({ left: thumbnail.offsetLeft });
    }

    announceLiveRegion(activeItem, position) {
      const image = activeItem.querySelector('.product__modal-opener--image img');
      if (!image) return;
      image.onload = () => {
        this.elements.liveRegion.setAttribute('aria-hidden', false);
        this.elements.liveRegion.innerHTML = window.accessibilityStrings.imageAvailable.replace(
          '[index]',
          position
        );
        setTimeout(() => {
          this.elements.liveRegion.setAttribute('aria-hidden', true);
        }, 2000);
      };
      image.src = image.src;
    }

    playActiveMedia(activeItem) {
      window.pauseAllMedia();
      const deferredMedia = activeItem.querySelector('.deferred-media');
      if (deferredMedia) deferredMedia.loadContent(false);
    }

    preventStickyHeader() {
      this.stickyHeader = this.stickyHeader || document.querySelector('sticky-header');
      if (!this.stickyHeader) return;
      this.stickyHeader.dispatchEvent(new Event('preventHeaderReveal'));
    }

    removeListSemantic() {
      if (!this.elements.viewer.slider) return;
      this.elements.viewer.slider.setAttribute('role', 'presentation');
      this.elements.viewer.sliderItems.forEach(slide => slide.setAttribute('role', 'presentation'));
    }
  });
}

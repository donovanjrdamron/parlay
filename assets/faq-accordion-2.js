// FAQ Accordion 2 JavaScript
class FaqAccordion {
  constructor(section) {
    this.section = section;
    this.items = section.querySelectorAll('[data-faq-item]');
    this.init();
  }

  init() {
    this.items.forEach(item => {
      const trigger = item.querySelector('[data-faq-trigger]');
      const content = item.querySelector('[data-faq-content]');

      if (trigger && content) {
        trigger.addEventListener('click', () => this.toggleItem(item, trigger, content));

        // Set initial state
        if (trigger.getAttribute('aria-expanded') === 'true') {
          content.classList.add('is-open');
          this.setMaxHeight(content);
        }
      }
    });
  }

  toggleItem(item, trigger, content) {
    const isOpen = trigger.getAttribute('aria-expanded') === 'true';

    if (isOpen) {
      this.closeItem(trigger, content);
    } else {
      this.openItem(trigger, content);
    }
  }

  openItem(trigger, content) {
    trigger.setAttribute('aria-expanded', 'true');
    content.classList.add('is-open');
    this.setMaxHeight(content);
  }

  closeItem(trigger, content) {
    trigger.setAttribute('aria-expanded', 'false');
    content.style.maxHeight = content.scrollHeight + 'px';
    content.offsetHeight; // Force reflow
    content.style.maxHeight = '0';

    setTimeout(() => {
      content.classList.remove('is-open');
      content.style.maxHeight = '';
    }, 300);
  }

  setMaxHeight(content) {
    content.style.maxHeight = content.scrollHeight + 'px';

    setTimeout(() => {
      content.style.maxHeight = 'max-content';
    }, 300);
  }
}

// Initialize all FAQ accordions on the page
document.addEventListener('DOMContentLoaded', () => {
  const accordions = document.querySelectorAll('.faq-accordion-2');
  accordions.forEach(accordion => new FaqAccordion(accordion));
});

// Initialize on Shopify section load (for theme editor)
document.addEventListener('shopify:section:load', (event) => {
  if (event.target.classList.contains('faq-accordion-2')) {
    new FaqAccordion(event.target);
  }
});
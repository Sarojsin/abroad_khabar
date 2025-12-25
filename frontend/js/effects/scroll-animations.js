/**
 * Scroll Animations using Intersection Observer
 * AOS-style animations without dependencies
 */

class ScrollAnimations {
    constructor() {
        this.observer = null;
        this.elements = new Map();
        this.init();
    }

    init() {
        this.createObserver();
        this.scanElements();
        this.bindEvents();
    }

    createObserver() {
        const options = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateElement(entry.target);
                }
            });
        }, options);
    }

    scanElements() {
        const elements = document.querySelectorAll('[data-animate]');
        elements.forEach(element => {
            const animation = element.dataset.animate;
            const delay = element.dataset.delay || 0;

            this.elements.set(element, { animation, delay, animated: false });
            this.observer.observe(element);

            // Apply initial styles
            this.applyInitialState(element, animation);
        });
    }

    applyInitialState(element, animation) {
        switch (animation) {
            case 'fade-up':
                element.style.opacity = '0';
                element.style.transform = 'translateY(30px)';
                break;
            case 'fade-down':
                element.style.opacity = '0';
                element.style.transform = 'translateY(-30px)';
                break;
            case 'fade-left':
                element.style.opacity = '0';
                element.style.transform = 'translateX(30px)';
                break;
            case 'fade-right':
                element.style.opacity = '0';
                element.style.transform = 'translateX(-30px)';
                break;
            case 'zoom-in':
                element.style.opacity = '0';
                element.style.transform = 'scale(0.9)';
                break;
            case 'zoom-out':
                element.style.opacity = '0';
                element.style.transform = 'scale(1.1)';
                break;
            case 'flip-up':
                element.style.opacity = '0';
                element.style.transform = 'rotateX(45deg)';
                element.style.transformStyle = 'preserve-3d';
                break;
            default:
                element.style.opacity = '0';
        }

        element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    }

    animateElement(element) {
        const elementData = this.elements.get(element);
        if (!elementData || elementData.animated) return;

        elementData.animated = true;

        setTimeout(() => {
            element.style.opacity = '1';
            element.style.transform = '';

            // Remove from observer after animation
            setTimeout(() => {
                this.observer.unobserve(element);
            }, 600);
        }, elementData.delay);
    }

    bindEvents() {
        // Re-scan on dynamic content changes
        const observer = new MutationObserver(() => {
            this.scanElements();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    refresh() {
        this.elements.clear();
        this.scanElements();
    }
}

// Scroll-triggered color transitions
class ScrollColorTransitions {
    constructor() {
        this.sections = [];
        this.currentSection = null;
        this.init();
    }

    init() {
        this.scanSections();
        this.setupScrollListener();
    }

    scanSections() {
        this.sections = Array.from(document.querySelectorAll('[data-bg-color]'))
            .map(section => ({
                element: section,
                color: section.dataset.bgColor,
                offset: section.offsetTop,
                height: section.offsetHeight
            }))
            .sort((a, b) => a.offset - b.offset);
    }

    setupScrollListener() {
        let ticking = false;

        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    this.onScroll();
                    ticking = false;
                });
                ticking = true;
            }
        });

        // Initial check
        this.onScroll();
    }

    onScroll() {
        const scrollY = window.scrollY + 100; // Offset for navbar
        let activeSection = null;

        for (const section of this.sections) {
            if (scrollY >= section.offset && scrollY < section.offset + section.height) {
                activeSection = section;
                break;
            }
        }

        if (activeSection && activeSection !== this.currentSection) {
            this.currentSection = activeSection;
            this.updateColors(activeSection.color);
        }
    }

    updateColors(color) {
        const root = document.documentElement;

        // You can define color schemes in CSS variables
        // For example: data-bg-color="dark" would map to CSS variable --bg-color-dark
        root.style.setProperty('--current-section-color', `var(--bg-color-${color})`);

        // Dispatch custom event for other components to react
        document.dispatchEvent(new CustomEvent('sectionChange', {
            detail: { color }
        }));
    }
}

// Staggered animations for groups
class StaggeredAnimations {
    constructor(containerSelector, itemSelector, animation = 'fade-up') {
        this.container = document.querySelector(containerSelector);
        this.itemSelector = itemSelector;
        this.animation = animation;
        this.init();
    }

    init() {
        if (!this.container) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateItems();
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        observer.observe(this.container);
    }

    animateItems() {
        const items = this.container.querySelectorAll(this.itemSelector);

        items.forEach((item, index) => {
            item.setAttribute('data-animate', this.animation);
            item.setAttribute('data-delay', index * 100);

            // Force reflow to trigger animation
            void item.offsetWidth;
        });
    }
}

// Smooth scroll to sections
function smoothScrollTo(target, offset = 80) {
    const element = typeof target === 'string'
        ? document.querySelector(target)
        : target;

    if (!element) return;

    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - offset;

    window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
    });
}

// Scroll progress indicator
class ScrollProgress {
    constructor() {
        this.progressBar = null;
        this.init();
    }

    init() {
        // Create progress bar
        this.progressBar = document.createElement('div');
        this.progressBar.className = 'scroll-progress';
        this.progressBar.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 0%;
            height: 3px;
            background: linear-gradient(90deg, var(--primary-color), var(--accent-color));
            z-index: 9999;
            transition: width 0.1s ease;
        `;

        document.body.appendChild(this.progressBar);
        this.setupScrollListener();
    }

    setupScrollListener() {
        window.addEventListener('scroll', () => {
            const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (winScroll / height) * 100;
            this.progressBar.style.width = scrolled + "%";
        });
    }
}

// Helper functions
function lazyLoadImages() {
    if (window.lazyLoader) {
        window.lazyLoader.refresh();
    }
}

function lazyLoadVideos() {
    if (window.lazyLoader) {
        window.lazyLoader.refresh();
    }
}

function setupScrollAnimations() {
    if (window.scrollAnimations) {
        window.scrollAnimations.refresh();
    } else {
        initScrollAnimations();
    }
}

// Export functions
export {
    ScrollProgress,
    initScrollAnimations,
    lazyLoadImages,
    lazyLoadVideos,
    setupScrollAnimations
};

// Initialize helper
function initScrollAnimations() {
    if (window.scrollAnimations) return window.scrollAnimations;
    return new ScrollAnimations();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize scroll animations
    const scrollAnimations = new ScrollAnimations();

    // Initialize color transitions if needed
    if (document.querySelector('[data-bg-color]')) {
        new ScrollColorTransitions();
    }

    // Initialize scroll progress if enabled
    if (document.body.dataset.scrollProgress === 'true') {
        new ScrollProgress();
    }

    // Make available globally for dynamic content
    window.scrollAnimations = scrollAnimations;
});

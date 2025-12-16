/**
 * Parallax Scrolling Effects with GPU Acceleration
 */

class ParallaxController {
    constructor() {
        this.elements = [];
        this.isEnabled = true;
        this.lastScrollY = 0;
        this.ticking = false;
        this.init();
    }

    init() {
        this.scanElements();
        this.bindEvents();
        this.update();
    }

    scanElements() {
        document.querySelectorAll('[data-parallax]').forEach(element => {
            const config = this.parseConfig(element);
            this.elements.push({
                element,
                config,
                originalTransform: element.style.transform
            });
        });
    }

    parseConfig(element) {
        const config = {
            speed: parseFloat(element.dataset.parallaxSpeed) || 0.5,
            direction: element.dataset.parallaxDirection || 'vertical',
            scale: element.dataset.parallaxScale ? parseFloat(element.dataset.parallaxScale) : 1,
            rotate: element.dataset.parallaxRotate ? parseFloat(element.dataset.parallaxRotate) : 0,
            opacity: element.dataset.parallaxOpacity === 'true',
            blur: element.dataset.parallaxBlur === 'true',
            threshold: element.dataset.parallaxThreshold || 0,
            perspective: element.dataset.parallaxPerspective ? parseInt(element.dataset.parallaxPerspective) : null
        };

        // Enable hardware acceleration
        element.style.willChange = 'transform';
        
        if (config.perspective) {
            element.parentElement.style.perspective = `${config.perspective}px`;
            element.parentElement.style.transformStyle = 'preserve-3d';
        }

        return config;
    }

    bindEvents() {
        window.addEventListener('scroll', this.onScroll.bind(this));
        window.addEventListener('resize', this.onResize.bind(this));
        
        // Intersection Observer for performance
        this.setupIntersectionObserver();
    }

    onScroll() {
        this.lastScrollY = window.scrollY;
        
        if (!this.ticking) {
            window.requestAnimationFrame(() => {
                this.update();
                this.ticking = false;
            });
            this.ticking = true;
        }
    }

    onResize() {
        // Re-calculate positions on resize
        this.update();
    }

    setupIntersectionObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const item = this.elements.find(e => e.element === entry.target);
                if (item) {
                    item.isVisible = entry.isIntersecting;
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '50px'
        });

        this.elements.forEach(item => {
            observer.observe(item.element);
        });
    }

    update() {
        if (!this.isEnabled) return;

        const scrollY = this.lastScrollY;
        const viewportHeight = window.innerHeight;

        this.elements.forEach(item => {
            if (!item.isVisible && !item.config.alwaysUpdate) return;

            const rect = item.element.getBoundingClientRect();
            const elementCenter = rect.top + rect.height / 2;
            const viewportCenter = viewportHeight / 2;
            
            // Calculate distance from viewport center
            const distanceFromCenter = elementCenter - viewportCenter;
            
            // Normalize value between -1 and 1
            const normalizedValue = distanceFromCenter / viewportHeight;
            
            // Apply parallax effect based on configuration
            this.applyParallax(item, scrollY, normalizedValue);
        });
    }

    applyParallax(item, scrollY, normalizedValue) {
        const { config, element } = item;
        let transform = '';
        
        // Base translation
        const translateY = scrollY * config.speed;
        const translateX = config.direction === 'horizontal' ? scrollY * config.speed : 0;
        
        if (translateY !== 0 || translateX !== 0) {
            transform += `translate3d(${translateX}px, ${translateY}px, 0) `;
        }
        
        // Scale effect
        if (config.scale !== 1) {
            const scaleValue = 1 + (config.scale - 1) * Math.abs(normalizedValue);
            transform += `scale3d(${scaleValue}, ${scaleValue}, 1) `;
        }
        
        // Rotation effect
        if (config.rotate !== 0) {
            const rotateValue = config.rotate * normalizedValue;
            transform += `rotate3d(0, 1, 0, ${rotateValue}deg) `;
        }
        
        // Apply transform
        element.style.transform = transform;
        
        // Apply opacity if enabled
        if (config.opacity) {
            const opacity = 1 - Math.abs(normalizedValue) * 0.5;
            element.style.opacity = Math.max(opacity, 0.5);
        }
        
        // Apply blur if enabled
        if (config.blur) {
            const blurAmount = Math.abs(normalizedValue) * 5;
            element.style.filter = `blur(${blurAmount}px)`;
        }
    }

    addElement(element, config = {}) {
        const item = {
            element,
            config: { ...this.parseConfig(element), ...config },
            originalTransform: element.style.transform,
            isVisible: true
        };
        
        this.elements.push(item);
        this.update();
    }

    removeElement(element) {
        const index = this.elements.findIndex(item => item.element === element);
        if (index !== -1) {
            // Restore original transform
            element.style.transform = this.elements[index].originalTransform;
            element.style.willChange = '';
            this.elements.splice(index, 1);
        }
    }

    enable() {
        this.isEnabled = true;
        this.update();
    }

    disable() {
        this.isEnabled = false;
        
        // Reset all elements
        this.elements.forEach(item => {
            item.element.style.transform = item.originalTransform;
            item.element.style.opacity = '';
            item.element.style.filter = '';
        });
    }

    refresh() {
        this.elements = [];
        this.scanElements();
        this.update();
    }
}

// Layered parallax for complex scenes
class LayeredParallax {
    constructor(container) {
        this.container = container;
        this.layers = [];
        this.depth = parseFloat(container.dataset.parallaxDepth) || 1000;
        this.init();
    }

    init() {
        this.scanLayers();
        this.bindEvents();
        this.update();
    }

    scanLayers() {
        const layerElements = this.container.querySelectorAll('[data-parallax-layer]');
        
        layerElements.forEach((layer, index) => {
            const depth = parseFloat(layer.dataset.parallaxLayer) || (index + 1) * 100;
            const speed = depth / this.depth;
            
            this.layers.push({
                element: layer,
                depth,
                speed,
                originalTransform: layer.style.transform
            });
            
            layer.style.willChange = 'transform';
        });
    }

    bindEvents() {
        let ticking = false;
        
        this.container.addEventListener('mousemove', (e) => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    this.onMouseMove(e);
                    ticking = false;
                });
                ticking = true;
            }
        });
        
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    this.onScroll();
                    ticking = false;
                });
                ticking = true;
            }
        });
    }

    onMouseMove(e) {
        const rect = this.container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const moveX = (x - centerX) / centerX;
        const moveY = (y - centerY) / centerY;
        
        this.layers.forEach(layer => {
            const translateX = moveX * layer.depth * 0.1;
            const translateY = moveY * layer.depth * 0.1;
            
            layer.element.style.transform = 
                `translate3d(${translateX}px, ${translateY}px, 0) ${layer.originalTransform}`;
        });
    }

    onScroll() {
        const scrollY = window.scrollY;
        
        this.layers.forEach(layer => {
            const translateY = scrollY * layer.speed;
            layer.element.style.transform = 
                `${layer.originalTransform} translate3d(0, ${translateY}px, 0)`;
        });
    }
}

// Tilt effect on mouse move
class TiltEffect {
    constructor(element, options = {}) {
        this.element = element;
        this.settings = {
            max: options.max || 15,
            perspective: options.perspective || 1000,
            scale: options.scale || 1.05,
            speed: options.speed || 300,
            axis: options.axis || null,
            reset: options.reset || true,
            ...options
        };
        
        this.init();
    }

    init() {
        this.element.style.transformStyle = 'preserve-3d';
        this.element.style.willChange = 'transform';
        
        this.bindEvents();
    }

    bindEvents() {
        this.element.addEventListener('mouseenter', this.onMouseEnter.bind(this));
        this.element.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.element.addEventListener('mouseleave', this.onMouseLeave.bind(this));
    }

    onMouseEnter() {
        this.element.style.transition = `transform ${this.settings.speed}ms cubic-bezier(.03,.98,.52,.99)`;
    }

    onMouseMove(e) {
        const rect = this.element.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const percentageX = (x / width - 0.5) * 2;
        const percentageY = (y / height - 0.5) * 2;
        
        const rotateY = this.settings.max * percentageX;
        const rotateX = this.settings.max * percentageY * -1;
        
        let transform = `perspective(${this.settings.perspective}px) `;
        transform += `rotateX(${this.settings.axis === 'x' ? 0 : rotateX}deg) `;
        transform += `rotateY(${this.settings.axis === 'y' ? 0 : rotateY}deg) `;
        transform += `scale3d(${this.settings.scale}, ${this.settings.scale}, ${this.settings.scale})`;
        
        this.element.style.transform = transform;
    }

    onMouseLeave() {
        if (this.settings.reset) {
            this.element.style.transition = `transform ${this.settings.speed}ms cubic-bezier(.03,.98,.52,.99)`;
            this.element.style.transform = 
                `perspective(${this.settings.perspective}px) rotateX(0) rotateY(0) scale3d(1, 1, 1)`;
        }
    }

    destroy() {
        this.element.removeEventListener('mouseenter', this.onMouseEnter);
        this.element.removeEventListener('mousemove', this.onMouseMove);
        this.element.removeEventListener('mouseleave', this.onMouseLeave);
    }
}

// Scroll-triggered reveal animations
class ScrollReveal {
    constructor(elements, options = {}) {
        this.elements = Array.isArray(elements) ? elements : [elements];
        this.options = {
            threshold: options.threshold || 0.1,
            rootMargin: options.rootMargin || '0px',
            delay: options.delay || 0,
            distance: options.distance || '50px',
            origin: options.origin || 'bottom',
            duration: options.duration || 600,
            easing: options.easing || 'cubic-bezier(0.5, 0, 0, 1)',
            ...options
        };
        
        this.init();
    }

    init() {
        this.setInitialStyles();
        this.setupObserver();
    }

    setInitialStyles() {
        this.elements.forEach(element => {
            element.style.opacity = '0';
            element.style.willChange = 'transform, opacity';
            
            let transform = '';
            switch(this.options.origin) {
                case 'bottom':
                    transform = `translateY(${this.options.distance})`;
                    break;
                case 'top':
                    transform = `translateY(-${this.options.distance})`;
                    break;
                case 'left':
                    transform = `translateX(-${this.options.distance})`;
                    break;
                case 'right':
                    transform = `translateX(${this.options.distance})`;
                    break;
            }
            
            element.style.transform = transform;
            element.style.transition = `opacity ${this.options.duration}ms ${this.options.easing}, 
                                       transform ${this.options.duration}ms ${this.options.easing}`;
        });
    }

    setupObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        this.animateIn(entry.target);
                        observer.unobserve(entry.target);
                    }, this.options.delay + (index * 100));
                }
            });
        }, {
            threshold: this.options.threshold,
            rootMargin: this.options.rootMargin
        });

        this.elements.forEach(element => {
            observer.observe(element);
        });
    }

    animateIn(element) {
        element.style.opacity = '1';
        element.style.transform = 'translate3d(0, 0, 0)';
        
        element.addEventListener('transitionend', () => {
            element.style.willChange = '';
        }, { once: true });
    }
}

// Export functions
export {
    ParallaxController,
    LayeredParallax,
    TiltEffect,
    ScrollReveal
};

// Initialize parallax effects on page load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize parallax controller
    const parallaxController = new ParallaxController();
    
    // Initialize layered parallax containers
    document.querySelectorAll('[data-parallax-depth]').forEach(container => {
        new LayeredParallax(container);
    });
    
    // Initialize tilt effects
    document.querySelectorAll('[data-tilt]').forEach(element => {
        new TiltEffect(element, {
            max: parseFloat(element.dataset.tiltMax) || 15,
            perspective: parseFloat(element.dataset.tiltPerspective) || 1000,
            scale: parseFloat(element.dataset.tiltScale) || 1.05
        });
    });
    
    // Initialize scroll reveals
    document.querySelectorAll('[data-reveal]').forEach(element => {
        new ScrollReveal(element, {
            origin: element.dataset.revealOrigin || 'bottom',
            distance: element.dataset.revealDistance || '50px',
            delay: parseFloat(element.dataset.revealDelay) || 0
        });
    });
    
    // Make available globally
    window.parallaxController = parallaxController;
});
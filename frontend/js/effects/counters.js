/**
 * Animated Counters with Intersection Observer
 */

class AnimatedCounter {
    constructor(element) {
        this.element = element;
        this.target = parseInt(element.dataset.target) || 0;
        this.duration = parseInt(element.dataset.duration) || 2000;
        this.delay = parseInt(element.dataset.delay) || 0;
        this.prefix = element.dataset.prefix || '';
        this.suffix = element.dataset.suffix || '';
        this.startValue = parseInt(element.dataset.start) || 0;
        this.decimalPlaces = parseInt(element.dataset.decimals) || 0;
        this.easing = element.dataset.easing || 'easeOutCubic';
        this.animated = false;
        this.observer = null;
        this.init();
    }

    init() {
        this.setupObserver();
    }

    setupObserver() {
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.animated) {
                    setTimeout(() => {
                        this.animate();
                    }, this.delay);
                    this.animated = true;
                    this.observer.unobserve(this.element);
                }
            });
        }, {
            threshold: 0.5,
            rootMargin: '50px'
        });

        this.observer.observe(this.element);
    }

    animate() {
        const startTime = performance.now();
        const startValue = this.startValue;
        const endValue = this.target;
        const duration = this.duration;

        const animateFrame = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Apply easing function
            const easedProgress = this.ease(progress, this.easing);

            const currentValue = startValue + (endValue - startValue) * easedProgress;

            // Format the number
            let displayValue;
            if (this.decimalPlaces > 0) {
                displayValue = currentValue.toFixed(this.decimalPlaces);
            } else {
                displayValue = Math.floor(currentValue);
            }

            // Update element
            this.element.textContent = this.prefix + displayValue + this.suffix;

            if (progress < 1) {
                requestAnimationFrame(animateFrame);
            } else {
                // Animation complete
                this.element.dispatchEvent(new CustomEvent('counterComplete', {
                    detail: { value: endValue }
                }));
            }
        };

        requestAnimationFrame(animateFrame);
    }

    ease(t, easing) {
        switch (easing) {
            case 'linear':
                return t;
            case 'easeInQuad':
                return t * t;
            case 'easeOutQuad':
                return t * (2 - t);
            case 'easeInOutQuad':
                return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            case 'easeInCubic':
                return t * t * t;
            case 'easeOutCubic':
                return (--t) * t * t + 1;
            case 'easeInOutCubic':
                return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
            default:
                return t;
        }
    }

    reset() {
        this.animated = false;
        this.element.textContent = this.prefix + this.startValue + this.suffix;
        this.observer.observe(this.element);
    }
}

// Initialize all counters on page
function initCounters() {
    const counterElements = document.querySelectorAll('.animate-counter, [data-counter]');
    const counters = [];

    counterElements.forEach(element => {
        counters.push(new AnimatedCounter(element));
    });

    return counters;
}

function animateCounters(elements) {
    elements.forEach(el => new AnimatedCounter(el));
}

// Stats counter for dashboard
class StatsCounter {
    constructor(container) {
        this.container = container;
        this.stats = [];
        this.init();
    }

    init() {
        this.gatherStats();
        this.setupObserver();
    }

    gatherStats() {
        const statElements = this.container.querySelectorAll('.stat-number');

        statElements.forEach(element => {
            const counterElement = element.querySelector('.counter');
            if (counterElement) {
                this.stats.push({
                    element: counterElement,
                    target: parseInt(counterElement.dataset.target) || 0,
                    prefix: counterElement.dataset.prefix || '',
                    suffix: counterElement.dataset.suffix || '',
                    duration: parseInt(counterElement.dataset.duration) || 2000
                });
            }
        });
    }

    setupObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateAll();
                    observer.unobserve(this.container);
                }
            });
        }, {
            threshold: 0.5
        });

        observer.observe(this.container);
    }

    animateAll() {
        this.stats.forEach((stat, index) => {
            setTimeout(() => {
                this.animateStat(stat);
            }, index * 200); // Stagger animation
        });
    }

    animateStat(stat) {
        const startValue = 0;
        const duration = stat.duration;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic
            const easedProgress = 1 - Math.pow(1 - progress, 3);

            const currentValue = Math.floor(startValue + (stat.target - startValue) * easedProgress);

            stat.element.textContent = stat.prefix + currentValue.toLocaleString() + stat.suffix;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }
}

// Timer/countdown functionality
class CountdownTimer {
    constructor(element) {
        this.element = element;
        this.endTime = new Date(element.dataset.endTime).getTime();
        this.updateInterval = null;
        this.init();
    }

    init() {
        if (!this.endTime || this.endTime < Date.now()) {
            this.element.textContent = 'Expired';
            return;
        }

        this.update();
        this.updateInterval = setInterval(() => this.update(), 1000);
    }

    update() {
        const now = Date.now();
        const distance = this.endTime - now;

        if (distance < 0) {
            clearInterval(this.updateInterval);
            this.element.textContent = 'Expired';
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        this.element.innerHTML = `
            <span class="time-unit">
                <span class="time-value">${days.toString().padStart(2, '0')}</span>
                <span class="time-label">Days</span>
            </span>
            <span class="time-separator">:</span>
            <span class="time-unit">
                <span class="time-value">${hours.toString().padStart(2, '0')}</span>
                <span class="time-label">Hours</span>
            </span>
            <span class="time-separator">:</span>
            <span class="time-unit">
                <span class="time-value">${minutes.toString().padStart(2, '0')}</span>
                <span class="time-label">Mins</span>
            </span>
            <span class="time-separator">:</span>
            <span class="time-unit">
                <span class="time-value">${seconds.toString().padStart(2, '0')}</span>
                <span class="time-label">Secs</span>
            </span>
        `;
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// Form character counter
class CharacterCounter {
    constructor(input, counterElement, maxLength) {
        this.input = input;
        this.counter = counterElement;
        this.maxLength = maxLength || parseInt(input.getAttribute('maxlength')) || 0;

        if (this.maxLength > 0) {
            this.init();
        }
    }

    init() {
        this.update();
        this.input.addEventListener('input', () => this.update());
    }

    update() {
        const currentLength = this.input.value.length;
        const remaining = this.maxLength - currentLength;

        this.counter.textContent = `${currentLength}/${this.maxLength}`;

        if (remaining < 0) {
            this.counter.style.color = '#ef4444';
        } else if (remaining < 10) {
            this.counter.style.color = '#f59e0b';
        } else {
            this.counter.style.color = '#6b7280';
        }
    }
}

// Export functions
export {
    AnimatedCounter,
    initCounters,
    animateCounters,
    StatsCounter,
    CountdownTimer,
    CharacterCounter
};

// Auto-initialize counters on page load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize regular counters
    initCounters();

    // Initialize stats counters
    document.querySelectorAll('.stats-section').forEach(section => {
        new StatsCounter(section);
    });

    // Initialize countdown timers
    document.querySelectorAll('[data-end-time]').forEach(element => {
        new CountdownTimer(element);
    });
});

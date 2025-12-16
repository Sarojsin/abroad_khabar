// Loading System
class Loader {
    constructor(options = {}) {
        this.containerId = options.containerId || 'loader-container';
        this.type = options.type || 'spinner'; // spinner, dots, bars, ring, pulse, wave
        this.size = options.size || 'md'; // sm, md, lg
        this.color = options.color || 'primary'; // primary, secondary, accent, white
        this.message = options.message || '';
        this.overlay = options.overlay !== false;
        this.zIndex = options.zIndex || 9999;
        
        this.container = null;
        this.isVisible = false;
        
        this.init();
    }

    init() {
        this.createContainer();
    }

    createContainer() {
        this.container = document.createElement('div');
        this.container.id = this.containerId;
        this.container.className = 'loader-container';
        
        if (this.overlay) {
            this.container.classList.add('loader-overlay');
        }
        
        this.container.style.zIndex = this.zIndex;
        
        const loaderClass = `loader-${this.type}`;
        const sizeClass = this.type === 'spinner' ? `loader-${this.type}-${this.size}` : '';
        const colorClass = `loader-${this.color}`;
        
        this.container.innerHTML = `
            <div class="loader-content">
                <div class="${loaderClass} ${sizeClass} ${colorClass}"></div>
                ${this.message ? `<p class="loader-message">${this.message}</p>` : ''}
            </div>
        `;
        
        // Hide initially
        this.container.style.display = 'none';
        document.body.appendChild(this.container);
    }

    show(message = null) {
        if (message) {
            this.updateMessage(message);
        }
        
        this.container.style.display = 'flex';
        
        // Trigger animation
        requestAnimationFrame(() => {
            this.container.style.opacity = '1';
            this.isVisible = true;
            
            // Dispatch event
            const event = new CustomEvent('loadershow', { detail: this });
            document.dispatchEvent(event);
        });
        
        return this;
    }

    hide() {
        if (!this.isVisible) return;
        
        this.container.style.opacity = '0';
        
        setTimeout(() => {
            this.container.style.display = 'none';
            this.isVisible = false;
            
            // Dispatch event
            const event = new CustomEvent('loaderhide', { detail: this });
            document.dispatchEvent(event);
        }, 300);
        
        return this;
    }

    updateMessage(message) {
        this.message = message;
        const messageElement = this.container.querySelector('.loader-message');
        
        if (messageElement) {
            messageElement.textContent = message;
        } else if (message) {
            const loaderContent = this.container.querySelector('.loader-content');
            const messageElement = document.createElement('p');
            messageElement.className = 'loader-message';
            messageElement.textContent = message;
            loaderContent.appendChild(messageElement);
        }
    }

    changeType(type) {
        if (this.isVisible) {
            console.warn('Cannot change loader type while visible');
            return;
        }
        
        this.type = type;
        this.destroy();
        this.createContainer();
    }

    destroy() {
        if (this.container && this.container.parentElement) {
            document.body.removeChild(this.container);
        }
        this.container = null;
    }

    // Static methods for common loader types
    static showFullscreen(message = null) {
        const loader = new Loader({
            type: 'spinner',
            size: 'lg',
            overlay: true,
            message: message
        });
        
        loader.show();
        return loader;
    }

    static showInline(container, options = {}) {
        const loader = new Loader({
            containerId: `inline-loader-${Date.now()}`,
            type: options.type || 'spinner',
            size: options.size || 'sm',
            overlay: false,
            message: options.message
        });
        
        // Position inline
        if (container) {
            container.style.position = 'relative';
            loader.container.style.position = 'absolute';
            loader.container.style.top = '0';
            loader.container.style.left = '0';
            loader.container.style.right = '0';
            loader.container.style.bottom = '0';
            loader.container.style.backgroundColor = 'rgba(255, 255, 255, 0.8)';
            loader.container.style.zIndex = '100';
            
            container.appendChild(loader.container);
        }
        
        loader.show();
        return loader;
    }

    static showButton(button, options = {}) {
        const originalContent = button.innerHTML;
        const originalWidth = button.offsetWidth;
        
        // Set minimum width to prevent button from shrinking
        button.style.minWidth = `${originalWidth}px`;
        
        const loader = new Loader({
            containerId: `button-loader-${Date.now()}`,
            type: 'spinner',
            size: 'sm',
            overlay: false,
            message: options.message
        });
        
        // Position inside button
        loader.container.style.display = 'inline-flex';
        loader.container.style.alignItems = 'center';
        loader.container.style.gap = '8px';
        
        button.innerHTML = '';
        button.appendChild(loader.container);
        button.disabled = true;
        
        loader.show();
        
        // Return restore function
        return () => {
            loader.hide();
            setTimeout(() => {
                button.innerHTML = originalContent;
                button.style.minWidth = '';
                button.disabled = false;
            }, 300);
        };
    }

    static showPage() {
        // Show page-level loader (used during page transitions)
        const existingLoader = document.querySelector('.page-loader');
        if (existingLoader) {
            existingLoader.style.display = 'flex';
            existingLoader.style.opacity = '1';
            return;
        }
        
        const loader = document.createElement('div');
        loader.className = 'page-loader';
        loader.innerHTML = `
            <div class="page-loader-content">
                <div class="page-loader-logo">
                    <i class="fas fa-graduation-cap"></i>
                </div>
                <div class="loader-spinner loader-lg"></div>
            </div>
        `;
        
        document.body.appendChild(loader);
        
        // Trigger animation
        requestAnimationFrame(() => {
            loader.style.opacity = '1';
        });
    }

    static hidePage() {
        const loader = document.querySelector('.page-loader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 300);
        }
    }

    // Progress loader
    static showProgress(message = null, total = 100) {
        const loader = document.createElement('div');
        loader.className = 'progress-loader';
        loader.innerHTML = `
            <div class="progress-loader-content">
                ${message ? `<p class="progress-message">${message}</p>` : ''}
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 0%"></div>
                    </div>
                    <span class="progress-text">0%</span>
                </div>
            </div>
        `;
        
        document.body.appendChild(loader);
        
        // Show with animation
        loader.style.display = 'flex';
        requestAnimationFrame(() => {
            loader.style.opacity = '1';
        });
        
        // Return update function
        return {
            update: (current, message = null) => {
                const percentage = Math.min(100, Math.max(0, (current / total) * 100));
                const fill = loader.querySelector('.progress-fill');
                const text = loader.querySelector('.progress-text');
                const messageEl = loader.querySelector('.progress-message');
                
                if (fill) fill.style.width = `${percentage}%`;
                if (text) text.textContent = `${Math.round(percentage)}%`;
                if (message && messageEl) messageEl.textContent = message;
            },
            hide: () => {
                loader.style.opacity = '0';
                setTimeout(() => {
                    if (loader.parentElement) {
                        document.body.removeChild(loader);
                    }
                }, 300);
            }
        };
    }
}

// Global loader manager
class LoaderManager {
    constructor() {
        this.loaders = new Map();
        this.pageLoader = null;
        this.init();
    }

    init() {
        // Auto-show page loader on fetch start
        let fetchCount = 0;
        
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
            fetchCount++;
            
            if (fetchCount === 1) {
                Loader.showPage();
            }
            
            return originalFetch.apply(this, args)
                .then(response => {
                    fetchCount--;
                    if (fetchCount === 0) {
                        Loader.hidePage();
                    }
                    return response;
                })
                .catch(error => {
                    fetchCount--;
                    if (fetchCount === 0) {
                        Loader.hidePage();
                    }
                    throw error;
                });
        };
    }

    create(id, options = {}) {
        const loader = new Loader(options);
        this.loaders.set(id, loader);
        return loader;
    }

    show(id, message = null) {
        const loader = this.loaders.get(id);
        if (loader) {
            loader.show(message);
        }
        return loader;
    }

    hide(id) {
        const loader = this.loaders.get(id);
        if (loader) {
            loader.hide();
        }
    }

    hideAll() {
        this.loaders.forEach(loader => {
            if (loader.isVisible) {
                loader.hide();
            }
        });
        Loader.hidePage();
    }

    get(id) {
        return this.loaders.get(id);
    }

    remove(id) {
        const loader = this.loaders.get(id);
        if (loader) {
            loader.destroy();
            this.loaders.delete(id);
        }
    }

    // Quick show/hide methods
    static show(options = {}) {
        const loader = new Loader(options);
        loader.show();
        return loader;
    }

    static hide() {
        // Hide all loaders
        document.querySelectorAll('.loader-container').forEach(loader => {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 300);
        });
        Loader.hidePage();
    }
}

// Create global loader manager
const loaderManager = new LoaderManager();

// Initialize loader system
export function initLoaderSystem() {
    return loaderManager;
}

// Export for module usage
export default Loader;

// Export helper methods
export const {
    create,
    show,
    hide,
    hideAll,
    get,
    remove
} = loaderManager;

// Export static methods
export const {
    showFullscreen,
    showInline,
    showButton,
    showPage,
    hidePage,
    showProgress
} = Loader;

// Alias for common use
export const showLoader = (options) => Loader.showFullscreen(options?.message);
export const hideLoader = LoaderManager.hide;
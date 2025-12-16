// Main Application Entry Point
import Router from './core/router.js';
import { initAuth } from './core/auth.js';
import { loadNavbar, loadFooter } from './components/navbar.js';
import { initModalSystem } from './components/modal.js';
import { initScrollAnimations } from './effects/scroll-animations.js';
import { initLazyMedia } from './effects/lazy-media.js';

class EduConsultApp {
    constructor() {
        this.router = new Router();
        this.currentPage = null;
        this.init();
    }

    async init() {
        // Initialize core systems
        await this.initCore();
        
        // Initialize effects and animations
        this.initEffects();
        
        // Start router
        this.router.init();
        
        console.log('EduConsult App initialized');
    }

    async initCore() {
        try {
            // Load navigation and footer
            await loadNavbar();
            await loadFooter();
            
            // Initialize auth system
            await initAuth();
            
            // Initialize modal system
            initModalSystem();
            
            // Initialize loading state
            this.initLoadingState();
            
        } catch (error) {
            console.error('Failed to initialize core:', error);
            this.showError('Failed to initialize application. Please refresh the page.');
        }
    }

    initEffects() {
        // Initialize scroll animations
        initScrollAnimations();
        
        // Initialize lazy loading for media
        initLazyMedia();
        
        // Initialize back to top button
        this.initBackToTop();
        
        // Initialize page transitions
        this.initPageTransitions();
    }

    initLoadingState() {
        const loader = document.querySelector('.loader-container');
        if (loader) {
            setTimeout(() => {
                loader.style.opacity = '0';
                setTimeout(() => {
                    loader.style.display = 'none';
                }, 300);
            }, 500);
        }
    }

    initBackToTop() {
        const backToTopBtn = document.getElementById('back-to-top');
        if (!backToTopBtn) return;

        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTopBtn.style.display = 'flex';
            } else {
                backToTopBtn.style.display = 'none';
            }
        });

        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    initPageTransitions() {
        // Handle internal link clicks for smooth transitions
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;

            const href = link.getAttribute('href');
            if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) {
                return;
            }

            // Handle internal navigation
            e.preventDefault();
            this.router.navigate(href);
        });
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'global-error';
        errorDiv.innerHTML = `
            <div class="error-content">
                <i class="fas fa-exclamation-circle"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.style.opacity = '1';
        }, 10);
        
        setTimeout(() => {
            errorDiv.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(errorDiv);
            }, 300);
        }, 5000);
    }

    updatePageTitle(title) {
        document.title = `${title} | EduConsult`;
        
        // Update meta tags for SEO
        this.updateMetaTags(title);
    }

    updateMetaTags(title) {
        // Update OpenGraph tags
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute('content', title);
        
        // Update Twitter card
        const twitterTitle = document.querySelector('meta[name="twitter:title"]');
        if (twitterTitle) twitterTitle.setAttribute('content', title);
    }

    injectSchema(schema) {
        const script = document.getElementById('schema-json');
        if (script) {
            script.textContent = JSON.stringify(schema);
        }
    }

    // Public API for page components
    static getInstance() {
        if (!EduConsultApp.instance) {
            EduConsultApp.instance = new EduConsultApp();
        }
        return EduConsultApp.instance;
    }
}

// Add global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    
    // Don't show error for network errors in production
    if (event.error instanceof TypeError && event.error.message.includes('fetch')) {
        return;
    }
    
    const app = EduConsultApp.getInstance();
    if (app) {
        app.showError('An unexpected error occurred. Please try again.');
    }
});

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check for service worker support
    if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
        navigator.serviceWorker.register('/service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registered:', registration);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed:', error);
            });
    }
    
    // Initialize the app
    window.app = EduConsultApp.getInstance();
});

// Make app globally available
window.EduConsultApp = EduConsultApp;

// Export for module usage
export default EduConsultApp;
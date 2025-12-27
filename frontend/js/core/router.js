// SPA-like Router with History API
import { showLoader, hideLoader } from '../components/loader.js';
import { closeAllModals } from '../components/modal.js';
import auth from './auth.js';

class Router {
    constructor() {
        this.routes = [];
        this.currentRoute = null;
        this.appContent = null;
        this.cache = new Map(); // Add template cache
        this.initEventListeners();
    }

    init() {
        this.appContent = document.getElementById('main-content');
        if (!this.appContent) {
            console.warn('Router: #main-content not found during init, will retry during navigation');
        }
        // Load initial route
        this.navigate(window.location.pathname, false);
    }

    initEventListeners() {
        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.route) {
                this.loadRoute(e.state.route, false);
            }
        });

        // Handle anchor clicks
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[data-router]');
            if (link) {
                e.preventDefault();
                const href = link.getAttribute('href');
                this.navigate(href);
            }
        });
    }

    registerRoute(path, component, options = {}) {
        const route = {
            path: this.normalizePath(path),
            component,
            title: options.title || 'Abroad Khabar',
            requiresAuth: options.requiresAuth || false,
            requiredRoles: options.requiredRoles || [],
            layout: options.layout || 'default'
        };

        this.routes.push(route);
        return this;
    }

    async navigate(path, pushState = true) {
        path = this.normalizePath(path);

        // Close any open modals
        closeAllModals();

        // Show loader
        showLoader();

        // Check authentication and permissions
        const route = this.matchRoute(path);

        if (!route) {
            await this.load404();
            hideLoader();
            return;
        }

        // Check auth
        if (route.requiresAuth && !auth.isAuthenticated) {
            this.redirectToLogin();
            hideLoader();
            return;
        }

        // Check roles
        if (route.requiredRoles.length > 0 && !auth.hasAnyRole(route.requiredRoles)) {
            await this.load403();
            hideLoader();
            return;
        }

        // Update browser history
        if (pushState) {
            window.history.pushState({ route: path }, '', path);
        }

        // Load the route
        await this.loadRoute(route);

        // Update page title
        document.title = route.title;

        // Scroll to top
        window.scrollTo(0, 0);

        // Update active nav link
        this.updateActiveLink(path);

        hideLoader();
    }

    async loadRoute(route) {
        try {
            // Match by component string
            if (typeof route === 'string') {
                route = this.matchRoute(route);
                if (!route) {
                    await this.load404();
                    return;
                }
            }

            this.currentRoute = route;

            // Add loading class to body for transitions
            document.body.classList.add('router-loading');

            // Load the component with caching
            const html = await this.fetchComponent(route.component);

            // Parse and render
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Extract main content more robustly
            // If it's a partial, it might be directly in the body of the parsed document
            const mainContent = doc.querySelector('[data-router-view]') ||
                doc.querySelector('main') ||
                (doc.body.children.length > 0 ? doc.body : null);

            if (!mainContent) {
                console.error('No content found in component:', route.component);
                await this.loadError();
                return;
            }

            // Clear current content and set new HTML
            console.log('Injecting HTML to main-content');

            // Ensure appContent is available
            if (!this.appContent) this.appContent = document.getElementById('main-content');
            if (!this.appContent) {
                console.error('Critical Router Error: #main-content container not found');
                return;
            }

            // Handle layouts
            const navbarContainer = document.getElementById('navbar-container');
            const footerContainer = document.getElementById('footer-container');

            if (route.path.startsWith('/admin')) {
                if (navbarContainer) navbarContainer.style.display = 'none';
                if (footerContainer) footerContainer.style.display = 'none';
                // Take everything inside #app or body if it's a full page
                const fullContent = doc.querySelector('#app') || doc.body;
                this.appContent.innerHTML = fullContent.innerHTML;
            } else {
                if (navbarContainer) navbarContainer.style.display = 'block';
                if (footerContainer) footerContainer.style.display = 'block';
                this.appContent.innerHTML = mainContent.innerHTML;
            }

            // Remove loading class
            document.body.classList.remove('router-loading');

            // CRITICAL: Hide the initial page loader after content loads
            const pageLoader = document.querySelector('.page-loader');
            if (pageLoader) {
                pageLoader.style.display = 'none';
            }

            // Execute page-specific JavaScript
            await this.executePageScript(route);

            // Dispatch route change event
            this.dispatchRouteChange(route);

        } catch (error) {
            console.error('Failed to load route:', error);
            await this.loadError();
        }
    }

    async fetchComponent(component) {
        // If component is a function, execute it
        if (typeof component === 'function') {
            return await component();
        }

        // If component is a string URL, fetch it
        if (typeof component === 'string' && !component.trim().startsWith('<')) {
            // Check if we should bypass cache (always in development)
            const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

            if (!isDevelopment && this.cache.has(component)) {
                return this.cache.get(component);
            }

            // Add cache-busting timestamp in development
            const url = isDevelopment ? `${component}?t=${Date.now()}` : component;

            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch ${component}`);
            const html = await response.text();

            // Cache the result (only if not in development)
            if (!isDevelopment) {
                this.cache.set(component, html);
            }
            return html;
        }

        // If component is HTML string, return it
        if (typeof component === 'string') {
            return component;
        }

        throw new Error('Invalid component format');
    }

    matchRoute(path) {
        path = this.normalizePath(path);

        // Exact match
        let route = this.routes.find(r => r.path === path);
        if (route) return route;

        // Parameterized match (e.g., /blog/:id)
        for (const route of this.routes) {
            if (route.path.includes(':')) {
                const routeParts = route.path.split('/');
                const pathParts = path.split('/');

                if (routeParts.length !== pathParts.length) continue;

                let match = true;
                const params = {};

                for (let i = 0; i < routeParts.length; i++) {
                    if (routeParts[i].startsWith(':')) {
                        const paramName = routeParts[i].substring(1);
                        params[paramName] = pathParts[i];
                    } else if (routeParts[i] !== pathParts[i]) {
                        match = false;
                        break;
                    }
                }

                if (match) {
                    return { ...route, params };
                }
            }
        }

        return null;
    }

    normalizePath(path) {
        // Remove query string and hash
        path = path.split('?')[0].split('#')[0];

        // Ensure path starts with /
        if (!path.startsWith('/')) path = '/' + path;

        // Remove trailing slash (except for root)
        if (path.length > 1 && path.endsWith('/')) {
            path = path.slice(0, -1);
        }

        return path;
    }

    updateActiveLink(path) {
        // Remove active class from all links
        document.querySelectorAll('[data-router-link]').forEach(link => {
            link.classList.remove('active');
        });

        // Add active class to current link
        const activeLink = document.querySelector(`[data-router-link="${path}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    async executePageScript(route) {
        // Look for page-specific script
        const scriptElement = this.appContent.querySelector('script[data-page]');

        if (scriptElement) {
            try {
                // Create new script element
                const newScript = document.createElement('script');
                newScript.type = 'module';
                newScript.textContent = scriptElement.textContent;

                // Execute script
                document.head.appendChild(newScript);
                document.head.removeChild(newScript);

            } catch (error) {
                console.error('Failed to execute page script:', error);
            }
        }

        // Also look for external script modules
        const componentPath = route.component;
        const pageName = componentPath.split('/').pop().replace('.html', '');
        let pageModule;

        if (componentPath.startsWith('/admin/')) {
            pageModule = `../admin/${pageName}.js`;
        } else {
            pageModule = `../pages/${pageName}.js`;
        }

        try {
            const module = await import(pageModule);
            // Wait for a tick to ensure DOM is updated
            setTimeout(() => {
                if (module.default && typeof module.default === 'function') {
                    new module.default();
                }
            }, 0);
        } catch (error) {
            // It's okay if page module doesn't exist
            if (!error.message.includes('Failed to fetch')) {
                console.error(`Failed to load page module ${pageModule}:`, error);
            }
        }
    }

    dispatchRouteChange(route) {
        const event = new CustomEvent('routechange', {
            detail: { route }
        });
        window.dispatchEvent(event);
    }

    redirectToLogin() {
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
    }

    async load404() {
        try {
            if (!this.appContent) this.appContent = document.getElementById('main-content');

            const response = await fetch('/pages/404.html');
            if (!response.ok) throw new Error('404 page not found');
            const html = await response.text();

            if (this.appContent) {
                this.appContent.innerHTML = html;
            }
            document.title = 'Page Not Found | Abroad Khabar';
        } catch (e) {
            console.error('Failed to load 404 page:', e);
            if (this.appContent) {
                this.appContent.innerHTML = '<h1>Page Not Found</h1>';
            }
            document.title = '404 | Abroad Khabar';
        }
    }

    async load403() {
        const response = await fetch('/pages/403.html');
        const html = await response.text();
        this.appContent.innerHTML = html;
        document.title = 'Access Denied | Abroad Khabar';
    }

    async loadError() {
        const html = `
            <div class="error-page">
                <div class="error-content">
                    <h1>Something went wrong</h1>
                    <p>We're having trouble loading this page. Please try again.</p>
                    <button onclick="window.location.reload()">Reload Page</button>
                </div>
            </div>
        `;
        if (this.appContent) {
            this.appContent.innerHTML = html;
        } else {
            const container = document.getElementById('main-content');
            if (container) container.innerHTML = html;
        }
        document.title = 'Error | Abroad Khabar';
    }

    // Helper method to generate routes from page structure
    generateRoutes() {
        // Public pages
        this.registerRoute('/', '/pages/home.html', { title: 'Home | Abroad Khabar' });
        this.registerRoute('/about', '/pages/about.html', { title: 'About Us | Abroad Khabar' });
        this.registerRoute('/services', '/pages/services.html', { title: 'Services | Abroad Khabar' });
        this.registerRoute('/services/:id', '/pages/service-detail.html', { title: 'Service Details | Abroad Khabar' });
        this.registerRoute('/countries', '/pages/countries.html', { title: 'Countries | Abroad Khabar' });
        this.registerRoute('/videos', '/pages/videos.html', { title: 'Videos | Abroad Khabar' });
        this.registerRoute('/videos/:id', '/pages/video-detail.html', { title: 'Video Details | Abroad Khabar' });
        this.registerRoute('/blogs', '/pages/blogs.html', { title: 'Blogs | Abroad Khabar' });
        this.registerRoute('/blogs/:id', '/pages/blog-detail.html', { title: 'Blog Post | Abroad Khabar' });
        this.registerRoute('/contact', '/pages/contact.html', { title: 'Contact Us | Abroad Khabar' });
        this.registerRoute('/login', '/pages/login.html', { title: 'Login | Abroad Khabar' });

        // Admin pages (protected)
        this.registerRoute('/admin/dashboard', '/admin/dashboard.html', {
            title: 'Dashboard | Admin',
            requiresAuth: true,
            requiredRoles: ['admin', 'editor']
        });
        this.registerRoute('/admin/videos', '/admin/videos.html', {
            title: 'Video Manager | Admin',
            requiresAuth: true,
            requiredRoles: ['admin', 'editor']
        });
        this.registerRoute('/admin/images', '/admin/images.html', {
            title: 'Image Manager | Admin',
            requiresAuth: true,
            requiredRoles: ['admin', 'editor']
        });
        this.registerRoute('/admin/ads', '/admin/ads.html', {
            title: 'Ad Manager | Admin',
            requiresAuth: true,
            requiredRoles: ['admin']
        });
        this.registerRoute('/admin/blogs', '/admin/blogs.html', {
            title: 'Blog Manager | Admin',
            requiresAuth: true,
            requiredRoles: ['admin', 'editor']
        });
        this.registerRoute('/admin/services', '/admin/services.html', {
            title: 'Service Manager | Admin',
            requiresAuth: true,
            requiredRoles: ['admin', 'editor']
        });


    }

    // Get current route parameters
    getParams() {
        return this.currentRoute?.params || {};
    }

    // Get query parameters
    getQueryParams() {
        const params = {};
        const queryString = window.location.search.substring(1);
        const pairs = queryString.split('&');

        pairs.forEach(pair => {
            const [key, value] = pair.split('=');
            if (key) {
                params[decodeURIComponent(key)] = decodeURIComponent(value || '');
            }
        });

        return params;
    }

    // Navigate with query parameters
    navigateWithQuery(path, queryParams = {}) {
        const queryString = new URLSearchParams(queryParams).toString();
        const url = queryString ? `${path}?${queryString}` : path;
        this.navigate(url);
    }
}

// Create singleton instance
const router = new Router();

// Export for module usage
export default router;

// Export helper methods
export const {
    navigate,
    navigateWithQuery,
    getParams,
    getQueryParams,
    registerRoute
} = router;

// SPA-like Router with History API
import { showLoader, hideLoader } from '../components/loader.js';
import { closeAllModals } from '../components/modal.js';
import auth from './auth.js';

class Router {
    constructor() {
        this.routes = [];
        this.currentRoute = null;
        this.appContent = document.getElementById('app-content');
        this.initEventListeners();
    }

    init() {
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
            title: options.title || 'EduConsult',
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
            // If route is a string, match it first
            if (typeof route === 'string') {
                route = this.matchRoute(route);
                if (!route) {
                    await this.load404();
                    return;
                }
            }

            this.currentRoute = route;

            // Load the component
            const html = await this.fetchComponent(route.component);
            
            // Parse and render
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Extract main content
            const mainContent = doc.querySelector('[data-router-view]') || 
                               doc.querySelector('main') || 
                               doc.body;
            
            // Clear current content
            this.appContent.innerHTML = '';
            
            // Append new content
            this.appContent.appendChild(mainContent.cloneNode(true));
            
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
        if (typeof component === 'string') {
            const response = await fetch(component);
            if (!response.ok) throw new Error(`Failed to fetch ${component}`);
            return await response.text();
        }
        
        // If component is HTML string, return it
        if (typeof component === 'string' && component.trim().startsWith('<')) {
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
        const pageName = route.component.split('/').pop().replace('.html', '');
        const pageModule = `./pages/${pageName}.js`;
        
        try {
            const module = await import(pageModule);
            if (module.default && typeof module.default === 'function') {
                await module.default();
            }
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
        window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
    }

    async load404() {
        const response = await fetch('/pages/404.html');
        const html = await response.text();
        this.appContent.innerHTML = html;
        document.title = 'Page Not Found | EduConsult';
    }

    async load403() {
        const response = await fetch('/pages/403.html');
        const html = await response.text();
        this.appContent.innerHTML = html;
        document.title = 'Access Denied | EduConsult';
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
        this.appContent.innerHTML = html;
        document.title = 'Error | EduConsult';
    }

    // Helper method to generate routes from page structure
    generateRoutes() {
        // Public pages
        this.registerRoute('/', '/pages/index.html', { title: 'Home | EduConsult' });
        this.registerRoute('/about', '/pages/about.html', { title: 'About Us | EduConsult' });
        this.registerRoute('/services', '/pages/services.html', { title: 'Services | EduConsult' });
        this.registerRoute('/services/:id', '/pages/service-detail.html', { title: 'Service Details | EduConsult' });
        this.registerRoute('/countries', '/pages/countries.html', { title: 'Countries | EduConsult' });
        this.registerRoute('/videos', '/pages/videos.html', { title: 'Videos | EduConsult' });
        this.registerRoute('/videos/:id', '/pages/video-detail.html', { title: 'Video Details | EduConsult' });
        this.registerRoute('/blogs', '/pages/blogs.html', { title: 'Blogs | EduConsult' });
        this.registerRoute('/blogs/:id', '/pages/blog-detail.html', { title: 'Blog Post | EduConsult' });
        this.registerRoute('/contact', '/pages/contact.html', { title: 'Contact Us | EduConsult' });
        this.registerRoute('/login', '/pages/login.html', { title: 'Login | EduConsult' });

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

        // 404 catch-all
        this.registerRoute('*', this.load404.bind(this));
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
import toast from '../components/toast.js';

const prefersReducedMotion = () => {
    try {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
        return false;
    }
};

class ReadingProgressBar {
    constructor() {
        this.el = null;
        this.onScroll = this.onScroll.bind(this);
    }

    ensure() {
        if (this.el) return;
        const bar = document.createElement('div');
        bar.className = 'reading-progress';
        bar.setAttribute('aria-hidden', 'true');
        document.body.appendChild(bar);
        this.el = bar;
    }

    enable() {
        this.ensure();
        this.el.style.display = 'block';
        window.addEventListener('scroll', this.onScroll, { passive: true });
        this.onScroll();
    }

    disable() {
        if (!this.el) return;
        window.removeEventListener('scroll', this.onScroll);
        this.el.style.display = 'none';
        this.el.style.width = '0%';
    }

    onScroll() {
        if (!this.el) return;
        const doc = document.documentElement;
        const scrollTop = doc.scrollTop || document.body.scrollTop;
        const scrollHeight = doc.scrollHeight - doc.clientHeight;
        const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
        this.el.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    }
}

class NetworkStatus {
    constructor() {
        this.lastOnline = navigator.onLine;
    }

    init() {
        window.addEventListener('online', () => {
            if (!this.lastOnline) {
                toast.success('Back online');
            }
            this.lastOnline = true;
        });

        window.addEventListener('offline', () => {
            toast.warning('You are offline. Some features may not work.');
            this.lastOnline = false;
        });
    }
}

const readingProgress = new ReadingProgressBar();
const networkStatus = new NetworkStatus();

function isBlogDetailRoute(route) {
    // Supports both:
    // - SPA route: /blogs/:id (if used)
    // - Static detail page route: /blogs/<something> or when blog-detail template is loaded
    // Our router uses /blogs/:id -> /pages/blog-detail.html
    return route?.path === '/blogs/:id' || route?.path === '/blogs' || (window.location.pathname.startsWith('/blogs/') && window.location.pathname !== '/blogs');
}

export function initRouteEnhancers(router) {
    networkStatus.init();

    // Route change hook (emitted by router.js)
    window.addEventListener('routechange', (e) => {
        const route = e.detail?.route;

        // Ensure these data attributes exist for CSS hooks
        document.body.dataset.routeScope = route?.path?.startsWith('/admin') ? 'admin' : 'public';

        // Reading progress only for blog detail pages
        if (isBlogDetailRoute(route) && !prefersReducedMotion()) {
            readingProgress.enable();
        } else {
            readingProgress.disable();
        }
    });
}

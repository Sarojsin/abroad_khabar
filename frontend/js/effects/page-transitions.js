const prefersReducedMotion = () => {
    try {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
        return false;
    }
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function initPageTransitions(router) {
    if (!router) return;

    const getMain = () => document.getElementById('main-content');

    let isFirstNavigation = true;

    router._navDirection = 'forward';

    window.addEventListener('popstate', () => {
        router._navDirection = 'back';
    });

    const originalNavigate = router.navigate.bind(router);

    router.navigate = async (path, pushState = true) => {
        const main = getMain();
        const route = router.matchRoute(path);

        if (route) {
            document.body.dataset.routeScope = route.path.startsWith('/admin') ? 'admin' : 'public';
        }

        document.body.dataset.navDirection = pushState ? 'forward' : (router._navDirection || 'back');

        const reduced = prefersReducedMotion();

        // First navigation (initial page load): skip exit animation
        if (!isFirstNavigation && main && !reduced) {
            main.classList.remove('page-transition-enter', 'page-transition-enter-active', 'page-transition-exit', 'page-transition-exit-active');
            main.classList.add('page-transition-exit');
            requestAnimationFrame(() => main.classList.add('page-transition-exit-active'));
            await wait(180);
        }

        await originalNavigate(path, pushState);

        if (main && !reduced) {
            main.classList.remove('page-transition-exit', 'page-transition-exit-active');
            main.classList.add('page-transition-enter');
            requestAnimationFrame(() => main.classList.add('page-transition-enter-active'));
            setTimeout(() => {
                main.classList.remove('page-transition-enter', 'page-transition-enter-active');
            }, 320);
        }

        isFirstNavigation = false;

        router._navDirection = 'forward';
        document.body.dataset.navDirection = 'forward';
    };
}

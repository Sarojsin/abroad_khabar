const prefersReducedMotion = () => {
    try {
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
        return false;
    }
};

function shouldApplyRipple(target) {
    if (!target) return false;
    if (target.disabled) return false;
    if (target.getAttribute('aria-disabled') === 'true') return false;
    return true;
}

function attachRippleHost(el) {
    if (!el.classList.contains('ripple-host')) {
        el.classList.add('ripple-host');
    }
}

function createRipple(el, clientX, clientY) {
    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const x = clientX - rect.left - size / 2;
    const y = clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    el.appendChild(ripple);

    const cleanup = () => ripple.remove();
    ripple.addEventListener('animationend', cleanup, { once: true });
    setTimeout(cleanup, 800);
}

export function initRippleEffects() {
    document.addEventListener('pointerdown', (e) => {
        if (prefersReducedMotion()) return;

        const target = e.target.closest('[data-ripple], .btn, .modal-btn, .navbar-link, .auth-btn');
        if (!shouldApplyRipple(target)) return;

        attachRippleHost(target);
        createRipple(target, e.clientX, e.clientY);
    }, { passive: true });
}

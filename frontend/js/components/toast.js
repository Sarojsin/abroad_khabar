class ToastManager {
    constructor() {
        this.container = null;
        this.ensureContainer();
    }

    ensureContainer() {
        if (this.container) return;
        const el = document.createElement('div');
        el.className = 'toast-container';
        el.setAttribute('role', 'region');
        el.setAttribute('aria-live', 'polite');
        el.setAttribute('aria-label', 'Notifications');
        document.body.appendChild(el);
        this.container = el;
    }

    show(message, options = {}) {
        const type = options.type || 'info';
        const duration = typeof options.duration === 'number' ? options.duration : 3200;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

        toast.innerHTML = `
            <div class="toast-bar"></div>
            <div class="toast-message"></div>
            <button class="toast-close" type="button" aria-label="Dismiss notification">&times;</button>
        `;

        toast.querySelector('.toast-message').textContent = message;

        const closeBtn = toast.querySelector('.toast-close');
        const close = () => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 250);
        };

        closeBtn.addEventListener('click', close);

        this.container.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add('show'));

        if (duration > 0) {
            setTimeout(close, duration);
        }

        return { close };
    }

    success(message, options = {}) { return this.show(message, { ...options, type: 'success' }); }
    error(message, options = {}) { return this.show(message, { ...options, type: 'error' }); }
    warning(message, options = {}) { return this.show(message, { ...options, type: 'warning' }); }
    info(message, options = {}) { return this.show(message, { ...options, type: 'info' }); }
}

const toast = new ToastManager();

export function initToastSystem() {
    return toast;
}

export default toast;

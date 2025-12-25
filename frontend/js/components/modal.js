// Modal System
class Modal {
    constructor(options = {}) {
        this.id = options.id || `modal-${Date.now()}`;
        this.title = options.title || '';
        this.content = options.content || '';
        this.size = options.size || 'md'; // sm, md, lg, xl, fullscreen
        this.animation = options.animation || 'scale-up';
        this.backdrop = options.backdrop !== false;
        this.closeOnBackdrop = options.closeOnBackdrop !== false;
        this.closeOnEsc = options.closeOnEsc !== false;
        this.showCloseButton = options.showCloseButton !== false;
        this.buttons = options.buttons || [];
        this.onOpen = options.onOpen || null;
        this.onClose = options.onClose || null;
        this.onConfirm = options.onConfirm || null;
        this.data = options.data || {};
        
        this.modalContainer = null;
        this.modalElement = null;
        this.isOpen = false;
        
        this.init();
    }

    init() {
        this.createModal();
        this.bindEvents();
    }

    createModal() {
        // Create modal container
        this.modalContainer = document.createElement('div');
        this.modalContainer.className = 'modal-overlay';
        this.modalContainer.id = this.id;
        
        // Determine size class
        const sizeClass = `modal-${this.size}`;
        
        // Build modal HTML
        this.modalContainer.innerHTML = `
            <div class="modal-container ${sizeClass} ${this.animation}">
                ${this.title || this.showCloseButton ? `
                    <div class="modal-header">
                        ${this.title ? `<h3 class="modal-title">${this.title}</h3>` : ''}
                        ${this.showCloseButton ? `
                            <button class="modal-close" aria-label="Close modal">
                                <i class="fas fa-times"></i>
                            </button>
                        ` : ''}
                    </div>
                ` : ''}
                
                <div class="modal-body">
                    ${typeof this.content === 'string' ? this.content : ''}
                </div>
                
                ${this.buttons.length > 0 ? `
                    <div class="modal-footer">
                        ${this.buttons.map((btn, index) => `
                            <button class="modal-btn ${btn.type || 'secondary'}" 
                                    data-action="${btn.action || 'close'}"
                                    data-index="${index}">
                                ${btn.label}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
        
        // If content is a DOM element, append it
        if (this.content instanceof Element) {
            const modalBody = this.modalContainer.querySelector('.modal-body');
            modalBody.innerHTML = '';
            modalBody.appendChild(this.content);
        }
    }

    bindEvents() {
        const closeBtn = this.modalContainer.querySelector('.modal-close');
        const backdrop = this.modalContainer;
        const actionButtons = this.modalContainer.querySelectorAll('[data-action]');
        
        // Close button
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
        
        // Backdrop click
        if (this.closeOnBackdrop) {
            backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) {
                    this.close();
                }
            });
        }
        
        // Escape key
        if (this.closeOnEsc) {
            document.addEventListener('keydown', this.handleKeydown.bind(this));
        }
        
        // Action buttons
        actionButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.getAttribute('data-action');
                const index = e.target.getAttribute('data-index');
                
                this.handleAction(action, index);
            });
        });
    }

    handleKeydown(e) {
        if (e.key === 'Escape' && this.isOpen) {
            this.close();
        }
    }

    handleAction(action, index) {
        switch (action) {
            case 'confirm':
                if (this.onConfirm) {
                    const result = this.onConfirm(this.data);
                    if (result !== false) {
                        this.close();
                    }
                } else {
                    this.close();
                }
                break;
                
            case 'close':
                this.close();
                break;
                
            default:
                const button = this.buttons[index];
                if (button && button.onClick) {
                    button.onClick(this);
                }
                break;
        }
    }

    open() {
        if (this.isOpen) return;
        
        // Add to DOM
        document.body.appendChild(this.modalContainer);
        
        // Trigger animation
        requestAnimationFrame(() => {
            this.modalContainer.classList.add('active');
            this.isOpen = true;
            
            // Call onOpen callback
            if (this.onOpen) {
                this.onOpen(this);
            }
            
            // Dispatch custom event
            const event = new CustomEvent('modalopen', { detail: this });
            document.dispatchEvent(event);
        });
        
        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    close() {
        if (!this.isOpen) return;
        
        // Trigger close animation
        this.modalContainer.classList.remove('active');
        
        // Remove from DOM after animation
        setTimeout(() => {
            if (this.modalContainer.parentElement) {
                document.body.removeChild(this.modalContainer);
            }
            
            this.isOpen = false;
            
            // Call onClose callback
            if (this.onClose) {
                this.onClose(this);
            }
            
            // Dispatch custom event
            const event = new CustomEvent('modalclose', { detail: this });
            document.dispatchEvent(event);
            
            // Restore body scroll
            document.body.style.overflow = '';
        }, 300);
    }

    updateContent(content) {
        this.content = content;
        const modalBody = this.modalContainer.querySelector('.modal-body');
        
        if (modalBody) {
            if (typeof content === 'string') {
                modalBody.innerHTML = content;
            } else if (content instanceof Element) {
                modalBody.innerHTML = '';
                modalBody.appendChild(content);
            }
        }
    }

    updateTitle(title) {
        this.title = title;
        const titleElement = this.modalContainer.querySelector('.modal-title');
        
        if (titleElement) {
            titleElement.textContent = title;
        }
    }

    showLoading() {
        const loadingHtml = `
            <div class="loading-modal">
                <div class="loading-spinner"></div>
                <p class="loading-text">Loading...</p>
            </div>
        `;
        this.updateContent(loadingHtml);
    }

    showSuccess(message) {
        const successHtml = `
            <div class="alert-modal">
                <div class="alert-icon success">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h3 class="alert-title">Success!</h3>
                <p class="alert-message">${message}</p>
                <div class="modal-footer">
                    <button class="modal-btn primary" data-action="close">OK</button>
                </div>
            </div>
        `;
        this.updateContent(successHtml);
    }

    showError(message) {
        const errorHtml = `
            <div class="alert-modal">
                <div class="alert-icon error">
                    <i class="fas fa-exclamation-circle"></i>
                </div>
                <h3 class="alert-title">Error</h3>
                <p class="alert-message">${message}</p>
                <div class="modal-footer">
                    <button class="modal-btn primary" data-action="close">OK</button>
                </div>
            </div>
        `;
        this.updateContent(errorHtml);
    }

    // Static methods for common modal types
    static confirm(options) {
        const modal = new Modal({
            title: options.title || 'Confirm',
            content: options.message || 'Are you sure?',
            buttons: [
                {
                    label: options.cancelLabel || 'Cancel',
                    type: 'secondary',
                    action: 'close'
                },
                {
                    label: options.confirmLabel || 'Confirm',
                    type: 'primary',
                    action: 'confirm'
                }
            ],
            onConfirm: options.onConfirm,
            onClose: options.onClose,
            data: options.data
        });
        
        modal.open();
        return modal;
    }

    static alert(options) {
        const modal = new Modal({
            title: options.title || 'Alert',
            content: options.message || '',
            buttons: [
                {
                    label: options.buttonLabel || 'OK',
                    type: 'primary',
                    action: 'close'
                }
            ],
            onClose: options.onClose
        });
        
        modal.open();
        return modal;
    }

    static prompt(options) {
        const inputId = `prompt-input-${Date.now()}`;
        const content = `
            <div class="prompt-modal">
                <p class="prompt-message">${options.message || ''}</p>
                <div class="form-group">
                    <label for="${inputId}" class="form-label">${options.label || 'Enter value:'}</label>
                    <input type="${options.type || 'text'}" 
                           id="${inputId}" 
                           class="form-control"
                           value="${options.defaultValue || ''}"
                           placeholder="${options.placeholder || ''}"
                           ${options.required ? 'required' : ''}>
                </div>
            </div>
        `;
        
        const modal = new Modal({
            title: options.title || 'Prompt',
            content: content,
            buttons: [
                {
                    label: options.cancelLabel || 'Cancel',
                    type: 'secondary',
                    action: 'close'
                },
                {
                    label: options.confirmLabel || 'OK',
                    type: 'primary',
                    action: 'confirm'
                }
            ],
            onConfirm: (modal) => {
                const input = document.getElementById(inputId);
                if (options.onConfirm) {
                    return options.onConfirm(input.value, modal);
                }
                return true;
            },
            onClose: options.onClose
        });
        
        modal.open();
        return modal;
    }

    static loading(options = {}) {
        const modal = new Modal({
            title: options.title,
            content: `
                <div class="loading-modal">
                    <div class="loading-spinner"></div>
                    <p class="loading-text">${options.message || 'Loading...'}</p>
                </div>
            `,
            showCloseButton: false,
            closeOnBackdrop: false,
            closeOnEsc: false,
            buttons: []
        });
        
        modal.open();
        return modal;
    }
}

// Modal Manager
class ModalManager {
    constructor() {
        this.modals = new Map();
        this.init();
    }

    init() {
        // Global event listeners for data-modal attributes
        document.addEventListener('click', (e) => {
            const modalTrigger = e.target.closest('[data-modal]');
            if (modalTrigger) {
                e.preventDefault();
                this.handleModalTrigger(modalTrigger);
            }
        });
    }

    handleModalTrigger(element) {
        const modalType = element.getAttribute('data-modal');
        const modalId = element.getAttribute('data-modal-id');
        const modalOptions = this.parseDataAttributes(element);
        
        switch (modalType) {
            case 'confirm':
                Modal.confirm(modalOptions);
                break;
            case 'alert':
                Modal.alert(modalOptions);
                break;
            case 'prompt':
                Modal.prompt(modalOptions);
                break;
            case 'loading':
                Modal.loading(modalOptions);
                break;
            default:
                if (modalId) {
                    this.openById(modalId, modalOptions);
                }
                break;
        }
    }

    parseDataAttributes(element) {
        const options = {};
        const attributes = element.dataset;
        
        Object.keys(attributes).forEach(key => {
            if (key.startsWith('modal')) {
                const optionKey = key.replace('modal', '').replace(/^./, c => c.toLowerCase());
                let value = attributes[key];
                
                // Parse JSON values
                if (value && (value.startsWith('{') || value.startsWith('['))) {
                    try {
                        value = JSON.parse(value);
                    } catch (e) {
                        // Keep as string if not valid JSON
                    }
                }
                
                // Convert string booleans
                if (value === 'true') value = true;
                if (value === 'false') value = false;
                
                options[optionKey] = value;
            }
        });
        
        return options;
    }

    register(id, modal) {
        this.modals.set(id, modal);
    }

    openById(id, options = {}) {
        const modal = this.modals.get(id);
        if (modal) {
            Object.assign(modal, options);
            modal.open();
            return modal;
        }
        return null;
    }

    closeById(id) {
        const modal = this.modals.get(id);
        if (modal) {
            modal.close();
        }
    }

    closeAll() {
        this.modals.forEach(modal => {
            if (modal.isOpen) {
                modal.close();
            }
        });
    }

    getById(id) {
        return this.modals.get(id);
    }

    // Create modal from HTML template
    createFromTemplate(templateId, options = {}) {
        const template = document.getElementById(templateId);
        if (!template) {
            console.error(`Template not found: ${templateId}`);
            return null;
        }
        
        const content = template.content.cloneNode(true);
        const modal = new Modal({
            ...options,
            content: content
        });
        
        return modal;
    }
}

// Create global modal manager
const modalManager = new ModalManager();

// Initialize modal system
export function initModalSystem() {
    return modalManager;
}

// Export for module usage
export default Modal;

// Export helper methods
export const {
    register,
    openById,
    closeById,
    closeAll,
    getById,
    createFromTemplate
} = modalManager;

// Export static methods
export const {
    confirm,
    alert,
    prompt,
    loading
} = Modal;

// Alias for closeAll
export const closeAllModals = modalManager.closeAll.bind(modalManager);

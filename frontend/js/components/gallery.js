// Gallery Component with Lightbox
class Gallery {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' 
            ? document.querySelector(container) 
            : container;
        
        this.options = {
            items: options.items || [],
            columns: options.columns || 4,
            spacing: options.spacing || 16,
            masonry: options.masonry || false,
            lazyLoad: options.lazyLoad || true,
            lightbox: options.lightbox !== false,
            captions: options.captions || true,
            filters: options.filters || false,
            sortable: options.sortable || false,
            onItemClick: options.onItemClick || null,
            onLightboxOpen: options.onLightboxOpen || null,
            onLightboxClose: options.onLightboxClose || null,
            ...options
        };
        
        this.items = [];
        this.filteredItems = [];
        this.activeFilter = 'all';
        this.currentIndex = 0;
        this.lightbox = null;
        this.init();
    }

    async init() {
        if (!this.container) {
            console.error('Gallery container not found');
            return;
        }
        
        await this.loadItems();
        this.render();
        this.bindEvents();
        
        if (this.options.lightbox) {
            this.createLightbox();
        }
    }

    async loadItems() {
        // If items are provided in options, use them
        if (this.options.items && this.options.items.length > 0) {
            this.items = this.options.items;
            this.filteredItems = [...this.items];
            return;
        }
        
        // Otherwise, look for data attributes or child elements
        const itemElements = this.container.querySelectorAll('[data-gallery-item]');
        
        if (itemElements.length > 0) {
            this.items = Array.from(itemElements).map(element => ({
                id: element.getAttribute('data-id') || Date.now() + Math.random(),
                src: element.getAttribute('data-src') || element.src,
                thumbnail: element.getAttribute('data-thumbnail') || element.src,
                title: element.getAttribute('data-title') || '',
                description: element.getAttribute('data-description') || '',
                category: element.getAttribute('data-category') || 'all',
                element: element
            }));
        }
        
        this.filteredItems = [...this.items];
    }

    render() {
        // Clear container
        this.container.innerHTML = '';
        
        // Add filters if enabled
        if (this.options.filters) {
            this.renderFilters();
        }
        
        // Create gallery grid
        const galleryElement = document.createElement('div');
        galleryElement.className = `gallery ${this.options.masonry ? 'gallery-masonry' : 'gallery-grid'}`;
        galleryElement.style.display = 'grid';
        galleryElement.style.gap = `${this.options.spacing}px`;
        
        if (!this.options.masonry) {
            galleryElement.style.gridTemplateColumns = `repeat(${this.options.columns}, 1fr)`;
        }
        
        // Add items
        this.filteredItems.forEach((item, index) => {
            const itemElement = this.createItemElement(item, index);
            galleryElement.appendChild(itemElement);
        });
        
        this.container.appendChild(galleryElement);
        
        // Initialize masonry layout if needed
        if (this.options.masonry) {
            this.initMasonry(galleryElement);
        }
        
        // Initialize lazy loading if enabled
        if (this.options.lazyLoad) {
            this.initLazyLoading();
        }
    }

    createItemElement(item, index) {
        const itemElement = document.createElement('div');
        itemElement.className = 'gallery-item';
        itemElement.setAttribute('data-index', index);
        itemElement.setAttribute('data-category', item.category);
        
        if (this.options.masonry) {
            // For masonry, set random span
            const span = Math.floor(Math.random() * 20) + 15;
            itemElement.style.setProperty('--span', span);
            itemElement.classList.add('grid-item-masonry');
        }
        
        const img = document.createElement('img');
        img.className = 'gallery-img';
        img.alt = item.title || item.description || 'Gallery image';
        
        if (this.options.lazyLoad) {
            img.setAttribute('data-src', item.thumbnail || item.src);
            img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E';
            img.classList.add('lazy');
        } else {
            img.src = item.thumbnail || item.src;
        }
        
        itemElement.appendChild(img);
        
        // Add overlay with caption if enabled
        if (this.options.captions && (item.title || item.description)) {
            const overlay = document.createElement('div');
            overlay.className = 'gallery-overlay';
            
            if (item.title) {
                const title = document.createElement('h3');
                title.className = 'gallery-title';
                title.textContent = item.title;
                overlay.appendChild(title);
            }
            
            if (item.description) {
                const description = document.createElement('p');
                description.className = 'gallery-description';
                description.textContent = item.description;
                overlay.appendChild(description);
            }
            
            // Add actions
            const actions = document.createElement('div');
            actions.className = 'gallery-actions';
            
            if (this.options.lightbox) {
                const viewBtn = document.createElement('button');
                viewBtn.className = 'gallery-btn';
                viewBtn.innerHTML = '<i class="fas fa-expand"></i>';
                viewBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.openLightbox(index);
                });
                actions.appendChild(viewBtn);
            }
            
            overlay.appendChild(actions);
            itemElement.appendChild(overlay);
        }
        
        // Add click handler
        itemElement.addEventListener('click', () => {
            if (this.options.onItemClick) {
                this.options.onItemClick(item, index);
            }
            
            if (this.options.lightbox) {
                this.openLightbox(index);
            }
        });
        
        return itemElement;
    }

    renderFilters() {
        // Get unique categories
        const categories = ['all', ...new Set(this.items.map(item => item.category))];
        
        const filterContainer = document.createElement('div');
        filterContainer.className = 'gallery-filters';
        
        categories.forEach(category => {
            const filter = document.createElement('button');
            filter.className = `gallery-filter ${category === 'all' ? 'active' : ''}`;
            filter.textContent = category === 'all' ? 'All' : category;
            filter.setAttribute('data-filter', category);
            
            filter.addEventListener('click', () => {
                this.filterByCategory(category);
                
                // Update active filter
                filterContainer.querySelectorAll('.gallery-filter').forEach(f => {
                    f.classList.remove('active');
                });
                filter.classList.add('active');
            });
            
            filterContainer.appendChild(filter);
        });
        
        this.container.appendChild(filterContainer);
    }

    filterByCategory(category) {
        this.activeFilter = category;
        
        if (category === 'all') {
            this.filteredItems = [...this.items];
        } else {
            this.filteredItems = this.items.filter(item => item.category === category);
        }
        
        this.render();
    }

    initMasonry(container) {
        // Simple masonry implementation
        const items = container.querySelectorAll('.gallery-item');
        const columnHeights = new Array(this.options.columns).fill(0);
        
        items.forEach(item => {
            // Find column with minimum height
            const minHeight = Math.min(...columnHeights);
            const columnIndex = columnHeights.indexOf(minHeight);
            
            // Position item
            item.style.gridColumn = columnIndex + 1;
            item.style.gridRow = `span ${item.style.getPropertyValue('--span')}`;
            
            // Update column height (estimate based on span)
            const span = parseInt(item.style.getPropertyValue('--span'));
            columnHeights[columnIndex] += span * 10; // 10px per span unit
        });
    }

    initLazyLoading() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    const src = img.getAttribute('data-src');
                    
                    if (src) {
                        img.src = src;
                        img.classList.remove('lazy');
                        observer.unobserve(img);
                    }
                }
            });
        }, {
            rootMargin: '50px',
            threshold: 0.1
        });
        
        this.container.querySelectorAll('.lazy').forEach(img => {
            observer.observe(img);
        });
    }

    createLightbox() {
        if (this.lightbox) return;
        
        this.lightbox = document.createElement('div');
        this.lightbox.className = 'gallery-lightbox';
        this.lightbox.innerHTML = `
            <div class="lightbox-header">
                <h3 class="lightbox-title"></h3>
                <button class="lightbox-close" aria-label="Close lightbox">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="lightbox-body">
                <img class="lightbox-img" src="" alt="">
                
                <div class="lightbox-nav">
                    <button class="lightbox-btn prev" aria-label="Previous image">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                    <button class="lightbox-btn next" aria-label="Next image">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            </div>
            
            <div class="lightbox-footer">
                <p class="lightbox-description"></p>
                <div class="lightbox-counter">
                    <span class="current-index">1</span> / 
                    <span class="total-count">${this.filteredItems.length}</span>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.lightbox);
        this.bindLightboxEvents();
    }

    bindLightboxEvents() {
        if (!this.lightbox) return;
        
        const closeBtn = this.lightbox.querySelector('.lightbox-close');
        const prevBtn = this.lightbox.querySelector('.lightbox-btn.prev');
        const nextBtn = this.lightbox.querySelector('.lightbox-btn.next');
        const lightboxImg = this.lightbox.querySelector('.lightbox-img');
        
        // Close lightbox
        closeBtn.addEventListener('click', () => this.closeLightbox());
        
        // Navigation
        prevBtn.addEventListener('click', () => this.navigateLightbox(-1));
        nextBtn.addEventListener('click', () => this.navigateLightbox(1));
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (!this.lightbox.classList.contains('active')) return;
            
            switch (e.key) {
                case 'Escape':
                    this.closeLightbox();
                    break;
                case 'ArrowLeft':
                    this.navigateLightbox(-1);
                    break;
                case 'ArrowRight':
                    this.navigateLightbox(1);
                    break;
            }
        });
        
        // Swipe support for touch devices
        let touchStartX = 0;
        let touchEndX = 0;
        
        lightboxImg.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        });
        
        lightboxImg.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        });
    }

    openLightbox(index) {
        if (!this.lightbox) return;
        
        this.currentIndex = index;
        this.updateLightbox();
        
        this.lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        if (this.options.onLightboxOpen) {
            this.options.onLightboxOpen(this.filteredItems[index], index);
        }
    }

    closeLightbox() {
        if (!this.lightbox) return;
        
        this.lightbox.classList.remove('active');
        document.body.style.overflow = '';
        
        if (this.options.onLightboxClose) {
            this.options.onLightboxClose();
        }
    }

    navigateLightbox(direction) {
        const newIndex = this.currentIndex + direction;
        
        if (newIndex >= 0 && newIndex < this.filteredItems.length) {
            this.currentIndex = newIndex;
            this.updateLightbox();
        }
    }

    updateLightbox() {
        if (!this.lightbox) return;
        
        const item = this.filteredItems[this.currentIndex];
        const title = this.lightbox.querySelector('.lightbox-title');
        const description = this.lightbox.querySelector('.lightbox-description');
        const img = this.lightbox.querySelector('.lightbox-img');
        const currentIndex = this.lightbox.querySelector('.current-index');
        const totalCount = this.lightbox.querySelector('.total-count');
        const prevBtn = this.lightbox.querySelector('.lightbox-btn.prev');
        const nextBtn = this.lightbox.querySelector('.lightbox-btn.next');
        
        // Update content
        if (title) title.textContent = item.title || '';
        if (description) description.textContent = item.description || '';
        if (img) {
            img.src = item.src;
            img.alt = item.title || item.description || 'Gallery image';
        }
        
        // Update counter
        if (currentIndex) currentIndex.textContent = this.currentIndex + 1;
        if (totalCount) totalCount.textContent = this.filteredItems.length;
        
        // Update navigation buttons
        if (prevBtn) {
            prevBtn.disabled = this.currentIndex === 0;
        }
        
        if (nextBtn) {
            nextBtn.disabled = this.currentIndex === this.filteredItems.length - 1;
        }
    }

    handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                this.navigateLightbox(1); // Swipe left
            } else {
                this.navigateLightbox(-1); // Swipe right
            }
        }
    }

    // Public API
    addItem(item) {
        const newItem = {
            id: Date.now() + Math.random(),
            ...item
        };
        
        this.items.push(newItem);
        this.filteredItems.push(newItem);
        this.render();
    }

    removeItem(id) {
        this.items = this.items.filter(item => item.id !== id);
        this.filteredItems = this.filteredItems.filter(item => item.id !== id);
        this.render();
    }

    updateItem(id, updates) {
        const index = this.items.findIndex(item => item.id === id);
        if (index !== -1) {
            this.items[index] = { ...this.items[index], ...updates };
            
            const filteredIndex = this.filteredItems.findIndex(item => item.id === id);
            if (filteredIndex !== -1) {
                this.filteredItems[filteredIndex] = { ...this.filteredItems[filteredIndex], ...updates };
            }
            
            this.render();
        }
    }

    getItems() {
        return this.items;
    }

    getFilteredItems() {
        return this.filteredItems;
    }

    refresh() {
        this.render();
    }

    destroy() {
        // Remove lightbox
        if (this.lightbox && this.lightbox.parentElement) {
            document.body.removeChild(this.lightbox);
            this.lightbox = null;
        }
        
        // Clear container
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeydown);
    }

    // Static method to create gallery
    static create(container, options) {
        return new Gallery(container, options);
    }

    // Static method to initialize all galleries on page
    static initAll(selector = '[data-gallery]') {
        const elements = document.querySelectorAll(selector);
        const galleries = [];
        
        elements.forEach(element => {
            const options = JSON.parse(element.getAttribute('data-options') || '{}');
            const gallery = new Gallery(element, options);
            galleries.push(gallery);
        });
        
        return galleries;
    }
}

// Export for module usage
export default Gallery;

// Export static methods
export const {
    create,
    initAll
} = Gallery;

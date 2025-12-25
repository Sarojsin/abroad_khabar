/**
 * Advanced Filtering, Sorting & Search System
 */

class FilterSystem {
    constructor(container, options = {}) {
        this.container = container;
        this.items = Array.from(container.children);
        this.filters = {};
        this.sortBy = options.sortBy || 'default';
        this.searchTerm = '';
        this.debounceTimeout = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.cacheItemData();
    }

    cacheItemData() {
        this.itemsData = this.items.map(item => ({
            element: item,
            data: {
                title: item.dataset.title || '',
                category: item.dataset.category ? item.dataset.category.split(',') : [],
                tags: item.dataset.tags ? item.dataset.tags.split(',') : [],
                country: item.dataset.country || '',
                service: item.dataset.service || '',
                featured: item.dataset.featured === 'true',
                views: parseInt(item.dataset.views) || 0,
                date: item.dataset.date ? new Date(item.dataset.date) : new Date(),
                price: parseFloat(item.dataset.price) || 0,
                rating: parseFloat(item.dataset.rating) || 0
            }
        }));
    }

    setupEventListeners() {
        // Filter checkboxes/selects
        document.querySelectorAll('[data-filter]').forEach(filter => {
            filter.addEventListener('change', (e) => {
                const filterName = e.target.name;
                const filterValue = e.target.type === 'checkbox'
                    ? e.target.checked ? e.target.value : null
                    : e.target.value;

                this.updateFilter(filterName, filterValue);
                this.applyFilters();
            });
        });

        // Search input
        document.querySelectorAll('[data-search]').forEach(search => {
            search.addEventListener('input', (e) => {
                this.debounce(() => {
                    this.searchTerm = e.target.value.toLowerCase();
                    this.applyFilters();
                }, 300);
            });
        });

        // Sort select
        document.querySelectorAll('[data-sort]').forEach(sort => {
            sort.addEventListener('change', (e) => {
                this.sortBy = e.target.value;
                this.applyFilters();
            });
        });

        // Clear filters button
        document.querySelectorAll('[data-clear-filters]').forEach(button => {
            button.addEventListener('click', () => {
                this.clearFilters();
            });
        });
    }

    updateFilter(name, value) {
        if (value === null || value === '' || value === 'all') {
            delete this.filters[name];
        } else {
            this.filters[name] = value;
        }
    }

    applyFilters() {
        let filteredItems = [...this.itemsData];

        // Apply search
        if (this.searchTerm) {
            filteredItems = filteredItems.filter(item => {
                return item.data.title.toLowerCase().includes(this.searchTerm) ||
                    item.data.tags.some(tag => tag.toLowerCase().includes(this.searchTerm)) ||
                    item.data.category.some(cat => cat.toLowerCase().includes(this.searchTerm));
            });
        }

        // Apply filters
        Object.entries(this.filters).forEach(([filterName, filterValue]) => {
            filteredItems = filteredItems.filter(item => {
                if (Array.isArray(item.data[filterName])) {
                    return item.data[filterName].includes(filterValue);
                }
                return item.data[filterName] === filterValue;
            });
        });

        // Apply sorting
        filteredItems = this.sortItems(filteredItems);

        // Update URL with filter state
        this.updateURL();

        // Render results
        this.renderResults(filteredItems);

        // Update result count
        this.updateResultCount(filteredItems.length);
    }

    sortItems(items) {
        const sorted = [...items];

        switch (this.sortBy) {
            case 'date-desc':
                return sorted.sort((a, b) => b.data.date - a.data.date);
            case 'date-asc':
                return sorted.sort((a, b) => a.data.date - b.data.date);
            case 'views-desc':
                return sorted.sort((a, b) => b.data.views - a.data.views);
            case 'views-asc':
                return sorted.sort((a, b) => a.data.views - b.data.views);
            case 'price-desc':
                return sorted.sort((a, b) => b.data.price - a.data.price);
            case 'price-asc':
                return sorted.sort((a, b) => a.data.price - b.data.price);
            case 'rating-desc':
                return sorted.sort((a, b) => b.data.rating - a.data.rating);
            case 'name-asc':
                return sorted.sort((a, b) => a.data.title.localeCompare(b.data.title));
            case 'name-desc':
                return sorted.sort((a, b) => b.data.title.localeCompare(a.data.title));
            case 'featured':
                return sorted.sort((a, b) => (b.data.featured - a.data.featured) || (b.data.date - a.data.date));
            default:
                return sorted;
        }
    }

    renderResults(items) {
        // Clear container
        this.container.innerHTML = '';

        if (items.length === 0) {
            this.showNoResults();
            return;
        }

        // Add items with animation
        items.forEach((item, index) => {
            item.element.style.opacity = '0';
            item.element.style.transform = 'translateY(20px)';
            this.container.appendChild(item.element);

            // Animate in
            setTimeout(() => {
                item.element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                item.element.style.opacity = '1';
                item.element.style.transform = 'translateY(0)';
            }, index * 50);
        });
    }

    showNoResults() {
        const noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.innerHTML = `
            <div class="no-results-icon">🔍</div>
            <h3>No results found</h3>
            <p>Try adjusting your filters or search term</p>
            <button class="btn btn-outline" data-clear-filters>Clear All Filters</button>
        `;
        this.container.appendChild(noResults);
    }

    updateResultCount(count) {
        const countElement = document.querySelector('[data-result-count]');
        if (countElement) {
            countElement.textContent = `${count} ${count === 1 ? 'result' : 'results'}`;
        }
    }

    updateURL() {
        if (!history.pushState) return;

        const params = new URLSearchParams();

        // Add search term
        if (this.searchTerm) {
            params.set('search', this.searchTerm);
        }

        // Add filters
        Object.entries(this.filters).forEach(([key, value]) => {
            params.set(key, value);
        });

        // Add sort
        if (this.sortBy && this.sortBy !== 'default') {
            params.set('sort', this.sortBy);
        }

        const url = `${window.location.pathname}?${params.toString()}`;
        history.replaceState(null, '', url);
    }

    loadFromURL() {
        const params = new URLSearchParams(window.location.search);

        // Load search
        const search = params.get('search');
        if (search) {
            this.searchTerm = search;
            document.querySelectorAll('[data-search]').forEach(input => {
                input.value = search;
            });
        }

        // Load filters
        params.forEach((value, key) => {
            if (key !== 'search' && key !== 'sort') {
                this.filters[key] = value;

                // Update UI
                const filterElement = document.querySelector(`[name="${key}"]`);
                if (filterElement) {
                    if (filterElement.type === 'checkbox') {
                        filterElement.checked = true;
                    } else {
                        filterElement.value = value;
                    }
                }
            }
        });

        // Load sort
        const sort = params.get('sort');
        if (sort) {
            this.sortBy = sort;
            document.querySelectorAll('[data-sort]').forEach(select => {
                select.value = sort;
            });
        }

        // Apply filters
        this.applyFilters();
    }

    clearFilters() {
        this.filters = {};
        this.searchTerm = '';
        this.sortBy = 'default';

        // Reset UI
        document.querySelectorAll('[data-filter]').forEach(filter => {
            if (filter.type === 'checkbox') {
                filter.checked = false;
            } else {
                filter.value = '';
            }
        });

        document.querySelectorAll('[data-search]').forEach(search => {
            search.value = '';
        });

        document.querySelectorAll('[data-sort]').forEach(sort => {
            sort.value = 'default';
        });

        // Update URL
        history.replaceState(null, '', window.location.pathname);

        // Apply filters
        this.applyFilters();
    }

    debounce(func, wait) {
        clearTimeout(this.debounceTimeout);
        this.debounceTimeout = setTimeout(func, wait);
    }

    refresh() {
        this.items = Array.from(this.container.children);
        this.cacheItemData();
        this.applyFilters();
    }
}

// Tag-based filtering
class TagFilter {
    constructor(container, options = {}) {
        this.container = container;
        this.tags = new Set();
        this.activeTags = new Set();
        this.options = options;
        this.init();
    }

    init() {
        this.extractTags();
        this.renderTagCloud();
        this.setupEventListeners();
    }

    extractTags() {
        const items = document.querySelectorAll(this.options.itemSelector || '[data-tags]');
        items.forEach(item => {
            const tags = item.dataset.tags ? item.dataset.tags.split(',').map(t => t.trim()) : [];
            tags.forEach(tag => this.tags.add(tag));
        });
    }

    renderTagCloud() {
        const tagCloud = document.createElement('div');
        tagCloud.className = 'tag-cloud';

        Array.from(this.tags).forEach(tag => {
            const button = document.createElement('button');
            button.className = 'tag';
            button.textContent = tag;
            button.dataset.tag = tag;
            tagCloud.appendChild(button);
        });

        this.container.appendChild(tagCloud);
    }

    setupEventListeners() {
        this.container.addEventListener('click', (e) => {
            if (e.target.classList.contains('tag')) {
                const tag = e.target.dataset.tag;
                this.toggleTag(tag);
                e.target.classList.toggle('active');

                // Dispatch custom event
                this.container.dispatchEvent(new CustomEvent('tagChange', {
                    detail: {
                        tag,
                        active: this.activeTags.has(tag),
                        activeTags: Array.from(this.activeTags)
                    }
                }));
            }
        });
    }

    toggleTag(tag) {
        if (this.activeTags.has(tag)) {
            this.activeTags.delete(tag);
        } else {
            this.activeTags.add(tag);
        }
    }

    getActiveTags() {
        return Array.from(this.activeTags);
    }

    clearTags() {
        this.activeTags.clear();
        this.container.querySelectorAll('.tag.active').forEach(tag => {
            tag.classList.remove('active');
        });
    }
}

// Range slider filter
class RangeFilter {
    constructor(container, options = {}) {
        this.container = container;
        this.minInput = container.querySelector('[data-min]');
        this.maxInput = container.querySelector('[data-max]');
        this.rangeMin = parseInt(options.min) || 0;
        this.rangeMax = parseInt(options.max) || 100;
        this.currentMin = this.rangeMin;
        this.currentMax = this.rangeMax;
        this.init();
    }

    init() {
        this.setupInputs();
        this.setupRangeSlider();
    }

    setupInputs() {
        this.minInput.min = this.rangeMin;
        this.minInput.max = this.rangeMax;
        this.minInput.value = this.currentMin;

        this.maxInput.min = this.rangeMin;
        this.maxInput.max = this.rangeMax;
        this.maxInput.value = this.currentMax;

        this.minInput.addEventListener('input', (e) => {
            this.currentMin = parseInt(e.target.value);
            if (this.currentMin > this.currentMax) {
                this.currentMin = this.currentMax;
                e.target.value = this.currentMin;
            }
            this.updateRange();
            this.dispatchChange();
        });

        this.maxInput.addEventListener('input', (e) => {
            this.currentMax = parseInt(e.target.value);
            if (this.currentMax < this.currentMin) {
                this.currentMax = this.currentMin;
                e.target.value = this.currentMax;
            }
            this.updateRange();
            this.dispatchChange();
        });
    }

    setupRangeSlider() {
        const slider = document.createElement('div');
        slider.className = 'range-slider';
        slider.innerHTML = `
            <div class="range-track"></div>
            <div class="range-thumb min-thumb"></div>
            <div class="range-thumb max-thumb"></div>
        `;
        this.container.appendChild(slider);

        this.setupDragEvents(slider);
    }

    setupDragEvents(slider) {
        const minThumb = slider.querySelector('.min-thumb');
        const maxThumb = slider.querySelector('.max-thumb');
        const track = slider.querySelector('.range-track');

        this.setupThumbDrag(minThumb, 'min');
        this.setupThumbDrag(maxThumb, 'max');

        // Update slider position from inputs
        this.updateRange();
    }

    setupThumbDrag(thumb, type) {
        let isDragging = false;

        thumb.addEventListener('mousedown', (e) => {
            isDragging = true;
            document.body.style.userSelect = 'none';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const sliderRect = this.container.querySelector('.range-slider').getBoundingClientRect();
            const position = (e.clientX - sliderRect.left) / sliderRect.width;
            const value = Math.round(this.rangeMin + position * (this.rangeMax - this.rangeMin));

            if (type === 'min') {
                this.currentMin = Math.min(Math.max(value, this.rangeMin), this.currentMax);
                this.minInput.value = this.currentMin;
            } else {
                this.currentMax = Math.max(Math.min(value, this.rangeMax), this.currentMin);
                this.maxInput.value = this.currentMax;
            }

            this.updateRange();
            this.dispatchChange();
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                document.body.style.userSelect = '';
            }
        });
    }

    updateRange() {
        const minPercent = ((this.currentMin - this.rangeMin) / (this.rangeMax - this.rangeMin)) * 100;
        const maxPercent = ((this.currentMax - this.rangeMin) / (this.rangeMax - this.rangeMin)) * 100;

        const slider = this.container.querySelector('.range-slider');
        if (slider) {
            slider.style.setProperty('--min-percent', `${minPercent}%`);
            slider.style.setProperty('--max-percent', `${maxPercent}%`);
        }
    }

    dispatchChange() {
        this.container.dispatchEvent(new CustomEvent('rangeChange', {
            detail: {
                min: this.currentMin,
                max: this.currentMax
            }
        }));
    }

    getValues() {
        return {
            min: this.currentMin,
            max: this.currentMax
        };
    }

    reset() {
        this.currentMin = this.rangeMin;
        this.currentMax = this.rangeMax;
        this.minInput.value = this.currentMin;
        this.maxInput.value = this.currentMax;
        this.updateRange();
        this.dispatchChange();
    }
}

// Export functions
export {
    FilterSystem,
    TagFilter,
    RangeFilter,
    setupFilter
};

function setupFilter(container, options = {}) {
    return new FilterSystem(container, options);
}

// Initialize filter systems on page load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize filter systems
    document.querySelectorAll('[data-filter-container]').forEach(container => {
        const filterSystem = new FilterSystem(container);
        filterSystem.loadFromURL();
    });

    // Initialize tag filters
    document.querySelectorAll('[data-tag-filter]').forEach(container => {
        new TagFilter(container);
    });

    // Initialize range filters
    document.querySelectorAll('[data-range-filter]').forEach(container => {
        new RangeFilter(container, {
            min: container.dataset.min || 0,
            max: container.dataset.max || 100
        });
    });
});

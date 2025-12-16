/**
 * Service Manager for Admin Dashboard
 * Manages all 18 educational consultancy services
 */

class ServiceManager {
    constructor() {
        this.services = [];
        this.categories = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.selectedServices = new Set();
        this.filters = {
            category: 'all',
            featured: 'all',
            search: '',
            sort: 'position'
        };
        this.init();
    }

    init() {
        this.loadServices();
        this.loadCategories();
        this.setupEventListeners();
        this.setupSortable();
    }

    async loadServices(page = 1) {
        try {
            const params = new URLSearchParams({
                page,
                ...this.filters
            });
            
            const response = await fetch(`/api/v1/services?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) throw new Error('Failed to load services');
            
            const data = await response.json();
            this.services = data.services;
            this.currentPage = data.page;
            this.totalPages = data.totalPages;
            
            this.renderServices();
            this.renderPagination();
            this.updateStats();
        } catch (error) {
            this.showError(error.message);
        }
    }

    async loadCategories() {
        try {
            const response = await fetch('/api/v1/services/categories', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) throw new Error('Failed to load categories');
            
            this.categories = await response.json();
            this.populateCategoryFilter();
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    }

    populateCategoryFilter() {
        const filter = document.getElementById('filter-category');
        if (!filter) return;
        
        filter.innerHTML = `
            <option value="all">All Categories</option>
            ${this.categories.map(cat => `
                <option value="${cat.slug}">${cat.name} (${cat.count})</option>
            `).join('')}
        `;
    }

    renderServices() {
        const container = document.getElementById('services-container');
        if (!container) return;

        container.innerHTML = '';
        
        if (this.services.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="icon-services"></i>
                    <h3>No services found</h3>
                    <p>Add your first service to get started</p>
                    <button class="btn btn-primary" id="create-first-service">
                        <i class="icon-plus"></i> Create Service
                    </button>
                </div>
            `;
            return;
        }

        this.services.forEach(service => {
            const serviceCard = this.createServiceCard(service);
            container.appendChild(serviceCard);
        });
    }

    createServiceCard(service) {
        const card = document.createElement('div');
        card.className = `service-card ${service.featured ? 'featured' : ''} ${this.selectedServices.has(service.id) ? 'selected' : ''}`;
        card.dataset.id = service.id;
        card.dataset.position = service.position;
        
        const isSelected = this.selectedServices.has(service.id);
        
        card.innerHTML = `
            <div class="service-card-header">
                <div class="service-checkbox">
                    <input type="checkbox" id="service-${service.id}" ${isSelected ? 'checked' : ''}>
                    <label for="service-${service.id}"></label>
                </div>
                <div class="service-position">
                    <i class="icon-drag-handle"></i>
                    <span class="position-number">${service.position}</span>
                </div>
            </div>
            <div class="service-preview">
                ${service.icon ? `
                    <div class="service-icon">
                        <i class="${service.icon}"></i>
                    </div>
                ` : `
                    <div class="service-image">
                        <img src="${service.image_url || '/assets/images/service-default.jpg'}" 
                             alt="${service.title}">
                    </div>
                `}
                <div class="service-overlay">
                    <button class="btn-icon btn-preview" title="Preview" data-id="${service.id}">
                        <i class="icon-eye"></i>
                    </button>
                </div>
            </div>
            <div class="service-info">
                <h4 class="service-title">${service.title}</h4>
                <p class="service-excerpt">${service.excerpt || this.truncateText(service.description, 100)}</p>
                <div class="service-meta">
                    <span class="service-category">
                        <i class="icon-folder"></i>
                        ${service.category?.name || 'Uncategorized'}
                    </span>
                    <span class="service-duration">
                        <i class="icon-clock"></i>
                        ${service.duration || 'Varies'}
                    </span>
                    <span class="service-price">
                        <i class="icon-dollar"></i>
                        ${service.price ? `$${service.price}` : 'Contact'}
                    </span>
                </div>
                <div class="service-features">
                    ${service.features?.slice(0, 3).map(feature => `
                        <span class="feature-tag">${feature}</span>
                    `).join('') || ''}
                </div>
                <div class="service-status">
                    <span class="status-badge ${service.status}">
                        ${service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                    </span>
                    ${service.featured ? `
                        <span class="featured-badge">
                            <i class="icon-star"></i> Featured
                        </span>
                    ` : ''}
                </div>
            </div>
            <div class="service-actions">
                <button class="btn-icon btn-edit" title="Edit" data-id="${service.id}">
                    <i class="icon-edit"></i>
                </button>
                <button class="btn-icon btn-feature" title="${service.featured ? 'Remove from Featured' : 'Feature'}" data-id="${service.id}">
                    <i class="icon-${service.featured ? 'star-filled' : 'star'}"></i>
                </button>
                <button class="btn-icon btn-duplicate" title="Duplicate" data-id="${service.id}">
                    <i class="icon-copy"></i>
                </button>
                <button class="btn-icon btn-delete" title="Delete" data-id="${service.id}">
                    <i class="icon-trash"></i>
                </button>
            </div>
        `;
        
        return card;
    }

    setupEventListeners() {
        // Create service button
        document.getElementById('create-service')?.addEventListener('click', () => {
            this.showCreateModal();
        });

        // Import services button
        document.getElementById('import-services')?.addEventListener('click', () => {
            this.importDefaultServices();
        });

        // Bulk actions
        document.getElementById('bulk-select-all')?.addEventListener('change', (e) => {
            this.toggleSelectAll(e.target.checked);
        });

        document.getElementById('bulk-delete')?.addEventListener('click', () => {
            this.deleteSelectedServices();
        });

        document.getElementById('bulk-feature')?.addEventListener('click', () => {
            this.toggleSelectedFeatured(true);
        });

        document.getElementById('bulk-unfeature')?.addEventListener('click', () => {
            this.toggleSelectedFeatured(false);
        });

        // Filters
        document.getElementById('filter-category')?.addEventListener('change', (e) => {
            this.filters.category = e.target.value;
            this.loadServices(1);
        });

        document.getElementById('filter-featured')?.addEventListener('change', (e) => {
            this.filters.featured = e.target.value;
            this.loadServices(1);
        });

        document.getElementById('filter-search')?.addEventListener('input', (e) => {
            this.debounce(() => {
                this.filters.search = e.target.value;
                this.loadServices(1);
            }, 300);
        });

        document.getElementById('filter-sort')?.addEventListener('change', (e) => {
            this.filters.sort = e.target.value;
            this.loadServices(1);
        });

        // Save order button
        document.getElementById('save-order')?.addEventListener('click', () => {
            this.saveServiceOrder();
        });

        // Service card events (delegated)
        document.addEventListener('click', (e) => {
            // Checkbox selection
            if (e.target.closest('.service-checkbox input')) {
                const checkbox = e.target;
                const card = checkbox.closest('.service-card');
                const serviceId = card.dataset.id;
                
                if (checkbox.checked) {
                    this.selectedServices.add(serviceId);
                    card.classList.add('selected');
                } else {
                    this.selectedServices.delete(serviceId);
                    card.classList.remove('selected');
                }
                this.updateBulkActions();
            }
            
            // Edit button
            if (e.target.closest('.btn-edit')) {
                const button = e.target.closest('.btn-edit');
                const serviceId = button.dataset.id;
                this.editService(serviceId);
            }
            
            // Feature button
            if (e.target.closest('.btn-feature')) {
                const button = e.target.closest('.btn-feature');
                const serviceId = button.dataset.id;
                this.toggleFeatured(serviceId);
            }
            
            // Duplicate button
            if (e.target.closest('.btn-duplicate')) {
                const button = e.target.closest('.btn-duplicate');
                const serviceId = button.dataset.id;
                this.duplicateService(serviceId);
            }
            
            // Preview button
            if (e.target.closest('.btn-preview')) {
                const button = e.target.closest('.btn-preview');
                const serviceId = button.dataset.id;
                this.previewService(serviceId);
            }
            
            // Delete button
            if (e.target.closest('.btn-delete')) {
                const button = e.target.closest('.btn-delete');
                const serviceId = button.dataset.id;
                this.deleteService(serviceId);
            }
        });
    }

    setupSortable() {
        const container = document.getElementById('services-container');
        if (!container) return;

        let draggedItem = null;
        let draggedIndex = null;

        // Make items draggable
        container.addEventListener('dragstart', (e) => {
            if (e.target.closest('.service-card')) {
                draggedItem = e.target.closest('.service-card');
                draggedIndex = Array.from(container.children).indexOf(draggedItem);
                draggedItem.classList.add('dragging');
                
                // Set drag image
                e.dataTransfer.setData('text/plain', '');
                e.dataTransfer.effectAllowed = 'move';
            }
        });

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            
            const afterElement = this.getDragAfterElement(container, e.clientY);
            const draggable = document.querySelector('.dragging');
            
            if (afterElement == null) {
                container.appendChild(draggable);
            } else {
                container.insertBefore(draggable, afterElement);
            }
        });

        container.addEventListener('dragend', (e) => {
            const draggable = document.querySelector('.dragging');
            if (draggable) {
                draggable.classList.remove('dragging');
                
                // Update position numbers
                this.updatePositionNumbers();
                
                // Show save button
                document.getElementById('save-order')?.classList.add('visible');
            }
        });

        // Make entire card draggable
        container.querySelectorAll('.service-card').forEach(card => {
            card.setAttribute('draggable', 'true');
        });
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.service-card:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    updatePositionNumbers() {
        const cards = document.querySelectorAll('.service-card');
        cards.forEach((card, index) => {
            const positionElement = card.querySelector('.position-number');
            if (positionElement) {
                positionElement.textContent = index + 1;
            }
            card.dataset.position = index + 1;
        });
    }

    async saveServiceOrder() {
        const order = [];
        document.querySelectorAll('.service-card').forEach((card, index) => {
            order.push({
                id: card.dataset.id,
                position: index + 1
            });
        });

        try {
            const response = await fetch('/api/v1/services/reorder', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ order })
            });
            
            if (!response.ok) throw new Error('Failed to save order');
            
            this.showSuccess('Service order saved successfully');
            document.getElementById('save-order')?.classList.remove('visible');
            
            // Reload services to reflect new order
            this.loadServices(this.currentPage);
        } catch (error) {
            this.showError(error.message);
        }
    }

    async createService(formData) {
        try {
            const response = await fetch('/api/v1/services', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) throw new Error('Failed to create service');
            
            const service = await response.json();
            this.showSuccess('Service created successfully');
            this.loadServices(this.currentPage);
            return service;
        } catch (error) {
            this.showError(error.message);
            throw error;
        }
    }

    async editService(serviceId) {
        const service = this.services.find(s => s.id === serviceId);
        if (!service) return;
        
        const modal = this.createEditModal(service);
        document.body.appendChild(modal);
        
        // Show modal
        setTimeout(() => modal.classList.add('active'), 10);
        
        // Handle form submission
        const form = modal.querySelector('.edit-service-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(form);
            const updates = Object.fromEntries(formData);
            
            // Convert features from textarea
            if (updates.features) {
                updates.features = updates.features.split('\n').filter(f => f.trim());
            }
            
            // Convert price to number
            if (updates.price) {
                updates.price = parseFloat(updates.price);
            }
            
            try {
                const response = await fetch(`/api/v1/services/${serviceId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updates)
                });
                
                if (!response.ok) throw new Error('Update failed');
                
                this.showSuccess('Service updated successfully');
                this.loadServices(this.currentPage);
                modal.remove();
            } catch (error) {
                this.showError(error.message);
            }
        });
    }

    createEditModal(service) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-overlay" data-modal-close="edit-service"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit Service</h3>
                    <button class="modal-close" data-modal-close="edit-service">&times;</button>
                </div>
                <div class="modal-body">
                    <form class="edit-service-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="edit-service-title">Title *</label>
                                <input type="text" id="edit-service-title" name="title" 
                                       value="${service.title}" required>
                            </div>
                            <div class="form-group">
                                <label for="edit-service-slug">Slug *</label>
                                <input type="text" id="edit-service-slug" name="slug" 
                                       value="${service.slug}" required>
                                <small>URL-friendly version of the title</small>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="edit-service-category">Category *</label>
                                <select id="edit-service-category" name="category_id" required>
                                    <option value="">Select Category</option>
                                    ${this.categories.map(cat => `
                                        <option value="${cat.id}" ${service.category_id === cat.id ? 'selected' : ''}>
                                            ${cat.name}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="edit-service-status">Status</label>
                                <select id="edit-service-status" name="status">
                                    <option value="active" ${service.status === 'active' ? 'selected' : ''}>Active</option>
                                    <option value="inactive" ${service.status === 'inactive' ? 'selected' : ''}>Inactive</option>
                                    <option value="draft" ${service.status === 'draft' ? 'selected' : ''}>Draft</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-service-excerpt">Excerpt</label>
                            <textarea id="edit-service-excerpt" name="excerpt" rows="2">${service.excerpt || ''}</textarea>
                            <small>Brief description shown in listings</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-service-description">Description *</label>
                            <textarea id="edit-service-description" name="description" rows="5" required>${service.description}</textarea>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="edit-service-icon">Icon Class</label>
                                <input type="text" id="edit-service-icon" name="icon" 
                                       value="${service.icon || ''}"
                                       placeholder="e.g., icon-graduation-cap">
                                <small>Font icon class name</small>
                            </div>
                            <div class="form-group">
                                <label for="edit-service-image">Image URL</label>
                                <input type="url" id="edit-service-image" name="image_url" 
                                       value="${service.image_url || ''}">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="edit-service-duration">Duration</label>
                                <input type="text" id="edit-service-duration" name="duration" 
                                       value="${service.duration || ''}"
                                       placeholder="e.g., 4-6 weeks">
                            </div>
                            <div class="form-group">
                                <label for="edit-service-price">Price ($)</label>
                                <input type="number" id="edit-service-price" name="price" 
                                       value="${service.price || ''}" min="0" step="0.01">
                                <small>Leave empty for "Contact for price"</small>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-service-features">Features (one per line) *</label>
                            <textarea id="edit-service-features" name="features" rows="4" required>${service.features?.join('\n') || ''}</textarea>
                            <small>Each line becomes a bullet point feature</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-service-benefits">Benefits (one per line)</label>
                            <textarea id="edit-service-benefits" name="benefits" rows="4">${service.benefits?.join('\n') || ''}</textarea>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="edit-service-process">Process Steps (one per line)</label>
                                <textarea id="edit-service-process" name="process" rows="4">${service.process?.join('\n') || ''}</textarea>
                            </div>
                            <div class="form-group">
                                <label for="edit-service-requirements">Requirements (one per line)</label>
                                <textarea id="edit-service-requirements" name="requirements" rows="4">${service.requirements?.join('\n') || ''}</textarea>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-service-seo-title">SEO Title</label>
                            <input type="text" id="edit-service-seo-title" name="seo_title" 
                                   value="${service.seo_title || ''}">
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-service-seo-description">SEO Description</label>
                            <textarea id="edit-service-seo-description" name="seo_description" rows="2">${service.seo_description || ''}</textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-service-seo-keywords">SEO Keywords</label>
                            <input type="text" id="edit-service-seo-keywords" name="seo_keywords" 
                                   value="${service.seo_keywords || ''}"
                                   placeholder="comma, separated, keywords">
                        </div>
                        
                        <div class="form-checkbox">
                            <input type="checkbox" id="edit-service-featured" name="featured" 
                                   ${service.featured ? 'checked' : ''}>
                            <label for="edit-service-featured">Featured Service</label>
                        </div>
                        
                        <div class="form-checkbox">
                            <input type="checkbox" id="edit-service-popular" name="popular" 
                                   ${service.popular ? 'checked' : ''}>
                            <label for="edit-service-popular">Mark as Popular</label>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn btn-outline" data-modal-close="edit-service">Cancel</button>
                            <button type="submit" class="btn btn-primary">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        return modal;
    }

    async toggleFeatured(serviceId) {
        const service = this.services.find(s => s.id === serviceId);
        if (!service) return;
        
        try {
            const response = await fetch(`/api/v1/services/${serviceId}/feature`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ featured: !service.featured })
            });
            
            if (!response.ok) throw new Error('Failed to update featured status');
            
            this.showSuccess(`Service ${!service.featured ? 'featured' : 'unfeatured'} successfully`);
            this.loadServices(this.currentPage);
        } catch (error) {
            this.showError(error.message);
        }
    }

    async toggleSelectedFeatured(featured) {
        if (this.selectedServices.size === 0) {
            this.showError('No services selected');
            return;
        }
        
        try {
            const response = await fetch('/api/v1/services/bulk-feature', {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    service_ids: Array.from(this.selectedServices),
                    featured: featured
                })
            });
            
            if (!response.ok) throw new Error('Bulk update failed');
            
            this.showSuccess(`${this.selectedServices.size} services updated successfully`);
            this.selectedServices.clear();
            this.loadServices(this.currentPage);
            this.updateBulkActions();
        } catch (error) {
            this.showError(error.message);
        }
    }

    async duplicateService(serviceId) {
        const service = this.services.find(s => s.id === serviceId);
        if (!service) return;
        
        if (!confirm('Duplicate this service?')) return;
        
        try {
            const response = await fetch(`/api/v1/services/${serviceId}/duplicate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) throw new Error('Failed to duplicate service');
            
            this.showSuccess('Service duplicated successfully');
            this.loadServices(this.currentPage);
        } catch (error) {
            this.showError(error.message);
        }
    }

    async deleteService(serviceId) {
        if (!confirm('Are you sure you want to delete this service?')) return;
        
        try {
            const response = await fetch(`/api/v1/services/${serviceId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) throw new Error('Delete failed');
            
            this.showSuccess('Service deleted successfully');
            this.loadServices(this.currentPage);
        } catch (error) {
            this.showError(error.message);
        }
    }

    async deleteSelectedServices() {
        if (this.selectedServices.size === 0) {
            this.showError('No services selected');
            return;
        }
        
        if (!confirm(`Delete ${this.selectedServices.size} selected services?`)) return;
        
        try {
            const response = await fetch('/api/v1/services/bulk-delete', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ service_ids: Array.from(this.selectedServices) })
            });
            
            if (!response.ok) throw new Error('Bulk delete failed');
            
            this.showSuccess(`${this.selectedServices.size} services deleted successfully`);
            this.selectedServices.clear();
            this.loadServices(this.currentPage);
            this.updateBulkActions();
        } catch (error) {
            this.showError(error.message);
        }
    }

    async importDefaultServices() {
        if (!confirm('Import default educational consultancy services? This will add 18 pre-defined services.')) return;
        
        try {
            const response = await fetch('/api/v1/services/import-default', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) throw new Error('Import failed');
            
            const result = await response.json();
            this.showSuccess(`${result.count} services imported successfully`);
            this.loadServices(this.currentPage);
        } catch (error) {
            this.showError(error.message);
        }
    }

    previewService(serviceId) {
        const service = this.services.find(s => s.id === serviceId);
        if (!service) return;
        
        window.open(`/services/${service.slug}`, '_blank');
    }

    // Utility methods
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text || '';
        return text.substr(0, maxLength) + '...';
    }

    toggleSelectAll(selectAll) {
        const checkboxes = document.querySelectorAll('.service-checkbox input');
        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAll;
            const card = checkbox.closest('.service-card');
            const serviceId = card.dataset.id;
            
            if (selectAll) {
                this.selectedServices.add(serviceId);
                card.classList.add('selected');
            } else {
                this.selectedServices.delete(serviceId);
                card.classList.remove('selected');
            }
        });
        
        this.updateBulkActions();
    }

    updateBulkActions() {
        const bulkActions = document.getElementById('bulk-actions');
        const selectedCount = document.getElementById('selected-count');
        
        if (this.selectedServices.size > 0) {
            bulkActions?.classList.add('active');
            if (selectedCount) {
                selectedCount.textContent = `${this.selectedServices.size} selected`;
            }
        } else {
            bulkActions?.classList.remove('active');
        }
    }

    updateStats() {
        const stats = {
            total: this.services.length,
            active: this.services.filter(s => s.status === 'active').length,
            featured: this.services.filter(s => s.featured).length,
            categories: this.categories.length,
            totalViews: this.services.reduce((sum, service) => sum + (service.views || 0), 0),
            avgPrice: 0
        };
        
        const pricedServices = this.services.filter(s => s.price && s.price > 0);
        if (pricedServices.length > 0) {
            const totalPrice = pricedServices.reduce((sum, service) => sum + service.price, 0);
            stats.avgPrice = totalPrice / pricedServices.length;
        }
        
        // Update UI elements
        document.querySelectorAll('[data-stat="total-services"]').forEach(el => {
            el.textContent = stats.total;
        });
        
        document.querySelectorAll('[data-stat="active-services"]').forEach(el => {
            el.textContent = stats.active;
        });
        
        document.querySelectorAll('[data-stat="featured-services"]').forEach(el => {
            el.textContent = stats.featured;
        });
        
        document.querySelectorAll('[data-stat="total-categories"]').forEach(el => {
            el.textContent = stats.categories;
        });
        
        document.querySelectorAll('[data-stat="total-views"]').forEach(el => {
            el.textContent = stats.totalViews.toLocaleString();
        });
        
        document.querySelectorAll('[data-stat="avg-price"]').forEach(el => {
            el.textContent = stats.avgPrice ? `$${stats.avgPrice.toFixed(2)}` : 'N/A';
        });
    }

    renderPagination() {
        const pagination = document.getElementById('pagination');
        if (!pagination) return;
        
        pagination.innerHTML = '';
        
        // Previous button
        const prevButton = document.createElement('button');
        prevButton.className = `pagination-btn ${this.currentPage === 1 ? 'disabled' : ''}`;
        prevButton.innerHTML = '<i class="icon-chevron-left"></i>';
        prevButton.disabled = this.currentPage === 1;
        prevButton.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.loadServices(this.currentPage - 1);
            }
        });
        pagination.appendChild(prevButton);
        
        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, startPage + 4);
        
        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.className = `pagination-btn ${i === this.currentPage ? 'active' : ''}`;
            pageButton.textContent = i;
            pageButton.addEventListener('click', () => {
                this.loadServices(i);
            });
            pagination.appendChild(pageButton);
        }
        
        // Next button
        const nextButton = document.createElement('button');
        nextButton.className = `pagination-btn ${this.currentPage === this.totalPages ? 'disabled' : ''}`;
        nextButton.innerHTML = '<i class="icon-chevron-right"></i>';
        nextButton.disabled = this.currentPage === this.totalPages;
        nextButton.addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.loadServices(this.currentPage + 1);
            }
        });
        pagination.appendChild(nextButton);
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    showSuccess(message) {
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.innerHTML = `
            <i class="icon-check"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    showError(message) {
        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.innerHTML = `
            <i class="icon-alert"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const serviceManager = new ServiceManager();
    window.serviceManager = serviceManager;
});
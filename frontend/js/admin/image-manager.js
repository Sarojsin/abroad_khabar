/**
 * Image Manager for Admin Dashboard
 */

class ImageManager {
    constructor() {
        this.images = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.selectedImages = new Set();
        this.filters = {
            category: '',
            search: '',
            sort: 'newest'
        };
        this.init();
    }

    init() {
        this.loadImages();
        this.setupEventListeners();
        this.setupDragAndDrop();
    }

    async loadImages(page = 1) {
        try {
            const params = new URLSearchParams({
                page,
                ...this.filters
            });
            
            const response = await fetch(`/api/v1/images?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) throw new Error('Failed to load images');
            
            const data = await response.json();
            this.images = data.images;
            this.currentPage = data.page;
            this.totalPages = data.totalPages;
            
            this.renderImages();
            this.renderPagination();
            this.updateStats();
        } catch (error) {
            this.showError(error.message);
        }
    }

    renderImages() {
        const container = document.getElementById('images-container');
        if (!container) return;

        container.innerHTML = '';
        
        if (this.images.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="icon-image"></i>
                    <h3>No images found</h3>
                    <p>Upload your first image to get started</p>
                    <button class="btn btn-primary" id="upload-first-image">
                        <i class="icon-upload"></i> Upload Image
                    </button>
                </div>
            `;
            return;
        }

        this.images.forEach(image => {
            const imageCard = this.createImageCard(image);
            container.appendChild(imageCard);
        });
    }

    createImageCard(image) {
        const card = document.createElement('div');
        card.className = `image-card ${this.selectedImages.has(image.id) ? 'selected' : ''}`;
        card.dataset.id = image.id;
        
        const isSelected = this.selectedImages.has(image.id);
        
        card.innerHTML = `
            <div class="image-card-header">
                <div class="image-checkbox">
                    <input type="checkbox" id="image-${image.id}" ${isSelected ? 'checked' : ''}>
                    <label for="image-${image.id}"></label>
                </div>
                <div class="image-actions">
                    <button class="btn-icon btn-edit" title="Edit" data-id="${image.id}">
                        <i class="icon-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" title="Delete" data-id="${image.id}">
                        <i class="icon-trash"></i>
                    </button>
                </div>
            </div>
            <div class="image-preview">
                <img src="${image.thumbnail_url || image.url}" 
                     alt="${image.alt_text || 'Image'}"
                     loading="lazy"
                     class="image-thumbnail">
                <div class="image-overlay">
                    <button class="btn-icon btn-view" title="Preview" data-id="${image.id}">
                        <i class="icon-eye"></i>
                    </button>
                </div>
            </div>
            <div class="image-info">
                <div class="image-name">${this.truncateText(image.filename, 20)}</div>
                <div class="image-meta">
                    <span class="image-size">${this.formatFileSize(image.size)}</span>
                    <span class="image-dimensions">${image.width}x${image.height}</span>
                </div>
                <div class="image-tags">
                    ${image.tags?.map(tag => `<span class="tag">${tag}</span>`).join('') || ''}
                </div>
                <div class="image-date">${this.formatDate(image.created_at)}</div>
            </div>
        `;
        
        return card;
    }

    setupEventListeners() {
        // Upload button
        document.getElementById('upload-images')?.addEventListener('click', () => {
            this.showUploadModal();
        });

        // Bulk actions
        document.getElementById('bulk-select-all')?.addEventListener('change', (e) => {
            this.toggleSelectAll(e.target.checked);
        });

        document.getElementById('bulk-delete')?.addEventListener('click', () => {
            this.deleteSelectedImages();
        });

        document.getElementById('bulk-download')?.addEventListener('click', () => {
            this.downloadSelectedImages();
        });

        // Filters
        document.getElementById('filter-category')?.addEventListener('change', (e) => {
            this.filters.category = e.target.value;
            this.loadImages(1);
        });

        document.getElementById('filter-search')?.addEventListener('input', (e) => {
            this.debounce(() => {
                this.filters.search = e.target.value;
                this.loadImages(1);
            }, 300);
        });

        document.getElementById('filter-sort')?.addEventListener('change', (e) => {
            this.filters.sort = e.target.value;
            this.loadImages(1);
        });

        // Image card events (delegated)
        document.addEventListener('click', (e) => {
            // Checkbox selection
            if (e.target.closest('.image-checkbox input')) {
                const checkbox = e.target;
                const card = checkbox.closest('.image-card');
                const imageId = card.dataset.id;
                
                if (checkbox.checked) {
                    this.selectedImages.add(imageId);
                    card.classList.add('selected');
                } else {
                    this.selectedImages.delete(imageId);
                    card.classList.remove('selected');
                }
                this.updateBulkActions();
            }
            
            // Edit button
            if (e.target.closest('.btn-edit')) {
                const button = e.target.closest('.btn-edit');
                const imageId = button.dataset.id;
                this.editImage(imageId);
            }
            
            // Delete button
            if (e.target.closest('.btn-delete')) {
                const button = e.target.closest('.btn-delete');
                const imageId = button.dataset.id;
                this.deleteImage(imageId);
            }
            
            // View button
            if (e.target.closest('.btn-view')) {
                const button = e.target.closest('.btn-view');
                const imageId = button.dataset.id;
                this.viewImage(imageId);
            }
        });
    }

    setupDragAndDrop() {
        const dropZone = document.getElementById('upload-dropzone');
        if (!dropZone) return;

        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });

        // Highlight drop zone when item is dragged over it
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, highlight, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, unhighlight, false);
        });

        // Handle dropped files
        dropZone.addEventListener('drop', handleDrop, false);

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        function highlight() {
            dropZone.classList.add('dragover');
        }

        function unhighlight() {
            dropZone.classList.remove('dragover');
        }

        const handleDrop = (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            this.handleFiles(files);
        };

        // Click to upload
        dropZone.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.multiple = true;
            input.onchange = (e) => {
                this.handleFiles(e.target.files);
            };
            input.click();
        });
    }

    async handleFiles(files) {
        if (files.length === 0) return;
        
        const uploadModal = document.getElementById('upload-modal');
        if (uploadModal) {
            uploadModal.classList.add('active');
        }
        
        const formData = new FormData();
        Array.from(files).forEach(file => {
            formData.append('images', file);
        });
        
        // Add metadata if available
        const category = document.getElementById('upload-category')?.value;
        const tags = document.getElementById('upload-tags')?.value;
        
        if (category) formData.append('category', category);
        if (tags) formData.append('tags', tags);
        
        try {
            const response = await fetch('/api/v1/images/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });
            
            if (!response.ok) throw new Error('Upload failed');
            
            const result = await response.json();
            this.showSuccess(`${result.uploaded} images uploaded successfully`);
            
            // Refresh image list
            this.loadImages(this.currentPage);
            
            // Close modal
            if (uploadModal) {
                uploadModal.classList.remove('active');
            }
        } catch (error) {
            this.showError(`Upload failed: ${error.message}`);
        }
    }

    async editImage(imageId) {
        const image = this.images.find(img => img.id === imageId);
        if (!image) return;
        
        const modal = this.createEditModal(image);
        document.body.appendChild(modal);
        
        // Show modal
        setTimeout(() => modal.classList.add('active'), 10);
        
        // Handle form submission
        const form = modal.querySelector('.edit-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(form);
            const updates = Object.fromEntries(formData);
            
            try {
                const response = await fetch(`/api/v1/images/${imageId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updates)
                });
                
                if (!response.ok) throw new Error('Update failed');
                
                this.showSuccess('Image updated successfully');
                this.loadImages(this.currentPage);
                modal.remove();
            } catch (error) {
                this.showError(error.message);
            }
        });
    }

    createEditModal(image) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-overlay" data-modal-close="edit-image"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit Image</h3>
                    <button class="modal-close" data-modal-close="edit-image">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="edit-preview">
                        <img src="${image.url}" alt="${image.alt_text || ''}">
                    </div>
                    <form class="edit-form">
                        <div class="form-group">
                            <label for="edit-alt-text">Alt Text</label>
                            <input type="text" id="edit-alt-text" name="alt_text" 
                                   value="${image.alt_text || ''}" 
                                   placeholder="Describe the image for accessibility">
                        </div>
                        <div class="form-group">
                            <label for="edit-title">Title</label>
                            <input type="text" id="edit-title" name="title" 
                                   value="${image.title || ''}" 
                                   placeholder="Image title">
                        </div>
                        <div class="form-group">
                            <label for="edit-caption">Caption</label>
                            <textarea id="edit-caption" name="caption" 
                                      placeholder="Image caption">${image.caption || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label for="edit-category">Category</label>
                            <select id="edit-category" name="category">
                                <option value="">Select Category</option>
                                <option value="hero" ${image.category === 'hero' ? 'selected' : ''}>Hero Banner</option>
                                <option value="gallery" ${image.category === 'gallery' ? 'selected' : ''}>Gallery</option>
                                <option value="blog" ${image.category === 'blog' ? 'selected' : ''}>Blog</option>
                                <option value="service" ${image.category === 'service' ? 'selected' : ''}>Service</option>
                                <option value="country" ${image.category === 'country' ? 'selected' : ''}>Country</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="edit-tags">Tags</label>
                            <input type="text" id="edit-tags" name="tags" 
                                   value="${image.tags?.join(', ') || ''}" 
                                   placeholder="Comma-separated tags">
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn btn-outline" data-modal-close="edit-image">Cancel</button>
                            <button type="submit" class="btn btn-primary">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        return modal;
    }

    async deleteImage(imageId) {
        if (!confirm('Are you sure you want to delete this image?')) return;
        
        try {
            const response = await fetch(`/api/v1/images/${imageId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) throw new Error('Delete failed');
            
            this.showSuccess('Image deleted successfully');
            this.loadImages(this.currentPage);
        } catch (error) {
            this.showError(error.message);
        }
    }

    async deleteSelectedImages() {
        if (this.selectedImages.size === 0) {
            this.showError('No images selected');
            return;
        }
        
        if (!confirm(`Delete ${this.selectedImages.size} selected images?`)) return;
        
        try {
            const response = await fetch('/api/v1/images/bulk-delete', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ image_ids: Array.from(this.selectedImages) })
            });
            
            if (!response.ok) throw new Error('Bulk delete failed');
            
            this.showSuccess(`${this.selectedImages.size} images deleted successfully`);
            this.selectedImages.clear();
            this.loadImages(this.currentPage);
            this.updateBulkActions();
        } catch (error) {
            this.showError(error.message);
        }
    }

    viewImage(imageId) {
        const image = this.images.find(img => img.id === imageId);
        if (!image) return;
        
        const lightbox = this.createLightbox(image);
        document.body.appendChild(lightbox);
        
        // Show lightbox
        setTimeout(() => lightbox.classList.add('active'), 10);
    }

    createLightbox(image) {
        const lightbox = document.createElement('div');
        lightbox.className = 'lightbox';
        lightbox.innerHTML = `
            <div class="lightbox-overlay" data-modal-close="lightbox"></div>
            <div class="lightbox-content">
                <button class="lightbox-close" data-modal-close="lightbox">&times;</button>
                <div class="lightbox-image">
                    <img src="${image.url}" alt="${image.alt_text || ''}">
                </div>
                <div class="lightbox-info">
                    <div class="lightbox-info-header">
                        <h3>${image.filename}</h3>
                        <div class="lightbox-actions">
                            <a href="${image.url}" download="${image.filename}" class="btn-icon" title="Download">
                                <i class="icon-download"></i>
                            </a>
                            <button class="btn-icon btn-copy-url" title="Copy URL" data-url="${image.url}">
                                <i class="icon-copy"></i>
                            </button>
                        </div>
                    </div>
                    <div class="lightbox-info-grid">
                        <div class="info-item">
                            <span class="info-label">Size:</span>
                            <span class="info-value">${this.formatFileSize(image.size)}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Dimensions:</span>
                            <span class="info-value">${image.width} × ${image.height}px</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Format:</span>
                            <span class="info-value">${image.format?.toUpperCase() || 'Unknown'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">Uploaded:</span>
                            <span class="info-value">${this.formatDate(image.created_at)}</span>
                        </div>
                    </div>
                    ${image.alt_text ? `
                        <div class="lightbox-alt-text">
                            <strong>Alt Text:</strong> ${image.alt_text}
                        </div>
                    ` : ''}
                    ${image.tags?.length ? `
                        <div class="lightbox-tags">
                            <strong>Tags:</strong>
                            ${image.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                    <div class="lightbox-url">
                        <strong>URL:</strong>
                        <div class="url-display">
                            <input type="text" value="${image.url}" readonly>
                            <button class="btn-copy" data-url="${image.url}">Copy</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add copy functionality
        lightbox.querySelectorAll('.btn-copy, .btn-copy-url').forEach(button => {
            button.addEventListener('click', () => {
                const url = button.dataset.url;
                navigator.clipboard.writeText(url).then(() => {
                    this.showSuccess('URL copied to clipboard');
                });
            });
        });
        
        return lightbox;
    }

    toggleSelectAll(selectAll) {
        const checkboxes = document.querySelectorAll('.image-checkbox input');
        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAll;
            const card = checkbox.closest('.image-card');
            const imageId = card.dataset.id;
            
            if (selectAll) {
                this.selectedImages.add(imageId);
                card.classList.add('selected');
            } else {
                this.selectedImages.delete(imageId);
                card.classList.remove('selected');
            }
        });
        
        this.updateBulkActions();
    }

    updateBulkActions() {
        const bulkActions = document.getElementById('bulk-actions');
        const selectedCount = document.getElementById('selected-count');
        
        if (this.selectedImages.size > 0) {
            bulkActions?.classList.add('active');
            if (selectedCount) {
                selectedCount.textContent = `${this.selectedImages.size} selected`;
            }
        } else {
            bulkActions?.classList.remove('active');
        }
    }

    updateStats() {
        // Update stats in the dashboard
        const stats = {
            total: this.images.length,
            byCategory: {},
            totalSize: 0
        };
        
        this.images.forEach(image => {
            stats.totalSize += image.size;
            
            if (image.category) {
                stats.byCategory[image.category] = (stats.byCategory[image.category] || 0) + 1;
            }
        });
        
        // Update UI elements
        const totalElements = document.querySelectorAll('[data-stat="total-images"]');
        totalElements.forEach(el => {
            el.textContent = stats.total;
        });
        
        const sizeElement = document.querySelector('[data-stat="total-size"]');
        if (sizeElement) {
            sizeElement.textContent = this.formatFileSize(stats.totalSize);
        }
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
                this.loadImages(this.currentPage - 1);
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
                this.loadImages(i);
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
                this.loadImages(this.currentPage + 1);
            }
        });
        pagination.appendChild(nextButton);
    }

    // Utility methods
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength) + '...';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
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
        // Create or use existing notification system
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
    const imageManager = new ImageManager();
    window.imageManager = imageManager;
});
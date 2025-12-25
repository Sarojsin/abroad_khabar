/**
 * Media Manager for Admin Dashboard
 * Handles images, videos, and other media files in a unified interface
 */

import API from '../core/api.js';
import Auth from '../core/auth.js';

class MediaManager {
    constructor() {
        this.items = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.selectedItems = new Set();
        this.currentFolder = 'all';
        this.filters = {
            type: 'all',
            search: '',
            sort: 'newest'
        };
        this.init();
    }

    init() {
        if (!Auth.isAuthenticated) {
            window.location.href = '/login';
            return;
        }

        this.loadMedia();
        this.setupEventListeners();
    }

    async loadMedia(page = 1) {
        try {
            const params = {
                page,
                ...this.filters
            };

            // Currently our backend has separate endpoints for images and videos
            // If type is 'all', we might need to fetch both or have a unified media endpoint
            // For now, let's assume we fetch images and handle filtering

            let response;
            if (this.filters.type === 'videos') {
                response = await API.get('/videos', params);
                this.items = response.data.videos.map(v => ({ ...v, mediaType: 'video' }));
            } else {
                response = await API.get('/images', params);
                this.items = response.data.images.map(i => ({ ...i, mediaType: 'image' }));
            }

            const data = response.data;
            this.currentPage = data.page;
            this.totalPages = data.pages || data.totalPages;

            this.renderMedia();
            this.updatePagination();
            this.updateStats(data.total || this.items.length);
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    renderMedia() {
        const container = document.getElementById('media-container');
        if (!container) return;

        container.innerHTML = '';

        if (this.items.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg class="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    <h3>No media found</h3>
                    <p>Try adjusting your filters or upload new files</p>
                </div>
            `;
            return;
        }

        this.items.forEach(item => {
            const card = this.createMediaCard(item);
            container.appendChild(card);
        });
    }

    createMediaCard(item) {
        const div = document.createElement('div');
        div.className = `media-item glass-card ${this.selectedItems.has(item.id) ? 'selected' : ''}`;
        div.dataset.id = item.id;
        div.dataset.type = item.mediaType;

        const isImage = item.mediaType === 'image';
        const thumbnail = isImage ? (item.thumbnail_url || item.url) : (item.thumbnail || '/img/video-placeholder.jpg');

        div.innerHTML = `
            <div class="media-thumbnail">
                <img src="${thumbnail}" alt="${item.filename || item.title}" loading="lazy">
                <div class="media-overlay">
                    <div class="media-checkbox">
                        <input type="checkbox" ${this.selectedItems.has(item.id) ? 'checked' : ''}>
                    </div>
                </div>
                ${!isImage ? '<div class="play-icon"><i class="icon-play"></i></div>' : ''}
            </div>
            <div class="media-info">
                <span class="media-name">${this.truncateText(item.filename || item.title, 20)}</span>
                <span class="media-meta">${isImage ? `${item.width}x${item.height}` : this.formatDuration(item.duration)}</span>
            </div>
        `;

        // Click to select
        div.addEventListener('click', (e) => {
            if (e.target.type === 'checkbox') return;
            this.toggleSelection(item.id, div);
        });

        // Checkbox toggle
        const checkbox = div.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', (e) => {
            this.toggleSelection(item.id, div, e.target.checked);
        });

        return div;
    }

    toggleSelection(id, element, force) {
        if (force === undefined) {
            if (this.selectedItems.has(id)) {
                this.selectedItems.delete(id);
                element.classList.remove('selected');
                element.querySelector('input').checked = false;
            } else {
                this.selectedItems.add(id);
                element.classList.add('selected');
                element.querySelector('input').checked = true;
            }
        } else if (force) {
            this.selectedItems.add(id);
            element.classList.add('selected');
            element.querySelector('input').checked = true;
        } else {
            this.selectedItems.delete(id);
            element.classList.remove('selected');
            element.querySelector('input').checked = false;
        }

        this.updateSelectedActions();
    }

    updateSelectedActions() {
        const actionsBar = document.getElementById('selected-actions');
        const countSpan = document.getElementById('selected-count');

        if (this.selectedItems.size > 0) {
            if (actionsBar) actionsBar.style.display = 'flex';
            if (countSpan) countSpan.textContent = this.selectedItems.size;
        } else {
            if (actionsBar) actionsBar.style.display = 'none';
        }
    }

    setupEventListeners() {
        // Search
        const searchInput = document.getElementById('media-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                if (this.searchTimeout) clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => {
                    this.filters.search = e.target.value;
                    this.loadMedia(1);
                }, 300);
            });
        }

        // Sort
        const sortSelect = document.getElementById('media-sort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.filters.sort = e.target.value;
                this.loadMedia(1);
            });
        }

        // Folder/Type navigation
        const folderItems = document.querySelectorAll('.folder-item');
        folderItems.forEach(item => {
            item.addEventListener('click', () => {
                folderItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                const folder = item.dataset.folder;
                this.currentFolder = folder;

                if (folder === 'images' || folder === 'videos') {
                    this.filters.type = folder;
                } else {
                    this.filters.type = 'all';
                }

                const folderName = document.getElementById('current-folder');
                if (folderName) folderName.textContent = item.querySelector('span').textContent;

                this.loadMedia(1);
            });
        });

        // Upload
        const uploadBtn = document.getElementById('upload-media-btn');
        const uploadArea = document.getElementById('upload-area');
        const closeUpload = document.querySelector('.close-upload-area');

        if (uploadBtn && uploadArea) {
            uploadBtn.addEventListener('click', () => {
                uploadArea.style.display = 'block';
            });
        }

        if (closeUpload && uploadArea) {
            closeUpload.addEventListener('click', () => {
                uploadArea.style.display = 'none';
            });
        }

        // File input
        const browseBtn = document.getElementById('browse-media');
        const fileInput = document.getElementById('media-file-input');

        if (browseBtn && fileInput) {
            browseBtn.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', (e) => this.handleUpload(e.target.files));
        }

        // Dropzone
        const dropzone = document.getElementById('media-dropzone');
        if (dropzone) {
            dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzone.classList.add('dragover');
            });
            dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
            dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropzone.classList.remove('dragover');
                this.handleUpload(e.dataTransfer.files);
            });
        }

        // Bulk Delete
        const deleteBtn = document.getElementById('delete-selected');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.handleBulkDelete());
        }

        // Clear selection
        const clearBtn = document.getElementById('clear-selection');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.selectedItems.clear();
                this.renderMedia();
                this.updateSelectedActions();
            });
        }

        // Pagination
        document.querySelector('.pagination-btn.prev')?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.loadMedia(this.currentPage - 1);
            }
        });

        document.querySelector('.pagination-btn.next')?.addEventListener('click', () => {
            if (this.currentPage < this.totalPages) {
                this.loadMedia(this.currentPage + 1);
            }
        });
    }

    async handleUpload(files) {
        if (!files || files.length === 0) return;

        try {
            this.showToast(`Uploading ${files.length} files...`, 'info');

            for (const file of Array.from(files)) {
                const formData = new FormData();
                const isVideo = file.type.startsWith('video/');
                const endpoint = isVideo ? '/videos/upload' : '/images/upload';

                if (isVideo) {
                    formData.append('file', file);
                    formData.append('title', file.name);
                } else {
                    formData.append('images', file);
                }

                await API.upload(endpoint, formData);
            }

            this.showToast('Upload successful');
            this.loadMedia(1);

            const uploadArea = document.getElementById('upload-area');
            if (uploadArea) uploadArea.style.display = 'none';
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    async handleBulkDelete() {
        if (this.selectedItems.size === 0) return;

        if (!confirm(`Are you sure you want to delete ${this.selectedItems.size} items?`)) return;

        try {
            // Since we might have different types, we'd ideally have a unified bulk delete
            // For now, let's assume they are all the current filtered type
            const endpoint = this.filters.type === 'videos' ? '/videos/bulk-delete' : '/images/bulk-delete';

            await API.post(endpoint, {
                ids: Array.from(this.selectedItems).map(id => parseInt(id))
            });

            this.showToast(`${this.selectedItems.size} items deleted`);
            this.selectedItems.clear();
            this.loadMedia(this.currentPage);
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    updatePagination() {
        const currentSpan = document.getElementById('current-page');
        const totalSpan = document.getElementById('total-pages');
        const prevBtn = document.querySelector('.pagination-btn.prev');
        const nextBtn = document.querySelector('.pagination-btn.next');

        if (currentSpan) currentSpan.textContent = this.currentPage;
        if (totalSpan) totalSpan.textContent = this.totalPages;

        if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this.currentPage >= this.totalPages;
    }

    updateStats(total) {
        const totalFiles = document.getElementById('total-files');
        if (totalFiles) totalFiles.textContent = total.toLocaleString();

        // Storage used could be calculated or fetched from another endpoint
    }

    // Utilities
    truncateText(text, length) {
        if (!text) return '';
        return text.length > length ? text.substring(0, length) + '...' : text;
    }

    formatDuration(seconds) {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    showToast(message, type = 'success') {
        // Reuse AdminDashboard showToast if available, or create locally
        console.log(`[${type.toUpperCase()}] ${message}`);
        // Implementation similar to dashboard.js toast
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MediaManager();
});

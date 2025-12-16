/**
 * Video Manager JavaScript
 * Handles video upload, management, and organization
 */

import Auth from '../core/auth.js';
import API from '../core/api.js';

class VideoManager {
    constructor() {
        this.videos = [];
        this.currentFilter = 'all';
        this.currentSearch = '';
        this.selectedVideos = new Set();
        
        this.init();
    }

    init() {
        this.checkAuth();
        this.setupEventListeners();
        this.loadVideos();
        this.setupUpload();
    }

    checkAuth() {
        if (!Auth.isAuthenticated()) {
            window.location.href = '../pages/login.html';
            return;
        }
        
        const user = Auth.getUser();
        if (!user || !user.permissions || !user.permissions.includes('manage_videos')) {
            this.showUnauthorizedMessage();
        }
    }

    setupEventListeners() {
        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }

        // Upload video button
        const uploadBtn = document.getElementById('upload-video-btn');
        const uploadLink = document.getElementById('upload-video-link');
        
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => {
                this.showUploadSection();
            });
        }
        
        if (uploadLink) {
            uploadLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showUploadSection();
            });
        }

        // Close upload section
        const closeUpload = document.querySelector('.close-upload');
        if (closeUpload) {
            closeUpload.addEventListener('click', () => {
                this.hideUploadSection();
            });
        }

        // Browse files button
        const browseBtn = document.getElementById('browse-videos');
        if (browseBtn) {
            browseBtn.addEventListener('click', () => {
                document.getElementById('video-file-input').click();
            });
        }

        // File input change
        const fileInput = document.getElementById('video-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelection(e.target.files);
            });
        }

        // Dropzone events
        const dropzone = document.getElementById('video-dropzone');
        if (dropzone) {
            dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzone.classList.add('dragover');
            });
            
            dropzone.addEventListener('dragleave', () => {
                dropzone.classList.remove('dragover');
            });
            
            dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropzone.classList.remove('dragover');
                this.handleFileSelection(e.dataTransfer.files);
            });
        }

        // Search functionality
        const searchInput = document.getElementById('video-manager-search');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.currentSearch = e.target.value.toLowerCase();
                    this.filterVideos();
                }, 500);
            });
        }

        // Filter functionality
        const categoryFilter = document.getElementById('video-category-filter');
        const statusFilter = document.getElementById('video-status-filter');
        
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.filterVideos();
            });
        }
        
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filterVideos();
            });
        }

        // Bulk actions
        const bulkActionsBtn = document.getElementById('bulk-actions-btn');
        if (bulkActionsBtn) {
            bulkActionsBtn.addEventListener('click', () => {
                this.showBulkActions();
            });
        }

        // Video modal
        const videoModal = document.getElementById('video-details-modal');
        if (videoModal) {
            videoModal.querySelector('.modal-close').addEventListener('click', () => {
                videoModal.classList.remove('active');
            });
            
            videoModal.addEventListener('click', (e) => {
                if (e.target === videoModal) {
                    videoModal.classList.remove('active');
                }
            });
        }
    }

    toggleSidebar() {
        const sidebar = document.getElementById('admin-sidebar');
        sidebar.classList.toggle('collapsed');
    }

    async loadVideos() {
        try {
            // In production, this would fetch from API
            // const response = await API.get('/admin/videos');
            // this.videos = await response.json();
            
            // Mock data for demonstration
            this.videos = this.generateMockVideos();
            this.renderVideos();
            
        } catch (error) {
            console.error('Error loading videos:', error);
            this.showError('Failed to load videos. Please try again.');
        }
    }

    generateMockVideos() {
        const categories = ['success-stories', 'university-tours', 'visa-guide', 'webinars', 'testimonials'];
        const statuses = ['published', 'draft', 'scheduled'];
        
        return Array.from({ length: 12 }, (_, i) => ({
            id: i + 1,
            title: `Study Abroad Success Story #${i + 1}`,
            description: 'Watch this inspiring journey of a student who achieved their dream of studying abroad.',
            category: categories[i % categories.length],
            status: statuses[i % statuses.length],
            duration: `${Math.floor(Math.random() * 30) + 5}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
            size: `${(Math.random() * 500 + 50).toFixed(1)} MB`,
            views: Math.floor(Math.random() * 10000) + 1000,
            thumbnail: `../assets/images/videos/thumb${(i % 6) + 1}.jpg`,
            uploadedAt: new Date(Date.now() - i * 86400000).toLocaleDateString(),
            uploadedBy: 'Admin User',
            selected: false
        }));
    }

    renderVideos() {
        const container = document.getElementById('videos-manager-container');
        if (!container) return;
        
        // Filter videos
        let filteredVideos = [...this.videos];
        
        if (this.currentFilter && this.currentFilter !== 'all') {
            filteredVideos = filteredVideos.filter(video => video.category === this.currentFilter);
        }
        
        if (this.currentSearch) {
            filteredVideos = filteredVideos.filter(video => 
                video.title.toLowerCase().includes(this.currentSearch) ||
                video.description.toLowerCase().includes(this.currentSearch)
            );
        }
        
        const statusFilter = document.getElementById('video-status-filter')?.value;
        if (statusFilter) {
            filteredVideos = filteredVideos.filter(video => video.status === statusFilter);
        }
        
        if (filteredVideos.length === 0) {
            container.innerHTML = `
                <div class="no-results glass-card">
                    <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <h3>No videos found</h3>
                    <p>Try adjusting your filters or search term</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = filteredVideos.map(video => `
            <div class="video-manager-card glass-card ${video.selected ? 'selected' : ''}" data-video-id="${video.id}">
                <div class="video-manager-thumbnail">
                    <img src="${video.thumbnail}" alt="${video.title}" class="lazy-image">
                    <div class="video-overlay">
                        <button class="btn-icon play-btn" title="Preview">
                            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/>
                            </svg>
                        </button>
                        <span class="video-duration">${video.duration}</span>
                    </div>
                    <div class="video-checkbox">
                        <input type="checkbox" id="video-${video.id}" ${video.selected ? 'checked' : ''}>
                        <label for="video-${video.id}"></label>
                    </div>
                </div>
                <div class="video-manager-info">
                    <h3 class="video-title">${video.title}</h3>
                    <div class="video-meta">
                        <span class="video-category ${video.category}">${this.formatCategory(video.category)}</span>
                        <span class="video-status ${video.status}">${this.formatStatus(video.status)}</span>
                        <span class="video-size">${video.size}</span>
                    </div>
                    <p class="video-description">${video.description}</p>
                    <div class="video-stats">
                        <span class="stat">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                            </svg>
                            ${video.views.toLocaleString()} views
                        </span>
                        <span class="stat">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                            </svg>
                            ${video.uploadedAt}
                        </span>
                    </div>
                </div>
                <div class="video-manager-actions">
                    <button class="btn-icon edit-btn" title="Edit" data-video-id="${video.id}">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                    </button>
                    <button class="btn-icon delete-btn" title="Delete" data-video-id="${video.id}">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </button>
                    <div class="dropdown">
                        <button class="btn-icon more-btn" title="More options">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
                            </svg>
                        </button>
                        <div class="dropdown-menu">
                            <button class="dropdown-item" data-action="feature" data-video-id="${video.id}">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                                </svg>
                                Feature Video
                            </button>
                            <button class="dropdown-item" data-action="duplicate" data-video-id="${video.id}">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                                </svg>
                                Duplicate
                            </button>
                            <button class="dropdown-item" data-action="download" data-video-id="${video.id}">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                                </svg>
                                Download
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        
        // Add event listeners
        this.setupVideoCardEvents();
    }

    setupVideoCardEvents() {
        // Checkbox selection
        document.querySelectorAll('.video-checkbox input').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const videoId = parseInt(e.target.closest('.video-manager-card').dataset.videoId);
                this.toggleVideoSelection(videoId, e.target.checked);
            });
        });
        
        // Edit button
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const videoId = parseInt(e.target.closest('.edit-btn').dataset.videoId);
                this.editVideo(videoId);
            });
        });
        
        // Delete button
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const videoId = parseInt(e.target.closest('.delete-btn').dataset.videoId);
                this.deleteVideo(videoId);
            });
        });
        
        // Play button
        document.querySelectorAll('.play-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const videoId = parseInt(e.target.closest('.video-manager-card').dataset.videoId);
                this.previewVideo(videoId);
            });
        });
        
        // Dropdown actions
        document.querySelectorAll('.more-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const dropdown = e.target.closest('.dropdown').querySelector('.dropdown-menu');
                dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
            });
        });
        
        // Dropdown items
        document.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const videoId = parseInt(e.target.dataset.videoId);
                this.handleDropdownAction(action, videoId);
            });
        });
        
        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown')) {
                document.querySelectorAll('.dropdown-menu').forEach(menu => {
                    menu.style.display = 'none';
                });
            }
        });
    }

    formatCategory(category) {
        const categories = {
            'success-stories': 'Success Stories',
            'university-tours': 'University Tours',
            'visa-guide': 'Visa Guide',
            'webinars': 'Live Webinars',
            'testimonials': 'Testimonials'
        };
        return categories[category] || category;
    }

    formatStatus(status) {
        const statuses = {
            'published': 'Published',
            'draft': 'Draft',
            'scheduled': 'Scheduled'
        };
        return statuses[status] || status;
    }

    toggleVideoSelection(videoId, selected) {
        const video = this.videos.find(v => v.id === videoId);
        if (video) {
            video.selected = selected;
            
            if (selected) {
                this.selectedVideos.add(videoId);
            } else {
                this.selectedVideos.delete(videoId);
            }
            
            // Update UI
            const card = document.querySelector(`[data-video-id="${videoId}"]`);
            if (card) {
                card.classList.toggle('selected', selected);
            }
            
            // Update bulk actions button
            this.updateBulkActionsButton();
        }
    }

    updateBulkActionsButton() {
        const bulkBtn = document.getElementById('bulk-actions-btn');
        if (bulkBtn) {
            if (this.selectedVideos.size > 0) {
                bulkBtn.textContent = `${this.selectedVideos.size} Selected`;
                bulkBtn.classList.add('has-selection');
            } else {
                bulkBtn.textContent = 'Bulk Actions';
                bulkBtn.classList.remove('has-selection');
            }
        }
    }

    showUploadSection() {
        const uploadSection = document.getElementById('upload-section');
        if (uploadSection) {
            uploadSection.style.display = 'block';
            uploadSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    hideUploadSection() {
        const uploadSection = document.getElementById('upload-section');
        if (uploadSection) {
            uploadSection.style.display = 'none';
        }
    }

    setupUpload() {
        const dropzone = document.getElementById('video-dropzone');
        const fileInput = document.getElementById('video-file-input');
        
        if (dropzone && fileInput) {
            // Click on dropzone triggers file input
            dropzone.addEventListener('click', (e) => {
                if (!e.target.closest('.btn')) {
                    fileInput.click();
                }
            });
        }
    }

    handleFileSelection(files) {
        if (files.length === 0) return;
        
        // Show upload progress
        const uploadProgress = document.getElementById('upload-progress');
        const progressFill = document.getElementById('progress-fill');
        const progressPercent = document.getElementById('progress-percent');
        
        if (uploadProgress && progressFill && progressPercent) {
            uploadProgress.style.display = 'block';
            
            // Simulate upload progress
            let progress = 0;
            const interval = setInterval(() => {
                progress += 5;
                progressFill.style.width = `${progress}%`;
                progressPercent.textContent = `${progress}%`;
                
                if (progress >= 100) {
                    clearInterval(interval);
                    
                    // Upload complete
                    setTimeout(() => {
                        this.showToast(`${files.length} video(s) uploaded successfully!`);
                        uploadProgress.style.display = 'none';
                        progressFill.style.width = '0%';
                        progressPercent.textContent = '0%';
                        
                        // Reload videos
                        this.loadVideos();
                    }, 500);
                }
            }, 100);
        }
        
        // Process each file
        Array.from(files).forEach(file => {
            if (!file.type.startsWith('video/')) {
                this.showToast(`Skipped ${file.name}: Not a video file`, 'error');
                return;
            }
            
            if (file.size > 2 * 1024 * 1024 * 1024) { // 2GB limit
                this.showToast(`Skipped ${file.name}: File too large (max 2GB)`, 'error');
                return;
            }
            
            console.log('Processing file:', file.name, file.size, file.type);
        });
    }

    filterVideos() {
        this.renderVideos();
    }

    showBulkActions() {
        if (this.selectedVideos.size === 0) {
            this.showToast('Please select videos first', 'error');
            return;
        }
        
        const actions = [
            { label: 'Publish', action: 'publish', icon: 'check-circle' },
            { label: 'Unpublish', action: 'unpublish', icon: 'x-circle' },
            { label: 'Delete', action: 'bulk-delete', icon: 'trash', danger: true },
            { label: 'Move to Category', action: 'move-category', icon: 'folder' },
            { label: 'Download', action: 'bulk-download', icon: 'download' }
        ];
        
        // Create bulk actions menu
        const menu = document.createElement('div');
        menu.className = 'bulk-actions-menu glass-card';
        menu.innerHTML = `
            <div class="bulk-actions-header">
                <h4>${this.selectedVideos.size} Video(s) Selected</h4>
                <button class="btn-icon close-bulk-menu">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            <div class="bulk-actions-list">
                ${actions.map(action => `
                    <button class="bulk-action-item ${action.danger ? 'danger' : ''}" data-action="${action.action}">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            ${this.getBulkActionIcon(action.icon)}
                        </svg>
                        <span>${action.label}</span>
                    </button>
                `).join('')}
            </div>
        `;
        
        // Position menu
        const bulkBtn = document.getElementById('bulk-actions-btn');
        const rect = bulkBtn.getBoundingClientRect();
        
        menu.style.position = 'absolute';
        menu.style.top = `${rect.bottom + 5}px`;
        menu.style.right = `${window.innerWidth - rect.right}px`;
        menu.style.zIndex = '1000';
        
        document.body.appendChild(menu);
        
        // Event listeners
        menu.querySelector('.close-bulk-menu').addEventListener('click', () => {
            menu.remove();
        });
        
        menu.querySelectorAll('.bulk-action-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.target.closest('.bulk-action-item').dataset.action;
                this.handleBulkAction(action);
                menu.remove();
            });
        });
        
        // Close on outside click
        setTimeout(() => {
            const closeHandler = (e) => {
                if (!e.target.closest('.bulk-actions-menu') && !e.target.closest('#bulk-actions-btn')) {
                    menu.remove();
                    document.removeEventListener('click', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
        }, 10);
    }

    getBulkActionIcon(icon) {
        const icons = {
            'check-circle': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 01118 0z"/>',
            'x-circle': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>',
            'trash': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>',
            'folder': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>',
            'download': '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>'
        };
        return icons[icon] || '';
    }

    async handleBulkAction(action) {
        const selectedIds = Array.from(this.selectedVideos);
        
        try {
            switch (action) {
                case 'publish':
                    // await API.post('/admin/videos/bulk-publish', { ids: selectedIds });
                    this.showToast(`${selectedIds.length} video(s) published successfully`);
                    break;
                    
                case 'unpublish':
                    // await API.post('/admin/videos/bulk-unpublish', { ids: selectedIds });
                    this.showToast(`${selectedIds.length} video(s) unpublished`);
                    break;
                    
                case 'bulk-delete':
                    if (confirm(`Are you sure you want to delete ${selectedIds.length} video(s)?`)) {
                        // await API.post('/admin/videos/bulk-delete', { ids: selectedIds });
                        this.showToast(`${selectedIds.length} video(s) deleted successfully`);
                    }
                    break;
                    
                case 'move-category':
                    const category = prompt('Enter category name:');
                    if (category) {
                        // await API.post('/admin/videos/bulk-move', { ids: selectedIds, category });
                        this.showToast(`Moved ${selectedIds.length} video(s) to ${category}`);
                    }
                    break;
                    
                case 'bulk-download':
                    this.showToast('Bulk download started');
                    break;
            }
            
            // Clear selection and reload
            this.selectedVideos.clear();
            this.loadVideos();
            
        } catch (error) {
            console.error('Bulk action error:', error);
            this.showToast('Failed to perform bulk action', 'error');
        }
    }

    editVideo(videoId) {
        const video = this.videos.find(v => v.id === videoId);
        if (!video) return;
        
        const modal = document.getElementById('video-details-modal');
        const content = document.getElementById('video-details-content');
        
        content.innerHTML = `
            <div class="video-edit-form">
                <h3>Edit Video: ${video.title}</h3>
                <form id="edit-video-form" data-video-id="${video.id}">
                    <div class="form-group">
                        <label for="edit-title">Title</label>
                        <input type="text" id="edit-title" value="${video.title}" required>
                    </div>
                    <div class="form-group">
                        <label for="edit-description">Description</label>
                        <textarea id="edit-description" rows="3" required>${video.description}</textarea>
                    </div>
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="edit-category">Category</label>
                            <select id="edit-category" required>
                                <option value="success-stories" ${video.category === 'success-stories' ? 'selected' : ''}>Success Stories</option>
                                <option value="university-tours" ${video.category === 'university-tours' ? 'selected' : ''}>University Tours</option>
                                <option value="visa-guide" ${video.category === 'visa-guide' ? 'selected' : ''}>Visa Guide</option>
                                <option value="webinars" ${video.category === 'webinars' ? 'selected' : ''}>Live Webinars</option>
                                <option value="testimonials" ${video.category === 'testimonials' ? 'selected' : ''}>Testimonials</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="edit-status">Status</label>
                            <select id="edit-status" required>
                                <option value="published" ${video.status === 'published' ? 'selected' : ''}>Published</option>
                                <option value="draft" ${video.status === 'draft' ? 'selected' : ''}>Draft</option>
                                <option value="scheduled" ${video.status === 'scheduled' ? 'selected' : ''}>Scheduled</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Save Changes</button>
                        <button type="button" class="btn btn-outline modal-close">Cancel</button>
                    </div>
                </form>
            </div>
        `;
        
        modal.classList.add('active');
        
        // Form submission
        const form = document.getElementById('edit-video-form');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.saveVideoChanges(videoId, form);
            });
        }
    }

    async saveVideoChanges(videoId, form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        try {
            // In production, this would update via API
            // await API.put(`/admin/videos/${videoId}`, data);
            
            this.showToast('Video updated successfully');
            document.getElementById('video-details-modal').classList.remove('active');
            this.loadVideos();
            
        } catch (error) {
            console.error('Error updating video:', error);
            this.showToast('Failed to update video', 'error');
        }
    }

    async deleteVideo(videoId) {
        if (!confirm('Are you sure you want to delete this video?')) {
            return;
        }
        
        try {
            // In production, this would delete via API
            // await API.delete(`/admin/videos/${videoId}`);
            
            this.showToast('Video deleted successfully');
            this.loadVideos();
            
        } catch (error) {
            console.error('Error deleting video:', error);
            this.showToast('Failed to delete video', 'error');
        }
    }

    previewVideo(videoId) {
        const video = this.videos.find(v => v.id === videoId);
        if (!video) return;
        
        this.showToast(`Previewing: ${video.title}`);
        // In production, this would open a video player modal
    }

    handleDropdownAction(action, videoId) {
        switch (action) {
            case 'feature':
                this.featureVideo(videoId);
                break;
            case 'duplicate':
                this.duplicateVideo(videoId);
                break;
            case 'download':
                this.downloadVideo(videoId);
                break;
        }
    }

    featureVideo(videoId) {
        this.showToast('Video featured successfully');
    }

    duplicateVideo(videoId) {
        this.showToast('Video duplicated successfully');
    }

    downloadVideo(videoId) {
        this.showToast('Download started');
    }

    showUnauthorizedMessage() {
        this.showToast('You do not have permission to manage videos', 'error');
        setTimeout(() => {
            window.location.href = '../admin/dashboard.html';
        }, 3000);
    }

    showError(message) {
        const container = document.getElementById('videos-manager-container');
        if (container) {
            container.innerHTML = `
                <div class="error-message glass-card">
                    <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <h3>Oops! Something went wrong</h3>
                    <p>${message}</p>
                    <button class="btn btn-outline" onclick="window.location.reload()">
                        Try Again
                    </button>
                </div>
            `;
        }
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VideoManager();
});

export default VideoManager;
/**
 * Advertisement Manager for Admin Dashboard
 */

class AdManager {
    constructor() {
        this.ads = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.selectedAds = new Set();
        this.filters = {
            status: 'all',
            type: 'all',
            position: 'all',
            search: ''
        };
        this.init();
    }

    init() {
        this.loadAds();
        this.setupEventListeners();
        this.initializeDatePickers();
        this.setupAdPreview();
    }

    async loadAds(page = 1) {
        try {
            const params = new URLSearchParams({
                page,
                ...this.filters
            });
            
            const response = await fetch(`/api/v1/ads?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) throw new Error('Failed to load ads');
            
            const data = await response.json();
            this.ads = data.ads;
            this.currentPage = data.page;
            this.totalPages = data.totalPages;
            
            this.renderAds();
            this.renderPagination();
            this.updateStats();
        } catch (error) {
            this.showError(error.message);
        }
    }

    renderAds() {
        const container = document.getElementById('ads-container');
        if (!container) return;

        container.innerHTML = '';
        
        if (this.ads.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="icon-megaphone"></i>
                    <h3>No advertisements found</h3>
                    <p>Create your first ad campaign to get started</p>
                    <button class="btn btn-primary" id="create-first-ad">
                        <i class="icon-plus"></i> Create Ad
                    </button>
                </div>
            `;
            return;
        }

        this.ads.forEach(ad => {
            const adCard = this.createAdCard(ad);
            container.appendChild(adCard);
        });
    }

    createAdCard(ad) {
        const card = document.createElement('div');
        card.className = `ad-card ${ad.status} ${this.selectedAds.has(ad.id) ? 'selected' : ''}`;
        card.dataset.id = ad.id;
        
        const isSelected = this.selectedAds.has(ad.id);
        const statusClass = `status-${ad.status}`;
        const typeIcon = this.getAdTypeIcon(ad.type);
        
        card.innerHTML = `
            <div class="ad-card-header">
                <div class="ad-checkbox">
                    <input type="checkbox" id="ad-${ad.id}" ${isSelected ? 'checked' : ''}>
                    <label for="ad-${ad.id}"></label>
                </div>
                <div class="ad-status ${statusClass}">
                    <span class="status-dot"></span>
                    ${ad.status.charAt(0).toUpperCase() + ad.status.slice(1)}
                </div>
            </div>
            <div class="ad-preview">
                <div class="ad-type-icon">${typeIcon}</div>
                ${ad.image_url ? `
                    <img src="${ad.image_url}" alt="${ad.title}" class="ad-image">
                ` : `
                    <div class="ad-text-preview">
                        <h4>${ad.title}</h4>
                        <p>${ad.description || ''}</p>
                    </div>
                `}
            </div>
            <div class="ad-info">
                <h4 class="ad-title">${ad.title}</h4>
                <div class="ad-meta">
                    <span class="ad-type">${this.formatAdType(ad.type)}</span>
                    <span class="ad-position">${this.formatPosition(ad.position)}</span>
                </div>
                <div class="ad-stats">
                    <div class="stat">
                        <span class="stat-label">Impressions</span>
                        <span class="stat-value">${ad.impressions?.toLocaleString() || 0}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Clicks</span>
                        <span class="stat-value">${ad.clicks?.toLocaleString() || 0}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">CTR</span>
                        <span class="stat-value">${this.calculateCTR(ad)}%</span>
                    </div>
                </div>
                <div class="ad-dates">
                    <div class="date">
                        <span class="date-label">Starts:</span>
                        <span class="date-value">${this.formatDate(ad.start_date)}</span>
                    </div>
                    <div class="date">
                        <span class="date-label">Ends:</span>
                        <span class="date-value">${ad.end_date ? this.formatDate(ad.end_date) : 'Never'}</span>
                    </div>
                </div>
            </div>
            <div class="ad-actions">
                <button class="btn-icon btn-edit" title="Edit" data-id="${ad.id}">
                    <i class="icon-edit"></i>
                </button>
                <button class="btn-icon btn-toggle" title="${ad.status === 'active' ? 'Pause' : 'Activate'}" data-id="${ad.id}">
                    <i class="icon-${ad.status === 'active' ? 'pause' : 'play'}"></i>
                </button>
                <button class="btn-icon btn-stats" title="View Statistics" data-id="${ad.id}">
                    <i class="icon-chart"></i>
                </button>
                <button class="btn-icon btn-delete" title="Delete" data-id="${ad.id}">
                    <i class="icon-trash"></i>
                </button>
            </div>
        `;
        
        return card;
    }

    setupEventListeners() {
        // Create ad button
        document.getElementById('create-ad')?.addEventListener('click', () => {
            this.showCreateModal();
        });

        // Bulk actions
        document.getElementById('bulk-select-all')?.addEventListener('change', (e) => {
            this.toggleSelectAll(e.target.checked);
        });

        document.getElementById('bulk-delete')?.addEventListener('click', () => {
            this.deleteSelectedAds();
        });

        document.getElementById('bulk-activate')?.addEventListener('click', () => {
            this.toggleSelectedAdsStatus('active');
        });

        document.getElementById('bulk-pause')?.addEventListener('click', () => {
            this.toggleSelectedAdsStatus('paused');
        });

        // Filters
        document.getElementById('filter-status')?.addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.loadAds(1);
        });

        document.getElementById('filter-type')?.addEventListener('change', (e) => {
            this.filters.type = e.target.value;
            this.loadAds(1);
        });

        document.getElementById('filter-position')?.addEventListener('change', (e) => {
            this.filters.position = e.target.value;
            this.loadAds(1);
        });

        document.getElementById('filter-search')?.addEventListener('input', (e) => {
            this.debounce(() => {
                this.filters.search = e.target.value;
                this.loadAds(1);
            }, 300);
        });

        // Ad card events (delegated)
        document.addEventListener('click', (e) => {
            // Checkbox selection
            if (e.target.closest('.ad-checkbox input')) {
                const checkbox = e.target;
                const card = checkbox.closest('.ad-card');
                const adId = card.dataset.id;
                
                if (checkbox.checked) {
                    this.selectedAds.add(adId);
                    card.classList.add('selected');
                } else {
                    this.selectedAds.delete(adId);
                    card.classList.remove('selected');
                }
                this.updateBulkActions();
            }
            
            // Edit button
            if (e.target.closest('.btn-edit')) {
                const button = e.target.closest('.btn-edit');
                const adId = button.dataset.id;
                this.editAd(adId);
            }
            
            // Toggle status button
            if (e.target.closest('.btn-toggle')) {
                const button = e.target.closest('.btn-toggle');
                const adId = button.dataset.id;
                this.toggleAdStatus(adId);
            }
            
            // Stats button
            if (e.target.closest('.btn-stats')) {
                const button = e.target.closest('.btn-stats');
                const adId = button.dataset.id;
                this.showAdStats(adId);
            }
            
            // Delete button
            if (e.target.closest('.btn-delete')) {
                const button = e.target.closest('.btn-delete');
                const adId = button.dataset.id;
                this.deleteAd(adId);
            }
        });
    }

    initializeDatePickers() {
        // Initialize flatpickr for date inputs if available
        if (typeof flatpickr !== 'undefined') {
            flatpickr('#ad-start-date', {
                enableTime: true,
                dateFormat: "Y-m-d H:i",
                minDate: "today"
            });
            
            flatpickr('#ad-end-date', {
                enableTime: true,
                dateFormat: "Y-m-d H:i",
                minDate: "today"
            });
        }
    }

    setupAdPreview() {
        const previewContainer = document.getElementById('ad-preview');
        if (!previewContainer) return;

        // Update preview when ad details change
        const updatePreview = () => {
            const type = document.getElementById('ad-type')?.value;
            const position = document.getElementById('ad-position')?.value;
            const title = document.getElementById('ad-title')?.value;
            const description = document.getElementById('ad-description')?.value;
            const url = document.getElementById('ad-url')?.value;
            
            previewContainer.innerHTML = this.generatePreview(type, position, {
                title,
                description,
                url
            });
        };

        // Listen for changes in form fields
        ['#ad-type', '#ad-position', '#ad-title', '#ad-description', '#ad-url'].forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                element.addEventListener('input', updatePreview);
                element.addEventListener('change', updatePreview);
            }
        });

        // Initial preview
        updatePreview();
    }

    generatePreview(type, position, data) {
        const previewClass = `ad-preview-${position}`;
        
        switch(type) {
            case 'banner':
                return `
                    <div class="ad-preview-banner ${previewClass}">
                        <div class="banner-content">
                            <h4>${data.title || 'Banner Ad Title'}</h4>
                            ${data.description ? `<p>${data.description}</p>` : ''}
                            ${data.url ? `<a href="${data.url}" class="btn btn-small">Learn More</a>` : ''}
                        </div>
                    </div>
                `;
                
            case 'sidebar':
                return `
                    <div class="ad-preview-sidebar ${previewClass}">
                        <div class="sidebar-ad">
                            <h5>${data.title || 'Sidebar Ad'}</h5>
                            ${data.description ? `<p>${data.description}</p>` : ''}
                            ${data.url ? `<a href="${data.url}" class="btn-link">Visit Now</a>` : ''}
                        </div>
                    </div>
                `;
                
            case 'video':
                return `
                    <div class="ad-preview-video ${previewClass}">
                        <div class="video-ad-placeholder">
                            <div class="play-button"></div>
                            <h5>${data.title || 'Video Ad'}</h5>
                        </div>
                    </div>
                `;
                
            case 'popup':
                return `
                    <div class="ad-preview-popup">
                        <div class="popup-ad">
                            <button class="popup-close">&times;</button>
                            <h4>${data.title || 'Special Offer!'}</h4>
                            <p>${data.description || 'Limited time offer. Click to learn more.'}</p>
                            ${data.url ? `<a href="${data.url}" class="btn btn-primary">Claim Offer</a>` : ''}
                        </div>
                    </div>
                `;
                
            default:
                return '<div class="ad-preview-default">Preview will appear here</div>';
        }
    }

    async createAd(formData) {
        try {
            const response = await fetch('/api/v1/ads', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) throw new Error('Failed to create ad');
            
            const ad = await response.json();
            this.showSuccess('Advertisement created successfully');
            this.loadAds(this.currentPage);
            return ad;
        } catch (error) {
            this.showError(error.message);
            throw error;
        }
    }

    async editAd(adId) {
        const ad = this.ads.find(a => a.id === adId);
        if (!ad) return;
        
        const modal = this.createEditModal(ad);
        document.body.appendChild(modal);
        
        // Show modal
        setTimeout(() => modal.classList.add('active'), 10);
        
        // Handle form submission
        const form = modal.querySelector('.edit-ad-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(form);
            const updates = Object.fromEntries(formData);
            
            try {
                const response = await fetch(`/api/v1/ads/${adId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updates)
                });
                
                if (!response.ok) throw new Error('Update failed');
                
                this.showSuccess('Advertisement updated successfully');
                this.loadAds(this.currentPage);
                modal.remove();
            } catch (error) {
                this.showError(error.message);
            }
        });
    }

    createEditModal(ad) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-overlay" data-modal-close="edit-ad"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit Advertisement</h3>
                    <button class="modal-close" data-modal-close="edit-ad">&times;</button>
                </div>
                <div class="modal-body">
                    <form class="edit-ad-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="edit-ad-title">Title *</label>
                                <input type="text" id="edit-ad-title" name="title" 
                                       value="${ad.title}" required>
                            </div>
                            <div class="form-group">
                                <label for="edit-ad-status">Status</label>
                                <select id="edit-ad-status" name="status">
                                    <option value="draft" ${ad.status === 'draft' ? 'selected' : ''}>Draft</option>
                                    <option value="active" ${ad.status === 'active' ? 'selected' : ''}>Active</option>
                                    <option value="paused" ${ad.status === 'paused' ? 'selected' : ''}>Paused</option>
                                    <option value="expired" ${ad.status === 'expired' ? 'selected' : ''}>Expired</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="edit-ad-type">Type *</label>
                                <select id="edit-ad-type" name="type" required>
                                    <option value="banner" ${ad.type === 'banner' ? 'selected' : ''}>Banner</option>
                                    <option value="sidebar" ${ad.type === 'sidebar' ? 'selected' : ''}>Sidebar</option>
                                    <option value="video" ${ad.type === 'video' ? 'selected' : ''}>Video</option>
                                    <option value="popup" ${ad.type === 'popup' ? 'selected' : ''}>Popup</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="edit-ad-position">Position *</label>
                                <select id="edit-ad-position" name="position" required>
                                    <option value="header" ${ad.position === 'header' ? 'selected' : ''}>Header</option>
                                    <option value="sidebar" ${ad.position === 'sidebar' ? 'selected' : ''}>Sidebar</option>
                                    <option value="footer" ${ad.position === 'footer' ? 'selected' : ''}>Footer</option>
                                    <option value="inline" ${ad.position === 'inline' ? 'selected' : ''}>Inline Content</option>
                                    <option value="popup" ${ad.position === 'popup' ? 'selected' : ''}>Popup</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-ad-description">Description</label>
                            <textarea id="edit-ad-description" name="description" rows="3">${ad.description || ''}</textarea>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="edit-ad-url">Target URL *</label>
                                <input type="url" id="edit-ad-url" name="url" 
                                       value="${ad.url || ''}" required>
                            </div>
                            <div class="form-group">
                                <label for="edit-ad-image-url">Image URL</label>
                                <input type="url" id="edit-ad-image-url" name="image_url" 
                                       value="${ad.image_url || ''}">
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="edit-ad-start-date">Start Date *</label>
                                <input type="datetime-local" id="edit-ad-start-date" name="start_date" 
                                       value="${this.formatDateTimeLocal(ad.start_date)}" required>
                            </div>
                            <div class="form-group">
                                <label for="edit-ad-end-date">End Date</label>
                                <input type="datetime-local" id="edit-ad-end-date" name="end_date" 
                                       value="${ad.end_date ? this.formatDateTimeLocal(ad.end_date) : ''}">
                                <small>Leave empty for no end date</small>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-ad-pages">Show on Pages</label>
                            <select id="edit-ad-pages" name="pages" multiple>
                                <option value="home" ${ad.pages?.includes('home') ? 'selected' : ''}>Homepage</option>
                                <option value="services" ${ad.pages?.includes('services') ? 'selected' : ''}>Services</option>
                                <option value="blogs" ${ad.pages?.includes('blogs') ? 'selected' : ''}>Blogs</option>
                                <option value="videos" ${ad.pages?.includes('videos') ? 'selected' : ''}>Videos</option>
                                <option value="contact" ${ad.pages?.includes('contact') ? 'selected' : ''}>Contact</option>
                            </select>
                            <small>Hold Ctrl/Cmd to select multiple</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-ad-max-impressions">Max Impressions</label>
                            <input type="number" id="edit-ad-max-impressions" name="max_impressions" 
                                   value="${ad.max_impressions || ''}" min="0">
                            <small>Leave empty for unlimited</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-ad-max-clicks">Max Clicks</label>
                            <input type="number" id="edit-ad-max-clicks" name="max_clicks" 
                                   value="${ad.max_clicks || ''}" min="0">
                            <small>Leave empty for unlimited</small>
                        </div>
                        
                        <div class="form-actions">
                            <button type="button" class="btn btn-outline" data-modal-close="edit-ad">Cancel</button>
                            <button type="submit" class="btn btn-primary">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        return modal;
    }

    async toggleAdStatus(adId) {
        const ad = this.ads.find(a => a.id === adId);
        if (!ad) return;
        
        const newStatus = ad.status === 'active' ? 'paused' : 'active';
        
        try {
            const response = await fetch(`/api/v1/ads/${adId}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });
            
            if (!response.ok) throw new Error('Failed to update status');
            
            this.showSuccess(`Ad ${newStatus === 'active' ? 'activated' : 'paused'} successfully`);
            this.loadAds(this.currentPage);
        } catch (error) {
            this.showError(error.message);
        }
    }

    async toggleSelectedAdsStatus(status) {
        if (this.selectedAds.size === 0) {
            this.showError('No ads selected');
            return;
        }
        
        try {
            const response = await fetch('/api/v1/ads/bulk-status', {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ad_ids: Array.from(this.selectedAds),
                    status: status
                })
            });
            
            if (!response.ok) throw new Error('Bulk update failed');
            
            this.showSuccess(`${this.selectedAds.size} ads updated successfully`);
            this.selectedAds.clear();
            this.loadAds(this.currentPage);
            this.updateBulkActions();
        } catch (error) {
            this.showError(error.message);
        }
    }

    async deleteAd(adId) {
        if (!confirm('Are you sure you want to delete this advertisement?')) return;
        
        try {
            const response = await fetch(`/api/v1/ads/${adId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) throw new Error('Delete failed');
            
            this.showSuccess('Advertisement deleted successfully');
            this.loadAds(this.currentPage);
        } catch (error) {
            this.showError(error.message);
        }
    }

    async deleteSelectedAds() {
        if (this.selectedAds.size === 0) {
            this.showError('No ads selected');
            return;
        }
        
        if (!confirm(`Delete ${this.selectedAds.size} selected ads?`)) return;
        
        try {
            const response = await fetch('/api/v1/ads/bulk-delete', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ ad_ids: Array.from(this.selectedAds) })
            });
            
            if (!response.ok) throw new Error('Bulk delete failed');
            
            this.showSuccess(`${this.selectedAds.size} ads deleted successfully`);
            this.selectedAds.clear();
            this.loadAds(this.currentPage);
            this.updateBulkActions();
        } catch (error) {
            this.showError(error.message);
        }
    }

    async showAdStats(adId) {
        try {
            const response = await fetch(`/api/v1/ads/${adId}/stats`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) throw new Error('Failed to load statistics');
            
            const stats = await response.json();
            this.displayStatsModal(stats);
        } catch (error) {
            this.showError(error.message);
        }
    }

    displayStatsModal(stats) {
        const modal = document.createElement('div');
        modal.className = 'modal stats-modal';
        modal.innerHTML = `
            <div class="modal-overlay" data-modal-close="stats"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Advertisement Statistics</h3>
                    <button class="modal-close" data-modal-close="stats">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="stats-summary">
                        <div class="stat-card">
                            <div class="stat-value">${stats.impressions?.toLocaleString() || 0}</div>
                            <div class="stat-label">Impressions</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${stats.clicks?.toLocaleString() || 0}</div>
                            <div class="stat-label">Clicks</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">${this.calculateCTR(stats)}%</div>
                            <div class="stat-label">CTR</div>
                        </div>
                    </div>
                    
                    <div class="stats-chart">
                        <canvas id="stats-chart" width="400" height="200"></canvas>
                    </div>
                    
                    <div class="stats-table">
                        <h4>Performance by Day</h4>
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Impressions</th>
                                    <th>Clicks</th>
                                    <th>CTR</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${stats.daily_data?.map(day => `
                                    <tr>
                                        <td>${this.formatDate(day.date)}</td>
                                        <td>${day.impressions}</td>
                                        <td>${day.clicks}</td>
                                        <td>${day.ctr}%</td>
                                    </tr>
                                `).join('') || '<tr><td colspan="4">No daily data available</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Show modal
        setTimeout(() => modal.classList.add('active'), 10);
        
        // Initialize chart if Chart.js is available
        if (typeof Chart !== 'undefined' && stats.daily_data) {
            this.initializeStatsChart(stats.daily_data);
        }
    }

    initializeStatsChart(dailyData) {
        const ctx = document.getElementById('stats-chart')?.getContext('2d');
        if (!ctx) return;
        
        const dates = dailyData.map(day => this.formatDate(day.date, true));
        const impressions = dailyData.map(day => day.impressions);
        const clicks = dailyData.map(day => day.clicks);
        
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'Impressions',
                        data: impressions,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Clicks',
                        data: clicks,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Utility methods
    getAdTypeIcon(type) {
        const icons = {
            banner: '📱',
            sidebar: '📊',
            video: '🎥',
            popup: '💥'
        };
        return icons[type] || '📢';
    }

    formatAdType(type) {
        return type.charAt(0).toUpperCase() + type.slice(1);
    }

    formatPosition(position) {
        const positions = {
            header: 'Header',
            sidebar: 'Sidebar',
            footer: 'Footer',
            inline: 'Inline',
            popup: 'Popup'
        };
        return positions[position] || position;
    }

    calculateCTR(ad) {
        if (!ad.impressions || ad.impressions === 0) return '0.00';
        const ctr = (ad.clicks || 0) / ad.impressions * 100;
        return ctr.toFixed(2);
    }

    formatDate(dateString, short = false) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        
        if (short) {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric'
            });
        }
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    formatDateTimeLocal(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const offset = date.getTimezoneOffset() * 60000;
        const localDate = new Date(date.getTime() - offset);
        return localDate.toISOString().slice(0, 16);
    }

    toggleSelectAll(selectAll) {
        const checkboxes = document.querySelectorAll('.ad-checkbox input');
        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAll;
            const card = checkbox.closest('.ad-card');
            const adId = card.dataset.id;
            
            if (selectAll) {
                this.selectedAds.add(adId);
                card.classList.add('selected');
            } else {
                this.selectedAds.delete(adId);
                card.classList.remove('selected');
            }
        });
        
        this.updateBulkActions();
    }

    updateBulkActions() {
        const bulkActions = document.getElementById('bulk-actions');
        const selectedCount = document.getElementById('selected-count');
        
        if (this.selectedAds.size > 0) {
            bulkActions?.classList.add('active');
            if (selectedCount) {
                selectedCount.textContent = `${this.selectedAds.size} selected`;
            }
        } else {
            bulkActions?.classList.remove('active');
        }
    }

    updateStats() {
        const stats = {
            total: this.ads.length,
            active: this.ads.filter(ad => ad.status === 'active').length,
            paused: this.ads.filter(ad => ad.status === 'paused').length,
            draft: this.ads.filter(ad => ad.status === 'draft').length,
            expired: this.ads.filter(ad => ad.status === 'expired').length,
            totalImpressions: this.ads.reduce((sum, ad) => sum + (ad.impressions || 0), 0),
            totalClicks: this.ads.reduce((sum, ad) => sum + (ad.clicks || 0), 0)
        };
        
        // Update UI elements
        document.querySelectorAll('[data-stat="total-ads"]').forEach(el => {
            el.textContent = stats.total;
        });
        
        document.querySelectorAll('[data-stat="active-ads"]').forEach(el => {
            el.textContent = stats.active;
        });
        
        document.querySelectorAll('[data-stat="total-impressions"]').forEach(el => {
            el.textContent = stats.totalImpressions.toLocaleString();
        });
        
        document.querySelectorAll('[data-stat="total-clicks"]').forEach(el => {
            el.textContent = stats.totalClicks.toLocaleString();
        });
        
        const overallCTR = stats.totalImpressions > 0 
            ? ((stats.totalClicks / stats.totalImpressions) * 100).toFixed(2)
            : '0.00';
            
        document.querySelectorAll('[data-stat="overall-ctr"]').forEach(el => {
            el.textContent = `${overallCTR}%`;
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
                this.loadAds(this.currentPage - 1);
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
                this.loadAds(i);
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
                this.loadAds(this.currentPage + 1);
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
    const adManager = new AdManager();
    window.adManager = adManager;
});
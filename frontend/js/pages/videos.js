/**
 * Videos Page JavaScript
 * Handles video filtering, playback, and dynamic loading
 */

import { lazyLoadImages, lazyLoadVideos, setupScrollAnimations } from '../effects/scroll-animations.js';
import { setupFilter } from '../effects/filters.js';
import VideoPlayer from '../components/video-player.js';
import API from '../core/api.js';

class VideosPage {
    constructor() {
        this.currentPage = 1;
        this.isLoading = false;
        this.hasMore = true;
        this.currentCategory = 'all';
        this.currentSort = 'latest';
        this.currentSearch = '';
        this.videos = [];

        this.videoPlayer = null;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initAnimations();
        this.loadVideos();
        this.setupVideoPlayer();
    }

    setupEventListeners() {
        // Category filter tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.currentCategory = e.target.dataset.category;
                this.currentPage = 1;
                document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.loadVideos();
            });
        });

        // Search functionality
        const searchInput = document.getElementById('video-search');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.currentSearch = e.target.value.toLowerCase();
                    this.currentPage = 1;
                    this.loadVideos();
                }, 500);
            });
        }

        // Sort functionality
        const sortSelect = document.getElementById('video-sort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.sortVideos();
                this.renderVideos();
            });
        }

        // View toggle
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.toggleView(view);
            });
        });

        // Load more button
        const loadMoreBtn = document.getElementById('load-more-videos');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.currentPage++;
                this.loadVideos(true);
            });
        }

        // Video submission button
        const submitBtn = document.getElementById('submit-video-btn');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => {
                this.openSubmitModal();
            });
        }

        // Featured video play button
        const featuredPlayBtn = document.querySelector('.featured-video-container .play-btn');
        if (featuredPlayBtn) {
            featuredPlayBtn.addEventListener('click', () => {
                this.playFeaturedVideo();
            });
        }

        // Live event reminder button
        const reminderBtn = document.querySelector('.live-events-container .btn-primary');
        if (reminderBtn) {
            reminderBtn.addEventListener('click', () => {
                this.setReminder();
            });
        }

        // Video modals
        this.setupModalEvents();
    }

    setupModalEvents() {
        const videoModal = document.getElementById('video-modal');
        const submitModal = document.getElementById('submit-modal');

        if (videoModal) {
            videoModal.querySelector('.modal-close').addEventListener('click', () => {
                videoModal.classList.remove('active');
                if (this.videoPlayer) this.videoPlayer.pause();
                // If iframe, clear src to stop video
                const iframe = videoModal.querySelector('iframe');
                if (iframe) iframe.src = '';
            });
            videoModal.addEventListener('click', (e) => {
                if (e.target === videoModal) {
                    videoModal.classList.remove('active');
                    if (this.videoPlayer) this.videoPlayer.pause();
                    const iframe = videoModal.querySelector('iframe');
                    if (iframe) iframe.src = '';
                }
            });
        }

        if (submitModal) {
            submitModal.querySelector('.modal-close').addEventListener('click', () => {
                submitModal.classList.remove('active');
            });
            submitModal.addEventListener('click', (e) => {
                if (e.target === submitModal) {
                    submitModal.classList.remove('active');
                }
            });

            // Submission form
            const submitForm = document.getElementById('video-submission-form');
            if (submitForm) {
                submitForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.submitVideo(submitForm);
                });
            }
        }
    }

    initAnimations() {
        lazyLoadImages();
        lazyLoadVideos();
        setupScrollAnimations();

        // Animate playlist cards
        const playlistCards = document.querySelectorAll('.playlist-card');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.classList.add('animate-fade-in');
                    }, index * 100);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });

        playlistCards.forEach(card => observer.observe(card));
    }

    setupVideoPlayer() {
        // Initialize video player for all lazy-loaded videos
        const lazyVideos = document.querySelectorAll('.lazy-video');
        lazyVideos.forEach(video => {
            video.addEventListener('click', (e) => {
                if (e.target.closest('.play-btn')) {
                    const videoUrl = video.dataset.src;
                    const thumbnail = video.dataset.thumbnail;
                    const title = video.querySelector('.video-title')?.textContent || 'Video';

                    this.openVideoModal(videoUrl, thumbnail, title);
                }
            });
        });
    }

    async loadVideos(append = false) {
        if (this.isLoading) return;

        this.isLoading = true;

        // Show loading skeleton
        if (!append) {
            const container = document.getElementById('videos-container');
            container.innerHTML = this.generateSkeletonGrid(6);
        }

        try {
            // In production, this would fetch from API
            // const response = await API.get('/videos', {
            //     page: this.currentPage,
            //     category: this.currentCategory !== 'all' ? this.currentCategory : undefined,
            //     sort: this.currentSort,
            //     search: this.currentSearch
            // });
            // const data = await response.json();

            // Mock data for demonstration
            const mockVideos = this.generateMockVideos();

            if (append) {
                this.videos = [...this.videos, ...mockVideos];
            } else {
                this.videos = mockVideos;
            }

            this.sortVideos();
            this.renderVideos(append);
            this.hasMore = mockVideos.length === 12; // Assuming 12 per page

        } catch (error) {
            console.error('Error loading videos:', error);
            this.showError('Failed to load videos. Please try again.');
        } finally {
            this.isLoading = false;
        }
    }

    generateMockVideos() {
        const categories = ['success-stories', 'university-tours', 'visa-guide', 'webinars', 'testimonials'];
        const durations = ['5:42', '12:18', '25:30', '8:15', '45:20', '3:55'];

        return Array.from({ length: 12 }, (_, i) => ({
            id: i + 1,
            title: `Study Abroad Success Story #${i + 1}: Journey to ${i % 2 === 0 ? 'Canada' : 'Australia'}`,
            description: 'Watch this inspiring journey of a student who achieved their dream of studying abroad.',
            category: categories[i % categories.length],
            duration: durations[i % durations.length],
            views: Math.floor(Math.random() * 10000) + 1000,
            thumbnail: `/assets/images/videos/thumb${(i % 6) + 1}.jpg`,
            videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
            featured: i < 3,
            date: new Date(Date.now() - i * 86400000).toLocaleDateString(),
            tags: ['Success', 'Student Life', 'Visa Tips', 'University Tour']
        }));
    }

    sortVideos() {
        switch (this.currentSort) {
            case 'popular':
                this.videos.sort((a, b) => b.views - a.views);
                break;
            case 'featured':
                this.videos.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
                break;
            case 'duration':
                this.videos.sort((a, b) => {
                    const durationA = this.parseDuration(a.duration);
                    const durationB = this.parseDuration(b.duration);
                    return durationA - durationB;
                });
                break;
            case 'latest':
            default:
                this.videos.sort((a, b) => new Date(b.date) - new Date(a.date));
        }
    }

    parseDuration(duration) {
        const parts = duration.split(':').map(Number);
        if (parts.length === 2) return parts[0] * 60 + parts[1]; // MM:SS
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS
        return 0;
    }

    generateSkeletonGrid(count) {
        return Array.from({ length: count }, () => `
            <div class="video-skeleton glass-card">
                <div class="skeleton-thumbnail"></div>
                <div class="skeleton-title"></div>
                <div class="skeleton-text"></div>
                <div class="skeleton-meta"></div>
            </div>
        `).join('');
    }

    renderVideos(append = false) {
        const container = document.getElementById('videos-container');

        if (!append) {
            container.innerHTML = '';
        }

        if (this.videos.length === 0) {
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

        // Filter videos by category
        const filteredVideos = this.currentCategory === 'all'
            ? this.videos
            : this.videos.filter(video => video.category === this.currentCategory);

        // Filter by search
        const searchedVideos = this.currentSearch
            ? filteredVideos.filter(video =>
                video.title.toLowerCase().includes(this.currentSearch) ||
                video.description.toLowerCase().includes(this.currentSearch) ||
                video.tags.some(tag => tag.toLowerCase().includes(this.currentSearch))
            )
            : filteredVideos;

        if (searchedVideos.length === 0) {
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

        container.innerHTML = searchedVideos.map(video => `
            <div class="video-card glass-card hover-glow" data-category="${video.category}">
                <div class="video-thumbnail lazy-video" 
                     data-src="${video.videoUrl}"
                     data-thumbnail="${video.thumbnail}">
                    <div class="thumbnail-overlay">
                        <button class="play-btn">
                            <svg class="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/>
                            </svg>
                        </button>
                        <span class="video-duration">${video.duration}</span>
                        ${video.featured ? '<span class="featured-badge">Featured</span>' : ''}
                    </div>
                </div>
                <div class="video-info">
                    <h3 class="video-title">${video.title}</h3>
                    <div class="video-meta">
                        <span class="video-category">${this.getCategoryName(video.category)}</span>
                        <span class="video-views">${this.formatViews(video.views)} views</span>
                        <span class="video-date">${video.date}</span>
                    </div>
                    <p class="video-description">${video.description}</p>
                    <div class="video-tags">
                        ${video.tags.map(tag => `<span class="video-tag">${tag}</span>`).join('')}
                    </div>
                    <div class="video-actions">
                        <button class="btn-icon save-btn" data-video-id="${video.id}" title="Save">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                            </svg>
                        </button>
                        <button class="btn-icon share-btn" data-video-id="${video.id}" title="Share">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        // Re-setup video player for new videos
        this.setupVideoPlayer();

        // Add event listeners to action buttons
        container.querySelectorAll('.save-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const videoId = parseInt(e.target.closest('.save-btn').dataset.videoId);
                this.saveVideo(videoId);
            });
        });

        container.querySelectorAll('.share-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const videoId = parseInt(e.target.closest('.share-btn').dataset.videoId);
                this.shareVideo(videoId);
            });
        });

        // Update load more button
        const loadMoreBtn = document.getElementById('load-more-videos');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = this.hasMore ? 'block' : 'none';
        }

        // Update featured video
        const featuredVideo = this.videos.find(v => v.featured) || this.videos[0];
        if (featuredVideo) {
            this.updateFeaturedVideo(featuredVideo);
        }
    }

    getCategoryName(category) {
        const categories = {
            'success-stories': 'Success Stories',
            'university-tours': 'University Tours',
            'visa-guide': 'Visa Guide',
            'webinars': 'Live Webinars',
            'testimonials': 'Testimonials'
        };
        return categories[category] || category;
    }

    formatViews(views) {
        if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
        if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
        return views.toString();
    }

    updateFeaturedVideo(video) {
        const container = document.querySelector('.featured-video-container');
        if (!container) return;

        const videoWrapper = container.querySelector('.featured-video-wrapper');
        videoWrapper.innerHTML = `
            <div class="featured-video-player">
                <div class="video-player" id="featured-video-player">
                    <div class="video-placeholder lazy-video" 
                         data-src="${video.videoUrl}"
                         data-thumbnail="${video.thumbnail}">
                        <div class="video-overlay">
                            <button class="play-btn">
                                <svg class="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"/>
                                </svg>
                            </button>
                            <div class="video-info">
                                <h3 class="video-title">${video.title}</h3>
                                <p class="video-duration">${video.duration}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="featured-video-info">
                <h3 class="video-title">${video.title}</h3>
                <div class="video-meta">
                    <span class="video-category badge">${this.getCategoryName(video.category)}</span>
                    <span class="video-date">Posted ${video.date}</span>
                    <span class="video-views">${this.formatViews(video.views)} views</span>
                </div>
                <p class="video-description">${video.description}</p>
                <div class="video-actions">
                    <button class="btn btn-outline save-featured" data-video-id="${video.id}">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                        </svg>
                        Save
                    </button>
                    <button class="btn btn-outline share-featured" data-video-id="${video.id}">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                        </svg>
                        Share
                    </button>
                </div>
            </div>
        `;

        // Add event listeners to featured video
        const playBtn = container.querySelector('.play-btn');
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                this.openVideoModal(video.videoUrl, video.thumbnail, video.title);
            });
        }

        const saveBtn = container.querySelector('.save-featured');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveVideo(video.id));
        }

        const shareBtn = container.querySelector('.share-featured');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => this.shareVideo(video.id));
        }
    }

    toggleView(view) {
        const container = document.getElementById('videos-container');
        container.className = `videos-${view}`;
    }

    playFeaturedVideo() {
        const videoContainer = document.querySelector('.featured-video-container');
        const videoUrl = videoContainer.querySelector('.lazy-video')?.dataset.src;
        const thumbnail = videoContainer.querySelector('.lazy-video')?.dataset.thumbnail;
        const title = videoContainer.querySelector('.video-title')?.textContent || 'Featured Video';

        if (videoUrl) {
            this.openVideoModal(videoUrl, thumbnail, title);
        }
    }

    openVideoModal(videoUrl, thumbnail, title) {
        const modal = document.getElementById('video-modal');
        const playerContainer = document.getElementById('video-modal-player');
        const infoContainer = document.getElementById('video-modal-info');

        playerContainer.innerHTML = `
            <div class="modal-video-player">
                <iframe src="${videoUrl}?autoplay=1&rel=0" 
                        frameborder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen>
                </iframe>
            </div>
        `;

        infoContainer.innerHTML = `
            <div class="modal-video-info">
                <h3>${title}</h3>
                <div class="video-actions-modal">
                    <button class="btn btn-outline">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/>
                        </svg>
                        Save
                    </button>
                    <button class="btn btn-outline" onclick="this.shareVideo()">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                        </svg>
                        Share
                    </button>
                </div>
            </div>
        `;

        modal.classList.add('active');
    }

    openSubmitModal() {
        const modal = document.getElementById('submit-modal');
        modal.classList.add('active');
    }

    async submitVideo(form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        try {
            // In production, this would submit to API
            // await API.post('/videos/submit', data);

            this.showToast('Video submitted successfully! It will be reviewed by our team.');
            form.reset();
            document.getElementById('submit-modal').classList.remove('active');

        } catch (error) {
            console.error('Error submitting video:', error);
            this.showToast('Failed to submit video. Please try again.', 'error');
        }
    }

    saveVideo(videoId) {
        // In production, this would save to user's account
        this.showToast('Video saved to your library');
    }

    shareVideo(videoId) {
        const video = this.videos.find(v => v.id === videoId);
        if (!video) return;

        if (navigator.share) {
            navigator.share({
                title: video.title,
                text: video.description,
                url: window.location.href + `?video=${videoId}`
            });
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(window.location.href + `?video=${videoId}`);
            this.showToast('Link copied to clipboard!');
        }
    }

    setReminder() {
        // In production, this would set calendar reminder
        this.showToast('Reminder set for live event!');
    }

    showError(message) {
        const container = document.getElementById('videos-container');
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

// Export for module usage
export default VideosPage;

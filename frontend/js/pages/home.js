/**
 * Home Page JavaScript
 */

import API from '../core/api.js';

class HomePage {
    constructor() {
        this.featuredServices = [];
        this.featuredVideos = [];
        this.testimonials = [];
        this.stats = {};
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.setupAnimations();
        this.setupAds();
    }

    async loadData() {
        try {
            // Load featured services
            const servicesData = await API.get('/services', { featured: true, limit: 4 });
            this.featuredServices = servicesData.services || [];
            this.renderFeaturedServices();

            // Load featured videos
            const videosData = await API.get('/videos', { featured: true, limit: 3 });
            this.featuredVideos = videosData.videos || [];
            this.renderFeaturedVideos();

            // Load testimonials
            const testimonialsData = await API.get('/testimonials', { featured: true, limit: 5 });
            this.testimonials = testimonialsData.testimonials || [];
            this.renderTestimonials();

            // Load stats
            const statsData = await API.get('/stats');
            this.stats = statsData || {};
            this.updateStats();

            // Load homepage ad
            this.loadHomepageAd();

        } catch (error) {
            console.error('Failed to load home page data:', error);
        }
    }

    renderFeaturedServices() {
        const container = document.getElementById('featured-services-container');
        if (!container) return;

        container.innerHTML = '';

        if (this.featuredServices.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No featured services available at the moment.</p>
                </div>
            `;
            return;
        }

        this.featuredServices.forEach(service => {
            const serviceCard = this.createServiceCard(service);
            container.appendChild(serviceCard);
        });
    }

    createServiceCard(service) {
        const card = document.createElement('div');
        card.className = 'service-card animate-fade-in';
        card.dataset.category = service.category?.slug || '';

        card.innerHTML = `
            <div class="service-card-inner">
                <div class="service-icon">
                    <i class="${service.icon || 'icon-graduation-cap'}"></i>
                </div>
                <div class="service-content">
                    <h3 class="service-title">${service.title}</h3>
                    <p class="service-excerpt">${service.excerpt || this.truncateText(service.description, 100)}</p>
                    <div class="service-features">
                        ${service.features?.slice(0, 3).map(feature => `
                            <span class="feature-tag">${feature}</span>
                        `).join('')}
                    </div>
                </div>
                <div class="service-actions">
                    <a href="/services/${service.slug}" class="btn btn-outline btn-small">
                        Learn More
                    </a>
                    <button class="btn-icon btn-quick-view" data-service-id="${service.id}" title="Quick View">
                        <i class="icon-eye"></i>
                    </button>
                </div>
            </div>
        `;

        return card;
    }

    renderFeaturedVideos() {
        const container = document.getElementById('featured-videos-container');
        if (!container) return;

        container.innerHTML = '';

        if (this.featuredVideos.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No featured videos available at the moment.</p>
                </div>
            `;
            return;
        }

        this.featuredVideos.forEach(video => {
            const videoCard = this.createVideoCard(video);
            container.appendChild(videoCard);
        });
    }

    createVideoCard(video) {
        const card = document.createElement('div');
        card.className = 'video-card animate-fade-in';

        card.innerHTML = `
            <div class="video-card-inner">
                <div class="video-thumbnail">
                    <img src="${video.thumbnail_url || '/assets/images/video-placeholder.png'}" 
                         alt="${video.title}"
                         loading="lazy"
                         class="lazy-image">
                    <div class="video-play-button" data-video-id="${video.id}">
                        <i class="icon-play"></i>
                    </div>
                    <div class="video-duration">${this.formatDuration(video.duration)}</div>
                </div>
                <div class="video-info">
                    <h3 class="video-title">${video.title}</h3>
                    <div class="video-meta">
                        <span class="video-category">${video.category}</span>
                        <span class="video-views">
                            <i class="icon-eye"></i>
                            ${video.views?.toLocaleString() || 0}
                        </span>
                        <span class="video-date">${this.formatDate(video.created_at)}</span>
                    </div>
                    <p class="video-description">${this.truncateText(video.description, 120)}</p>
                </div>
            </div>
        `;

        return card;
    }

    renderTestimonials() {
        const container = document.getElementById('testimonials-container');
        if (!container) return;

        if (this.testimonials.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No testimonials available at the moment.</p>
                </div>
            `;
            return;
        }

        // Create testimonial slider
        container.innerHTML = `
            <div class="testimonial-slider-wrapper">
                <div class="testimonial-track" id="testimonial-track">
                    ${this.testimonials.map(testimonial => `
                        <div class="testimonial-slide">
                            <div class="testimonial-content">
                                <div class="testimonial-rating">
                                    ${this.generateStars(testimonial.rating)}
                                </div>
                                <p class="testimonial-text">"${testimonial.content}"</p>
                                <div class="testimonial-author">
                                    <div class="author-avatar">
                                        ${testimonial.avatar_url ? `
                                            <img src="${testimonial.avatar_url}" alt="${testimonial.author_name}">
                                        ` : `
                                            <div class="avatar-placeholder">
                                                ${testimonial.author_name.charAt(0)}
                                            </div>
                                        `}
                                    </div>
                                    <div class="author-info">
                                        <h4 class="author-name">${testimonial.author_name}</h4>
                                        <p class="author-details">${testimonial.program || ''} • ${testimonial.university || ''}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="slider-controls">
                    <button class="slider-btn prev-btn" id="testimonial-prev">
                        <i class="icon-chevron-left"></i>
                    </button>
                    <div class="slider-dots" id="testimonial-dots"></div>
                    <button class="slider-btn next-btn" id="testimonial-next">
                        <i class="icon-chevron-right"></i>
                    </button>
                </div>
            </div>
        `;

        // Initialize slider
        this.initTestimonialSlider();
    }

    initTestimonialSlider() {
        const track = document.getElementById('testimonial-track');
        const dotsContainer = document.getElementById('testimonial-dots');
        const prevBtn = document.getElementById('testimonial-prev');
        const nextBtn = document.getElementById('testimonial-next');

        if (!track || !dotsContainer) return;

        const slides = track.querySelectorAll('.testimonial-slide');
        const slideCount = slides.length;
        let currentSlide = 0;
        let slideWidth = 0;

        // Create dots
        slides.forEach((_, index) => {
            const dot = document.createElement('button');
            dot.className = `slider-dot ${index === 0 ? 'active' : ''}`;
            dot.addEventListener('click', () => {
                goToSlide(index);
            });
            dotsContainer.appendChild(dot);
        });

        const updateSlider = () => {
            if (slides.length === 0) return;

            slideWidth = slides[0].offsetWidth;
            track.style.transform = `translateX(-${currentSlide * slideWidth}px)`;

            // Update dots
            document.querySelectorAll('.slider-dot').forEach((dot, index) => {
                dot.classList.toggle('active', index === currentSlide);
            });
        };

        const goToSlide = (index) => {
            currentSlide = index;
            if (currentSlide >= slideCount) currentSlide = 0;
            if (currentSlide < 0) currentSlide = slideCount - 1;
            updateSlider();
        };

        const nextSlide = () => {
            currentSlide = (currentSlide + 1) % slideCount;
            updateSlider();
        };

        const prevSlide = () => {
            currentSlide = (currentSlide - 1 + slideCount) % slideCount;
            updateSlider();
        };

        // Auto-advance slider
        let autoSlideInterval = setInterval(nextSlide, 5000);

        // Event listeners
        if (nextBtn) nextBtn.addEventListener('click', () => {
            clearInterval(autoSlideInterval);
            nextSlide();
            autoSlideInterval = setInterval(nextSlide, 5000);
        });

        if (prevBtn) prevBtn.addEventListener('click', () => {
            clearInterval(autoSlideInterval);
            prevSlide();
            autoSlideInterval = setInterval(nextSlide, 5000);
        });

        // Pause auto-slide on hover
        track.addEventListener('mouseenter', () => {
            clearInterval(autoSlideInterval);
        });

        track.addEventListener('mouseleave', () => {
            clearInterval(autoSlideInterval);
            autoSlideInterval = setInterval(nextSlide, 5000);
        });

        // Update on window resize
        window.addEventListener('resize', updateSlider);

        // Initial update
        updateSlider();
    }

    updateStats() {
        // Update counter elements with stats
        const stats = {
            students: this.stats.students_helped || 5000,
            universities: this.stats.universities || 200,
            countries: this.stats.countries || 50,
            success_rate: this.stats.success_rate || 98
        };

        // Initialize counters if counters.js is loaded
        if (window.initCounters) {
            document.querySelectorAll('.animate-counter').forEach(counter => {
                const target = counter.dataset.target;
                if (target) {
                    counter.querySelector('.counter').textContent = target;
                }
            });
            window.initCounters();
        }
    }

    async loadHomepageAd() {
        const adContainer = document.getElementById('homepage-ad');
        if (!adContainer) return;

        try {
            const data = await API.get('/ads', { position: 'homepage', status: 'active', limit: 1 });
            if (data.ads && data.ads.length > 0) {
                const ad = data.ads[0];
                this.renderAd(ad, adContainer);
            }
        } catch (error) {
            console.error('Failed to load ad:', error);
        }
    }

    renderAd(ad, container) {
        container.innerHTML = `
            <div class="ad-banner-content ${ad.type}">
                ${ad.image_url ? `
                    <img src="${ad.image_url}" alt="${ad.title}" class="ad-image">
                ` : ''}
                <div class="ad-text">
                    <h3>${ad.title}</h3>
                    ${ad.description ? `<p>${ad.description}</p>` : ''}
                    ${ad.url ? `
                        <a href="${ad.url}" target="_blank" class="btn btn-primary btn-small">
                            Learn More
                        </a>
                    ` : ''}
                </div>
                <button class="ad-close" title="Close ad">&times;</button>
            </div>
        `;

        // Add close functionality
        container.querySelector('.ad-close')?.addEventListener('click', () => {
            container.style.display = 'none';
        });
    }

    setupEventListeners() {
        // Quick view service buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.btn-quick-view')) {
                const button = e.target.closest('.btn-quick-view');
                const serviceId = button.dataset.serviceId;
                this.showServiceQuickView(serviceId);
            }

            if (e.target.closest('.video-play-button')) {
                const button = e.target.closest('.video-play-button');
                const videoId = button.dataset.videoId;
                this.playVideo(videoId);
            }
        });

        // Consultation form
        const consultationForm = document.getElementById('consultation-form');
        if (consultationForm) {
            consultationForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitConsultationForm(e.target);
            });
        }

        // Smooth scroll for anchor links
        document.addEventListener('click', (e) => {
            if (e.target.matches('a[href^="#"]')) {
                e.preventDefault();
                const targetId = e.target.getAttribute('href');
                if (targetId === '#') return;

                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });

        // Scroll to top button
        const scrollToTopBtn = document.getElementById('scroll-to-top');
        if (scrollToTopBtn) {
            window.addEventListener('scroll', () => {
                if (window.pageYOffset > 300) {
                    scrollToTopBtn.classList.add('visible');
                } else {
                    scrollToTopBtn.classList.remove('visible');
                }
            });

            scrollToTopBtn.addEventListener('click', () => {
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            });
        }
    }

    setupAnimations() {
        // Initialize scroll animations
        if (window.scrollAnimations) {
            window.scrollAnimations.refresh();
        }

        // Initialize parallax
        if (window.parallaxController) {
            window.parallaxController.refresh();
        }

        // Animate hero elements
        this.animateHero();
    }

    animateHero() {
        const heroTitle = document.querySelector('.hero-title');
        const heroSubtitle = document.querySelector('.hero-subtitle');
        const heroButton = document.querySelector('.hero-section .btn');

        if (heroTitle) {
            heroTitle.style.animation = 'fadeUp 1s ease-out forwards';
        }
        if (heroSubtitle) {
            heroSubtitle.style.animation = 'fadeUp 1s ease-out 0.3s forwards';
            heroSubtitle.style.opacity = '0';
        }
        if (heroButton) {
            heroButton.style.animation = 'fadeUp 1s ease-out 0.6s forwards';
            heroButton.style.opacity = '0';
        }
    }

    setupAds() {
        // Load additional ads if needed
        this.loadSidebarAds();
    }

    async loadSidebarAds() {
        try {
            const data = await API.get('/ads', { position: 'sidebar', status: 'active', limit: 2 });
            if (data.ads && data.ads.length > 0) {
                this.renderSidebarAds(data.ads);
            }
        } catch (error) {
            console.error('Failed to load sidebar ads:', error);
        }
    }

    renderSidebarAds(ads) {
        const sidebar = document.querySelector('.sidebar-ads');
        if (!sidebar) return;

        ads.forEach(ad => {
            const adElement = document.createElement('div');
            adElement.className = 'sidebar-ad';
            adElement.innerHTML = `
                <div class="ad-content">
                    <h4>${ad.title}</h4>
                    ${ad.description ? `<p>${ad.description}</p>` : ''}
                    ${ad.url ? `
                        <a href="${ad.url}" target="_blank" class="btn-link">
                            Learn More <i class="icon-arrow-right"></i>
                        </a>
                    ` : ''}
                </div>
            `;
            sidebar.appendChild(adElement);
        });
    }

    async showServiceQuickView(serviceId) {
        try {
            const response = await fetch(`/api/v1/services/${serviceId}`);
            if (!response.ok) throw new Error('Service not found');

            const service = await response.json();
            this.openServiceModal(service);
        } catch (error) {
            console.error('Failed to load service:', error);
        }
    }

    openServiceModal(service) {
        const modal = document.createElement('div');
        modal.className = 'modal service-quick-view';
        modal.innerHTML = `
            <div class="modal-overlay" data-modal-close="service-quick-view"></div>
            <div class="modal-content">
                <button class="modal-close" data-modal-close="service-quick-view">&times;</button>
                <div class="service-modal-content">
                    <div class="service-modal-header">
                        <div class="service-icon">
                            <i class="${service.icon || 'icon-graduation-cap'}"></i>
                        </div>
                        <h2>${service.title}</h2>
                        <div class="service-tags">
                            ${service.features?.slice(0, 5).map(feature => `
                                <span class="tag">${feature}</span>
                            `).join('')}
                        </div>
                    </div>
                    <div class="service-modal-body">
                        <div class="service-details">
                            <h3>Service Overview</h3>
                            <p>${service.description}</p>
                            
                            <div class="service-meta-grid">
                                <div class="meta-item">
                                    <i class="icon-clock"></i>
                                    <div>
                                        <strong>Duration</strong>
                                        <span>${service.duration || 'Varies'}</span>
                                    </div>
                                </div>
                                <div class="meta-item">
                                    <i class="icon-dollar"></i>
                                    <div>
                                        <strong>Price</strong>
                                        <span>${service.price ? `$${service.price}` : 'Contact for pricing'}</span>
                                    </div>
                                </div>
                                <div class="meta-item">
                                    <i class="icon-check-circle"></i>
                                    <div>
                                        <strong>Success Rate</strong>
                                        <span>${service.success_rate || '98%'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="service-process">
                            <h3>How It Works</h3>
                            <div class="process-steps">
                                ${service.process?.map((step, index) => `
                                    <div class="process-step">
                                        <div class="step-number">${index + 1}</div>
                                        <div class="step-content">
                                            <h4>Step ${index + 1}</h4>
                                            <p>${step}</p>
                                        </div>
                                    </div>
                                `).join('') || '<p>Process details coming soon.</p>'}
                            </div>
                        </div>
                    </div>
                    <div class="service-modal-footer">
                        <a href="/services/${service.slug}" class="btn btn-outline">
                            View Full Details
                        </a>
                        <button class="btn btn-primary" data-modal-open="consultation-modal">
                            Book This Service
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Show modal
        setTimeout(() => modal.classList.add('active'), 10);
    }

    async playVideo(videoId) {
        try {
            const response = await fetch(`/api/v1/videos/${videoId}`);
            if (!response.ok) throw new Error('Video not found');

            const video = await response.json();
            this.openVideoPlayer(video);
        } catch (error) {
            console.error('Failed to load video:', error);
        }
    }

    openVideoPlayer(video) {
        const modal = document.createElement('div');
        modal.className = 'modal video-player-modal';
        modal.innerHTML = `
            <div class="modal-overlay" data-modal-close="video-player"></div>
            <div class="modal-content">
                <button class="modal-close" data-modal-close="video-player">&times;</button>
                <div class="video-player-container">
                    <div class="video-player">
                        ${video.video_url ? `
                            <video controls poster="${video.thumbnail_url || ''}">
                                <source src="${video.video_url}" type="video/mp4">
                                Your browser does not support the video tag.
                            </video>
                        ` : video.embed_url ? `
                            <div class="video-embed">
                                <iframe src="${video.embed_url}" 
                                        frameborder="0" 
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                        allowfullscreen>
                                </iframe>
                            </div>
                        ` : `
                            <div class="video-unavailable">
                                <p>Video not available</p>
                            </div>
                        `}
                    </div>
                    <div class="video-info">
                        <h2>${video.title}</h2>
                        <div class="video-meta">
                            <span class="views">
                                <i class="icon-eye"></i>
                                ${video.views?.toLocaleString() || 0} views
                            </span>
                            <span class="date">
                                <i class="icon-calendar"></i>
                                ${this.formatDate(video.created_at)}
                            </span>
                            <span class="category">
                                <i class="icon-tag"></i>
                                ${video.category}
                            </span>
                        </div>
                        <div class="video-description">
                            ${video.description || ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Show modal
        setTimeout(() => modal.classList.add('active'), 10);

        // Play video automatically
        const videoElement = modal.querySelector('video');
        if (videoElement) {
            videoElement.play().catch(e => console.log('Autoplay prevented:', e));
        }
    }

    async submitConsultationForm(form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        try {
            const response = await fetch('/api/v1/consultations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error('Submission failed');

            // Show success message
            this.showNotification('Thank you! We\'ll contact you within 24 hours.', 'success');

            // Reset form
            form.reset();

            // Close modal if open
            const modal = document.getElementById('consultation-modal');
            if (modal) {
                modal.classList.remove('active');
            }
        } catch (error) {
            this.showNotification('Failed to submit. Please try again.', 'error');
            console.error('Form submission error:', error);
        }
    }

    // Utility methods
    truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) return text || '';
        return text.substr(0, maxLength) + '...';
    }

    formatDuration(seconds) {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    generateStars(rating) {
        if (!rating) rating = 5;
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                stars += '<i class="icon-star-filled"></i>';
            } else if (i - 0.5 <= rating) {
                stars += '<i class="icon-star-half"></i>';
            } else {
                stars += '<i class="icon-star"></i>';
            }
        }
        return stars;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="icon-${type === 'success' ? 'check' : 'alert'}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">&times;</button>
        `;

        document.body.appendChild(notification);

        // Show with animation
        setTimeout(() => notification.classList.add('show'), 10);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);

        // Close button
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        });
    }
}

// Export home page class
export default HomePage;

/**
 * Services Page JavaScript
 * Handles service filtering, search, and dynamic loading
 */

import { lazyLoadImages, setupScrollAnimations } from '../effects/scroll-animations.js';
import { setupFilter } from '../effects/filters.js';
import API from '../core/api.js';

class ServicesPage {
    constructor() {
        this.currentPage = 1;
        this.isLoading = false;
        this.hasMore = true;
        this.currentFilter = 'all';
        this.currentSearch = '';

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initAnimations();
        this.loadServices();
        this.setupFAQ();
    }

    setupEventListeners() {
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentFilter = e.target.dataset.filter;
                this.currentPage = 1;
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.loadServices();
            });
        });

        // Search functionality
        const searchInput = document.getElementById('service-search');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.currentSearch = e.target.value;
                    this.currentPage = 1;
                    this.loadServices();
                }, 500);
            });
        }

        // Load more button
        const loadMoreBtn = document.getElementById('load-more-services');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.currentPage++;
                this.loadServices(true);
            });
        }

        // Service modal
        const serviceModal = document.getElementById('service-modal');
        if (serviceModal) {
            const modalClose = serviceModal.querySelector('.modal-close');
            if (modalClose) {
                modalClose.addEventListener('click', () => {
                    serviceModal.classList.remove('active');
                });
            }

            // Close modal on outside click
            serviceModal.addEventListener('click', (e) => {
                if (e.target === serviceModal) {
                    serviceModal.classList.remove('active');
                }
            });
        }

        // Package selection
        document.querySelectorAll('.package-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const packageType = e.target.dataset.package;
                this.selectPackage(packageType);
            });
        });

        // Consultation modal
        const consultBtn = document.querySelector('.magnetic-btn');
        if (consultBtn) {
            consultBtn.addEventListener('click', () => {
                this.openConsultationModal();
            });
        }
    }

    initAnimations() {
        lazyLoadImages();
        setupScrollAnimations();

        // Animate process steps
        const processSteps = document.querySelectorAll('.process-step');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.classList.add('animate-slide-up');
                    }, index * 200);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        processSteps.forEach(step => observer.observe(step));
    }

    setupFAQ() {
        const faqItems = document.querySelectorAll('.faq-item');
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            const answer = item.querySelector('.faq-answer');
            const icon = item.querySelector('.faq-icon');

            question.addEventListener('click', () => {
                const isOpen = answer.style.maxHeight;

                // Close all other items
                faqItems.forEach(otherItem => {
                    if (otherItem !== item) {
                        otherItem.querySelector('.faq-answer').style.maxHeight = null;
                        otherItem.querySelector('.faq-icon').textContent = '+';
                        otherItem.classList.remove('active');
                    }
                });

                // Toggle current item
                if (isOpen) {
                    answer.style.maxHeight = null;
                    icon.textContent = '+';
                    item.classList.remove('active');
                } else {
                    answer.style.maxHeight = answer.scrollHeight + 'px';
                    icon.textContent = '−';
                    item.classList.add('active');
                }
            });
        });
    }

    async loadServices(append = false) {
        if (this.isLoading) return;

        this.isLoading = true;

        // Show loading skeleton
        if (!append) {
            const container = document.getElementById('services-container');
            container.innerHTML = `
                <div class="service-skeleton glass-card">
                    <div class="skeleton-image"></div>
                    <div class="skeleton-title"></div>
                    <div class="skeleton-text"></div>
                    <div class="skeleton-text short"></div>
                </div>
                <div class="service-skeleton glass-card">
                    <div class="skeleton-image"></div>
                    <div class="skeleton-title"></div>
                    <div class="skeleton-text"></div>
                    <div class="skeleton-text short"></div>
                </div>
                <div class="service-skeleton glass-card">
                    <div class="skeleton-image"></div>
                    <div class="skeleton-title"></div>
                    <div class="skeleton-text"></div>
                    <div class="skeleton-text short"></div>
                </div>
            `;
        }

        try {
            // In production, this would fetch from API
            // const response = await API.get('/services', {
            //     page: this.currentPage,
            //     category: this.currentFilter !== 'all' ? this.currentFilter : undefined,
            //     search: this.currentSearch
            // });
            // const data = await response.json();

            // Mock data for demonstration
            const mockServices = this.generateMockServices();

            this.renderServices(mockServices, append);
            this.hasMore = mockServices.length === 12; // Assuming 12 per page

        } catch (error) {
            console.error('Error loading services:', error);
            this.showError('Failed to load services. Please try again.');
        } finally {
            this.isLoading = false;
        }
    }

    generateMockServices() {
        const services = [
            {
                id: 1,
                title: 'Personalized Education Counseling',
                description: 'One-on-one counseling sessions to understand your goals and create a personalized education plan.',
                category: 'pre-departure',
                icon: '🎓'
            },
            {
                id: 2,
                title: 'University & Course Selection',
                description: 'Expert guidance in selecting the right universities and courses based on your profile.',
                category: 'application',
                icon: '🏫'
            },
            {
                id: 3,
                title: 'Visa File Preparation',
                description: 'Complete assistance in preparing and organizing all visa application documents.',
                category: 'visa',
                icon: '📋'
            },
            {
                id: 4,
                title: 'Scholarship Guidance',
                description: 'Help in finding and applying for scholarships and financial aid opportunities.',
                category: 'financial',
                icon: '💰'
            },
            {
                id: 5,
                title: 'Pre-Departure Orientation',
                description: 'Comprehensive orientation sessions to prepare you for life abroad.',
                category: 'post-arrival',
                icon: '✈️'
            },
            {
                id: 6,
                title: 'Post-Arrival Support',
                description: 'Continued support after you arrive at your study destination.',
                category: 'post-arrival',
                icon: '🤝'
            }
        ];

        // Filter based on current filter
        return services.filter(service =>
            this.currentFilter === 'all' || service.category === this.currentFilter
        );
    }

    renderServices(services, append) {
        const container = document.getElementById('services-container');

        if (!append) {
            container.innerHTML = '';
        }

        if (services.length === 0) {
            container.innerHTML = `
                <div class="no-results glass-card">
                    <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <h3>No services found</h3>
                    <p>Try adjusting your filters or search term</p>
                </div>
            `;
            return;
        }

        services.forEach(service => {
            const serviceCard = document.createElement('div');
            serviceCard.className = 'service-card glass-card hover-glow';
            serviceCard.dataset.category = service.category;
            serviceCard.innerHTML = `
                <div class="service-icon">${service.icon}</div>
                <div class="service-content">
                    <h3 class="service-title">${service.title}</h3>
                    <p class="service-description">${service.description}</p>
                    <div class="service-meta">
                        <span class="service-category">${service.category}</span>
                    </div>
                </div>
                <button class="service-view-btn" data-service-id="${service.id}">
                    View Details
                </button>
            `;

            // Add click event for service details
            serviceCard.querySelector('.service-view-btn').addEventListener('click', () => {
                this.showServiceDetails(service);
            });

            container.appendChild(serviceCard);
        });

        // Update load more button
        const loadMoreBtn = document.getElementById('load-more-services');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = this.hasMore ? 'block' : 'none';
        }

        // Re-initialize animations for new elements
        lazyLoadImages();
    }

    showServiceDetails(service) {
        const modal = document.getElementById('service-modal');
        const content = document.getElementById('service-modal-content');

        content.innerHTML = `
            <div class="service-modal-content">
                <div class="service-modal-header">
                    <div class="service-modal-icon">${service.icon}</div>
                    <h2>${service.title}</h2>
                </div>
                <div class="service-modal-body">
                    <p>${service.description}</p>
                    <div class="service-features">
                        <h4>What's Included:</h4>
                        <ul>
                            <li>Personalized consultation session</li>
                            <li>Detailed university shortlisting</li>
                            <li>Document checklist and review</li>
                            <li>Application timeline planning</li>
                            <li>Follow-up support</li>
                        </ul>
                    </div>
                    <div class="service-pricing">
                        <h4>Starting from: <span class="price">$499</span></h4>
                        <p class="pricing-note">Custom packages available based on your needs</p>
                    </div>
                </div>
                <div class="service-modal-actions">
                    <button class="btn btn-primary" onclick="window.location.href='contact.html'">
                        Book Consultation
                    </button>
                    <button class="btn btn-outline modal-close">
                        Close
                    </button>
                </div>
            </div>
        `;

        // Add close event to the close button in modal
        content.querySelector('.modal-close').addEventListener('click', () => {
            modal.classList.remove('active');
        });

        modal.classList.add('active');
    }

    selectPackage(packageType) {
        // In production, this would redirect to booking page or show booking modal
        console.log(`Selected package: ${packageType}`);

        // Show confirmation message
        this.showToast(`Added ${packageType} package to cart`);
    }

    openConsultationModal() {
        // In production, this would open a consultation booking modal
        window.location.href = 'contact.html';
    }

    showError(message) {
        const container = document.getElementById('services-container');
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

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
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
export default ServicesPage;

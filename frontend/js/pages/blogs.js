/**
 * Blogs Page JavaScript
 * Handles blog filtering, search, pagination, and dynamic loading
 */

import { lazyLoadImages, setupScrollAnimations } from '../effects/scroll-animations.js';
import { setupFilter } from '../effects/filters.js';
import API from '../core/api.js';

class BlogsPage {
    constructor() {
        this.currentPage = 1;
        this.totalPages = 1;
        this.isLoading = false;
        this.currentCategory = 'all';
        this.currentSort = 'latest';
        this.currentSearch = '';
        this.blogs = [];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initAnimations();
        this.loadBlogs();
        this.setupNewsletter();
    }

    setupEventListeners() {
        // Category filter tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.currentCategory = e.target.dataset.category;
                this.currentPage = 1;
                document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.loadBlogs();
            });
        });

        // Search functionality
        const searchInput = document.getElementById('blog-search');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.currentSearch = e.target.value.toLowerCase();
                    this.currentPage = 1;
                    this.loadBlogs();
                }, 500);
            });
        }

        // Sort functionality
        const sortSelect = document.getElementById('blog-sort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.sortBlogs();
                this.renderBlogs();
            });
        }

        // Pagination
        this.setupPagination();

        // Subscribe button
        const subscribeBtn = document.getElementById('subscribe-blog-btn');
        if (subscribeBtn) {
            subscribeBtn.addEventListener('click', () => {
                this.openSubscribeModal();
            });
        }

        // Newsletter form
        const newsletterForm = document.getElementById('newsletter-form');
        if (newsletterForm) {
            newsletterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.subscribeNewsletter(newsletterForm);
            });
        }

        // Topic cards
        document.querySelectorAll('.topic-card').forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                const topic = card.querySelector('.topic-title').textContent;
                this.filterByTopic(topic);
            });
        });
    }

    initAnimations() {
        lazyLoadImages();
        setupScrollAnimations();

        // Animate topic cards
        const topicCards = document.querySelectorAll('.topic-card');
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

        topicCards.forEach(card => observer.observe(card));

        // Animate author cards
        const authorCards = document.querySelectorAll('.author-card');
        authorCards.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('animate-slide-up');
            }, index * 200);
        });
    }

    setupPagination() {
        const prevBtn = document.querySelector('.pagination-btn.prev');
        const nextBtn = document.querySelector('.pagination-btn.next');
        const numberBtns = document.querySelectorAll('.pagination-number');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.currentPage--;
                    this.loadBlogs();
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (this.currentPage < this.totalPages) {
                    this.currentPage++;
                    this.loadBlogs();
                }
            });
        }

        numberBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = parseInt(e.target.textContent);
                if (page && page !== this.currentPage) {
                    this.currentPage = page;
                    this.loadBlogs();
                }
            });
        });
    }

    async loadBlogs() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        
        // Show loading skeleton
        const container = document.getElementById('blogs-container');
        container.innerHTML = this.generateSkeletonGrid(6);

        try {
            // In production, this would fetch from API
            // const response = await API.get('/blogs', {
            //     page: this.currentPage,
            //     category: this.currentCategory !== 'all' ? this.currentCategory : undefined,
            //     sort: this.currentSort,
            //     search: this.currentSearch
            // });
            // const data = await response.json();
            
            // Mock data for demonstration
            const mockData = this.generateMockBlogs();
            this.blogs = mockData.blogs;
            this.totalPages = mockData.totalPages;
            
            this.sortBlogs();
            this.renderBlogs();
            this.updatePagination();
            
        } catch (error) {
            console.error('Error loading blogs:', error);
            this.showError('Failed to load blogs. Please try again.');
        } finally {
            this.isLoading = false;
        }
    }

    generateMockBlogs() {
        const categories = ['study-tips', 'visa-updates', 'scholarships', 'country-guides', 'success-stories'];
        const authors = [
            { name: 'Dr. Sarah Johnson', role: 'CEO & Founder', image: '../assets/images/team/ceo.jpg' },
            { name: 'Michael Chen', role: 'Visa Expert', image: '../assets/images/team/director.jpg' },
            { name: 'Priya Sharma', role: 'Education Counselor', image: '../assets/images/team/counselor.jpg' }
        ];
        
        const blogs = Array.from({ length: 12 }, (_, i) => ({
            id: i + 1,
            title: `The Ultimate Guide to ${i % 2 === 0 ? 'Study Abroad' : 'Visa Applications'} in 2024`,
            excerpt: 'Learn everything you need to know about studying abroad in 2024. From choosing the right country to visa application tips.',
            category: categories[i % categories.length],
            readTime: `${Math.floor(Math.random() * 10) + 3} min read`,
            date: new Date(Date.now() - i * 86400000).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
            }),
            image: `../assets/images/blogs/blog${(i % 5) + 1}.jpg`,
            author: authors[i % authors.length],
            featured: i < 3,
            views: Math.floor(Math.random() * 5000) + 1000,
            tags: ['Study Tips', 'Visa', 'Scholarships', 'Country Guide']
        }));

        return {
            blogs,
            totalPages: 5,
            currentPage: this.currentPage
        };
    }

    sortBlogs() {
        switch (this.currentSort) {
            case 'popular':
                this.blogs.sort((a, b) => b.views - a.views);
                break;
            case 'trending':
                // Mock trending algorithm (views per day)
                this.blogs.sort((a, b) => {
                    const trendA = a.views / (this.daysSince(a.date) + 1);
                    const trendB = b.views / (this.daysSince(b.date) + 1);
                    return trendB - trendA;
                });
                break;
            case 'oldest':
                this.blogs.sort((a, b) => new Date(a.date) - new Date(b.date));
                break;
            case 'latest':
            default:
                this.blogs.sort((a, b) => new Date(b.date) - new Date(a.date));
        }
    }

    daysSince(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    }

    generateSkeletonGrid(count) {
        return Array.from({ length: count }, () => `
            <div class="blog-skeleton glass-card">
                <div class="skeleton-image"></div>
                <div class="skeleton-title"></div>
                <div class="skeleton-text"></div>
                <div class="skeleton-text short"></div>
                <div class="skeleton-meta"></div>
            </div>
        `).join('');
    }

    renderBlogs() {
        const container = document.getElementById('blogs-container');
        
        // Filter blogs by category
        const filteredBlogs = this.currentCategory === 'all' 
            ? this.blogs 
            : this.blogs.filter(blog => blog.category === this.currentCategory);

        // Filter by search
        const searchedBlogs = this.currentSearch
            ? filteredBlogs.filter(blog => 
                blog.title.toLowerCase().includes(this.currentSearch) ||
                blog.excerpt.toLowerCase().includes(this.currentSearch) ||
                blog.tags.some(tag => tag.toLowerCase().includes(this.currentSearch))
            )
            : filteredBlogs;

        if (searchedBlogs.length === 0) {
            container.innerHTML = `
                <div class="no-results glass-card">
                    <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <h3>No articles found</h3>
                    <p>Try adjusting your filters or search term</p>
                </div>
            `;
            return;
        }

        container.innerHTML = searchedBlogs.map(blog => `
            <article class="blog-card glass-card hover-glow">
                <div class="blog-image">
                    <img src="${blog.image}" alt="${blog.title}" class="lazy-image" data-src="${blog.image}">
                    ${blog.featured ? '<span class="featured-badge">Featured</span>' : ''}
                </div>
                <div class="blog-content">
                    <div class="blog-meta">
                        <span class="blog-category">${this.getCategoryName(blog.category)}</span>
                        <span class="blog-date">${blog.date}</span>
                        <span class="blog-read-time">${blog.readTime}</span>
                    </div>
                    <h3 class="blog-title">
                        <a href="blog-detail.html?id=${blog.id}">${blog.title}</a>
                    </h3>
                    <p class="blog-excerpt">${blog.excerpt}</p>
                    <div class="blog-footer">
                        <div class="blog-author">
                            <img src="${blog.author.image}" alt="${blog.author.name}" class="author-avatar">
                            <div class="author-info">
                                <div class="author-name">${blog.author.name}</div>
                                <div class="author-role">${blog.author.role}</div>
                            </div>
                        </div>
                        <div class="blog-actions">
                            <a href="blog-detail.html?id=${blog.id}" class="read-more">
                                Read More
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>
            </article>
        `).join('');

        // Re-initialize lazy loading for new images
        lazyLoadImages();
    }

    getCategoryName(category) {
        const categories = {
            'study-tips': 'Study Tips',
            'visa-updates': 'Visa Updates',
            'scholarships': 'Scholarships',
            'country-guides': 'Country Guides',
            'success-stories': 'Success Stories'
        };
        return categories[category] || category;
    }

    updatePagination() {
        const prevBtn = document.querySelector('.pagination-btn.prev');
        const nextBtn = document.querySelector('.pagination-btn.next');
        const numbersContainer = document.querySelector('.pagination-numbers');
        
        if (prevBtn) {
            prevBtn.disabled = this.currentPage === 1;
        }
        
        if (nextBtn) {
            nextBtn.disabled = this.currentPage === this.totalPages;
        }
        
        if (numbersContainer) {
            let paginationHTML = '';
            const maxVisible = 5;
            let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
            let end = Math.min(this.totalPages, start + maxVisible - 1);
            
            if (end - start + 1 < maxVisible) {
                start = Math.max(1, end - maxVisible + 1);
            }
            
            if (start > 1) {
                paginationHTML += '<button class="pagination-number">1</button>';
                if (start > 2) {
                    paginationHTML += '<span class="pagination-ellipsis">...</span>';
                }
            }
            
            for (let i = start; i <= end; i++) {
                paginationHTML += `
                    <button class="pagination-number ${i === this.currentPage ? 'active' : ''}">
                        ${i}
                    </button>
                `;
            }
            
            if (end < this.totalPages) {
                if (end < this.totalPages - 1) {
                    paginationHTML += '<span class="pagination-ellipsis">...</span>';
                }
                paginationHTML += `<button class="pagination-number">${this.totalPages}</button>`;
            }
            
            numbersContainer.innerHTML = paginationHTML;
            
            // Re-attach event listeners
            numbersContainer.querySelectorAll('.pagination-number').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const page = parseInt(e.target.textContent);
                    if (page && page !== this.currentPage) {
                        this.currentPage = page;
                        this.loadBlogs();
                    }
                });
            });
        }
    }

    setupNewsletter() {
        const newsletterForm = document.getElementById('newsletter-form');
        if (newsletterForm) {
            newsletterForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('newsletter-email').value;
                
                try {
                    // In production, this would submit to API
                    // await API.post('/newsletter/subscribe', { email });
                    
                    this.showToast('Successfully subscribed to newsletter!');
                    newsletterForm.reset();
                } catch (error) {
                    console.error('Error subscribing:', error);
                    this.showToast('Failed to subscribe. Please try again.', 'error');
                }
            });
        }
    }

    openSubscribeModal() {
        const modal = document.getElementById('subscribe-modal');
        if (modal) {
            modal.classList.add('active');
            
            const form = document.getElementById('subscribe-form');
            const closeBtn = modal.querySelector('.modal-close');
            
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
            
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('subscriber-name').value;
                const email = document.getElementById('subscriber-email').value;
                const interests = Array.from(form.querySelectorAll('input[name="interests"]:checked'))
                    .map(checkbox => checkbox.value);
                
                try {
                    // In production, this would submit to API
                    // await API.post('/newsletter/subscribe-detailed', { name, email, interests });
                    
                    this.showToast('Successfully subscribed! Check your email for confirmation.');
                    form.reset();
                    modal.classList.remove('active');
                } catch (error) {
                    console.error('Error subscribing:', error);
                    this.showToast('Failed to subscribe. Please try again.', 'error');
                }
            });
        }
    }

    filterByTopic(topic) {
        // Convert topic to category
        const topicMap = {
            'SOP Writing': 'study-tips',
            'Scholarships': 'scholarships',
            'Country Guides': 'country-guides',
            'Visa Success': 'visa-updates'
        };
        
        const category = topicMap[topic];
        if (category) {
            this.currentCategory = category;
            this.currentPage = 1;
            
            // Update active filter tab
            document.querySelectorAll('.filter-tab').forEach(tab => {
                tab.classList.remove('active');
                if (tab.dataset.category === category) {
                    tab.classList.add('active');
                }
            });
            
            this.loadBlogs();
        }
    }

    showError(message) {
        const container = document.getElementById('blogs-container');
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new BlogsPage();
});

export default BlogsPage;
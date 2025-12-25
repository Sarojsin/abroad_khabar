/**
 * Blog Detail Page JavaScript
 * Handles blog content, comments, likes, and sharing
 */

import { lazyLoadImages, setupScrollAnimations } from '../effects/scroll-animations.js';
import API from '../core/api.js';

class BlogDetailPage {
    constructor() {
        this.blogId = this.getBlogIdFromUrl();
        this.blogData = null;
        this.comments = [];
        this.isLiked = false;
        this.isBookmarked = false;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initAnimations();
        this.loadBlogDetail();
        this.loadComments();
        this.setupTableOfContents();
        this.setupShareButtons();
    }

    getBlogIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        return id ? parseInt(id) : 1; // Default to 1 if no ID
    }

    setupEventListeners() {
        // Like button
        const likeBtn = document.querySelector('.like-btn');
        if (likeBtn) {
            likeBtn.addEventListener('click', () => {
                this.toggleLike();
            });
        }

        // Comment button
        const commentBtn = document.querySelector('.comment-btn');
        if (commentBtn) {
            commentBtn.addEventListener('click', () => {
                this.toggleCommentForm();
            });
        }

        // Bookmark button
        const bookmarkBtn = document.querySelector('.bookmark-btn');
        if (bookmarkBtn) {
            bookmarkBtn.addEventListener('click', () => {
                this.toggleBookmark();
            });
        }

        // Add comment button
        const addCommentBtn = document.getElementById('add-comment-btn');
        if (addCommentBtn) {
            addCommentBtn.addEventListener('click', () => {
                this.toggleCommentForm();
            });
        }

        // Comment form submission
        const commentForm = document.getElementById('new-comment-form');
        if (commentForm) {
            commentForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitComment(commentForm);
            });
        }

        // Print button
        const printBtn = document.querySelector('[onclick="window.print()"]');
        if (printBtn) {
            printBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.print();
            });
        }
    }

    initAnimations() {
        lazyLoadImages();
        setupScrollAnimations();

        // Animate related posts
        const relatedPosts = document.querySelectorAll('.related-post-card');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.classList.add('animate-fade-in');
                    }, index * 200);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });

        relatedPosts.forEach(post => observer.observe(post));
    }

    async loadBlogDetail() {
        try {
            // In production, this would fetch from API
            // const response = await API.get(`/blogs/${this.blogId}`);
            // this.blogData = await response.json();

            // Mock data for demonstration
            this.blogData = this.generateMockBlogDetail();
            this.renderBlogDetail();

            // Check if user has liked/bookmarked
            this.checkUserActions();

        } catch (error) {
            console.error('Error loading blog detail:', error);
            this.showError('Failed to load blog post. Please try again.');
        }
    }

    generateMockBlogDetail() {
        const authors = [
            { name: 'Priya Sharma', role: 'Lead Education Counselor', image: '/assets/images/team/counselor.jpg' },
            { name: 'Dr. Sarah Johnson', role: 'CEO & Founder', image: '/assets/images/team/ceo.jpg' },
            { name: 'Michael Chen', role: 'Visa Expert', image: '/assets/images/team/director.jpg' }
        ];

        return {
            id: this.blogId,
            title: 'Complete Guide to Study Abroad in 2024: Everything You Need to Know',
            category: 'Study Guide',
            date: 'December 15, 2024',
            readTime: '8 min read',
            image: '/assets/images/blogs/featured-blog.jpg',
            author: authors[this.blogId % authors.length],
            content: this.generateMockContent(),
            likes: Math.floor(Math.random() * 500) + 100,
            views: Math.floor(Math.random() * 10000) + 1000,
            shares: Math.floor(Math.random() * 200) + 50,
            tags: ['#StudyAbroad2024', '#InternationalEducation', '#VisaGuide', '#Scholarships', '#UniversityAdmission']
        };
    }

    generateMockContent() {
        return {
            intro: 'Studying abroad in 2024 presents incredible opportunities for personal growth, academic excellence, and career advancement. With proper planning and guidance, you can turn your dream of international education into reality.',
            sections: [
                {
                    title: 'Choosing the Right Destination',
                    content: 'The first step in your study abroad journey is selecting the perfect destination. Consider factors like academic reputation, cost of living, career opportunities, and cultural fit.'
                },
                {
                    title: 'University Application Process',
                    content: 'The application process varies by country but generally includes research, document preparation, essay writing, application submission, and interviews.'
                },
                {
                    title: 'Visa Application Guide',
                    content: 'Visa requirements differ by country but common documents include valid passport, university acceptance letter, financial proof, health insurance, and English test scores.'
                },
                {
                    title: 'Financial Planning & Scholarships',
                    content: 'Studying abroad requires careful financial planning. Consider university scholarships, government programs, private scholarships, education loans, and part-time work.'
                },
                {
                    title: 'Pre-Departure Preparation',
                    content: 'Once you receive your visa, focus on booking flights, arranging accommodation, purchasing insurance, and attending pre-departure orientation.'
                }
            ],
            conclusion: 'Studying abroad in 2024 is an exciting journey that requires careful planning. With the right guidance and preparation, you can navigate the process smoothly and make the most of this life-changing experience.'
        };
    }

    renderBlogDetail() {
        if (!this.blogData) return;

        // Update meta information
        document.title = `${this.blogData.title} - Global Education Consultants`;

        // Update like count
        const likeCount = document.querySelector('.like-count');
        if (likeCount) {
            likeCount.textContent = this.blogData.likes.toLocaleString();
        }

        // Update tags
        const tagsContainer = document.querySelector('.blog-tags');
        if (tagsContainer && this.blogData.tags) {
            tagsContainer.innerHTML = this.blogData.tags.map(tag =>
                `<span class="tag">${tag}</span>`
            ).join('');
        }

        // Update related articles
        this.updateRelatedArticles();
    }

    updateRelatedArticles() {
        const relatedContainer = document.querySelector('.related-articles');
        if (!relatedContainer) return;

        const relatedArticles = [
            {
                id: 2,
                title: 'Scholarship Opportunities for 2024',
                date: 'Dec 10, 2024',
                readTime: '5 min read'
            },
            {
                id: 3,
                title: 'Visa Interview Preparation Guide',
                date: 'Dec 5, 2024',
                readTime: '6 min read'
            },
            {
                id: 4,
                title: 'SOP Writing Tips & Examples',
                date: 'Nov 28, 2024',
                readTime: '7 min read'
            }
        ];

        relatedContainer.innerHTML = relatedArticles.map(article => `
            <a href="blog-detail.html?id=${article.id}" class="related-article">
                <h4 class="related-title">${article.title}</h4>
                <div class="related-meta">${article.readTime} • ${article.date}</div>
            </a>
        `).join('');
    }

    async loadComments() {
        try {
            // In production, this would fetch from API
            // const response = await API.get(`/blogs/${this.blogId}/comments`);
            // this.comments = await response.json();

            // Mock data for demonstration
            this.comments = this.generateMockComments();
            this.renderComments();

        } catch (error) {
            console.error('Error loading comments:', error);
        }
    }

    generateMockComments() {
        return [
            {
                id: 1,
                author: 'Rahul Kumar',
                avatar: '/assets/images/users/user1.jpg',
                role: 'Student',
                date: '3 days ago',
                content: 'Great article! The visa section was particularly helpful. Could you write more about scholarship opportunities for Indian students?',
                likes: 5,
                replies: []
            },
            {
                id: 2,
                author: 'Maria Garcia',
                avatar: '/assets/images/users/user2.jpg',
                role: 'Working Professional',
                date: '1 week ago',
                content: 'Very comprehensive guide. The cost breakdown tables were especially useful for financial planning.',
                likes: 3,
                replies: []
            },
            {
                id: 3,
                author: 'Chen Wei',
                avatar: '/assets/images/users/user3.jpg',
                role: 'Parent',
                date: '2 weeks ago',
                content: 'Thank you for this detailed guide. It helped me understand the entire process for my daughter.',
                likes: 8,
                replies: []
            }
        ];
    }

    renderComments() {
        const container = document.querySelector('.comments-container');
        if (!container) return;

        // Remove the form from container before re-rendering
        const form = container.querySelector('#comment-form');
        container.innerHTML = '';
        if (form) {
            container.appendChild(form);
        }

        // Render comments
        this.comments.forEach(comment => {
            const commentElement = document.createElement('div');
            commentElement.className = 'comment glass-card';
            commentElement.innerHTML = `
                <div class="comment-header">
                    <img src="${comment.avatar}" alt="${comment.author}" class="comment-avatar">
                    <div class="comment-info">
                        <div class="comment-author">${comment.author}</div>
                        <div class="comment-meta">${comment.date} • ${comment.role}</div>
                    </div>
                </div>
                <div class="comment-body">
                    <p>${comment.content}</p>
                </div>
                <div class="comment-actions">
                    <button class="comment-like" data-comment-id="${comment.id}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"/>
                        </svg>
                        Like (${comment.likes})
                    </button>
                    <button class="comment-reply" data-comment-id="${comment.id}">
                        Reply
                    </button>
                </div>
            `;

            container.appendChild(commentElement);
        });

        // Add event listeners to comment actions
        container.querySelectorAll('.comment-like').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const commentId = parseInt(e.target.closest('.comment-like').dataset.commentId);
                this.likeComment(commentId);
            });
        });

        container.querySelectorAll('.comment-reply').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const commentId = parseInt(e.target.closest('.comment-reply').dataset.commentId);
                this.showReplyForm(commentId);
            });
        });
    }

    checkUserActions() {
        // In production, this would check user's actions from API
        // For now, use localStorage
        this.isLiked = localStorage.getItem(`blog_${this.blogId}_liked`) === 'true';
        this.isBookmarked = localStorage.getItem(`blog_${this.blogId}_bookmarked`) === 'true';

        this.updateActionButtons();
    }

    updateActionButtons() {
        const likeBtn = document.querySelector('.like-btn');
        const bookmarkBtn = document.querySelector('.bookmark-btn');

        if (likeBtn) {
            if (this.isLiked) {
                likeBtn.classList.add('liked');
                likeBtn.querySelector('svg').style.fill = 'currentColor';
            } else {
                likeBtn.classList.remove('liked');
                likeBtn.querySelector('svg').style.fill = 'none';
            }
        }

        if (bookmarkBtn) {
            if (this.isBookmarked) {
                bookmarkBtn.classList.add('bookmarked');
                bookmarkBtn.querySelector('svg').style.fill = 'currentColor';
            } else {
                bookmarkBtn.classList.remove('bookmarked');
                bookmarkBtn.querySelector('svg').style.fill = 'none';
            }
        }
    }

    async toggleLike() {
        try {
            // In production, this would call API
            // await API.post(`/blogs/${this.blogId}/like`);

            this.isLiked = !this.isLiked;
            if (this.isLiked) {
                this.blogData.likes++;
            } else {
                this.blogData.likes--;
            }

            // Update localStorage
            localStorage.setItem(`blog_${this.blogId}_liked`, this.isLiked);

            this.updateActionButtons();

            // Update like count display
            const likeCount = document.querySelector('.like-count');
            if (likeCount) {
                likeCount.textContent = this.blogData.likes.toLocaleString();
            }

        } catch (error) {
            console.error('Error toggling like:', error);
        }
    }

    toggleBookmark() {
        this.isBookmarked = !this.isBookmarked;
        localStorage.setItem(`blog_${this.blogId}_bookmarked`, this.isBookmarked);
        this.updateActionButtons();

        this.showToast(
            this.isBookmarked
                ? 'Article saved to bookmarks'
                : 'Article removed from bookmarks'
        );
    }

    toggleCommentForm() {
        const form = document.getElementById('comment-form');
        if (form) {
            form.style.display = form.style.display === 'none' ? 'block' : 'none';

            if (form.style.display === 'block') {
                form.querySelector('textarea').focus();
            }
        }
    }

    async submitComment(form) {
        const name = document.getElementById('comment-name').value;
        const email = document.getElementById('comment-email').value;
        const text = document.getElementById('comment-text').value;

        if (!name || !email || !text) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }

        try {
            // In production, this would submit to API
            // const response = await API.post(`/blogs/${this.blogId}/comments`, {
            //     name,
            //     email,
            //     content: text
            // });
            // const newComment = await response.json();

            // Mock new comment
            const newComment = {
                id: Date.now(),
                author: name,
                avatar: '/assets/images/users/default.jpg',
                role: 'Reader',
                date: 'Just now',
                content: text,
                likes: 0,
                replies: []
            };

            this.comments.unshift(newComment);
            this.renderComments();

            form.reset();
            form.style.display = 'none';

            this.showToast('Comment submitted successfully!');

        } catch (error) {
            console.error('Error submitting comment:', error);
            this.showToast('Failed to submit comment. Please try again.', 'error');
        }
    }

    likeComment(commentId) {
        const comment = this.comments.find(c => c.id === commentId);
        if (comment) {
            comment.likes++;
            this.renderComments();
            this.showToast('Comment liked!');
        }
    }

    showReplyForm(commentId) {
        this.showToast('Reply functionality coming soon!');
    }

    setupTableOfContents() {
        const tocContainer = document.querySelector('.toc');
        if (!tocContainer) return;

        const headings = document.querySelectorAll('.blog-content h2');
        if (headings.length === 0) return;

        tocContainer.innerHTML = Array.from(headings).map((heading, index) => {
            const id = `section-${index + 1}`;
            heading.id = id;

            return `<a href="#${id}" class="toc-item">${heading.textContent}</a>`;
        }).join('');

        // Smooth scroll for TOC links
        tocContainer.querySelectorAll('.toc-item').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                const targetElement = document.querySelector(targetId);

                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });
    }

    setupShareButtons() {
        const shareButtons = document.querySelectorAll('.share-btn');

        shareButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const platform = e.currentTarget.dataset.platform;
                this.shareArticle(platform);
            });
        });
    }

    shareArticle(platform) {
        const url = window.location.href;
        const title = this.blogData?.title || document.title;
        const text = 'Check out this article on Global Education Consultants';

        switch (platform) {
            case 'facebook':
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
                break;
            case 'twitter':
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`, '_blank');
                break;
            case 'linkedin':
                window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
                break;
            case 'copy':
                navigator.clipboard.writeText(url).then(() => {
                    this.showToast('Link copied to clipboard!');
                }).catch(err => {
                    console.error('Failed to copy:', err);
                    this.showToast('Failed to copy link', 'error');
                });
                break;
        }
    }

    showError(message) {
        const container = document.querySelector('.blog-content-section');
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

// Export for module usage
export default BlogDetailPage;

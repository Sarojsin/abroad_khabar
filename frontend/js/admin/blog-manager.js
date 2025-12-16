/**
 * Blog Manager for Admin Dashboard
 */

class BlogManager {
    constructor() {
        this.blogs = [];
        this.currentPage = 1;
        this.totalPages = 1;
        this.selectedBlogs = new Set();
        this.filters = {
            status: 'all',
            category: 'all',
            search: '',
            sort: 'newest'
        };
        this.editor = null;
        this.init();
    }

    init() {
        this.loadBlogs();
        this.setupEventListeners();
        this.initializeEditor();
        this.setupImageUpload();
    }

    async loadBlogs(page = 1) {
        try {
            const params = new URLSearchParams({
                page,
                ...this.filters
            });
            
            const response = await fetch(`/api/v1/blogs?${params}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) throw new Error('Failed to load blogs');
            
            const data = await response.json();
            this.blogs = data.blogs;
            this.currentPage = data.page;
            this.totalPages = data.totalPages;
            
            this.renderBlogs();
            this.renderPagination();
            this.updateStats();
        } catch (error) {
            this.showError(error.message);
        }
    }

    renderBlogs() {
        const container = document.getElementById('blogs-container');
        if (!container) return;

        container.innerHTML = '';
        
        if (this.blogs.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="icon-blog"></i>
                    <h3>No blog posts found</h3>
                    <p>Create your first blog post to get started</p>
                    <button class="btn btn-primary" id="create-first-blog">
                        <i class="icon-plus"></i> Create Blog Post
                    </button>
                </div>
            `;
            return;
        }

        this.blogs.forEach(blog => {
            const blogCard = this.createBlogCard(blog);
            container.appendChild(blogCard);
        });
    }

    createBlogCard(blog) {
        const card = document.createElement('div');
        card.className = `blog-card ${blog.status} ${this.selectedBlogs.has(blog.id) ? 'selected' : ''}`;
        card.dataset.id = blog.id;
        
        const isSelected = this.selectedBlogs.has(blog.id);
        const statusClass = `status-${blog.status}`;
        const excerpt = this.stripHtml(blog.content).substring(0, 150) + '...';
        
        card.innerHTML = `
            <div class="blog-card-header">
                <div class="blog-checkbox">
                    <input type="checkbox" id="blog-${blog.id}" ${isSelected ? 'checked' : ''}>
                    <label for="blog-${blog.id}"></label>
                </div>
                <div class="blog-status ${statusClass}">
                    <span class="status-dot"></span>
                    ${blog.status.charAt(0).toUpperCase() + blog.status.slice(1)}
                </div>
            </div>
            <div class="blog-preview">
                ${blog.featured_image ? `
                    <img src="${blog.featured_image}" alt="${blog.title}" class="blog-image">
                ` : `
                    <div class="blog-image-placeholder">
                        <i class="icon-image"></i>
                    </div>
                `}
                <div class="blog-overlay">
                    <button class="btn-icon btn-view" title="Preview" data-id="${blog.id}">
                        <i class="icon-eye"></i>
                    </button>
                </div>
            </div>
            <div class="blog-info">
                <h4 class="blog-title">${blog.title}</h4>
                <p class="blog-excerpt">${excerpt}</p>
                <div class="blog-meta">
                    <span class="blog-author">
                        <i class="icon-user"></i>
                        ${blog.author?.name || 'Admin'}
                    </span>
                    <span class="blog-date">
                        <i class="icon-calendar"></i>
                        ${this.formatDate(blog.created_at)}
                    </span>
                    <span class="blog-views">
                        <i class="icon-eye"></i>
                        ${blog.views?.toLocaleString() || 0}
                    </span>
                </div>
                <div class="blog-tags">
                    ${blog.tags?.map(tag => `<span class="tag">${tag}</span>`).join('') || ''}
                </div>
            </div>
            <div class="blog-actions">
                <button class="btn-icon btn-edit" title="Edit" data-id="${blog.id}">
                    <i class="icon-edit"></i>
                </button>
                <button class="btn-icon btn-toggle" title="${blog.status === 'published' ? 'Unpublish' : 'Publish'}" data-id="${blog.id}">
                    <i class="icon-${blog.status === 'published' ? 'eye-off' : 'eye'}"></i>
                </button>
                <button class="btn-icon btn-duplicate" title="Duplicate" data-id="${blog.id}">
                    <i class="icon-copy"></i>
                </button>
                <button class="btn-icon btn-delete" title="Delete" data-id="${blog.id}">
                    <i class="icon-trash"></i>
                </button>
            </div>
        `;
        
        return card;
    }

    setupEventListeners() {
        // Create blog button
        document.getElementById('create-blog')?.addEventListener('click', () => {
            this.showCreateModal();
        });

        // Bulk actions
        document.getElementById('bulk-select-all')?.addEventListener('change', (e) => {
            this.toggleSelectAll(e.target.checked);
        });

        document.getElementById('bulk-delete')?.addEventListener('click', () => {
            this.deleteSelectedBlogs();
        });

        document.getElementById('bulk-publish')?.addEventListener('click', () => {
            this.toggleSelectedBlogsStatus('published');
        });

        document.getElementById('bulk-unpublish')?.addEventListener('click', () => {
            this.toggleSelectedBlogsStatus('draft');
        });

        // Filters
        document.getElementById('filter-status')?.addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.loadBlogs(1);
        });

        document.getElementById('filter-category')?.addEventListener('change', (e) => {
            this.filters.category = e.target.value;
            this.loadBlogs(1);
        });

        document.getElementById('filter-search')?.addEventListener('input', (e) => {
            this.debounce(() => {
                this.filters.search = e.target.value;
                this.loadBlogs(1);
            }, 300);
        });

        document.getElementById('filter-sort')?.addEventListener('change', (e) => {
            this.filters.sort = e.target.value;
            this.loadBlogs(1);
        });

        // Blog card events (delegated)
        document.addEventListener('click', (e) => {
            // Checkbox selection
            if (e.target.closest('.blog-checkbox input')) {
                const checkbox = e.target;
                const card = checkbox.closest('.blog-card');
                const blogId = card.dataset.id;
                
                if (checkbox.checked) {
                    this.selectedBlogs.add(blogId);
                    card.classList.add('selected');
                } else {
                    this.selectedBlogs.delete(blogId);
                    card.classList.remove('selected');
                }
                this.updateBulkActions();
            }
            
            // Edit button
            if (e.target.closest('.btn-edit')) {
                const button = e.target.closest('.btn-edit');
                const blogId = button.dataset.id;
                this.editBlog(blogId);
            }
            
            // Toggle status button
            if (e.target.closest('.btn-toggle')) {
                const button = e.target.closest('.btn-toggle');
                const blogId = button.dataset.id;
                this.toggleBlogStatus(blogId);
            }
            
            // Duplicate button
            if (e.target.closest('.btn-duplicate')) {
                const button = e.target.closest('.btn-duplicate');
                const blogId = button.dataset.id;
                this.duplicateBlog(blogId);
            }
            
            // View button
            if (e.target.closest('.btn-view')) {
                const button = e.target.closest('.btn-view');
                const blogId = button.dataset.id;
                this.previewBlog(blogId);
            }
            
            // Delete button
            if (e.target.closest('.btn-delete')) {
                const button = e.target.closest('.btn-delete');
                const blogId = button.dataset.id;
                this.deleteBlog(blogId);
            }
        });
    }

    initializeEditor() {
        const editorElement = document.getElementById('blog-editor');
        if (!editorElement) return;

        // Simple rich text editor implementation
        editorElement.innerHTML = `
            <div class="editor-toolbar">
                <button type="button" class="toolbar-btn" data-command="bold" title="Bold">
                    <i class="icon-bold"></i>
                </button>
                <button type="button" class="toolbar-btn" data-command="italic" title="Italic">
                    <i class="icon-italic"></i>
                </button>
                <button type="button" class="toolbar-btn" data-command="underline" title="Underline">
                    <i class="icon-underline"></i>
                </button>
                <div class="toolbar-divider"></div>
                <button type="button" class="toolbar-btn" data-command="insertUnorderedList" title="Bullet List">
                    <i class="icon-list"></i>
                </button>
                <button type="button" class="toolbar-btn" data-command="insertOrderedList" title="Numbered List">
                    <i class="icon-list-ol"></i>
                </button>
                <div class="toolbar-divider"></div>
                <button type="button" class="toolbar-btn" data-command="createLink" title="Insert Link">
                    <i class="icon-link"></i>
                </button>
                <button type="button" class="toolbar-btn" id="insert-image" title="Insert Image">
                    <i class="icon-image"></i>
                </button>
                <div class="toolbar-divider"></div>
                <button type="button" class="toolbar-btn" data-command="formatBlock" data-value="h2" title="Heading 2">
                    H2
                </button>
                <button type="button" class="toolbar-btn" data-command="formatBlock" data-value="h3" title="Heading 3">
                    H3
                </button>
                <button type="button" class="toolbar-btn" data-command="formatBlock" data-value="p" title="Paragraph">
                    P
                </button>
                <div class="toolbar-divider"></div>
                <button type="button" class="toolbar-btn" data-command="undo" title="Undo">
                    <i class="icon-undo"></i>
                </button>
                <button type="button" class="toolbar-btn" data-command="redo" title="Redo">
                    <i class="icon-redo"></i>
                </button>
            </div>
            <div class="editor-content" contenteditable="true" id="blog-content"></div>
            <div class="editor-footer">
                <div class="word-count">Words: <span id="word-count">0</span></div>
                <div class="char-count">Characters: <span id="char-count">0</span></div>
            </div>
        `;

        // Initialize toolbar
        this.setupEditorToolbar();
        
        // Initialize word count
        this.setupWordCount();
    }

    setupEditorToolbar() {
        const toolbar = document.querySelector('.editor-toolbar');
        toolbar.addEventListener('click', (e) => {
            const button = e.target.closest('.toolbar-btn');
            if (!button) return;

            e.preventDefault();
            
            const command = button.dataset.command;
            const value = button.dataset.value;
            
            if (command === 'createLink') {
                this.insertLink();
            } else if (command) {
                document.execCommand(command, false, value);
            }
            
            // Focus back on editor
            document.getElementById('blog-content').focus();
        });

        // Image insert button
        document.getElementById('insert-image')?.addEventListener('click', () => {
            this.insertImage();
        });
    }

    setupWordCount() {
        const editor = document.getElementById('blog-content');
        if (!editor) return;

        const updateCount = () => {
            const text = this.stripHtml(editor.innerHTML);
            const words = text.trim() ? text.trim().split(/\s+/).length : 0;
            const chars = text.length;
            
            document.getElementById('word-count').textContent = words;
            document.getElementById('char-count').textContent = chars;
        };

        editor.addEventListener('input', updateCount);
        editor.addEventListener('paste', (e) => {
            // Strip formatting on paste
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
            updateCount();
        });
    }

    setupImageUpload() {
        const uploadButton = document.getElementById('upload-featured-image');
        if (!uploadButton) return;

        uploadButton.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const formData = new FormData();
                formData.append('image', file);

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
                    
                    // Update featured image preview
                    const preview = document.getElementById('featured-image-preview');
                    if (preview) {
                        preview.innerHTML = `
                            <img src="${result.url}" alt="Featured Image">
                            <input type="hidden" name="featured_image" value="${result.url}">
                        `;
                    }

                    this.showSuccess('Image uploaded successfully');
                } catch (error) {
                    this.showError(error.message);
                }
            };
            input.click();
        });
    }

    async createBlog(formData) {
        try {
            // Get content from editor
            const editorContent = document.getElementById('blog-content')?.innerHTML;
            if (editorContent) {
                formData.content = editorContent;
            }

            const response = await fetch('/api/v1/blogs', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) throw new Error('Failed to create blog');
            
            const blog = await response.json();
            this.showSuccess('Blog post created successfully');
            this.loadBlogs(this.currentPage);
            return blog;
        } catch (error) {
            this.showError(error.message);
            throw error;
        }
    }

    async editBlog(blogId) {
        const blog = this.blogs.find(b => b.id === blogId);
        if (!blog) return;
        
        // Navigate to edit page or open modal
        window.location.href = `/admin/blog-edit.html?id=${blogId}`;
    }

    async toggleBlogStatus(blogId) {
        const blog = this.blogs.find(b => b.id === blogId);
        if (!blog) return;
        
        const newStatus = blog.status === 'published' ? 'draft' : 'published';
        
        try {
            const response = await fetch(`/api/v1/blogs/${blogId}/status`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });
            
            if (!response.ok) throw new Error('Failed to update status');
            
            this.showSuccess(`Blog ${newStatus === 'published' ? 'published' : 'unpublished'} successfully`);
            this.loadBlogs(this.currentPage);
        } catch (error) {
            this.showError(error.message);
        }
    }

    async toggleSelectedBlogsStatus(status) {
        if (this.selectedBlogs.size === 0) {
            this.showError('No blogs selected');
            return;
        }
        
        try {
            const response = await fetch('/api/v1/blogs/bulk-status', {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    blog_ids: Array.from(this.selectedBlogs),
                    status: status
                })
            });
            
            if (!response.ok) throw new Error('Bulk update failed');
            
            this.showSuccess(`${this.selectedBlogs.size} blogs updated successfully`);
            this.selectedBlogs.clear();
            this.loadBlogs(this.currentPage);
            this.updateBulkActions();
        } catch (error) {
            this.showError(error.message);
        }
    }

    async duplicateBlog(blogId) {
        const blog = this.blogs.find(b => b.id === blogId);
        if (!blog) return;
        
        if (!confirm('Duplicate this blog post?')) return;
        
        try {
            const response = await fetch(`/api/v1/blogs/${blogId}/duplicate`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) throw new Error('Failed to duplicate blog');
            
            this.showSuccess('Blog post duplicated successfully');
            this.loadBlogs(this.currentPage);
        } catch (error) {
            this.showError(error.message);
        }
    }

    async deleteBlog(blogId) {
        if (!confirm('Are you sure you want to delete this blog post?')) return;
        
        try {
            const response = await fetch(`/api/v1/blogs/${blogId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) throw new Error('Delete failed');
            
            this.showSuccess('Blog post deleted successfully');
            this.loadBlogs(this.currentPage);
        } catch (error) {
            this.showError(error.message);
        }
    }

    async deleteSelectedBlogs() {
        if (this.selectedBlogs.size === 0) {
            this.showError('No blogs selected');
            return;
        }
        
        if (!confirm(`Delete ${this.selectedBlogs.size} selected blog posts?`)) return;
        
        try {
            const response = await fetch('/api/v1/blogs/bulk-delete', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ blog_ids: Array.from(this.selectedBlogs) })
            });
            
            if (!response.ok) throw new Error('Bulk delete failed');
            
            this.showSuccess(`${this.selectedBlogs.size} blog posts deleted successfully');
            this.selectedBlogs.clear();
            this.loadBlogs(this.currentPage);
            this.updateBulkActions();
        } catch (error) {
            this.showError(error.message);
        }
    }

    async previewBlog(blogId) {
        const blog = this.blogs.find(b => b.id === blogId);
        if (!blog) return;
        
        const modal = this.createPreviewModal(blog);
        document.body.appendChild(modal);
        
        // Show modal
        setTimeout(() => modal.classList.add('active'), 10);
    }

    createPreviewModal(blog) {
        const modal = document.createElement('div');
        modal.className = 'modal preview-modal';
        modal.innerHTML = `
            <div class="modal-overlay" data-modal-close="preview"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Preview: ${blog.title}</h3>
                    <button class="modal-close" data-modal-close="preview">&times;</button>
                </div>
                <div class="modal-body">
                    <article class="blog-preview-content">
                        ${blog.featured_image ? `
                            <div class="preview-featured-image">
                                <img src="${blog.featured_image}" alt="${blog.title}">
                            </div>
                        ` : ''}
                        
                        <header class="preview-header">
                            <h1>${blog.title}</h1>
                            <div class="preview-meta">
                                <span class="author">By ${blog.author?.name || 'Admin'}</span>
                                <span class="date">${this.formatDate(blog.created_at)}</span>
                                <span class="views">${blog.views?.toLocaleString() || 0} views</span>
                            </div>
                            ${blog.tags?.length ? `
                                <div class="preview-tags">
                                    ${blog.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                                </div>
                            ` : ''}
                        </header>
                        
                        <div class="preview-content">
                            ${blog.content}
                        </div>
                    </article>
                </div>
                <div class="modal-footer">
                    <a href="/blogs/${blog.slug || blog.id}" target="_blank" class="btn btn-primary">
                        <i class="icon-external-link"></i> View Live
                    </a>
                    <button class="btn btn-outline" data-modal-close="preview">Close</button>
                </div>
            </div>
        `;
        
        return modal;
    }

    insertLink() {
        const url = prompt('Enter URL:', 'https://');
        if (url) {
            document.execCommand('createLink', false, url);
        }
    }

    insertImage() {
        const url = prompt('Enter image URL:', 'https://');
        if (url) {
            const alt = prompt('Enter alt text:', '');
            document.execCommand('insertHTML', false, `<img src="${url}" alt="${alt}" style="max-width: 100%;">`);
        }
    }

    // Utility methods
    stripHtml(html) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    toggleSelectAll(selectAll) {
        const checkboxes = document.querySelectorAll('.blog-checkbox input');
        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAll;
            const card = checkbox.closest('.blog-card');
            const blogId = card.dataset.id;
            
            if (selectAll) {
                this.selectedBlogs.add(blogId);
                card.classList.add('selected');
            } else {
                this.selectedBlogs.delete(blogId);
                card.classList.remove('selected');
            }
        });
        
        this.updateBulkActions();
    }

    updateBulkActions() {
        const bulkActions = document.getElementById('bulk-actions');
        const selectedCount = document.getElementById('selected-count');
        
        if (this.selectedBlogs.size > 0) {
            bulkActions?.classList.add('active');
            if (selectedCount) {
                selectedCount.textContent = `${this.selectedBlogs.size} selected`;
            }
        } else {
            bulkActions?.classList.remove('active');
        }
    }

    updateStats() {
        const stats = {
            total: this.blogs.length,
            published: this.blogs.filter(blog => blog.status === 'published').length,
            draft: this.blogs.filter(blog => blog.status === 'draft').length,
            scheduled: this.blogs.filter(blog => blog.status === 'scheduled').length,
            totalViews: this.blogs.reduce((sum, blog) => sum + (blog.views || 0), 0),
            totalComments: this.blogs.reduce((sum, blog) => sum + (blog.comment_count || 0), 0)
        };
        
        // Update UI elements
        document.querySelectorAll('[data-stat="total-blogs"]').forEach(el => {
            el.textContent = stats.total;
        });
        
        document.querySelectorAll('[data-stat="published-blogs"]').forEach(el => {
            el.textContent = stats.published;
        });
        
        document.querySelectorAll('[data-stat="total-views"]').forEach(el => {
            el.textContent = stats.totalViews.toLocaleString();
        });
        
        document.querySelectorAll('[data-stat="total-comments"]').forEach(el => {
            el.textContent = stats.totalComments.toLocaleString();
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
                this.loadBlogs(this.currentPage - 1);
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
                this.loadBlogs(i);
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
                this.loadBlogs(this.currentPage + 1);
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
    const blogManager = new BlogManager();
    window.blogManager = blogManager;
});
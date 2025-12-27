/**
 * Blog Manager for Admin Dashboard
 */
import API from '../core/api.js';

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
        this.setupTagHandling();
        this.checkUrlHash(); // Check hash on load
    }

    checkUrlHash() {
        if (window.location.hash === '#create') {
            this.showCreateModal();
        }
    }

    async loadBlogs(page = 1) {
        try {
            const params = {
                skip: (page - 1) * 20,
                limit: 20,
                ...this.filters
            };

            const response = await API.get('/blogs', params);
            const data = response.data;

            this.blogs = data.blogs;
            this.currentPage = data.page;
            this.totalPages = data.pages || data.totalPages;

            this.renderBlogs();
            this.updatePagination();
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
        // Create blog buttons
        document.getElementById('create-post-btn')?.addEventListener('click', () => {
            this.showCreateModal();
        });

        document.getElementById('create-post-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.showCreateModal();
        });

        document.getElementById('create-first-blog')?.addEventListener('click', () => {
            this.showCreateModal();
        });

        // Featured image upload logic
        const imagePreview = document.getElementById('featured-image-preview');
        const imageInput = document.getElementById('post-featured-image');
        if (imagePreview && imageInput) {
            imagePreview.addEventListener('click', () => imageInput.click());
            imageInput.addEventListener('change', (e) => this.handleImageUpload(e));
        }

        // Close editor
        document.querySelector('.close-editor')?.addEventListener('click', () => {
            this.closeEditor();
        });

        // Bulk actions
        document.getElementById('select-all-posts')?.addEventListener('change', (e) => {
            this.toggleSelectAll(e.target.checked);
        });

        document.getElementById('bulk-blog-actions')?.addEventListener('click', () => {
            const tableActions = document.getElementById('table-actions');
            if (tableActions) {
                const isHidden = tableActions.style.display === 'none';
                tableActions.style.display = isHidden ? 'flex' : 'none';
            }
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

        const searchInput = document.getElementById('blog-search');
        if (searchInput) {
            const debouncedSearch = this.debounce(() => {
                this.filters.search = searchInput.value;
                this.loadBlogs(1);
            }, 300);
            searchInput.addEventListener('input', () => debouncedSearch());
        }

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

        this.setupTagHandling();
    }

    setupTagHandling() {
        const tagInput = document.getElementById('tag-input');
        const tagsContainer = document.getElementById('tags-container');
        if (!tagInput || !tagsContainer) return;

        tagInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                const tag = tagInput.value.trim().replace(/,/g, '');
                if (tag) {
                    this.addTag(tag);
                    tagInput.value = '';
                }
            }
        });

        // Delegate tag removal
        tagsContainer.addEventListener('click', (e) => {
            if (e.target.closest('.remove-tag')) {
                const tagItem = e.target.closest('.tag-item');
                tagItem.remove();
            }
        });
    }

    addTag(tag) {
        const tagsContainer = document.getElementById('tags-container');
        if (!tagsContainer) return;

        // Prevent duplicates
        const existingTags = Array.from(tagsContainer.querySelectorAll('.tag-item')).map(t => t.dataset.tag);
        if (existingTags.includes(tag)) return;

        const tagEl = document.createElement('div');
        tagEl.className = 'tag-item';
        tagEl.dataset.tag = tag;
        tagEl.innerHTML = `
            <span>${tag}</span>
            <button type="button" class="remove-tag">&times;</button>
        `;
        tagsContainer.appendChild(tagEl);
    }

    initializeEditor() {
        const editorElement = document.getElementById('blog-editor');
        if (!editorElement) return;

        // Note: We use the existing HTML structure in blogs.html
        // and just initialize the logic.

        // Initialize toolbar
        this.setupEditorToolbar();

        // Initialize word count
        this.setupWordCount();

        // Save & Publish listeners
        document.getElementById('save-draft')?.addEventListener('click', () => this.handleSave(true));
        document.getElementById('publish-post')?.addEventListener('click', () => this.handleSave(false));
    }

    setupEditorToolbar() {
        const toolbar = document.querySelector('.editor-toolbar');
        if (!toolbar) return;

        toolbar.addEventListener('click', (e) => {
            const button = e.target.closest('.toolbar-btn');
            if (!button) return;

            e.preventDefault();

            // Support both data-command and data-format
            const command = button.dataset.command || button.dataset.format;
            const value = button.dataset.value;

            if (command === 'link' || command === 'createLink') {
                this.insertLink();
            } else if (command === 'image') {
                this.insertImage();
            } else if (command) {
                // For bold, italic, etc.
                document.execCommand(command, false, value);
            }
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
        const uploadButton = document.getElementById('featured-image-preview');
        if (!uploadButton) return;

        uploadButton.addEventListener('click', () => {
            const input = document.getElementById('post-featured-image');
            if (input) {
                input.click();
                return;
            }

            // Fallback if input not found
            const fallbackInput = document.createElement('input');
            fallbackInput.type = 'file';
            fallbackInput.accept = 'image/*';
            fallbackInput.onchange = (e) => this.handleImageFile(e.target.files[0]);
            fallbackInput.click();
        });

        document.getElementById('post-featured-image')?.addEventListener('change', (e) => {
            this.handleImageFile(e.target.files[0]);
        });
    }

    async handleImageFile(file) {
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await API.post('/images/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            const result = response.data || response;

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
    }

    async handleSave(isDraft) {
        const form = document.getElementById('blog-post-form');
        if (!form) return;

        const formData = {
            title: document.getElementById('post-title').value,
            content: document.getElementById('blog-content').innerHTML,
            status: isDraft ? 'draft' : document.getElementById('post-status').value,
            category: document.getElementById('post-category').value,
            author_id: document.getElementById('post-author').value,
            featured_image: document.querySelector('input[name="featured_image"]')?.value || '',
            meta_title: document.getElementById('meta-title').value,
            meta_description: document.getElementById('meta-description').value,
            tags: Array.from(document.querySelectorAll('.tag-item')).map(t => t.dataset.tag)
        };

        if (!formData.title) {
            this.showError('Please enter a title');
            return;
        }

        try {
            if (this.editingBlogId) {
                await this.updateBlog(this.editingBlogId, formData);
            } else {
                await this.createBlog(formData);
            }
            this.closeEditor();
        } catch (error) {
            console.error('Save failed:', error);
        }
    }

    async createBlog(formData) {
        try {
            const response = await API.post('/blogs', formData);

            const result = response.data || response;
            this.showSuccess('Blog post created successfully');
            this.loadBlogs(this.currentPage);
        } catch (error) {
            this.showError(error.message);
            throw error;
        }
    }

    async updateBlog(blogId, formData) {
        try {
            const response = await API.put(`/blogs/${blogId}`, formData);

            const result = response.data || response;
            this.showSuccess('Blog post updated successfully');
            this.loadBlogs(this.currentPage);
        } catch (error) {
            this.showError(error.message);
            throw error;
        }
    }

    showCreateModal() {
        this.editingBlogId = null;
        const form = document.getElementById('blog-post-form');
        if (form) form.reset();

        const preview = document.getElementById('featured-image-preview');
        if (preview) preview.innerHTML = '<i class="icon-image"></i><span>Upload Image</span>';

        const tagsContainer = document.getElementById('tags-container');
        if (tagsContainer) tagsContainer.innerHTML = '';

        const editor = document.getElementById('blog-editor');
        if (editor) editor.style.display = 'block';

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    closeEditor() {
        const editor = document.getElementById('blog-editor');
        if (editor) editor.style.display = 'none';
        this.editingBlogId = null;
    }

    async editBlog(blogId) {
        const blog = this.blogs.find(b => b.id == blogId);
        if (!blog) return;

        this.editingBlogId = blogId;

        // Populate form
        document.getElementById('post-title').value = blog.title || '';
        document.getElementById('post-content').value = blog.content || '';
        if (document.getElementById('blog-content')) {
            document.getElementById('blog-content').innerHTML = blog.content || '';
        }
        document.getElementById('post-status').value = blog.status || 'draft';
        document.getElementById('post-category').value = blog.category || '';
        document.getElementById('meta-title').value = blog.meta_title || '';
        document.getElementById('meta-description').value = blog.meta_description || '';

        const tagsContainer = document.getElementById('tags-container');
        if (tagsContainer) {
            tagsContainer.innerHTML = '';
            if (blog.tags && Array.isArray(blog.tags)) {
                blog.tags.forEach(tag => this.addTag(tag));
            }
        }

        const preview = document.getElementById('featured-image-preview');
        if (preview && blog.featured_image) {
            preview.innerHTML = `<img src="${blog.featured_image}" alt="Featured Image"><input type="hidden" name="featured_image" value="${blog.featured_image}">`;
        }

        const editor = document.getElementById('blog-editor');
        if (editor) editor.style.display = 'block';

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async toggleBlogStatus(blogId) {
        const blog = this.blogs.find(b => b.id === blogId);
        if (!blog) return;

        const newStatus = blog.status === 'published' ? 'draft' : 'published';

        try {
            await API.patch(`/blogs/${blogId}/status`, { status: newStatus });

            this.showSuccess(`Blog ${newStatus === 'published' ? 'published' : 'unpublished'} successfully`);
            this.loadBlogs(this.currentPage);
        } catch (error) {
            this.showError(error.message);
        }
    }

    async toggleSelectedBlogsStatus(status) {
        if (this.selectedBlogs.size === 0) {
            this.showError('No blog posts selected');
            return;
        }

        try {
            await API.post('/blogs/bulk-update', {
                ids: Array.from(this.selectedBlogs).map(Number),
                status: status
            });

            this.showSuccess(`${this.selectedBlogs.size} blog posts updated successfully`);
            this.selectedBlogs.clear();
            this.loadBlogs(this.currentPage);
            this.updateBulkActions();
        } catch (error) {
            this.showError(error.message || 'Bulk update failed');
        }
    }

    async duplicateBlog(blogId) {
        const blog = this.blogs.find(b => b.id === blogId);
        if (!blog) return;

        if (!confirm('Duplicate this blog post?')) return;

        try {
            await API.post(`/blogs/${blogId}/duplicate`);

            this.showSuccess('Blog post duplicated successfully');
            this.loadBlogs(this.currentPage);
        } catch (error) {
            this.showError(error.message);
        }
    }

    async deleteBlog(blogId) {
        if (!confirm('Are you sure you want to delete this blog post?')) return;

        try {
            await API.delete(`/blogs/${blogId}`);

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
            await API.delete('/blogs/bulk-delete', {
                body: JSON.stringify({ blog_ids: Array.from(this.selectedBlogs) })
            });

            this.showSuccess(`${this.selectedBlogs.size} blog posts deleted successfully`);
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
        const tableActions = document.getElementById('table-actions');
        const selectedCount = document.getElementById('selected-count');

        if (this.selectedBlogs.size > 0) {
            if (tableActions) tableActions.style.display = 'flex';
            if (selectedCount) {
                selectedCount.textContent = `${this.selectedBlogs.size} selected`;
            }
        } else {
            if (tableActions) tableActions.style.display = 'none';
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
        const updateEl = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };

        updateEl('published-count', stats.published);
        updateEl('drafts-count', stats.draft);
        updateEl('total-views', stats.totalViews.toLocaleString());
        updateEl('total-views-stat', stats.totalViews.toLocaleString());
        updateEl('total-comments', stats.totalComments.toLocaleString());

        document.querySelectorAll('[data-stat="total-blogs"]').forEach(el => {
            if (el) el.textContent = stats.total;
        });

        document.querySelectorAll('[data-stat="published-blogs"]').forEach(el => {
            if (el) el.textContent = stats.published;
        });

        document.querySelectorAll('[data-stat="total-views"]').forEach(el => {
            if (el) el.textContent = stats.totalViews.toLocaleString();
        });

        document.querySelectorAll('[data-stat="total-comments"]').forEach(el => {
            if (el) el.textContent = stats.totalComments.toLocaleString();
        });
    }

    updatePagination() {
        const currentSpan = document.getElementById('current-page');
        const totalSpan = document.getElementById('total-pages');
        const prevBtn = document.getElementById('prev-page-btn');
        const nextBtn = document.getElementById('next-page-btn');

        if (currentSpan) currentSpan.textContent = this.currentPage;
        if (totalSpan) totalSpan.textContent = this.totalPages;

        if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this.currentPage >= this.totalPages;
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

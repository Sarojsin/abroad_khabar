/**
 * Admin Dashboard JavaScript
 * Handles dashboard charts, stats, and admin functionality
 */

import Auth from '../core/auth.js';
import API from '../core/api.js';

class AdminDashboard {
    constructor() {
        this.charts = {};
        this.notifications = [];

        this.init();
    }

    init() {
        this.checkAuth();
        this.setupEventListeners();
        this.loadDashboardData();
        // this.initCharts(); // Removed for simplicity
        this.loadNotifications();
        this.setupUserMenu();
    }


    checkAuth() {
        if (!Auth.isAuthenticated) {
            window.location.href = '/login';
            return;
        }

        if (!Auth.isAdmin()) {
            this.showUnauthorizedMessage();
        }

        this.updateUserInfo();
    }

    updateUserInfo() {
        const user = Auth.currentUser;
        const userNameElement = document.getElementById('user-name');
        const userRoleElement = document.getElementById('user-role');
        const adminNameElement = document.getElementById('admin-name');

        if (userNameElement && user) {
            userNameElement.textContent = user.full_name || user.username || 'Admin User';
        }

        if (userRoleElement && user) {
            const role = (user.role || 'Admin').toLowerCase();
            userRoleElement.textContent = role.charAt(0).toUpperCase() + role.slice(1);
        }

        if (adminNameElement && user) {
            adminNameElement.textContent = user.full_name ? user.full_name.split(' ')[0] : (user.username || 'Admin');
        }
    }

    setupEventListeners() {
        const sidebarToggle = document.getElementById('sidebar-toggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }

        this.setupQuickActions();
        this.setupKeyboardShortcuts();
    }

    setupUserMenu() {
        // Handle outside clicks to close user menu
        document.addEventListener('click', (e) => {
            const userMenu = document.getElementById('user-menu');
            const userMenuBtn = document.getElementById('user-menu-btn');

            if (userMenu && !userMenu.contains(e.target) && userMenuBtn && !userMenuBtn.contains(e.target)) {
                userMenu.style.display = 'none';
            }
        });
    }

    toggleSidebar() {
        const sidebar = document.getElementById('admin-sidebar');
        if (sidebar) {
            sidebar.classList.toggle('active');
        }
    }

    hideUserMenu() {
        const menu = document.getElementById('user-menu');
        if (menu) {
            menu.style.display = 'none';
        }
    }

    hideNotificationPanel() {
        const panel = document.getElementById('notification-panel');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    async loadDashboardData() {
        try {
            const response = await API.get('/admin/dashboard/stats');

            if (response) {
                this.updateStats(response);
                if (response.recentSubmissions) {
                    this.updateSubmissions(response.recentSubmissions);
                }
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showError('Failed to load dashboard data');
        }
    }

    updateStats(data) {
        // Update stat cards
        const stats = {
            'total-users': data.totalUsers || 0,
            'total-submissions': data.totalSubmissions || 0,
            'page-views': data.pageViews || 0,
            'response-time': data.avgResponseTime || '0ms'
        };

        Object.entries(stats).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                this.animateCounter(element, value);
            }
        });
    }

    animateCounter(element, targetValue) {
        if (typeof targetValue === 'number') {
            let current = 0;
            const increment = targetValue / 20;
            const timer = setInterval(() => {
                current += increment;
                if (current >= targetValue) {
                    element.textContent = targetValue.toLocaleString();
                    clearInterval(timer);
                } else {
                    element.textContent = Math.floor(current).toLocaleString();
                }
            }, 50);
        } else {
            element.textContent = targetValue;
        }
    }

    updateSubmissions(submissions) {
        const container = document.querySelector('.submissions-table tbody');
        if (!container || !submissions || submissions.length === 0) return;

        container.innerHTML = submissions.map(submission => `
            <tr>
                <td>${submission.name || 'N/A'}</td>
                <td>${submission.service || 'N/A'}</td>
                <td><span class="status-badge ${submission.status}">${submission.status}</span></td>
                <td>${new Date(submission.date).toLocaleDateString()}</td>
                <td>
                    <button class="btn-icon" onclick="window.location.href='/admin/submission/${submission.id}'">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    getActivityIcon(type) {
        // Return SVG path based on activity type
        return '<path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>';
    }

    async loadNotifications() {
        try {
            const response = await API.get('/admin/notifications');

            if (response) {
                this.notifications = Array.isArray(response) ? response : [];
                this.updateNotificationCount();
                this.renderNotifications();
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }

    updateNotificationCount() {
        const unreadCount = this.notifications.filter(n => !n.read).length;
        const countElement = document.getElementById('notification-count');

        if (countElement) {
            countElement.textContent = unreadCount;
            countElement.style.display = unreadCount > 0 ? 'flex' : 'none';
        }
    }

    renderNotifications() {
        const container = document.querySelector('.notification-list');
        if (!container) return;

        container.innerHTML = this.notifications.map(notification => `
            <div class="notification-item ${notification.read ? '' : 'unread'}">
                <div class="notification-icon">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        ${this.getActivityIcon(notification.type)}
                    </svg>
                </div>
                <div class="notification-content">
                    <p>${notification.message}</p>
                    <span>${notification.time}</span>
                </div>
            </div>
        `).join('');
    }

    markAllNotificationsRead() {
        this.notifications.forEach(notification => {
            notification.read = true;
        });

        this.updateNotificationCount();
        this.renderNotifications();

        this.showToast('All notifications marked as read');
    }

    setupQuickActions() {
        const quickActions = {
            'add-blog': () => window.location.href = 'blogs.html',
            'upload-media': () => window.location.href = 'media.html',
            'manage-users': () => this.showToast('User management coming soon!'),
            'view-analytics': () => this.showToast('Analytics page coming soon!'),
            'check-submissions': () => window.location.href = '#submissions',
            'system-settings': () => this.showToast('System settings coming soon!')
        };

        Object.entries(quickActions).forEach(([id, action]) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', action);
            }
        });
    }

    searchAdmin(query) {
        // In production, this would search through admin panel
        console.log('Searching admin panel for:', query);
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K for search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.getElementById('admin-search');
                if (searchInput) {
                    searchInput.focus();
                }
            }

            // Ctrl/Cmd + / for help
            if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                e.preventDefault();
                this.showToast('Help documentation coming soon!');
            }

            // Escape to close modals/menus
            if (e.key === 'Escape') {
                this.hideUserMenu();
                this.hideNotificationPanel();
            }
        });
    }

    logout() {
        Auth.logout();
        window.location.href = '/login';
    }

    showUnauthorizedMessage() {
        this.showToast('You do not have permission to access this page', 'error');
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 3000);
    }

    showError(message) {
        const container = document.querySelector('.admin-main');
        if (container) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-message glass-card';
            errorDiv.innerHTML = `
                <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <h3>Oops! Something went wrong</h3>
                <p>${message}</p>
                <button class="btn btn-outline" onclick="window.location.reload()">
                    Try Again
                </button>
            `;

            // Insert at the beginning of main content
            container.insertBefore(errorDiv, container.firstChild);
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
    new AdminDashboard();
});

export default AdminDashboard;

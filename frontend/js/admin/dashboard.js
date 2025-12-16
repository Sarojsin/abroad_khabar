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
        this.initCharts();
        this.loadNotifications();
        this.setupUserMenu();
    }

    checkAuth() {
        if (!Auth.isAuthenticated()) {
            window.location.href = '../pages/login.html';
            return;
        }
        
        // Check user role
        const user = Auth.getUser();
        if (!user || !user.role || user.role !== 'admin') {
            this.showUnauthorizedMessage();
        }
        
        // Update user info in header
        this.updateUserInfo();
    }

    updateUserInfo() {
        const user = Auth.getUser();
        
        const userNameElement = document.getElementById('user-name');
        const userRoleElement = document.getElementById('user-role');
        const adminNameElement = document.getElementById('admin-name');
        
        if (userNameElement && user) {
            userNameElement.textContent = user.name || 'Admin User';
        }
        
        if (userRoleElement && user) {
            userRoleElement.textContent = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Admin';
        }
        
        if (adminNameElement && user) {
            adminNameElement.textContent = user.name ? user.name.split(' ')[0] : 'Admin';
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

        // User menu
        const userMenuBtn = document.getElementById('user-menu-btn');
        if (userMenuBtn) {
            userMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleUserMenu();
            });
        }

        // Logout buttons
        const logoutBtn = document.getElementById('logout-btn');
        const dropdownLogout = document.getElementById('dropdown-logout');
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }
        
        if (dropdownLogout) {
            dropdownLogout.addEventListener('click', () => {
                this.logout();
            });
        }

        // Notification button
        const notificationBtn = document.getElementById('notification-btn');
        if (notificationBtn) {
            notificationBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleNotificationPanel();
            });
        }

        // Mark all as read
        const markAllReadBtn = document.getElementById('mark-all-read');
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', () => {
                this.markAllNotificationsRead();
            });
        }

        // Search functionality
        const adminSearch = document.getElementById('admin-search');
        if (adminSearch) {
            adminSearch.addEventListener('input', (e) => {
                this.searchAdmin(e.target.value);
            });
        }

        // Quick actions
        this.setupQuickActions();

        // Close menus when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#user-menu-btn') && !e.target.closest('#user-menu')) {
                this.hideUserMenu();
            }
            
            if (!e.target.closest('#notification-btn') && !e.target.closest('#notification-panel')) {
                this.hideNotificationPanel();
            }
        });

        // Keyboard shortcuts
        this.setupKeyboardShortcuts();
    }

    toggleSidebar() {
        const sidebar = document.getElementById('admin-sidebar');
        sidebar.classList.toggle('collapsed');
    }

    toggleUserMenu() {
        const menu = document.getElementById('user-menu');
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        
        // Position the menu
        if (menu.style.display === 'block') {
            const userMenuBtn = document.getElementById('user-menu-btn');
            const rect = userMenuBtn.getBoundingClientRect();
            
            menu.style.top = `${rect.bottom + 5}px`;
            menu.style.right = `${window.innerWidth - rect.right}px`;
        }
    }

    hideUserMenu() {
        const menu = document.getElementById('user-menu');
        menu.style.display = 'none';
    }

    toggleNotificationPanel() {
        const panel = document.getElementById('notification-panel');
        panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
        
        // Position the panel
        if (panel.style.display === 'block') {
            const notificationBtn = document.getElementById('notification-btn');
            const rect = notificationBtn.getBoundingClientRect();
            
            panel.style.top = `${rect.bottom + 5}px`;
            panel.style.right = `${window.innerWidth - rect.right}px`;
            
            // Update notification count
            this.updateNotificationCount();
        }
    }

    hideNotificationPanel() {
        const panel = document.getElementById('notification-panel');
        panel.style.display = 'none';
    }

    async loadDashboardData() {
        try {
            // In production, this would fetch from API
            // const response = await API.get('/admin/dashboard/stats');
            // const data = await response.json();
            
            // Mock data for demonstration
            const mockData = {
                totalUsers: 1248,
                totalSubmissions: 356,
                pageViews: 24500,
                responseTime: 2.4,
                recentActivity: [
                    {
                        type: 'success',
                        message: 'New blog post published: "Study Abroad 2024 Guide"',
                        time: '2 hours ago'
                    },
                    {
                        type: 'warning',
                        message: 'Video upload failed: File size exceeds limit',
                        time: '4 hours ago'
                    },
                    {
                        type: 'info',
                        message: 'New user registration: john.doe@email.com',
                        time: 'Yesterday'
                    },
                    {
                        type: 'primary',
                        message: 'Database backup completed successfully',
                        time: '2 days ago'
                    }
                ],
                recentSubmissions: [
                    {
                        name: 'John Doe',
                        email: 'john@example.com',
                        country: 'Canada',
                        status: 'pending',
                        date: 'Dec 15, 2024'
                    },
                    {
                        name: 'Jane Smith',
                        email: 'jane@example.com',
                        country: 'USA',
                        status: 'reviewed',
                        date: 'Dec 14, 2024'
                    },
                    {
                        name: 'Bob Johnson',
                        email: 'bob@example.com',
                        country: 'UK',
                        status: 'approved',
                        date: 'Dec 13, 2024'
                    }
                ]
            };
            
            this.updateStats(mockData);
            this.updateActivity(mockData.recentActivity);
            this.updateSubmissions(mockData.recentSubmissions);
            
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showError('Failed to load dashboard data');
        }
    }

    updateStats(data) {
        // Update stat cards with animation
        const stats = {
            'total-users': data.totalUsers,
            'total-submissions': data.totalSubmissions,
            'page-views': data.pageViews,
            'response-time': data.responseTime
        };
        
        Object.entries(stats).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                this.animateCounter(element, value);
            }
        });
    }

    animateCounter(element, targetValue) {
        const currentValue = parseInt(element.textContent.replace(/[^0-9]/g, '') || 0);
        const duration = 1000; // 1 second
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out function
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            const current = Math.floor(currentValue + (targetValue - currentValue) * easeOut);
            
            // Format number
            let formatted;
            if (element.id === 'response-time') {
                formatted = current.toFixed(1) + 's';
            } else if (element.id === 'page-views') {
                formatted = current >= 1000 ? (current / 1000).toFixed(1) + 'K' : current;
            } else {
                formatted = current.toLocaleString();
            }
            
            element.textContent = formatted;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        animate();
    }

    updateActivity(activities) {
        const container = document.getElementById('activity-list');
        if (!container) return;
        
        container.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon ${activity.type}">
                    <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        ${this.getActivityIcon(activity.type)}
                    </svg>
                </div>
                <div class="activity-content">
                    <p><strong>${activity.message.split(':')[0]}</strong>${activity.message.includes(':') ? ':' + activity.message.split(':').slice(1).join(':') : ''}</p>
                    <span class="activity-time">${activity.time}</span>
                </div>
            </div>
        `).join('');
    }

    getActivityIcon(type) {
        const icons = {
            success: '<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>',
            warning: '<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>',
            info: '<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>',
            primary: '<path fill-rule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clip-rule="evenodd"/>'
        };
        
        return icons[type] || icons.info;
    }

    updateSubmissions(submissions) {
        const container = document.getElementById('submissions-table');
        if (!container) return;
        
        container.innerHTML = submissions.map(submission => `
            <tr>
                <td>${submission.name}</td>
                <td>${submission.email}</td>
                <td>${submission.country}</td>
                <td><span class="status-badge ${submission.status}">${this.formatStatus(submission.status)}</span></td>
                <td>${submission.date}</td>
                <td>
                    <button class="btn-icon view-btn" title="View">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    formatStatus(status) {
        const statusMap = {
            pending: 'Pending',
            reviewed: 'Reviewed',
            approved: 'Approved',
            rejected: 'Rejected'
        };
        return statusMap[status] || status;
    }

    initCharts() {
        // Traffic chart
        const trafficCtx = document.getElementById('traffic-chart');
        if (trafficCtx) {
            this.charts.traffic = this.createTrafficChart(trafficCtx);
        }
        
        // Engagement chart
        const engagementCtx = document.getElementById('engagement-chart');
        if (engagementCtx) {
            this.charts.engagement = this.createEngagementChart(engagementCtx);
        }
        
        // Chart period selectors
        const trafficPeriod = document.getElementById('traffic-period');
        const engagementPeriod = document.getElementById('engagement-period');
        
        if (trafficPeriod) {
            trafficPeriod.addEventListener('change', (e) => {
                this.updateTrafficChart(e.target.value);
            });
        }
        
        if (engagementPeriod) {
            engagementPeriod.addEventListener('change', (e) => {
                this.updateEngagementChart(e.target.value);
            });
        }
    }

    createTrafficChart(ctx) {
        // In production, use Chart.js or similar
        // For now, create a simple canvas-based chart
        
        const canvas = ctx;
        const width = canvas.width;
        const height = canvas.height;
        const context = canvas.getContext('2d');
        
        // Clear canvas
        context.clearRect(0, 0, width, height);
        
        // Draw grid
        context.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        context.lineWidth = 1;
        
        // Horizontal lines
        for (let i = 0; i <= 5; i++) {
            const y = (height / 5) * i;
            context.beginPath();
            context.moveTo(0, y);
            context.lineTo(width, y);
            context.stroke();
        }
        
        // Generate random data
        const dataPoints = 12;
        const data = Array.from({ length: dataPoints }, () => Math.random() * 100);
        
        // Draw line
        context.strokeStyle = 'rgba(59, 130, 246, 0.8)';
        context.lineWidth = 2;
        context.beginPath();
        
        data.forEach((value, index) => {
            const x = (width / (dataPoints - 1)) * index;
            const y = height - (value / 100) * height;
            
            if (index === 0) {
                context.moveTo(x, y);
            } else {
                context.lineTo(x, y);
            }
        });
        
        context.stroke();
        
        // Draw points
        context.fillStyle = 'rgba(59, 130, 246, 1)';
        data.forEach((value, index) => {
            const x = (width / (dataPoints - 1)) * index;
            const y = height - (value / 100) * height;
            
            context.beginPath();
            context.arc(x, y, 4, 0, Math.PI * 2);
            context.fill();
        });
        
        return { canvas, context, data };
    }

    createEngagementChart(ctx) {
        // Similar to traffic chart but for engagement data
        return this.createTrafficChart(ctx);
    }

    updateTrafficChart(period) {
        console.log('Updating traffic chart for period:', period);
        // In production, fetch new data and update chart
    }

    updateEngagementChart(period) {
        console.log('Updating engagement chart for period:', period);
        // In production, fetch new data and update chart
    }

    async loadNotifications() {
        try {
            // In production, this would fetch from API
            // const response = await API.get('/admin/notifications');
            // this.notifications = await response.json();
            
            // Mock notifications
            this.notifications = [
                {
                    id: 1,
                    type: 'warning',
                    message: 'New contact form submission from John Doe',
                    time: '10 minutes ago',
                    read: false
                },
                {
                    id: 2,
                    type: 'primary',
                    message: 'System backup completed successfully',
                    time: '2 hours ago',
                    read: false
                },
                {
                    id: 3,
                    type: 'info',
                    message: 'New user registration: jane@example.com',
                    time: '1 day ago',
                    read: true
                }
            ];
            
            this.updateNotificationCount();
            this.renderNotifications();
            
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
        window.location.href = '../pages/login.html';
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
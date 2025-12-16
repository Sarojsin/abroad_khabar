// Navigation Bar Component
import auth from '../core/auth.js';
import router from '../core/router.js';

class Navbar {
    constructor() {
        this.navbarContainer = document.getElementById('navbar-container');
        this.isMobileMenuOpen = false;
        this.init();
    }

    async init() {
        await this.render();
        this.bindEvents();
        this.setupAuthListener();
    }

    async render() {
        const isAuthenticated = auth.isAuthenticated;
        const user = auth.currentUser;
        const isAdmin = auth.isAdmin();

        const html = `
            <nav class="navbar">
                <div class="container navbar-container">
                    <!-- Logo -->
                    <a href="/" class="navbar-logo" data-router>
                        <div class="navbar-logo-icon">
                            <i class="fas fa-graduation-cap"></i>
                        </div>
                        <span>EduConsult</span>
                    </a>

                    <!-- Mobile Menu Toggle -->
                    <button class="navbar-toggle" id="mobile-menu-toggle">
                        <span class="navbar-toggle-icon">
                            <span></span>
                            <span></span>
                            <span></span>
                        </span>
                    </button>

                    <!-- Main Navigation -->
                    <ul class="navbar-menu" id="main-menu">
                        <li>
                            <a href="/" class="navbar-link" data-router data-router-link="/">Home</a>
                        </li>
                        <li class="navbar-dropdown">
                            <a href="/services" class="navbar-link" data-router data-router-link="/services">
                                Services
                                <i class="fas fa-chevron-down"></i>
                            </a>
                            <div class="navbar-dropdown-menu">
                                <a href="/services#university" class="navbar-dropdown-item">University Admissions</a>
                                <a href="/services#visa" class="navbar-dropdown-item">Visa Assistance</a>
                                <a href="/services#scholarship" class="navbar-dropdown-item">Scholarship Guidance</a>
                                <a href="/services#test-prep" class="navbar-dropdown-item">Test Preparation</a>
                                <a href="/services#career" class="navbar-dropdown-item">Career Counseling</a>
                            </div>
                        </li>
                        <li>
                            <a href="/countries" class="navbar-link" data-router data-router-link="/countries">Countries</a>
                        </li>
                        <li>
                            <a href="/videos" class="navbar-link" data-router data-router-link="/videos">Videos</a>
                        </li>
                        <li>
                            <a href="/blogs" class="navbar-link" data-router data-router-link="/blogs">Blogs</a>
                        </li>
                        <li>
                            <a href="/contact" class="navbar-link" data-router data-router-link="/contact">Contact</a>
                        </li>
                        
                        ${isAuthenticated && isAdmin ? `
                            <li class="navbar-dropdown">
                                <a href="/admin/dashboard" class="navbar-link" data-router data-router-link="/admin/dashboard">
                                    Admin
                                    <i class="fas fa-chevron-down"></i>
                                </a>
                                <div class="navbar-dropdown-menu">
                                    <a href="/admin/dashboard" class="navbar-dropdown-item">Dashboard</a>
                                    <a href="/admin/videos" class="navbar-dropdown-item">Video Manager</a>
                                    <a href="/admin/images" class="navbar-dropdown-item">Image Manager</a>
                                    <a href="/admin/blogs" class="navbar-dropdown-item">Blog Manager</a>
                                    <a href="/admin/services" class="navbar-dropdown-item">Service Manager</a>
                                    <a href="/admin/ads" class="navbar-dropdown-item">Ad Manager</a>
                                </div>
                            </li>
                        ` : ''}
                    </ul>

                    <!-- Auth Section -->
                    <div class="navbar-auth">
                        ${isAuthenticated ? `
                            <div class="user-dropdown">
                                <button class="user-menu-toggle">
                                    <img src="${user?.avatar || '/assets/images/default-avatar.png'}" 
                                         alt="${user?.name || 'User'}" 
                                         class="user-avatar">
                                    <span class="user-name">${user?.name?.split(' ')[0] || 'User'}</span>
                                    <i class="fas fa-chevron-down"></i>
                                </button>
                                <div class="user-dropdown-menu">
                                    <a href="/profile" class="user-dropdown-item">
                                        <i class="fas fa-user"></i>
                                        Profile
                                    </a>
                                    <a href="/settings" class="user-dropdown-item">
                                        <i class="fas fa-cog"></i>
                                        Settings
                                    </a>
                                    <div class="dropdown-divider"></div>
                                    <button class="user-dropdown-item logout-btn">
                                        <i class="fas fa-sign-out-alt"></i>
                                        Logout
                                    </button>
                                </div>
                            </div>
                        ` : `
                            <a href="/login" class="auth-btn login" data-router>Login</a>
                            <a href="/register" class="auth-btn register" data-router>Get Started</a>
                        `}
                    </div>
                </div>
            </nav>
        `;

        this.navbarContainer.innerHTML = html;
    }

    bindEvents() {
        // Mobile menu toggle
        const toggleBtn = document.getElementById('mobile-menu-toggle');
        const menu = document.getElementById('main-menu');
        
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggleMobileMenu());
        }

        // Dropdown menus
        document.querySelectorAll('.navbar-dropdown').forEach(dropdown => {
            const toggle = dropdown.querySelector('.navbar-link');
            const menu = dropdown.querySelector('.navbar-dropdown-menu');
            
            toggle.addEventListener('click', (e) => {
                if (window.innerWidth <= 768) {
                    e.preventDefault();
                    dropdown.classList.toggle('active');
                }
            });
        });

        // User dropdown
        const userToggle = document.querySelector('.user-menu-toggle');
        if (userToggle) {
            userToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                const dropdown = userToggle.nextElementSibling;
                dropdown.classList.toggle('active');
            });
        }

        // Logout button
        const logoutBtn = document.querySelector('.logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await auth.logout();
                router.navigate('/');
            });
        }

        // Close dropdowns on outside click
        document.addEventListener('click', (e) => {
            // Close navbar dropdowns
            document.querySelectorAll('.navbar-dropdown').forEach(dropdown => {
                if (!dropdown.contains(e.target)) {
                    dropdown.classList.remove('active');
                }
            });
            
            // Close user dropdown
            const userDropdown = document.querySelector('.user-dropdown-menu');
            if (userDropdown && !userDropdown.parentElement.contains(e.target)) {
                userDropdown.classList.remove('active');
            }
        });

        // Navbar scroll effect
        window.addEventListener('scroll', this.handleScroll.bind(this));
    }

    toggleMobileMenu() {
        const menu = document.getElementById('main-menu');
        const toggleBtn = document.getElementById('mobile-menu-toggle');
        
        this.isMobileMenuOpen = !this.isMobileMenuOpen;
        
        if (this.isMobileMenuOpen) {
            menu.classList.add('active');
            toggleBtn.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            menu.classList.remove('active');
            toggleBtn.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    handleScroll() {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }

    setupAuthListener() {
        auth.subscribe(({ isAuthenticated }) => {
            this.render();
            this.bindEvents();
        });
    }

    updateActiveLink(path) {
        // Remove active class from all links
        document.querySelectorAll('[data-router-link]').forEach(link => {
            link.classList.remove('active');
        });
        
        // Add active class to current link
        const activeLink = document.querySelector(`[data-router-link="${path}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    // Public method to refresh navbar
    async refresh() {
        await this.render();
        this.bindEvents();
    }
}

// Initialize and export
const navbar = new Navbar();

// Export load function for main.js
export async function loadNavbar() {
    await navbar.init();
    return navbar;
}

// Export for direct use
export default navbar;
// Authentication System
import api from './api.js';

class AuthService {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.tokenRefreshInterval = null;
        this.init();
    }

    async init() {
        // Check for stored user
        const userData = localStorage.getItem('user_data');
        const token = localStorage.getItem('auth_token');
        
        if (userData && token) {
            try {
                this.currentUser = JSON.parse(userData);
                this.isAuthenticated = true;
                
                // Verify token is still valid
                await this.verifyToken();
                
                // Start token refresh interval
                this.startTokenRefresh();
                
            } catch (error) {
                console.error('Failed to restore auth state:', error);
                this.clearAuth();
            }
        }
    }

    async login(email, password) {
        try {
            const response = await api.post('/auth/login', {
                email,
                password
            });

            if (response.access_token) {
                await this.setAuth(response);
                return { success: true, user: this.currentUser };
            }

            throw new Error('Invalid login response');

        } catch (error) {
            console.error('Login failed:', error);
            return {
                success: false,
                error: error.message || 'Login failed. Please check your credentials.'
            };
        }
    }

    async register(userData) {
        try {
            const response = await api.post('/auth/register', userData);

            if (response.access_token) {
                await this.setAuth(response);
                return { success: true, user: this.currentUser };
            }

            throw new Error('Invalid registration response');

        } catch (error) {
            console.error('Registration failed:', error);
            return {
                success: false,
                error: error.message || 'Registration failed. Please try again.'
            };
        }
    }

    async setAuth(authResponse) {
        const { access_token, refresh_token, user } = authResponse;
        
        // Store tokens
        api.setAuthToken(access_token);
        localStorage.setItem('refresh_token', refresh_token);
        
        // Store user data
        this.currentUser = user;
        localStorage.setItem('user_data', JSON.stringify(user));
        
        this.isAuthenticated = true;
        
        // Start token refresh
        this.startTokenRefresh();
        
        // Dispatch auth change event
        this.dispatchAuthChange();
    }

    async verifyToken() {
        try {
            await api.get('/auth/verify');
            return true;
        } catch (error) {
            console.error('Token verification failed:', error);
            await this.refreshToken();
            return false;
        }
    }

    async refreshToken() {
        try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (!refreshToken) {
                throw new Error('No refresh token available');
            }

            const response = await api.post('/auth/refresh', {
                refresh_token: refreshToken
            });

            if (response.access_token) {
                api.setAuthToken(response.access_token);
                return true;
            }

            throw new Error('Invalid refresh response');

        } catch (error) {
            console.error('Token refresh failed:', error);
            this.clearAuth();
            return false;
        }
    }

    startTokenRefresh() {
        // Clear existing interval
        if (this.tokenRefreshInterval) {
            clearInterval(this.tokenRefreshInterval);
        }

        // Refresh token every 15 minutes
        this.tokenRefreshInterval = setInterval(async () => {
            try {
                await this.refreshToken();
            } catch (error) {
                console.error('Automatic token refresh failed:', error);
            }
        }, 15 * 60 * 1000); // 15 minutes
    }

    clearAuth() {
        // Clear tokens
        api.removeAuthToken();
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');
        
        // Clear user state
        this.currentUser = null;
        this.isAuthenticated = false;
        
        // Clear refresh interval
        if (this.tokenRefreshInterval) {
            clearInterval(this.tokenRefreshInterval);
            this.tokenRefreshInterval = null;
        }
        
        // Dispatch auth change event
        this.dispatchAuthChange();
        
        // Redirect to login if not already there
        if (!window.location.pathname.includes('/login.html') && 
            !window.location.pathname.includes('/register.html')) {
            window.location.href = '/login.html';
        }
    }

    async logout() {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error('Logout API call failed:', error);
        } finally {
            this.clearAuth();
        }
    }

    dispatchAuthChange() {
        const event = new CustomEvent('authchange', {
            detail: {
                isAuthenticated: this.isAuthenticated,
                user: this.currentUser
            }
        });
        window.dispatchEvent(event);
    }

    // Check user roles
    hasRole(role) {
        if (!this.isAuthenticated || !this.currentUser) return false;
        return this.currentUser.roles?.includes(role) || this.currentUser.role === role;
    }

    hasAnyRole(roles) {
        if (!this.isAuthenticated || !this.currentUser) return false;
        return roles.some(role => 
            this.currentUser.roles?.includes(role) || this.currentUser.role === role
        );
    }

    hasAllRoles(roles) {
        if (!this.isAuthenticated || !this.currentUser) return false;
        return roles.every(role => 
            this.currentUser.roles?.includes(role) || this.currentUser.role === role
        );
    }

    // Check permissions
    can(permission) {
        if (!this.isAuthenticated || !this.currentUser) return false;
        
        // Check direct permissions
        if (this.currentUser.permissions?.includes(permission)) {
            return true;
        }
        
        // Check role-based permissions
        if (this.currentUser.role_permissions?.includes(permission)) {
            return true;
        }
        
        return false;
    }

    // Password reset
    async requestPasswordReset(email) {
        try {
            await api.post('/auth/password/reset', { email });
            return { success: true };
        } catch (error) {
            console.error('Password reset request failed:', error);
            return {
                success: false,
                error: error.message || 'Failed to request password reset'
            };
        }
    }

    async resetPassword(token, password, passwordConfirmation) {
        try {
            await api.post('/auth/password/reset/confirm', {
                token,
                password,
                password_confirmation: passwordConfirmation
            });
            return { success: true };
        } catch (error) {
            console.error('Password reset failed:', error);
            return {
                success: false,
                error: error.message || 'Failed to reset password'
            };
        }
    }

    // Email verification
    async sendVerificationEmail() {
        try {
            await api.post('/auth/email/verify/resend');
            return { success: true };
        } catch (error) {
            console.error('Failed to send verification email:', error);
            return {
                success: false,
                error: error.message || 'Failed to send verification email'
            };
        }
    }

    async verifyEmail(token) {
        try {
            await api.post('/auth/email/verify', { token });
            return { success: true };
        } catch (error) {
            console.error('Email verification failed:', error);
            return {
                success: false,
                error: error.message || 'Failed to verify email'
            };
        }
    }

    // Update profile
    async updateProfile(userData) {
        try {
            const response = await api.put('/auth/profile', userData);
            
            // Update local user data
            this.currentUser = { ...this.currentUser, ...response.user };
            localStorage.setItem('user_data', JSON.stringify(this.currentUser));
            
            return { success: true, user: this.currentUser };
        } catch (error) {
            console.error('Profile update failed:', error);
            return {
                success: false,
                error: error.message || 'Failed to update profile'
            };
        }
    }

    // Change password
    async changePassword(currentPassword, newPassword) {
        try {
            await api.post('/auth/password/change', {
                current_password: currentPassword,
                new_password: newPassword
            });
            return { success: true };
        } catch (error) {
            console.error('Password change failed:', error);
            return {
                success: false,
                error: error.message || 'Failed to change password'
            };
        }
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Check if user is admin
    isAdmin() {
        return this.hasRole('admin') || this.hasRole('superadmin');
    }

    // Check if user is staff
    isStaff() {
        return this.hasAnyRole(['admin', 'editor', 'moderator', 'staff']);
    }

    // Subscribe to auth changes
    subscribe(callback) {
        window.addEventListener('authchange', (event) => {
            callback(event.detail);
        });
        
        // Return unsubscribe function
        return () => {
            window.removeEventListener('authchange', callback);
        };
    }
}

// Create singleton instance
const auth = new AuthService();

// Initialize auth on page load
export async function initAuth() {
    await auth.init();
    return auth;
}

// Export for module usage
export default auth;

// Export individual methods for convenience
export const {
    login,
    register,
    logout,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    can,
    requestPasswordReset,
    resetPassword,
    sendVerificationEmail,
    verifyEmail,
    updateProfile,
    changePassword,
    getCurrentUser,
    isAdmin,
    isStaff,
    subscribe,
    isAuthenticated,
    currentUser
} = auth;
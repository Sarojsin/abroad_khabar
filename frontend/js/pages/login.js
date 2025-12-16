/**
 * Login Page JavaScript
 * Handles admin authentication, form validation, and security features
 */

import Auth from '../core/auth.js';
import API from '../core/api.js';

class LoginPage {
    constructor() {
        this.isLoginForm = true;
        this.loginAttempts = 0;
        this.maxAttempts = 5;
        this.lockedUntil = 0;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAutoLogin();
        this.setupPasswordToggle();
        this.checkSession();
        this.startSessionTimer();
    }

    setupEventListeners() {
        // Login form submission
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin(loginForm);
            });
        }

        // Forgot password link
        const forgotPasswordLink = document.getElementById('forgot-password-link');
        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.showForgotPasswordForm();
            });
        }

        // Back to login button
        const backToLoginBtn = document.getElementById('back-to-login');
        if (backToLoginBtn) {
            backToLoginBtn.addEventListener('click', () => {
                this.showLoginForm();
            });
        }

        // Forgot password form submission
        const forgotPasswordForm = document.getElementById('forgot-password-form');
        if (forgotPasswordForm) {
            forgotPasswordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handlePasswordReset(forgotPasswordForm);
            });
        }

        // Social login buttons
        document.querySelectorAll('.social-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const provider = e.target.classList.contains('google-btn') ? 'google' : 'microsoft';
                this.handleSocialLogin(provider);
            });
        });

        // Two-factor modal
        this.setupTwoFactorModal();
    }

    setupPasswordToggle() {
        const toggleBtn = document.getElementById('toggle-password');
        const passwordInput = document.getElementById('login-password');
        
        if (toggleBtn && passwordInput) {
            toggleBtn.addEventListener('click', () => {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                
                // Update icon
                const icon = toggleBtn.querySelector('svg');
                if (type === 'text') {
                    icon.innerHTML = `
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                    `;
                } else {
                    icon.innerHTML = `
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    `;
                }
            });
        }
    }

    checkAutoLogin() {
        const rememberMe = localStorage.getItem('rememberMe') === 'true';
        if (rememberMe) {
            const savedEmail = localStorage.getItem('savedEmail');
            const savedPassword = localStorage.getItem('savedPassword');
            
            if (savedEmail && savedPassword) {
                document.getElementById('login-email').value = savedEmail;
                document.getElementById('login-password').value = savedPassword;
                document.getElementById('remember-me').checked = true;
            }
        }
    }

    checkSession() {
        // Check if user is already logged in
        if (Auth.isAuthenticated()) {
            // Redirect to admin dashboard
            window.location.href = '../admin/dashboard.html';
        }
    }

    async handleLogin(form) {
        // Check if account is locked
        if (this.isAccountLocked()) {
            this.showLockedMessage();
            return;
        }

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const rememberMe = document.getElementById('remember-me').checked;

        // Validate inputs
        if (!this.validateLoginInputs(email, password)) {
            return;
        }

        // Show loading state
        const submitBtn = document.getElementById('login-submit');
        const btnText = submitBtn.querySelector('.btn-text');
        const spinner = submitBtn.querySelector('.loading-spinner');
        
        btnText.style.display = 'none';
        spinner.style.display = 'block';
        submitBtn.disabled = true;

        try {
            // In production, this would call the API
            // const response = await API.post('/auth/login', { email, password });
            // const data = await response.json();
            
            // Simulate API response with delay
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Mock successful response
            const mockResponse = {
                access_token: 'mock_jwt_token_' + Date.now(),
                refresh_token: 'mock_refresh_token_' + Date.now(),
                user: {
                    id: 1,
                    email: email,
                    name: 'Admin User',
                    role: 'admin',
                    permissions: ['all']
                }
            };
            
            // Save credentials if remember me is checked
            if (rememberMe) {
                localStorage.setItem('rememberMe', 'true');
                localStorage.setItem('savedEmail', email);
                // Note: In production, never store passwords in localStorage
                // This is just for demonstration
                localStorage.setItem('savedPassword', password);
            } else {
                localStorage.removeItem('rememberMe');
                localStorage.removeItem('savedEmail');
                localStorage.removeItem('savedPassword');
            }
            
            // Store auth data
            Auth.setToken(mockResponse.access_token);
            Auth.setRefreshToken(mockResponse.refresh_token);
            Auth.setUser(mockResponse.user);
            
            // Reset login attempts on successful login
            this.resetLoginAttempts();
            
            // Check if two-factor is required (mock)
            const requires2FA = Math.random() > 0.7; // 30% chance for demo
            if (requires2FA) {
                this.showTwoFactorModal();
            } else {
                // Redirect to admin dashboard
                window.location.href = '../admin/dashboard.html';
            }
            
        } catch (error) {
            console.error('Login error:', error);
            
            // Increment login attempts
            this.loginAttempts++;
            
            if (this.loginAttempts >= this.maxAttempts) {
                this.lockAccount();
                this.showLockedMessage();
            } else {
                const attemptsLeft = this.maxAttempts - this.loginAttempts;
                this.showToast(
                    `Invalid credentials. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining.`,
                    'error'
                );
            }
            
        } finally {
            // Reset button state
            btnText.style.display = 'block';
            spinner.style.display = 'none';
            submitBtn.disabled = false;
        }
    }

    validateLoginInputs(email, password) {
        if (!email || !password) {
            this.showToast('Please enter both email and password', 'error');
            return false;
        }
        
        if (!this.isValidEmail(email)) {
            this.showToast('Please enter a valid email address', 'error');
            return false;
        }
        
        if (password.length < 8) {
            this.showToast('Password must be at least 8 characters', 'error');
            return false;
        }
        
        return true;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    showForgotPasswordForm() {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('forgot-password-form').style.display = 'block';
        this.isLoginForm = false;
    }

    showLoginForm() {
        document.getElementById('forgot-password-form').style.display = 'none';
        document.getElementById('login-form').style.display = 'block';
        this.isLoginForm = true;
    }

    async handlePasswordReset(form) {
        const email = document.getElementById('reset-email').value;
        
        if (!email || !this.isValidEmail(email)) {
            this.showToast('Please enter a valid email address', 'error');
            return;
        }
        
        // Show loading state
        const submitBtn = document.getElementById('reset-submit');
        const btnText = submitBtn.querySelector('.btn-text');
        const spinner = submitBtn.querySelector('.loading-spinner');
        
        btnText.style.display = 'none';
        spinner.style.display = 'block';
        submitBtn.disabled = true;
        
        try {
            // In production, this would call the API
            // await API.post('/auth/forgot-password', { email });
            
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this.showToast('Password reset instructions sent to your email');
            this.showLoginForm();
            form.reset();
            
        } catch (error) {
            console.error('Password reset error:', error);
            this.showToast('Failed to send reset instructions. Please try again.', 'error');
        } finally {
            btnText.style.display = 'block';
            spinner.style.display = 'none';
            submitBtn.disabled = false;
        }
    }

    async handleSocialLogin(provider) {
        try {
            // In production, this would redirect to OAuth endpoint
            // For now, simulate social login
            this.showToast(`Redirecting to ${provider} login...`);
            
            // Simulate redirect delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Mock successful social login
            const mockResponse = {
                access_token: 'mock_social_token_' + Date.now(),
                user: {
                    id: 2,
                    email: 'social@example.com',
                    name: 'Social User',
                    role: 'editor',
                    permissions: ['content']
                }
            };
            
            Auth.setToken(mockResponse.access_token);
            Auth.setUser(mockResponse.user);
            
            // Redirect to admin dashboard
            window.location.href = '../admin/dashboard.html';
            
        } catch (error) {
            console.error('Social login error:', error);
            this.showToast('Social login failed. Please try again.', 'error');
        }
    }

    setupTwoFactorModal() {
        const modal = document.getElementById('two-factor-modal');
        if (!modal) return;
        
        // Close button
        modal.querySelector('.modal-close').addEventListener('click', () => {
            modal.classList.remove('active');
        });
        
        // Outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
        
        // Code input handling
        const codeInputs = modal.querySelectorAll('.code-input');
        codeInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                const value = e.target.value;
                
                // Only allow digits
                if (!/^\d?$/.test(value)) {
                    e.target.value = '';
                    return;
                }
                
                // Auto-focus next input
                if (value && index < codeInputs.length - 1) {
                    codeInputs[index + 1].focus();
                }
                
                // Check if all inputs are filled
                const allFilled = Array.from(codeInputs).every(input => input.value);
                if (allFilled) {
                    this.verifyTwoFactorCode();
                }
            });
            
            // Handle backspace
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && !input.value && index > 0) {
                    codeInputs[index - 1].focus();
                }
            });
            
            // Handle paste
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pastedData = e.clipboardData.getData('text');
                const digits = pastedData.replace(/\D/g, '').split('');
                
                digits.forEach((digit, idx) => {
                    if (codeInputs[idx]) {
                        codeInputs[idx].value = digit;
                    }
                });
                
                // Focus last input
                const lastIndex = Math.min(digits.length - 1, codeInputs.length - 1);
                codeInputs[lastIndex].focus();
                
                // Check if all inputs are filled
                const allFilled = Array.from(codeInputs).every(input => input.value);
                if (allFilled) {
                    this.verifyTwoFactorCode();
                }
            });
        });
        
        // Form submission
        const twoFactorForm = document.getElementById('two-factor-form');
        if (twoFactorForm) {
            twoFactorForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.verifyTwoFactorCode();
            });
        }
        
        // Resend code button
        const resendBtn = document.getElementById('resend-code');
        if (resendBtn) {
            resendBtn.addEventListener('click', () => {
                this.resendTwoFactorCode();
            });
        }
        
        // Use backup code button
        const backupBtn = document.getElementById('use-backup-code');
        if (backupBtn) {
            backupBtn.addEventListener('click', () => {
                this.useBackupCode();
            });
        }
        
        // Start timer
        this.startTwoFactorTimer();
    }

    showTwoFactorModal() {
        const modal = document.getElementById('two-factor-modal');
        if (modal) {
            modal.classList.add('active');
            
            // Focus first input
            const firstInput = modal.querySelector('.code-input');
            if (firstInput) {
                firstInput.focus();
            }
        }
    }

    async verifyTwoFactorCode() {
        const modal = document.getElementById('two-factor-modal');
        const codeInputs = modal.querySelectorAll('.code-input');
        const code = Array.from(codeInputs).map(input => input.value).join('');
        
        if (code.length !== 6) {
            this.showToast('Please enter a 6-digit code', 'error', modal);
            return;
        }
        
        try {
            // In production, this would verify with API
            // await API.post('/auth/verify-2fa', { code });
            
            // Simulate verification
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Mock successful verification
            this.showToast('Two-factor authentication successful!');
            modal.classList.remove('active');
            
            // Clear inputs
            codeInputs.forEach(input => input.value = '');
            
            // Redirect to admin dashboard
            window.location.href = '../admin/dashboard.html';
            
        } catch (error) {
            console.error('2FA verification error:', error);
            
            // Clear inputs and focus first
            codeInputs.forEach(input => input.value = '');
            if (codeInputs[0]) codeInputs[0].focus();
            
            this.showToast('Invalid verification code. Please try again.', 'error', modal);
        }
    }

    resendTwoFactorCode() {
        // In production, this would request new code from API
        this.showToast('New verification code sent to your authenticator app');
        this.startTwoFactorTimer();
    }

    useBackupCode() {
        this.showToast('Backup code functionality coming soon!');
    }

    startTwoFactorTimer() {
        const timerElement = document.getElementById('code-timer');
        if (!timerElement) return;
        
        let timeLeft = 120; // 2 minutes in seconds
        
        const timer = setInterval(() => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            
            timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            if (timeLeft <= 0) {
                clearInterval(timer);
                timerElement.textContent = '0:00';
                // Enable resend button
                const resendBtn = document.getElementById('resend-code');
                if (resendBtn) {
                    resendBtn.disabled = false;
                }
            }
            
            timeLeft--;
        }, 1000);
    }

    startSessionTimer() {
        // Display session warning after 55 minutes
        setTimeout(() => {
            const sessionWarning = document.querySelector('.session-warning');
            if (sessionWarning) {
                sessionWarning.classList.add('show-warning');
            }
        }, 55 * 60 * 1000); // 55 minutes
    }

    isAccountLocked() {
        if (this.lockedUntil > Date.now()) {
            return true;
        } else if (this.lockedUntil > 0) {
            // Lock expired, reset
            this.resetLoginAttempts();
        }
        return false;
    }

    lockAccount() {
        this.lockedUntil = Date.now() + (15 * 60 * 1000); // Lock for 15 minutes
        localStorage.setItem('accountLockedUntil', this.lockedUntil.toString());
    }

    resetLoginAttempts() {
        this.loginAttempts = 0;
        this.lockedUntil = 0;
        localStorage.removeItem('accountLockedUntil');
    }

    showLockedMessage() {
        if (this.lockedUntil > Date.now()) {
            const minutesLeft = Math.ceil((this.lockedUntil - Date.now()) / (60 * 1000));
            this.showToast(
                `Account locked. Try again in ${minutesLeft} minute${minutesLeft !== 1 ? 's' : ''}.`,
                'error'
            );
        }
    }

    showToast(message, type = 'success', context = document.body) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        context.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LoginPage();
});

export default LoginPage;
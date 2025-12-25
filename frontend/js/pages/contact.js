/**
 * Contact Page JavaScript
 * Handles multi-step form, validation, and submission
 */

import { lazyLoadImages, setupScrollAnimations } from '../effects/scroll-animations.js';
import API from '../core/api.js';

class ContactPage {
    constructor() {
        this.currentStep = 1;
        this.formData = {
            personal: {},
            study: {},
            message: {}
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initAnimations();
        this.initMultiStepForm();
        this.setupMap();
    }

    setupEventListeners() {
        // Country consultation button
        const consultBtn = document.querySelector('.magnetic-btn');
        if (consultBtn) {
            consultBtn.addEventListener('mouseenter', () => {
                consultBtn.classList.add('magnetic-hover');
            });
            consultBtn.addEventListener('mouseleave', () => {
                consultBtn.classList.remove('magnetic-hover');
            });
        }

        // Consultation form
        const consultationForm = document.getElementById('consultation-form');
        if (consultationForm) {
            consultationForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitConsultation(consultationForm);
            });
        }

        // Success modal close
        const successModal = document.getElementById('success-modal');
        if (successModal) {
            successModal.querySelector('.modal-close').addEventListener('click', () => {
                successModal.classList.remove('active');
            });
            successModal.querySelector('.close-success-modal').addEventListener('click', () => {
                successModal.classList.remove('active');
            });
            successModal.addEventListener('click', (e) => {
                if (e.target === successModal) {
                    successModal.classList.remove('active');
                }
            });
        }
    }

    initAnimations() {
        lazyLoadImages();
        setupScrollAnimations();

        // Animate contact options
        const contactOptions = document.querySelectorAll('.contact-option');
        contactOptions.forEach((option, index) => {
            setTimeout(() => {
                option.classList.add('animate-fade-in');
            }, index * 200);
        });

        // Animate FAQ items
        const faqItems = document.querySelectorAll('.faq-item');
        faqItems.forEach((item, index) => {
            setTimeout(() => {
                item.classList.add('animate-slide-up');
            }, index * 100);
        });
    }

    initMultiStepForm() {
        const form = document.getElementById('contact-form');
        if (!form) return;

        // Step navigation
        form.querySelectorAll('.next-step').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const nextStep = parseInt(e.target.dataset.next);
                if (this.validateCurrentStep()) {
                    this.goToStep(nextStep);
                }
            });
        });

        form.querySelectorAll('.prev-step').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const prevStep = parseInt(e.target.dataset.prev);
                this.goToStep(prevStep);
            });
        });

        // Form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.submitForm();
        });

        // Initialize first step
        this.goToStep(1);
    }

    validateCurrentStep() {
        const currentStepElement = document.querySelector(`.form-step[data-step="${this.currentStep}"]`);
        const requiredFields = currentStepElement.querySelectorAll('[required]');
        let isValid = true;
        let firstInvalidField = null;

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
                if (!firstInvalidField) firstInvalidField = field;

                field.classList.add('error');
                const errorMsg = field.parentElement.querySelector('.error-message') ||
                    this.createErrorMessage('This field is required');
                field.parentElement.appendChild(errorMsg);
            } else {
                field.classList.remove('error');
                const errorMsg = field.parentElement.querySelector('.error-message');
                if (errorMsg) errorMsg.remove();

                // Additional validation for specific fields
                if (field.type === 'email' && !this.isValidEmail(field.value)) {
                    isValid = false;
                    field.classList.add('error');
                    const errorMsg = this.createErrorMessage('Please enter a valid email address');
                    field.parentElement.appendChild(errorMsg);
                }

                if (field.type === 'tel' && !this.isValidPhone(field.value)) {
                    isValid = false;
                    field.classList.add('error');
                    const errorMsg = this.createErrorMessage('Please enter a valid phone number');
                    field.parentElement.appendChild(errorMsg);
                }
            }
        });

        if (firstInvalidField) {
            firstInvalidField.focus();
        }

        return isValid;
    }

    createErrorMessage(text) {
        const error = document.createElement('div');
        error.className = 'error-message';
        error.textContent = text;
        return error;
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    isValidPhone(phone) {
        // Basic phone validation - can be enhanced based on requirements
        const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
        return phoneRegex.test(phone);
    }

    goToStep(step) {
        // Hide current step
        const currentStep = document.querySelector(`.form-step[data-step="${this.currentStep}"]`);
        if (currentStep) {
            currentStep.classList.remove('active');
        }

        // Show new step
        const newStep = document.querySelector(`.form-step[data-step="${step}"]`);
        if (newStep) {
            newStep.classList.add('active');
            this.currentStep = step;

            // Update progress indicator
            this.updateProgress(step);

            // Scroll to step
            newStep.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    updateProgress(currentStep) {
        const progressSteps = document.querySelectorAll('.progress-step');
        progressSteps.forEach(step => {
            const stepNumber = parseInt(step.dataset.step);
            step.classList.remove('active', 'completed');

            if (stepNumber === currentStep) {
                step.classList.add('active');
            } else if (stepNumber < currentStep) {
                step.classList.add('completed');
            }
        });
    }

    collectFormData() {
        // Collect personal info
        this.formData.personal = {
            firstName: document.getElementById('first-name')?.value || '',
            lastName: document.getElementById('last-name')?.value || '',
            email: document.getElementById('email')?.value || '',
            phone: document.getElementById('phone')?.value || '',
            country: document.getElementById('country')?.value || ''
        };

        // Collect study preferences
        const destinationSelect = document.getElementById('study-destination');
        const selectedDestinations = Array.from(destinationSelect.selectedOptions).map(option => option.value);

        this.formData.study = {
            destination: selectedDestinations,
            educationLevel: document.getElementById('education-level')?.value || '',
            programInterest: document.getElementById('program-interest')?.value || '',
            intakeYear: document.getElementById('intake-year')?.value || ''
        };

        // Collect message and final details
        this.formData.message = {
            message: document.getElementById('message')?.value || '',
            howFound: document.getElementById('how-found')?.value || '',
            newsletterOptin: document.getElementById('newsletter-optin')?.checked || false
        };
    }

    async submitForm() {
        // Collect all form data
        this.collectFormData();

        // Validate final step
        if (!this.validateCurrentStep()) {
            return;
        }

        // Show loading state
        const submitBtn = document.querySelector('#contact-form button[type="submit"]');
        const submitText = submitBtn.querySelector('.submit-text');
        const spinner = submitBtn.querySelector('.loading-spinner');

        submitText.style.display = 'none';
        spinner.style.display = 'block';
        submitBtn.disabled = true;

        try {
            // In production, this would submit to API
            // const response = await API.post('/contact', {
            //     ...this.formData.personal,
            //     ...this.formData.study,
            //     ...this.formData.message,
            //     formType: 'general-inquiry'
            // });

            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Show success modal
            const successModal = document.getElementById('success-modal');
            if (successModal) {
                successModal.classList.add('active');

                // Reset form
                document.getElementById('contact-form').reset();
                this.goToStep(1);
            }

        } catch (error) {
            console.error('Error submitting form:', error);
            this.showToast('Failed to submit form. Please try again.', 'error');
        } finally {
            // Reset button state
            submitText.style.display = 'block';
            spinner.style.display = 'none';
            submitBtn.disabled = false;
        }
    }

    async submitConsultation(form) {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Booking...';
        submitBtn.disabled = true;

        try {
            // In production, this would submit to API
            // await API.post('/consultations', data);

            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            this.showToast('Consultation booked successfully! We will contact you soon.');
            form.reset();

        } catch (error) {
            console.error('Error booking consultation:', error);
            this.showToast('Failed to book consultation. Please try again.', 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    setupMap() {
        // In production, this would initialize Google Maps
        // For now, we'll set up a placeholder with interactive features

        const mapPlaceholder = document.querySelector('.map-placeholder');
        if (mapPlaceholder) {
            mapPlaceholder.addEventListener('click', () => {
                window.open('https://maps.google.com', '_blank');
            });

            // Add hover effect
            mapPlaceholder.addEventListener('mouseenter', () => {
                mapPlaceholder.style.transform = 'scale(1.02)';
                mapPlaceholder.style.transition = 'transform 0.3s ease';
            });

            mapPlaceholder.addEventListener('mouseleave', () => {
                mapPlaceholder.style.transform = 'scale(1)';
            });
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
export default ContactPage;

/**
 * 404 Page JavaScript
 * Handles interactive elements, animations, and search functionality
 */

import { setupScrollAnimations } from '../effects/scroll-animations.js';

class NotFoundPage {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initAnimations();
        this.setupTechnicalDetails();
        this.setupFactSlider();
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('error-search');
        const searchBtn = document.querySelector('.search-btn');
        
        if (searchInput && searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.performSearch(searchInput.value);
            });
            
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch(searchInput.value);
                }
            });
        }

        // Go back button
        const goBackBtn = document.querySelector('[onclick="window.history.back()"]');
        if (goBackBtn) {
            goBackBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    window.location.href = '../index.html';
                }
            });
        }

        // Refresh button
        const refreshBtn = document.querySelector('[onclick="window.location.reload()"]');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', (e) => {
                e.preventDefault();
                window.location.reload();
            });
        }

        // Technical details toggle
        const detailsToggle = document.querySelector('.error-technical details');
        if (detailsToggle) {
            detailsToggle.addEventListener('toggle', () => {
                if (detailsToggle.open) {
                    this.animateTechnicalDetails();
                }
            });
        }

        // Fact slider navigation
        this.setupFactSliderNavigation();
    }

    initAnimations() {
        setupScrollAnimations();
        
        // Animate 404 number
        this.animate404();
        
        // Animate suggestion cards
        const suggestionCards = document.querySelectorAll('.suggestion-card');
        suggestionCards.forEach((card, index) => {
            setTimeout(() => {
                card.classList.add('animate-fade-in');
            }, index * 200);
        });
    }

    animate404() {
        const digits = document.querySelectorAll('.digit');
        const orbits = document.querySelectorAll('.orbit');
        
        // Animate digits with delay
        digits.forEach((digit, index) => {
            setTimeout(() => {
                digit.classList.add('animate-bounce');
            }, index * 300);
        });
        
        // Animate orbits
        orbits.forEach((orbit, index) => {
            setTimeout(() => {
                orbit.classList.add('animate-spin');
            }, index * 400);
        });
        
        // Add floating animation to zero
        const zeroDigit = document.querySelector('.zero');
        if (zeroDigit) {
            setInterval(() => {
                zeroDigit.classList.toggle('float-up');
            }, 3000);
        }
    }

    performSearch(query) {
        if (!query.trim()) {
            this.showToast('Please enter a search term');
            return;
        }
        
        // In production, this would search through the site
        // For now, simulate search and show suggestions
        
        const suggestions = [
            'Study abroad programs',
            'Visa application process',
            'Scholarship opportunities',
            'University selection',
            'Contact information'
        ];
        
        const matchedSuggestions = suggestions.filter(suggestion => 
            suggestion.toLowerCase().includes(query.toLowerCase())
        );
        
        if (matchedSuggestions.length > 0) {
            this.showSearchResults(query, matchedSuggestions);
        } else {
            this.showToast(`No results found for "${query}". Try different keywords.`, 'error');
        }
    }

    showSearchResults(query, results) {
        const searchContainer = document.querySelector('.error-search');
        if (!searchContainer) return;
        
        const resultsHTML = `
            <div class="search-results glass-card">
                <h4>Search results for "${query}":</h4>
                <ul class="results-list">
                    ${results.map(result => `
                        <li>
                            <a href="#" class="result-link">${result}</a>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
        
        // Remove previous results if any
        const existingResults = searchContainer.querySelector('.search-results');
        if (existingResults) {
            existingResults.remove();
        }
        
        // Insert results
        searchContainer.insertAdjacentHTML('beforeend', resultsHTML);
        
        // Animate results
        const resultsContainer = searchContainer.querySelector('.search-results');
        setTimeout(() => {
            resultsContainer.classList.add('animate-slide-up');
        }, 100);
    }

    setupTechnicalDetails() {
        const timestampElement = document.getElementById('error-timestamp');
        const urlElement = document.getElementById('requested-url');
        const userAgentElement = document.getElementById('user-agent');
        
        if (timestampElement) {
            timestampElement.textContent = new Date().toLocaleString();
        }
        
        if (urlElement) {
            urlElement.textContent = window.location.href;
        }
        
        if (userAgentElement) {
            userAgentElement.textContent = navigator.userAgent;
        }
    }

    setupFactSlider() {
        this.currentFact = 0;
        this.totalFacts = document.querySelectorAll('.fact-slide').length;
        
        if (this.totalFacts === 0) return;
        
        // Start auto-rotation
        this.startFactRotation();
    }

    setupFactSliderNavigation() {
        const prevBtn = document.querySelector('.fact-nav-btn.prev');
        const nextBtn = document.querySelector('.fact-nav-btn.next');
        const dots = document.querySelectorAll('.fact-dots .dot');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.showFact(this.currentFact - 1);
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.showFact(this.currentFact + 1);
            });
        }
        
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                this.showFact(index);
            });
        });
    }

    showFact(index) {
        const slides = document.querySelectorAll('.fact-slide');
        const dots = document.querySelectorAll('.fact-dots .dot');
        
        // Handle wrap-around
        if (index < 0) index = this.totalFacts - 1;
        if (index >= this.totalFacts) index = 0;
        
        // Update current fact
        this.currentFact = index;
        
        // Update slides
        slides.forEach((slide, i) => {
            slide.classList.toggle('active', i === index);
        });
        
        // Update dots
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
        
        // Reset auto-rotation timer
        this.resetFactRotation();
    }

    startFactRotation() {
        this.rotationInterval = setInterval(() => {
            this.showFact(this.currentFact + 1);
        }, 5000); // Rotate every 5 seconds
    }

    resetFactRotation() {
        if (this.rotationInterval) {
            clearInterval(this.rotationInterval);
        }
        this.startFactRotation();
    }

    showToast(message, type = 'info') {
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
    
    animateTechnicalDetails() {
        const details = document.querySelector('.technical-content');
        if (details) {
            details.classList.add('animate-fade-in');
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new NotFoundPage();
});

export default NotFoundPage;

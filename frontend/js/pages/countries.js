/**
 * Countries Page JavaScript
 * Handles country filtering, sorting, and comparison table
 */

import { lazyLoadImages, setupScrollAnimations } from '../effects/scroll-animations.js';
import { setupFilter } from '../effects/filters.js';
import API from '../core/api.js';

class CountriesPage {
    constructor() {
        this.countries = [];
        this.filteredCountries = [];
        this.currentContinent = 'all';
        this.currentSort = 'popular';
        this.currentSearch = '';
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initAnimations();
        this.loadCountries();
        this.setupComparisonTable();
    }

    setupEventListeners() {
        // Continent filter tabs
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.currentContinent = e.target.dataset.continent;
                document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                this.filterCountries();
            });
        });

        // Search functionality
        const searchInput = document.getElementById('country-search');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.currentSearch = e.target.value.toLowerCase();
                    this.filterCountries();
                }, 500);
            });
        }

        // Sort functionality
        const sortSelect = document.getElementById('country-sort');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.sortCountries();
                this.renderCountries();
            });
        }

        // Country consultation button
        const consultBtn = document.getElementById('country-consultation-btn');
        if (consultBtn) {
            consultBtn.addEventListener('click', () => {
                this.openConsultationModal();
            });
        }

        // Country modal
        const countryModal = document.getElementById('country-modal');
        if (countryModal) {
            countryModal.querySelector('.modal-close').addEventListener('click', () => {
                countryModal.classList.remove('active');
            });
            countryModal.addEventListener('click', (e) => {
                if (e.target === countryModal) {
                    countryModal.classList.remove('active');
                }
            });
        }
    }

    initAnimations() {
        lazyLoadImages();
        setupScrollAnimations();

        // Animate visa cards
        const visaCards = document.querySelectorAll('.visa-card');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.classList.add('animate-fade-in');
                    }, index * 100);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });

        visaCards.forEach(card => observer.observe(card));
    }

    async loadCountries() {
        try {
            // In production, this would fetch from API
            // const response = await API.get('/countries');
            // this.countries = await response.json();
            
            // Mock data for demonstration
            this.countries = this.generateMockCountries();
            this.filteredCountries = [...this.countries];
            this.sortCountries();
            this.renderCountries();
            this.updateComparisonTable();
            
        } catch (error) {
            console.error('Error loading countries:', error);
            this.showError('Failed to load countries. Please try again.');
        }
    }

    generateMockCountries() {
        return [
            {
                id: 1,
                name: 'Canada',
                continent: 'north-america',
                flag: '../assets/images/flags/canada.png',
                description: 'World-class education with excellent post-study work opportunities',
                tuition: 'CAD $15,000 - $30,000',
                livingCost: '$1,200 - $2,000/month',
                workHours: '20 hours/week',
                postStudyVisa: '3 years',
                popularity: 95,
                universities: 'University of Toronto, University of British Columbia, McGill University',
                featured: true
            },
            {
                id: 2,
                name: 'United States',
                continent: 'north-america',
                flag: '../assets/images/flags/usa.png',
                description: 'Top-ranked universities with diverse cultural experiences',
                tuition: '$20,000 - $50,000',
                livingCost: '$1,500 - $3,000/month',
                workHours: '20 hours/week',
                postStudyVisa: '1-3 years',
                popularity: 90,
                universities: 'Harvard, MIT, Stanford, Yale',
                featured: false
            },
            {
                id: 3,
                name: 'United Kingdom',
                continent: 'europe',
                flag: '../assets/images/flags/uk.png',
                description: 'Prestigious universities with rich historical heritage',
                tuition: '£18,000 - £35,000',
                livingCost: '£1,000 - £2,000/month',
                workHours: '20 hours/week',
                postStudyVisa: '2 years',
                popularity: 85,
                universities: 'Oxford, Cambridge, Imperial College London',
                featured: true
            },
            {
                id: 4,
                name: 'Australia',
                continent: 'australia',
                flag: '../assets/images/flags/australia.png',
                description: 'High quality of life with excellent work opportunities',
                tuition: 'AUD $20,000 - $40,000',
                livingCost: '$1,500 - $2,500/month',
                workHours: '40 hours/fortnight',
                postStudyVisa: '2-4 years',
                popularity: 88,
                universities: 'University of Melbourne, Australian National University',
                featured: true
            },
            {
                id: 5,
                name: 'Germany',
                continent: 'europe',
                flag: '../assets/images/flags/germany.png',
                description: 'Tuition-free education with strong engineering programs',
                tuition: '€0 - €20,000',
                livingCost: '€800 - €1,500/month',
                workHours: '20 hours/week',
                postStudyVisa: '18 months',
                popularity: 82,
                universities: 'Technical University of Munich, Heidelberg University',
                featured: false
            },
            {
                id: 6,
                name: 'New Zealand',
                continent: 'australia',
                flag: '../assets/images/flags/newzealand.png',
                description: 'Safe and welcoming environment with excellent education',
                tuition: 'NZD $22,000 - $35,000',
                livingCost: '$1,200 - $2,000/month',
                workHours: '20 hours/week',
                postStudyVisa: '3 years',
                popularity: 80,
                universities: 'University of Auckland, University of Otago',
                featured: false
            }
        ];
    }

    filterCountries() {
        this.filteredCountries = this.countries.filter(country => {
            // Filter by continent
            const continentMatch = this.currentContinent === 'all' || country.continent === this.currentContinent;
            
            // Filter by search
            const searchMatch = !this.currentSearch || 
                country.name.toLowerCase().includes(this.currentSearch) ||
                country.description.toLowerCase().includes(this.currentSearch) ||
                country.universities.toLowerCase().includes(this.currentSearch);
            
            return continentMatch && searchMatch;
        });
        
        this.sortCountries();
        this.renderCountries();
    }

    sortCountries() {
        switch (this.currentSort) {
            case 'name':
                this.filteredCountries.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'cost':
                this.filteredCountries.sort((a, b) => {
                    const costA = this.extractNumber(a.tuition);
                    const costB = this.extractNumber(b.tuition);
                    return costA - costB;
                });
                break;
            case 'ranking':
                this.filteredCountries.sort((a, b) => b.popularity - a.popularity);
                break;
            case 'popular':
            default:
                this.filteredCountries.sort((a, b) => {
                    if (a.featured && !b.featured) return -1;
                    if (!a.featured && b.featured) return 1;
                    return b.popularity - a.popularity;
                });
        }
    }

    extractNumber(text) {
        const match = text.match(/[\d,]+/);
        return match ? parseInt(match[0].replace(/,/g, '')) : 0;
    }

    renderCountries() {
        const container = document.getElementById('countries-container');
        
        if (this.filteredCountries.length === 0) {
            container.innerHTML = `
                <div class="no-results glass-card">
                    <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <h3>No countries found</h3>
                    <p>Try adjusting your filters or search term</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.filteredCountries.map(country => `
            <div class="country-card glass-card hover-glow" data-continent="${country.continent}">
                <div class="country-flag">
                    <img src="${country.flag}" alt="${country.name} Flag" class="lazy-image" data-src="${country.flag}">
                    ${country.featured ? '<span class="featured-badge">Featured</span>' : ''}
                </div>
                <div class="country-content">
                    <h3 class="country-name">${country.name}</h3>
                    <p class="country-description">${country.description}</p>
                    <div class="country-stats">
                        <div class="stat">
                            <span class="stat-label">Tuition:</span>
                            <span class="stat-value">${country.tuition}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Living Cost:</span>
                            <span class="stat-value">${country.livingCost}</span>
                        </div>
                    </div>
                    <div class="country-actions">
                        <button class="btn btn-outline btn-sm view-details" data-country-id="${country.id}">
                            View Details
                        </button>
                        <button class="btn btn-primary btn-sm compare-btn" data-country-id="${country.id}">
                            Compare
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        // Add event listeners to buttons
        container.querySelectorAll('.view-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const countryId = parseInt(e.target.dataset.countryId);
                const country = this.countries.find(c => c.id === countryId);
                this.showCountryDetails(country);
            });
        });

        container.querySelectorAll('.compare-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const countryId = parseInt(e.target.dataset.countryId);
                this.addToComparison(countryId);
            });
        });

        // Update featured country spotlight
        const featuredCountry = this.filteredCountries.find(c => c.featured) || this.filteredCountries[0];
        if (featuredCountry) {
            this.updateSpotlight(featuredCountry);
        }

        lazyLoadImages();
    }

    updateSpotlight(country) {
        const spotlight = document.getElementById('country-spotlight');
        if (!spotlight) return;

        spotlight.innerHTML = `
            <div class="spotlight-header">
                <div class="spotlight-flag">
                    <img src="${country.flag}" alt="${country.name} Flag" class="flag-image">
                </div>
                <div class="spotlight-info">
                    <h3 class="spotlight-title">${country.name}</h3>
                    <div class="spotlight-rating">
                        <span class="rating-stars">${'★'.repeat(Math.floor(country.popularity / 20))}${'☆'.repeat(5 - Math.floor(country.popularity / 20))}</span>
                        <span class="rating-text">${country.popularity}% Student Satisfaction</span>
                    </div>
                </div>
            </div>
            <div class="spotlight-content">
                <div class="spotlight-stats">
                    <div class="stat-item">
                        <div class="stat-value">${country.tuition}</div>
                        <div class="stat-label">Avg Tuition</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${country.postStudyVisa}</div>
                        <div class="stat-label">Post-Study Work</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${country.workHours}</div>
                        <div class="stat-label">Work While Study</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">${country.popularity}%</div>
                        <div class="stat-label">Success Rate</div>
                    </div>
                </div>
                <div class="spotlight-features">
                    <h4>Why Choose ${country.name}?</h4>
                    <ul class="feature-list">
                        <li>${this.getCountryFeature(country.id, 1)}</li>
                        <li>${this.getCountryFeature(country.id, 2)}</li>
                        <li>${this.getCountryFeature(country.id, 3)}</li>
                        <li>${this.getCountryFeature(country.id, 4)}</li>
                    </ul>
                </div>
            </div>
        `;
    }

    getCountryFeature(countryId, index) {
        const features = {
            1: ['World-class education system', 'Top-ranked universities', 'Prestigious universities', 'High quality education', 'Tuition-free options', 'Safe environment'],
            2: ['Multicultural society', 'Diverse cultural experiences', 'Rich historical heritage', 'Excellent work opportunities', 'Strong engineering programs', 'Welcoming environment'],
            3: ['Pathway to permanent residency', 'Excellent post-study work', 'Good post-study options', 'Good work opportunities', 'Good job market', 'Good career prospects'],
            4: ['Safe and welcoming environment', 'High quality of life', 'Good living standards', 'Affordable living costs', 'Beautiful landscapes', 'Friendly people']
        };
        
        return features[index][countryId - 1] || 'Excellent education opportunities';
    }

    showCountryDetails(country) {
        const modal = document.getElementById('country-modal');
        const content = document.getElementById('country-modal-content');
        
        content.innerHTML = `
            <div class="country-details-modal">
                <div class="country-details-header">
                    <div class="country-flag-large">
                        <img src="${country.flag}" alt="${country.name} Flag">
                    </div>
                    <div class="country-header-info">
                        <h2>${country.name}</h2>
                        <div class="country-meta">
                            <span class="continent">${this.getContinentName(country.continent)}</span>
                            <span class="popularity">${country.popularity}% Popular</span>
                        </div>
                    </div>
                </div>
                
                <div class="country-details-content">
                    <div class="details-section">
                        <h3>Education Overview</h3>
                        <p>${country.description}</p>
                    </div>
                    
                    <div class="details-section">
                        <h3>Cost Breakdown</h3>
                        <div class="cost-grid">
                            <div class="cost-item">
                                <div class="cost-label">Tuition Fees</div>
                                <div class="cost-value">${country.tuition}</div>
                            </div>
                            <div class="cost-item">
                                <div class="cost-label">Living Expenses</div>
                                <div class="cost-value">${country.livingCost}</div>
                            </div>
                            <div class="cost-item">
                                <div class="cost-label">Health Insurance</div>
                                <div class="cost-value">$500 - $1,200/year</div>
                            </div>
                            <div class="cost-item">
                                <div class="cost-label">Total Estimated Cost</div>
                                <div class="cost-value">${this.calculateTotalCost(country)}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="details-section">
                        <h3>Work & Visa Information</h3>
                        <div class="visa-info">
                            <div class="info-item">
                                <strong>Work Hours Allowed:</strong> ${country.workHours}
                            </div>
                            <div class="info-item">
                                <strong>Post-Study Work Visa:</strong> ${country.postStudyVisa}
                            </div>
                            <div class="info-item">
                                <strong>Visa Processing Time:</strong> 4-8 weeks
                            </div>
                            <div class="info-item">
                                <strong>Visa Success Rate:</strong> ${country.popularity}%
                            </div>
                        </div>
                    </div>
                    
                    <div class="details-section">
                        <h3>Top Universities</h3>
                        <p>${country.universities}</p>
                    </div>
                    
                    <div class="details-section">
                        <h3>Requirements</h3>
                        <ul class="requirements-list">
                            <li>Valid passport</li>
                            <li>University acceptance letter</li>
                            <li>Financial proof (minimum 1 year expenses)</li>
                            <li>English proficiency test (IELTS/TOEFL)</li>
                            <li>Health insurance</li>
                            <li>Medical examination certificate</li>
                        </ul>
                    </div>
                </div>
                
                <div class="country-details-actions">
                    <button class="btn btn-primary" onclick="window.location.href='contact.html'">
                        Apply Now
                    </button>
                    <button class="btn btn-outline modal-close">
                        Close
                    </button>
                </div>
            </div>
        `;

        modal.classList.add('active');
    }

    getContinentName(continentCode) {
        const continents = {
            'north-america': 'North America',
            'europe': 'Europe',
            'asia': 'Asia',
            'australia': 'Australia & New Zealand'
        };
        return continents[continentCode] || continentCode;
    }

    calculateTotalCost(country) {
        const tuition = this.extractNumber(country.tuition);
        const living = this.extractNumber(country.livingCost) * 12; // Annual living cost
        return `$${(tuition + living).toLocaleString()}/year`;
    }

    setupComparisonTable() {
        this.updateComparisonTable();
    }

    updateComparisonTable() {
        const tableBody = document.getElementById('comparison-table-body');
        if (!tableBody) return;

        const topCountries = this.countries.slice(0, 4); // Show top 4 countries
        
        tableBody.innerHTML = topCountries.map(country => `
            <tr>
                <td>
                    <div class="country-cell">
                        <img src="${country.flag}" alt="${country.name}" class="flag-small">
                        <span>${country.name}</span>
                    </div>
                </td>
                <td>${country.tuition}</td>
                <td>${country.livingCost}</td>
                <td>${country.workHours}</td>
                <td>${country.postStudyVisa}</td>
                <td>${country.universities.split(', ').slice(0, 2).join(', ')}</td>
            </tr>
        `).join('');
    }

    addToComparison(countryId) {
        // In production, this would add to comparison cart
        this.showToast('Added to comparison');
    }

    openConsultationModal() {
        // In production, this would open consultation modal
        window.location.href = 'contact.html';
    }

    showError(message) {
        const container = document.getElementById('countries-container');
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

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
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
    new CountriesPage();
});

export default CountriesPage;
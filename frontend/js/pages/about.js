/**
 * About Page JavaScript
 * Handles animations, counters, and dynamic content for the About page
 */

import { lazyLoadImages, setupScrollAnimations } from '../effects/scroll-animations.js';
import { animateCounters } from '../effects/counters.js';
import { setupParallax } from '../effects/parallax.js';
import { setupFilter } from '../effects/filters.js';

class AboutPage {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initAnimations();
        this.loadTeamData();
    }

    setupEventListeners() {
        // Team filter functionality
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filterTeam(e.target.dataset.filter);
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Contact button
        const contactBtn = document.querySelector('.magnetic-btn');
        if (contactBtn) {
            contactBtn.addEventListener('mouseenter', () => {
                contactBtn.classList.add('magnetic-hover');
            });
            contactBtn.addEventListener('mouseleave', () => {
                contactBtn.classList.remove('magnetic-hover');
            });
        }
    }

    initAnimations() {
        // Initialize lazy loading
        lazyLoadImages();

        // Setup scroll animations
        setupScrollAnimations();

        // Animate counters
        const counterElements = document.querySelectorAll('.stat-number');
        if (counterElements.length > 0) {
            animateCounters(counterElements);
        }

        // Setup parallax for hero section
        const heroSection = document.querySelector('.about-hero');
        if (heroSection) {
            setupParallax(heroSection, 0.5);
        }

        // Timeline animations
        this.animateTimeline();
    }

    animateTimeline() {
        const timelineItems = document.querySelectorAll('.timeline-item');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-slide-up');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });

        timelineItems.forEach(item => observer.observe(item));
    }

    filterTeam(filter) {
        const teamCards = document.querySelectorAll('.team-card');
        teamCards.forEach(card => {
            if (filter === 'all' || card.dataset.team === filter) {
                card.style.display = 'block';
                setTimeout(() => card.classList.add('fade-in'), 10);
            } else {
                card.classList.remove('fade-in');
                card.style.display = 'none';
            }
        });
    }

    async loadTeamData() {
        try {
            // In production, this would fetch from API
            // const response = await fetch('/api/v1/team');
            // const data = await response.json();
            // this.renderTeam(data);
            
            // For now, we'll use static data
            console.log('Loading team data...');
        } catch (error) {
            console.error('Error loading team data:', error);
        }
    }

    renderTeam(teamData) {
        const container = document.querySelector('.team-section .grid');
        if (!container) return;

        container.innerHTML = teamData.map(member => `
            <div class="team-card glass-card hover-glow" data-team="${member.department}">
                <div class="team-image">
                    <img src="${member.image}" alt="${member.name}" class="lazy-image" data-src="${member.image}">
                </div>
                <div class="team-info">
                    <h3 class="team-name">${member.name}</h3>
                    <p class="team-role">${member.role}</p>
                    <p class="team-bio">${member.bio}</p>
                </div>
            </div>
        `).join('');

        // Re-initialize lazy loading for new images
        lazyLoadImages();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AboutPage();
});

export default AboutPage;
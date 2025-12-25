/**
 * SEO Management System
 * Handles dynamic SEO metadata and JSON-LD schemas
 */

class SEOManager {
    constructor() {
        this.currentPage = null;
        this.metadata = {};
        this.schemas = [];
        this.init();
    }

    init() {
        this.loadCurrentPage();
        this.setupMutationObserver();
    }

    loadCurrentPage() {
        // Get current page from data-page attribute or URL
        const pageElement = document.querySelector('[data-page]');
        this.currentPage = pageElement ? pageElement.dataset.page : 
                          window.location.pathname.split('/').pop().replace('.html', '') || 'home';
        
        this.loadPageMetadata();
    }

    async loadPageMetadata() {
        try {
            const response = await fetch(`/api/v1/seo/${this.currentPage}`);
            if (response.ok) {
                this.metadata = await response.json();
                this.applyMetadata();
                this.generateSchemas();
            } else {
                this.loadDefaultMetadata();
            }
        } catch (error) {
            console.warn('Failed to load SEO metadata, using defaults:', error);
            this.loadDefaultMetadata();
        }
    }

    loadDefaultMetadata() {
        const defaults = {
            home: {
                title: 'Global Education Consultants | Study Abroad Experts',
                description: 'Expert educational consultancy services for international students. University admissions, visa guidance, and career planning.',
                keywords: 'study abroad, university admission, visa assistance, education consultancy',
                canonical: window.location.origin
            },
            services: {
                title: 'Our Services | Global Education Consultants',
                description: 'Comprehensive educational consultancy services including university selection, visa assistance, and career guidance.',
                keywords: 'education services, study abroad services, visa help',
                canonical: `${window.location.origin}/services`
            },
            videos: {
                title: 'Educational Videos | Global Education Consultants',
                description: 'Watch our educational videos for study abroad tips, university information, and student success stories.',
                keywords: 'study abroad videos, educational videos, student stories',
                canonical: `${window.location.origin}/videos`
            },
            blogs: {
                title: 'Educational Blog | Global Education Consultants',
                description: 'Read our latest articles on study abroad, university admissions, visa updates, and career advice.',
                keywords: 'education blog, study abroad articles, visa news',
                canonical: `${window.location.origin}/blogs`
            },
            contact: {
                title: 'Contact Us | Global Education Consultants',
                description: 'Get in touch with our expert education consultants for personalized guidance on studying abroad.',
                keywords: 'contact education consultant, study abroad help, consultation',
                canonical: `${window.location.origin}/contact`
            }
        };

        this.metadata = defaults[this.currentPage] || defaults.home;
        this.applyMetadata();
        this.generateSchemas();
    }

    applyMetadata() {
        // Update document title
        if (this.metadata.title) {
            document.title = this.metadata.title;
        }

        // Update meta tags
        this.updateMetaTag('description', this.metadata.description);
        this.updateMetaTag('keywords', this.metadata.keywords);
        
        // Update OpenGraph tags
        this.updateOGTag('title', this.metadata.title);
        this.updateOGTag('description', this.metadata.description);
        this.updateOGTag('url', this.metadata.canonical || window.location.href);
        
        // Update Twitter Card tags
        this.updateTwitterTag('title', this.metadata.title);
        this.updateTwitterTag('description', this.metadata.description);
        
        // Update canonical link
        this.updateCanonicalLink(this.metadata.canonical);
    }

    updateMetaTag(name, content) {
        if (!content) return;
        
        let meta = document.querySelector(`meta[name="${name}"]`);
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = name;
            document.head.appendChild(meta);
        }
        meta.content = content;
    }

    updateOGTag(property, content) {
        if (!content) return;
        
        let meta = document.querySelector(`meta[property="og:${property}"]`);
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute('property', `og:${property}`);
            document.head.appendChild(meta);
        }
        meta.content = content;
    }

    updateTwitterTag(name, content) {
        if (!content) return;
        
        let meta = document.querySelector(`meta[name="twitter:${name}"]`);
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = `twitter:${name}`;
            document.head.appendChild(meta);
        }
        meta.content = content;
    }

    updateCanonicalLink(url) {
        if (!url) return;
        
        let link = document.querySelector('link[rel="canonical"]');
        if (!link) {
            link = document.createElement('link');
            link.rel = 'canonical';
            document.head.appendChild(link);
        }
        link.href = url;
    }

    generateSchemas() {
        this.clearSchemas();
        
        // Generate schemas based on page type
        switch(this.currentPage) {
            case 'home':
                this.generateHomepageSchemas();
                break;
            case 'services':
                this.generateServiceListingSchemas();
                break;
            case 'blog-detail':
                this.generateArticleSchema();
                break;
            case 'contact':
                this.generateContactPageSchema();
                break;
            default:
                this.generateOrganizationSchema();
        }
    }

    generateOrganizationSchema() {
        const schema = {
            "@context": "https://schema.org",
            "@type": "EducationalOrganization",
            "name": "Global Education Consultants",
            "description": "Expert educational consultancy services for international students",
            "url": window.location.origin,
            "logo": `${window.location.origin}/assets/images/logo.png`,
            "sameAs": [
                "https://facebook.com/globaleducation",
                "https://twitter.com/globaleducation",
                "https://linkedin.com/company/globaleducation"
            ],
            "contactPoint": {
                "@type": "ContactPoint",
                "telephone": "+1-234-567-8900",
                "contactType": "customer service",
                "availableLanguage": ["English", "Spanish", "French"]
            },
            "address": {
                "@type": "PostalAddress",
                "streetAddress": "123 Education Street",
                "addressLocality": "New York",
                "addressRegion": "NY",
                "postalCode": "10001",
                "addressCountry": "US"
            }
        };
        
        this.addSchema(schema);
    }

    generateHomepageSchemas() {
        // Organization schema
        this.generateOrganizationSchema();
        
        // WebSite schema
        const websiteSchema = {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "Global Education Consultants",
            "url": window.location.origin,
            "potentialAction": {
                "@type": "SearchAction",
                "target": `${window.location.origin}/search?q={search_term_string}`,
                "query-input": "required name=search_term_string"
            }
        };
        
        this.addSchema(websiteSchema);
        
        // FAQ schema (if FAQ section exists)
        this.generateFAQSchema();
    }

    generateServiceListingSchemas() {
        this.generateOrganizationSchema();
        
        // ItemList schema for services
        const serviceListSchema = {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": "Educational Consultancy Services",
            "description": "List of educational consultancy services offered",
            "url": window.location.href,
            "numberOfItems": 18,
            "itemListElement": []
        };
        
        // Populate with actual services from page
        const serviceCards = document.querySelectorAll('.service-card');
        serviceCards.forEach((card, index) => {
            const title = card.querySelector('.service-title')?.textContent;
            const description = card.querySelector('.service-excerpt')?.textContent;
            
            if (title) {
                serviceListSchema.itemListElement.push({
                    "@type": "ListItem",
                    "position": index + 1,
                    "item": {
                        "@type": "Service",
                        "name": title,
                        "description": description
                    }
                });
            }
        });
        
        this.addSchema(serviceListSchema);
    }

    generateArticleSchema() {
        const article = document.querySelector('article');
        if (!article) return;
        
        const schema = {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": article.querySelector('h1')?.textContent || this.metadata.title,
            "description": this.metadata.description,
            "image": article.querySelector('img')?.src || '',
            "datePublished": article.querySelector('time[datetime]')?.getAttribute('datetime') || '',
            "dateModified": article.querySelector('time[datetime]')?.getAttribute('datetime') || '',
            "author": {
                "@type": "Person",
                "name": article.querySelector('.author-name')?.textContent || "Admin"
            },
            "publisher": {
                "@type": "Organization",
                "name": "Global Education Consultants",
                "logo": {
                    "@type": "ImageObject",
                    "url": `${window.location.origin}/assets/images/logo.png`
                }
            }
        };
        
        this.addSchema(schema);
    }

    generateContactPageSchema() {
        const schema = {
            "@context": "https://schema.org",
            "@type": "ContactPage",
            "name": "Contact Global Education Consultants",
            "description": "Contact information for educational consultancy services",
            "url": window.location.href
        };
        
        this.addSchema(schema);
    }

    generateFAQSchema() {
        const faqItems = document.querySelectorAll('.faq-item');
        if (faqItems.length === 0) return;
        
        const faqSchema = {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": []
        };
        
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question')?.textContent;
            const answer = item.querySelector('.faq-answer')?.textContent;
            
            if (question && answer) {
                faqSchema.mainEntity.push({
                    "@type": "Question",
                    "name": question,
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": answer
                    }
                });
            }
        });
        
        if (faqSchema.mainEntity.length > 0) {
            this.addSchema(faqSchema);
        }
    }

    addSchema(schema) {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(schema);
        document.head.appendChild(script);
        this.schemas.push(script);
    }

    clearSchemas() {
        this.schemas.forEach(schema => {
            if (schema.parentNode) {
                schema.parentNode.removeChild(schema);
            }
        });
        this.schemas = [];
    }

    updatePageMetadata(metadata) {
        this.metadata = { ...this.metadata, ...metadata };
        this.applyMetadata();
    }

    updateDynamicMetadata(element) {
        // Extract metadata from data attributes
        const title = element.dataset.seoTitle;
        const description = element.dataset.seoDescription;
        const image = element.dataset.seoImage;
        
        if (title || description || image) {
            const updates = {};
            if (title) updates.title = title;
            if (description) updates.description = description;
            
            this.updatePageMetadata(updates);
            
            if (image) {
                this.updateOGTag('image', image);
                this.updateTwitterTag('image', image);
            }
        }
    }

    setupMutationObserver() {
        // Watch for dynamic content changes that might affect SEO
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) { // Element node
                            this.checkForSEOUpdates(node);
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    checkForSEOUpdates(element) {
        // Check if element has SEO-relevant data
        if (element.hasAttribute('data-seo-title') || 
            element.hasAttribute('data-seo-description')) {
            this.updateDynamicMetadata(element);
        }
        
        // Check for FAQ items
        if (element.classList?.contains('faq-item')) {
            this.generateFAQSchema();
        }
        
        // Check for service cards
        if (element.classList?.contains('service-card')) {
            this.generateServiceListingSchemas();
        }
    }

    // Public API
    setPage(page) {
        this.currentPage = page;
        this.loadPageMetadata();
    }

    setMetadata(metadata) {
        this.updatePageMetadata(metadata);
    }

    getCurrentMetadata() {
        return { ...this.metadata };
    }
}

// Initialize SEO Manager
let seoManager = null;

function initSEO() {
    if (!seoManager) {
        seoManager = new SEOManager();
    }
    return seoManager;
}

// Page-specific SEO loading
async function loadPageSEO(page) {
    const manager = initSEO();
    manager.setPage(page);
}

// Update SEO for dynamic content
function updateSEOMetadata(metadata) {
    const manager = initSEO();
    manager.setMetadata(metadata);
}

// Export functions
export {
    initSEO,
    loadPageSEO,
    updateSEOMetadata,
    SEOManager
};

// Auto-initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initSEO();
});

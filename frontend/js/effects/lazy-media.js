/**
 * Lazy loading for images and videos with blur placeholders
 */

class LazyMediaLoader {
    constructor() {
        this.imageObserver = null;
        this.videoObserver = null;
        this.iframeObserver = null;
        this.init();
    }

    init() {
        this.setupImageObserver();
        this.setupVideoObserver();
        this.setupIframeObserver();
        this.scanForMedia();

        // Watch for dynamically added content
        this.setupMutationObserver();
    }

    setupImageObserver() {
        this.imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadImage(entry.target);
                    this.imageObserver.unobserve(entry.target);
                }
            });
        }, {
            rootMargin: '50px 0px',
            threshold: 0.1
        });
    }

    setupVideoObserver() {
        this.videoObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadVideo(entry.target);
                    this.videoObserver.unobserve(entry.target);
                }
            });
        }, {
            rootMargin: '100px 0px',
            threshold: 0.1
        });
    }

    setupIframeObserver() {
        this.iframeObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadIframe(entry.target);
                    this.iframeObserver.unobserve(entry.target);
                }
            });
        }, {
            rootMargin: '100px 0px',
            threshold: 0.1
        });
    }

    scanForMedia() {
        // Lazy images
        document.querySelectorAll('img[data-src], img[data-srcset]').forEach(img => {
            this.imageObserver.observe(img);

            // Add blur placeholder if not already present
            if (!img.classList.contains('lazy-loaded')) {
                this.addBlurPlaceholder(img);
            }
        });

        // Lazy background images
        document.querySelectorAll('[data-bg-src]').forEach(element => {
            this.imageObserver.observe(element);
        });

        // Lazy videos
        document.querySelectorAll('video[data-src], video source[data-src]').forEach(video => {
            this.videoObserver.observe(video);
        });

        // Lazy iframes (YouTube, Vimeo, etc.)
        document.querySelectorAll('iframe[data-src]').forEach(iframe => {
            this.iframeObserver.observe(iframe);
        });
    }

    refresh() {
        this.scanForMedia();
    }

    addBlurPlaceholder(img) {
        // Store original classes
        const originalClasses = img.className;

        // Add blur class
        img.className = originalClasses + ' lazy-blur';

        // Create small placeholder if data-src exists
        if (img.dataset.src) {
            const tinySrc = img.dataset.src.replace(/(\.(jpg|jpeg|png|webp))/, '_tiny$1');

            // Create canvas for blur effect
            const canvas = document.createElement('canvas');
            canvas.width = 20;
            canvas.height = 20;

            // Load tiny image for blur
            const tempImg = new Image();
            tempImg.src = tinySrc;
            tempImg.onload = () => {
                const ctx = canvas.getContext('2d');
                ctx.drawImage(tempImg, 0, 0, 20, 20);

                // Apply blur using CSS
                img.style.backgroundImage = `url(${canvas.toDataURL()})`;
                img.style.backgroundSize = 'cover';
                img.style.filter = 'blur(10px)';
            };
        }
    }

    loadImage(img) {
        if (img.dataset.src) {
            img.src = img.dataset.src;
            delete img.dataset.src;
        }

        if (img.dataset.srcset) {
            img.srcset = img.dataset.srcset;
            delete img.dataset.srcset;
        }

        if (img.dataset.sizes) {
            img.sizes = img.dataset.sizes;
            delete img.dataset.sizes;
        }

        img.onload = () => {
            img.classList.add('lazy-loaded');
            img.classList.remove('lazy-blur');
            img.style.filter = '';
            img.style.backgroundImage = '';

            // Dispatch event for animations
            img.dispatchEvent(new CustomEvent('lazyloaded'));
        };
    }

    loadVideo(video) {
        if (video.dataset.src) {
            video.src = video.dataset.src;
            delete video.dataset.src;
        }

        const sources = video.querySelectorAll('source[data-src]');
        sources.forEach(source => {
            source.src = source.dataset.src;
            delete source.dataset.src;
        });

        video.load();
        video.classList.add('lazy-loaded');

        // Dispatch event
        video.dispatchEvent(new CustomEvent('lazyloaded'));
    }

    loadIframe(iframe) {
        if (iframe.dataset.src) {
            iframe.src = iframe.dataset.src;
            delete iframe.dataset.src;
        }

        iframe.classList.add('lazy-loaded');
        iframe.dispatchEvent(new CustomEvent('lazyloaded'));
    }

    setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length) {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) { // Element node
                            // Check for lazy media in new nodes
                            if (node.matches('img[data-src], img[data-srcset], [data-bg-src]')) {
                                this.imageObserver.observe(node);
                                if (node.tagName === 'IMG') {
                                    this.addBlurPlaceholder(node);
                                }
                            } else if (node.matches('video[data-src], video source[data-src]')) {
                                this.videoObserver.observe(node);
                            } else if (node.matches('iframe[data-src]')) {
                                this.iframeObserver.observe(node);
                            }

                            // Check children
                            node.querySelectorAll?.('img[data-src], img[data-srcset], [data-bg-src]').forEach(img => {
                                this.imageObserver.observe(img);
                                if (img.tagName === 'IMG') {
                                    this.addBlurPlaceholder(img);
                                }
                            });

                            node.querySelectorAll?.('video[data-src], video source[data-src]').forEach(video => {
                                this.videoObserver.observe(video);
                            });

                            node.querySelectorAll?.('iframe[data-src]').forEach(iframe => {
                                this.iframeObserver.observe(iframe);
                            });
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

    refresh() {
        this.scanForMedia();
    }
}

// Progressive image loading with quality levels
class ProgressiveImage {
    constructor(container) {
        this.container = container;
        this.lowResSrc = container.dataset.lowRes;
        this.mediumResSrc = container.dataset.mediumRes;
        this.highResSrc = container.dataset.highRes;
        this.currentQuality = 'low';
        this.init();
    }

    init() {
        if (this.lowResSrc) {
            this.loadLowRes();
        }

        // Load higher quality when in viewport
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadHigherQuality();
                    observer.unobserve(this.container);
                }
            });
        }, { threshold: 0.1 });

        observer.observe(this.container);
    }

    loadLowRes() {
        const img = new Image();
        img.src = this.lowResSrc;
        img.className = 'progressive-image low-quality';

        img.onload = () => {
            this.container.appendChild(img);
            this.currentQuality = 'low';

            // Start loading medium quality
            setTimeout(() => this.loadMediumRes(), 100);
        };
    }

    loadMediumRes() {
        if (!this.mediumResSrc || this.currentQuality === 'medium') return;

        const img = new Image();
        img.src = this.mediumResSrc;
        img.className = 'progressive-image medium-quality';

        img.onload = () => {
            const oldImg = this.container.querySelector('.low-quality');
            if (oldImg) {
                oldImg.classList.add('fading-out');
                setTimeout(() => oldImg.remove(), 300);
            }

            this.container.appendChild(img);
            this.currentQuality = 'medium';

            // Start loading high quality
            setTimeout(() => this.loadHighRes(), 300);
        };
    }

    loadHighRes() {
        if (!this.highResSrc || this.currentQuality === 'high') return;

        const img = new Image();
        img.src = this.highResSrc;
        img.className = 'progressive-image high-quality';

        img.onload = () => {
            const oldImg = this.container.querySelector('.medium-quality');
            if (oldImg) {
                oldImg.classList.add('fading-out');
                setTimeout(() => oldImg.remove(), 300);
            }

            this.container.appendChild(img);
            this.currentQuality = 'high';
        };
    }
}

// Background image lazy loader
class LazyBackground {
    constructor(element) {
        this.element = element;
        this.imageUrl = element.dataset.bgSrc;
        this.init();
    }

    init() {
        if (!this.imageUrl) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadBackground();
                    observer.unobserve(this.element);
                }
            });
        }, { threshold: 0.1 });

        observer.observe(this.element);
    }

    loadBackground() {
        const img = new Image();
        img.src = this.imageUrl;

        img.onload = () => {
            this.element.style.backgroundImage = `url(${this.imageUrl})`;
            this.element.classList.add('bg-loaded');

            // Remove data attribute
            delete this.element.dataset.bgSrc;
        };
    }
}

// Video thumbnail generator and lazy loader
class VideoThumbnailLoader {
    constructor(videoElement) {
        this.video = videoElement;
        this.thumbnailUrl = videoElement.dataset.thumbnail;
        this.posterGenerated = false;
        this.init();
    }

    init() {
        if (this.thumbnailUrl) {
            this.video.poster = this.thumbnailUrl;
        } else if (!this.posterGenerated && this.video.dataset.src) {
            this.generateThumbnail();
        }

        // Load video when in viewport
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadVideo();
                    observer.unobserve(this.video);
                }
            });
        }, { threshold: 0.1 });

        observer.observe(this.video);
    }

    generateThumbnail() {
        // For self-hosted videos, we need server-side thumbnail generation
        // This is a placeholder for when server-side thumbnails are available
        if (this.video.dataset.thumbnailUrl) {
            this.video.poster = this.video.dataset.thumbnailUrl;
            this.posterGenerated = true;
        }
    }

    loadVideo() {
        if (this.video.dataset.src) {
            this.video.src = this.video.dataset.src;
            delete this.video.dataset.src;
            this.video.load();
        }
    }
}

// Export functions
export {
    LazyMediaLoader,
    ProgressiveImage,
    LazyBackground,
    VideoThumbnailLoader,
    initLazyMedia
};

// Initialize helper
function initLazyMedia() {
    if (window.lazyLoader) return window.lazyLoader;
    return new LazyMediaLoader();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize lazy media loader
    const lazyLoader = new LazyMediaLoader();

    // Initialize progressive images
    document.querySelectorAll('[data-low-res]').forEach(container => {
        new ProgressiveImage(container);
    });

    // Initialize lazy backgrounds
    document.querySelectorAll('[data-bg-src]').forEach(element => {
        new LazyBackground(element);
    });

    // Initialize video thumbnails
    document.querySelectorAll('video[data-thumbnail]').forEach(video => {
        new VideoThumbnailLoader(video);
    });

    // Make available globally
    window.lazyLoader = lazyLoader;
});

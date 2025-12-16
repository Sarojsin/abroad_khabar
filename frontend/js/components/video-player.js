// Video Player Component
class VideoPlayer {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' 
            ? document.querySelector(container) 
            : container;
        
        this.options = {
            src: options.src || '',
            poster: options.poster || '',
            autoplay: options.autoplay || false,
            muted: options.muted || false,
            loop: options.loop || false,
            controls: options.controls !== false,
            preload: options.preload || 'metadata',
            playbackRate: options.playbackRate || 1,
            volume: options.volume !== undefined ? options.volume : 1,
            responsive: options.responsive !== false,
            lazyLoad: options.lazyLoad || false,
            onPlay: options.onPlay || null,
            onPause: options.onPause || null,
            onEnded: options.onEnded || null,
            onError: options.onError || null,
            onTimeUpdate: options.onTimeUpdate || null,
            onVolumeChange: options.onVolumeChange || null,
            ...options
        };
        
        this.video = null;
        this.controls = null;
        this.isPlaying = false;
        this.isFullscreen = false;
        this.isControlsVisible = true;
        this.controlsTimeout = null;
        this.init();
    }

    init() {
        if (!this.container) {
            console.error('Video player container not found');
            return;
        }
        
        this.createPlayer();
        this.bindEvents();
        
        if (this.options.lazyLoad) {
            this.setupLazyLoad();
        } else {
            this.loadVideo();
        }
    }

    createPlayer() {
        const playerId = `video-player-${Date.now()}`;
        
        this.container.innerHTML = `
            <div class="video-player-container" id="${playerId}">
                <video class="video-element"
                       ${this.options.poster ? `poster="${this.options.poster}"` : ''}
                       ${this.options.autoplay ? 'autoplay' : ''}
                       ${this.options.muted ? 'muted' : ''}
                       ${this.options.loop ? 'loop' : ''}
                       ${this.options.controls ? 'controls' : ''}
                       preload="${this.options.preload}">
                    ${this.options.src ? `<source src="${this.options.src}" type="video/mp4">` : ''}
                    Your browser does not support the video tag.
                </video>
                
                ${this.options.controls ? this.createControls() : ''}
                
                <div class="video-loading" style="display: none;"></div>
                <div class="video-error" style="display: none;">
                    <div class="video-error-icon">
                        <i class="fas fa-exclamation-circle"></i>
                    </div>
                    <h3 class="video-error-title">Video Failed to Load</h3>
                    <p class="video-error-message">Please check your connection and try again.</p>
                    <button class="video-error-btn">Retry</button>
                </div>
            </div>
        `;
        
        this.video = this.container.querySelector('.video-element');
        this.controls = this.container.querySelector('.video-controls');
        this.playerContainer = this.container.querySelector('.video-player-container');
        
        // Set initial volume
        this.video.volume = this.options.volume;
        
        // Set playback rate
        this.video.playbackRate = this.options.playbackRate;
        
        // Make responsive if needed
        if (this.options.responsive) {
            this.video.style.width = '100%';
            this.video.style.height = 'auto';
        }
    }

    createControls() {
        return `
            <div class="video-controls">
                <div class="video-progress">
                    <div class="video-progress-bar"></div>
                    <div class="video-progress-buffer"></div>
                    <div class="video-progress-thumb"></div>
                </div>
                
                <div class="video-controls-main">
                    <div class="video-controls-left">
                        <button class="video-control-btn video-play-btn" title="Play/Pause">
                            <i class="fas fa-play"></i>
                        </button>
                        
                        <div class="video-volume">
                            <button class="video-control-btn video-volume-btn" title="Volume">
                                <i class="fas fa-volume-up"></i>
                            </button>
                            <div class="video-volume-slider">
                                <div class="video-volume-level" style="width: ${this.options.volume * 100}%"></div>
                            </div>
                        </div>
                        
                        <div class="video-time">
                            <span class="video-current-time">0:00</span> / 
                            <span class="video-duration">0:00</span>
                        </div>
                    </div>
                    
                    <div class="video-controls-right">
                        <div class="video-playback">
                            <button class="video-control-btn video-playback-btn" title="Playback Rate">
                                ${this.options.playbackRate}x
                            </button>
                            <div class="video-playback-menu">
                                <div class="video-playback-item" data-rate="0.5">0.5x</div>
                                <div class="video-playback-item" data-rate="0.75">0.75x</div>
                                <div class="video-playback-item active" data-rate="1">1x</div>
                                <div class="video-playback-item" data-rate="1.25">1.25x</div>
                                <div class="video-playback-item" data-rate="1.5">1.5x</div>
                                <div class="video-playback-item" data-rate="2">2x</div>
                            </div>
                        </div>
                        
                        <div class="video-settings">
                            <button class="video-control-btn video-settings-btn" title="Settings">
                                <i class="fas fa-cog"></i>
                            </button>
                            <div class="video-settings-menu">
                                <div class="video-settings-item" data-quality="auto">
                                    <span>Quality</span>
                                    <span>Auto</span>
                                </div>
                                <div class="video-settings-item" data-quality="1080">
                                    <span>1080p</span>
                                    <i class="fas fa-check" style="display: none;"></i>
                                </div>
                                <div class="video-settings-item" data-quality="720">
                                    <span>720p</span>
                                    <i class="fas fa-check" style="display: none;"></i>
                                </div>
                                <div class="video-settings-item" data-quality="480">
                                    <span>480p</span>
                                    <i class="fas fa-check" style="display: none;"></i>
                                </div>
                            </div>
                        </div>
                        
                        <button class="video-control-btn video-fullscreen-btn" title="Fullscreen">
                            <i class="fas fa-expand"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    bindEvents() {
        if (!this.video) return;

        // Video events
        this.video.addEventListener('play', this.handlePlay.bind(this));
        this.video.addEventListener('pause', this.handlePause.bind(this));
        this.video.addEventListener('ended', this.handleEnded.bind(this));
        this.video.addEventListener('error', this.handleError.bind(this));
        this.video.addEventListener('timeupdate', this.handleTimeUpdate.bind(this));
        this.video.addEventListener('volumechange', this.handleVolumeChange.bind(this));
        this.video.addEventListener('loadedmetadata', this.handleLoadedMetadata.bind(this));
        this.video.addEventListener('waiting', this.handleWaiting.bind(this));
        this.video.addEventListener('canplay', this.handleCanPlay.bind(this));
        this.video.addEventListener('progress', this.handleProgress.bind(this));

        // Control events
        if (this.controls) {
            // Play/Pause button
            const playBtn = this.controls.querySelector('.video-play-btn');
            if (playBtn) {
                playBtn.addEventListener('click', () => this.togglePlay());
            }

            // Progress bar
            const progressBar = this.controls.querySelector('.video-progress');
            if (progressBar) {
                progressBar.addEventListener('click', (e) => this.seekTo(e));
                progressBar.addEventListener('mousemove', (e) => this.showPreview(e));
            }

            // Volume controls
            const volumeBtn = this.controls.querySelector('.video-volume-btn');
            const volumeSlider = this.controls.querySelector('.video-volume-slider');
            
            if (volumeBtn) {
                volumeBtn.addEventListener('click', () => this.toggleMute());
            }
            
            if (volumeSlider) {
                volumeSlider.addEventListener('click', (e) => this.setVolume(e));
            }

            // Playback rate
            const playbackBtn = this.controls.querySelector('.video-playback-btn');
            const playbackItems = this.controls.querySelectorAll('.video-playback-item');
            
            if (playbackBtn) {
                playbackBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const menu = this.controls.querySelector('.video-playback-menu');
                    menu.classList.toggle('active');
                });
            }
            
            playbackItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    const rate = parseFloat(e.target.getAttribute('data-rate'));
                    this.setPlaybackRate(rate);
                    
                    // Update active state
                    playbackItems.forEach(i => i.classList.remove('active'));
                    e.target.classList.add('active');
                    
                    // Update button text
                    if (playbackBtn) {
                        playbackBtn.textContent = `${rate}x`;
                    }
                    
                    // Hide menu
                    const menu = this.controls.querySelector('.video-playback-menu');
                    menu.classList.remove('active');
                });
            });

            // Fullscreen
            const fullscreenBtn = this.controls.querySelector('.video-fullscreen-btn');
            if (fullscreenBtn) {
                fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
            }

            // Settings
            const settingsBtn = this.controls.querySelector('.video-settings-btn');
            if (settingsBtn) {
                settingsBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const menu = this.controls.querySelector('.video-settings-menu');
                    menu.classList.toggle('active');
                });
            }

            // Hide controls when not interacting
            this.playerContainer.addEventListener('mousemove', () => this.showControls());
            this.playerContainer.addEventListener('mouseleave', () => this.hideControls());
            
            // Click to play/pause
            this.video.addEventListener('click', () => this.togglePlay());
        }

        // Error retry button
        const errorBtn = this.container.querySelector('.video-error-btn');
        if (errorBtn) {
            errorBtn.addEventListener('click', () => this.retry());
        }

        // Fullscreen change
        document.addEventListener('fullscreenchange', () => {
            this.isFullscreen = !!document.fullscreenElement;
            this.updateFullscreenButton();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
    }

    handlePlay() {
        this.isPlaying = true;
        this.updatePlayButton();
        
        if (this.options.onPlay) {
            this.options.onPlay(this.video);
        }
    }

    handlePause() {
        this.isPlaying = false;
        this.updatePlayButton();
        
        if (this.options.onPause) {
            this.options.onPause(this.video);
        }
    }

    handleEnded() {
        if (this.options.onEnded) {
            this.options.onEnded(this.video);
        }
    }

    handleError(e) {
        console.error('Video error:', e);
        
        // Show error message
        const errorElement = this.container.querySelector('.video-error');
        if (errorElement) {
            errorElement.style.display = 'flex';
        }
        
        if (this.options.onError) {
            this.options.onError(e, this.video);
        }
    }

    handleTimeUpdate() {
        this.updateProgressBar();
        this.updateTimeDisplay();
        
        if (this.options.onTimeUpdate) {
            this.options.onTimeUpdate(this.video.currentTime, this.video.duration);
        }
    }

    handleVolumeChange() {
        this.updateVolumeSlider();
        this.updateVolumeButton();
        
        if (this.options.onVolumeChange) {
            this.options.onVolumeChange(this.video.volume, this.video.muted);
        }
    }

    handleLoadedMetadata() {
        this.updateTimeDisplay();
        this.updateDurationDisplay();
    }

    handleWaiting() {
        this.showLoading();
    }

    handleCanPlay() {
        this.hideLoading();
    }

    handleProgress() {
        this.updateBufferBar();
    }

    handleKeydown(e) {
        // Only handle if video is focused or player container is active
        if (!this.playerContainer.contains(document.activeElement) && 
            document.activeElement !== this.video) {
            return;
        }
        
        switch (e.key.toLowerCase()) {
            case ' ':
            case 'k':
                e.preventDefault();
                this.togglePlay();
                break;
            case 'f':
                e.preventDefault();
                this.toggleFullscreen();
                break;
            case 'm':
                e.preventDefault();
                this.toggleMute();
                break;
            case 'arrowleft':
                e.preventDefault();
                this.seek(-5);
                break;
            case 'arrowright':
                e.preventDefault();
                this.seek(5);
                break;
            case 'arrowup':
                e.preventDefault();
                this.adjustVolume(0.1);
                break;
            case 'arrowdown':
                e.preventDefault();
                this.adjustVolume(-0.1);
                break;
            case 'j':
                e.preventDefault();
                this.seek(-10);
                break;
            case 'l':
                e.preventDefault();
                this.seek(10);
                break;
        }
    }

    // Player controls
    play() {
        if (this.video) {
            this.video.play().catch(error => {
                console.error('Failed to play video:', error);
            });
        }
    }

    pause() {
        if (this.video) {
            this.video.pause();
        }
    }

    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    seek(seconds) {
        if (this.video) {
            this.video.currentTime = Math.max(0, Math.min(
                this.video.duration, 
                this.video.currentTime + seconds
            ));
        }
    }

    seekTo(e) {
        if (!this.video || !this.video.duration) return;
        
        const progressBar = e.currentTarget;
        const rect = progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        this.video.currentTime = percent * this.video.duration;
    }

    setVolume(e) {
        if (!this.video) return;
        
        const volumeSlider = e.currentTarget;
        const rect = volumeSlider.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        this.video.volume = Math.max(0, Math.min(1, percent));
        this.video.muted = this.video.volume === 0;
    }

    adjustVolume(delta) {
        if (this.video) {
            const newVolume = Math.max(0, Math.min(1, this.video.volume + delta));
            this.video.volume = newVolume;
            this.video.muted = newVolume === 0;
        }
    }

    toggleMute() {
        if (this.video) {
            this.video.muted = !this.video.muted;
        }
    }

    setPlaybackRate(rate) {
        if (this.video) {
            this.video.playbackRate = rate;
        }
    }

    async toggleFullscreen() {
        if (!this.playerContainer) return;
        
        try {
            if (!this.isFullscreen) {
                if (this.playerContainer.requestFullscreen) {
                    await this.playerContainer.requestFullscreen();
                } else if (this.playerContainer.webkitRequestFullscreen) {
                    await this.playerContainer.webkitRequestFullscreen();
                } else if (this.playerContainer.msRequestFullscreen) {
                    await this.playerContainer.msRequestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    await document.webkitExitFullscreen();
                } else if (document.msExitFullscreen) {
                    await document.msExitFullscreen();
                }
            }
        } catch (error) {
            console.error('Fullscreen error:', error);
        }
    }

    // UI updates
    updatePlayButton() {
        const playBtn = this.container.querySelector('.video-play-btn');
        if (playBtn) {
            const icon = playBtn.querySelector('i');
            if (icon) {
                icon.className = this.isPlaying ? 'fas fa-pause' : 'fas fa-play';
            }
            playBtn.setAttribute('title', this.isPlaying ? 'Pause' : 'Play');
        }
    }

    updateProgressBar() {
        const progressBar = this.container.querySelector('.video-progress-bar');
        if (progressBar && this.video.duration) {
            const percent = (this.video.currentTime / this.video.duration) * 100;
            progressBar.style.width = `${percent}%`;
        }
    }

    updateBufferBar() {
        const bufferBar = this.container.querySelector('.video-progress-buffer');
        if (bufferBar && this.video.buffered.length > 0) {
            const buffered = this.video.buffered.end(this.video.buffered.length - 1);
            const percent = (buffered / this.video.duration) * 100;
            bufferBar.style.width = `${percent}%`;
        }
    }

    updateTimeDisplay() {
        const currentTimeEl = this.container.querySelector('.video-current-time');
        if (currentTimeEl) {
            currentTimeEl.textContent = this.formatTime(this.video.currentTime);
        }
    }

    updateDurationDisplay() {
        const durationEl = this.container.querySelector('.video-duration');
        if (durationEl && this.video.duration) {
            durationEl.textContent = this.formatTime(this.video.duration);
        }
    }

    updateVolumeSlider() {
        const volumeLevel = this.container.querySelector('.video-volume-level');
        if (volumeLevel) {
            const percent = this.video.muted ? 0 : this.video.volume * 100;
            volumeLevel.style.width = `${percent}%`;
        }
    }

    updateVolumeButton() {
        const volumeBtn = this.container.querySelector('.video-volume-btn');
        if (volumeBtn) {
            const icon = volumeBtn.querySelector('i');
            if (icon) {
                if (this.video.muted || this.video.volume === 0) {
                    icon.className = 'fas fa-volume-mute';
                } else if (this.video.volume < 0.5) {
                    icon.className = 'fas fa-volume-down';
                } else {
                    icon.className = 'fas fa-volume-up';
                }
            }
        }
    }

    updateFullscreenButton() {
        const fullscreenBtn = this.container.querySelector('.video-fullscreen-btn');
        if (fullscreenBtn) {
            const icon = fullscreenBtn.querySelector('i');
            if (icon) {
                icon.className = this.isFullscreen ? 'fas fa-compress' : 'fas fa-expand';
            }
            fullscreenBtn.setAttribute('title', this.isFullscreen ? 'Exit Fullscreen' : 'Fullscreen');
        }
    }

    showControls() {
        if (!this.controls) return;
        
        this.controls.classList.add('visible');
        this.controls.classList.remove('hidden');
        this.isControlsVisible = true;
        
        // Auto-hide after 3 seconds
        clearTimeout(this.controlsTimeout);
        this.controlsTimeout = setTimeout(() => {
            if (this.isPlaying) {
                this.hideControls();
            }
        }, 3000);
    }

    hideControls() {
        if (!this.controls || !this.isPlaying) return;
        
        this.controls.classList.remove('visible');
        this.controls.classList.add('hidden');
        this.isControlsVisible = false;
    }

    showLoading() {
        const loading = this.container.querySelector('.video-loading');
        if (loading) {
            loading.style.display = 'block';
        }
    }

    hideLoading() {
        const loading = this.container.querySelector('.video-loading');
        if (loading) {
            loading.style.display = 'none';
        }
    }

    showPreview(e) {
        // Implement thumbnail preview on hover
        // This would require server-side thumbnail generation
    }

    // Helper methods
    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    setupLazyLoad() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadVideo();
                    observer.unobserve(this.container);
                }
            });
        }, {
            rootMargin: '50px'
        });
        
        observer.observe(this.container);
    }

    loadVideo() {
        if (this.video && this.options.src) {
            // Already loaded
            if (this.video.src) return;
            
            const source = document.createElement('source');
            source.src = this.options.src;
            source.type = 'video/mp4';
            
            this.video.appendChild(source);
            this.video.load();
        }
    }

    retry() {
        // Hide error message
        const errorElement = this.container.querySelector('.video-error');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
        
        // Reload video
        if (this.video) {
            this.video.load();
            this.play();
        }
    }

    // Public API
    getVideoElement() {
        return this.video;
    }

    getCurrentTime() {
        return this.video ? this.video.currentTime : 0;
    }

    getDuration() {
        return this.video ? this.video.duration : 0;
    }

    getVolume() {
        return this.video ? this.video.volume : 1;
    }

    isMuted() {
        return this.video ? this.video.muted : false;
    }

    getPlaybackRate() {
        return this.video ? this.video.playbackRate : 1;
    }

    setSource(src, type = 'video/mp4') {
        if (this.video) {
            // Remove existing sources
            while (this.video.firstChild) {
                this.video.removeChild(this.video.firstChild);
            }
            
            // Add new source
            const source = document.createElement('source');
            source.src = src;
            source.type = type;
            this.video.appendChild(source);
            
            // Load new source
            this.video.load();
        }
    }

    setPoster(poster) {
        if (this.video) {
            this.video.poster = poster;
        }
    }

    destroy() {
        // Remove event listeners
        if (this.video) {
            const video = this.video;
            video.pause();
            video.src = '';
            video.load();
        }
        
        // Clear timeouts
        clearTimeout(this.controlsTimeout);
        
        // Remove from DOM
        if (this.container) {
            this.container.innerHTML = '';
        }
    }

    // Static method to create video player
    static create(container, options) {
        return new VideoPlayer(container, options);
    }

    // Static method to initialize all video players on page
    static initAll(selector = '[data-video-player]') {
        const elements = document.querySelectorAll(selector);
        const players = [];
        
        elements.forEach(element => {
            const options = JSON.parse(element.getAttribute('data-options') || '{}');
            const player = new VideoPlayer(element, options);
            players.push(player);
        });
        
        return players;
    }
}

// Export for module usage
export default VideoPlayer;

// Export static methods
export const {
    create,
    initAll
} = VideoPlayer;
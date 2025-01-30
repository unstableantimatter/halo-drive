class ParticleConfig {
    constructor() {
        this.qualityPresets = {
            ultra: {
                maxParticles: 2000,
                particleDetail: 1,
                blurEffects: true,
                blurQuality: 2,
                particlePhysics: true,
                particleCollisions: true,
                backgroundEffects: true,
                motionBlur: true,
                glowEffects: true,
                particleDensity: 1
            },
            high: {
                maxParticles: 1000,
                particleDetail: 0.8,
                blurEffects: true,
                blurQuality: 1,
                particlePhysics: true,
                particleCollisions: true,
                backgroundEffects: true,
                motionBlur: true,
                glowEffects: true,
                particleDensity: 0.8
            },
            medium: {
                maxParticles: 500,
                particleDetail: 0.6,
                blurEffects: true,
                blurQuality: 0.5,
                particlePhysics: true,
                particleCollisions: false,
                backgroundEffects: true,
                motionBlur: false,
                glowEffects: true,
                particleDensity: 0.6
            },
            low: {
                maxParticles: 200,
                particleDetail: 0.4,
                blurEffects: false,
                blurQuality: 0,
                particlePhysics: false,
                particleCollisions: false,
                backgroundEffects: false,
                motionBlur: false,
                glowEffects: false,
                particleDensity: 0.4
            }
        };

        this.currentQuality = 'high';
        this.autoAdjust = true;
        this.fpsThreshold = 45;
        this.lastFpsCheck = performance.now();
        this.frameCount = 0;

        // Load saved preferences
        this.loadPreferences();
        
        // Save preferences when page unloads
        window.addEventListener('beforeunload', () => this.savePreferences());
    }

    detectOptimalQuality() {
        const gpu = this.getGPUTier();
        const memory = this.getAvailableMemory();
        const devicePixelRatio = window.devicePixelRatio || 1;
        
        if (gpu === 'high' && memory > 4 && devicePixelRatio >= 2) {
            return 'ultra';
        } else if (gpu === 'medium' && memory > 2) {
            return 'high';
        } else if (gpu === 'low' || memory < 2) {
            return 'medium';
        }
        return 'low';
    }

    getGPUTier() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return 'low';

        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();

        if (renderer.includes('nvidia') || renderer.includes('radeon')) return 'high';
        if (renderer.includes('intel')) return 'medium';
        return 'low';
    }

    getAvailableMemory() {
        if (navigator.deviceMemory) {
            return navigator.deviceMemory;
        }
        return 4; // Default assumption
    }

    updateFPS() {
        this.frameCount++;
        const now = performance.now();
        const elapsed = now - this.lastFpsCheck;

        if (elapsed >= 1000) { // Check every second
            const fps = (this.frameCount * 1000) / elapsed;
            this.frameCount = 0;
            this.lastFpsCheck = now;

            if (this.autoAdjust) {
                this.adjustQualityBasedOnFPS(fps);
            }

            return fps;
        }
        return null;
    }

    adjustQualityBasedOnFPS(fps) {
        if (fps < this.fpsThreshold) {
            this.decreaseQuality();
        } else if (fps > this.fpsThreshold + 15) {
            this.increaseQuality();
        }
    }

    decreaseQuality() {
        const qualities = ['ultra', 'high', 'medium', 'low'];
        const currentIndex = qualities.indexOf(this.currentQuality);
        if (currentIndex < qualities.length - 1) {
            this.setQuality(qualities[currentIndex + 1]);
        }
    }

    increaseQuality() {
        const qualities = ['ultra', 'high', 'medium', 'low'];
        const currentIndex = qualities.indexOf(this.currentQuality);
        if (currentIndex > 0) {
            this.setQuality(qualities[currentIndex - 1]);
        }
    }

    loadPreferences() {
        try {
            const saved = localStorage.getItem('particlePreferences');
            if (saved) {
                const prefs = JSON.parse(saved);
                this.currentQuality = prefs.quality || 'high';
                this.autoAdjust = prefs.autoAdjust ?? true;
                this.fpsThreshold = prefs.fpsThreshold || 45;
                
                // Apply saved settings
                this.setQuality(this.currentQuality);
            }
        } catch (error) {
            console.warn('Failed to load particle preferences:', error);
        }
    }

    savePreferences() {
        try {
            const prefs = {
                quality: this.currentQuality,
                autoAdjust: this.autoAdjust,
                fpsThreshold: this.fpsThreshold
            };
            localStorage.setItem('particlePreferences', JSON.stringify(prefs));
        } catch (error) {
            console.warn('Failed to save particle preferences:', error);
        }
    }

    setQuality(quality, save = true) {
        if (this.qualityPresets[quality]) {
            this.currentQuality = quality;
            if (save) this.savePreferences();
            return this.qualityPresets[quality];
        }
        return null;
    }

    setAutoAdjust(enabled) {
        this.autoAdjust = enabled;
        this.savePreferences();
    }

    setFPSThreshold(value) {
        this.fpsThreshold = value;
        this.savePreferences();
    }

    getCurrentSettings() {
        return this.qualityPresets[this.currentQuality];
    }
} 
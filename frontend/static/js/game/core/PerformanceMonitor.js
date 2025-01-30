class PerformanceMonitor {
    constructor(game) {
        this.game = game;
        this.metrics = {
            fps: [],
            memory: [],
            loadTimes: {},
            gpuInfo: null,
            networkLatency: [],
            batteryLevel: null,
            thermalState: null
        };
        
        this.thresholds = {
            fps: { warning: 45, critical: 30 },
            memory: { warning: 0.7, critical: 0.85 }, // % of available memory
            latency: { warning: 100, critical: 200 } // ms
        };

        this.setupMonitoring();
    }

    setupMonitoring() {
        // FPS monitoring
        this.lastTime = performance.now();
        this.frames = 0;
        
        // Memory monitoring
        if (performance.memory) {
            this.memoryInterval = setInterval(() => this.checkMemory(), 5000);
        }

        // Battery monitoring
        if (navigator.getBattery) {
            this.setupBatteryMonitoring();
        }

        // Thermal monitoring
        if (navigator.thermal) {
            this.setupThermalMonitoring();
        }

        // Network monitoring
        this.setupNetworkMonitoring();

        // GPU monitoring
        this.detectGPUCapabilities();
    }

    update() {
        this.frames++;
        const currentTime = performance.now();
        
        if (currentTime - this.lastTime >= 1000) {
            const fps = this.frames;
            this.metrics.fps.push(fps);
            
            // Keep last 60 samples
            if (this.metrics.fps.length > 60) {
                this.metrics.fps.shift();
            }

            this.frames = 0;
            this.lastTime = currentTime;

            // Check performance and apply optimizations
            this.checkPerformance();
        }
    }

    checkPerformance() {
        const recentFps = this.getAverageFps(5); // Last 5 seconds

        if (recentFps < this.thresholds.fps.critical) {
            this.applyEmergencyOptimizations();
        } else if (recentFps < this.thresholds.fps.warning) {
            this.applyPerformanceOptimizations();
        }

        // Log performance data
        this.logMetrics();
    }

    applyEmergencyOptimizations() {
        const animManager = this.game.scene.getAt(0).animations;
        
        // Drastically reduce particles
        animManager.animationSettings.particleCount = 
            Math.max(5, Math.floor(animManager.animationSettings.particleCount * 0.5));

        // Disable all post-processing
        this.game.scene.scenes.forEach(scene => {
            scene.cameras.main.clearPostPipeline();
        });

        // Reduce resolution
        this.game.scale.setZoom(0.75);

        // Disable non-essential animations
        animManager.animationSettings.enableBlur = false;
        animManager.animationSettings.transitionDuration *= 0.5;
    }

    applyPerformanceOptimizations() {
        const animManager = this.game.scene.getAt(0).animations;

        // Moderately reduce effects
        animManager.animationSettings.particleCount = 
            Math.floor(animManager.animationSettings.particleCount * 0.8);

        // Simplify shaders
        if (animManager.warpPipeline) {
            animManager.warpPipeline.quality = 'low';
        }
    }

    async setupBatteryMonitoring() {
        try {
            const battery = await navigator.getBattery();
            
            const updateBattery = () => {
                this.metrics.batteryLevel = battery.level;
                
                // Apply power-saving optimizations when needed
                if (battery.level < 0.2 && !battery.charging) {
                    this.applyPowerSavingMode();
                }
            };

            battery.addEventListener('levelchange', updateBattery);
            battery.addEventListener('chargingchange', updateBattery);
            updateBattery();
        } catch (e) {
            console.warn('Battery API not available:', e);
        }
    }

    setupThermalMonitoring() {
        navigator.thermal.addEventListener('change', () => {
            this.metrics.thermalState = navigator.thermal.state;
            
            if (this.metrics.thermalState === 'critical') {
                this.applyEmergencyOptimizations();
            } else if (this.metrics.thermalState === 'serious') {
                this.applyPerformanceOptimizations();
            }
        });
    }

    setupNetworkMonitoring() {
        // Monitor WebSocket latency
        setInterval(() => {
            const start = performance.now();
            this.game.network?.socket.emit('ping', () => {
                const latency = performance.now() - start;
                this.metrics.networkLatency.push(latency);
                
                if (this.metrics.networkLatency.length > 30) {
                    this.metrics.networkLatency.shift();
                }
            });
        }, 2000);
    }

    checkMemory() {
        if (!performance.memory) return;

        const usedMemory = performance.memory.usedJSHeapSize;
        const totalMemory = performance.memory.jsHeapSizeLimit;
        const memoryUsage = usedMemory / totalMemory;

        this.metrics.memory.push(memoryUsage);
        
        if (this.metrics.memory.length > 30) {
            this.metrics.memory.shift();
        }

        if (memoryUsage > this.thresholds.memory.critical) {
            this.cleanupMemory();
        }
    }

    cleanupMemory() {
        // Clear texture caches
        this.game.textures.each(texture => {
            if (!texture.key.includes('essential')) {
                this.game.textures.remove(texture.key);
            }
        });

        // Clear particle emitters
        this.game.scene.scenes.forEach(scene => {
            scene.particles?.destroy();
        });

        // Force garbage collection if available
        if (window.gc) {
            window.gc();
        }
    }

    detectGPUCapabilities() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        
        if (gl) {
            this.metrics.gpuInfo = {
                vendor: gl.getParameter(gl.VENDOR),
                renderer: gl.getParameter(gl.RENDERER),
                version: gl.getParameter(gl.VERSION),
                shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
                maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
                maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
                extensions: gl.getSupportedExtensions()
            };
        }
    }

    getAverageFps(seconds) {
        const samples = this.metrics.fps.slice(-seconds);
        return samples.reduce((a, b) => a + b, 0) / samples.length;
    }

    getMetricsReport() {
        return {
            fps: {
                current: this.metrics.fps[this.metrics.fps.length - 1],
                average: this.getAverageFps(30),
                min: Math.min(...this.metrics.fps),
                max: Math.max(...this.metrics.fps)
            },
            memory: this.metrics.memory.length ? {
                current: this.metrics.memory[this.metrics.memory.length - 1],
                average: this.metrics.memory.reduce((a, b) => a + b, 0) / this.metrics.memory.length
            } : null,
            network: {
                latency: this.metrics.networkLatency.length ? {
                    current: this.metrics.networkLatency[this.metrics.networkLatency.length - 1],
                    average: this.metrics.networkLatency.reduce((a, b) => a + b, 0) / this.metrics.networkLatency.length
                } : null
            },
            battery: this.metrics.batteryLevel,
            thermal: this.metrics.thermalState,
            gpu: this.metrics.gpuInfo
        };
    }

    logMetrics() {
        if (process.env.NODE_ENV === 'development') {
            console.debug('Performance Metrics:', this.getMetricsReport());
        }
    }

    destroy() {
        clearInterval(this.memoryInterval);
        // Cleanup other intervals and listeners
    }
} 
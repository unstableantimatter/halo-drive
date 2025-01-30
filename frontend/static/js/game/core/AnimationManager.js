class AnimationManager {
    static transitions = {
        WARP: 'warp',
        FADE: 'fade',
        SLIDE: 'slide',
        ZOOM: 'zoom'
    };

    constructor(scene) {
        this.scene = scene;
        this.setupShaders();
        this.setupResponsiveHandlers();
        this.deviceTier = this.detectDeviceTier();
        this.animationSettings = this.getAnimationSettings();
        this.performanceMonitor = new PerformanceMonitor(scene.game);
        this.setupPerformanceOptimizations();
    }

    setupShaders() {
        // Warp effect shader
        const warpShader = `
            precision mediump float;
            uniform float time;
            uniform vec2 resolution;
            uniform sampler2D uMainSampler;
            varying vec2 outTexCoord;

            void main() {
                vec2 uv = outTexCoord;
                float distortion = sin(uv.y * 10.0 + time) * 0.1;
                vec2 warpedUV = vec2(uv.x + distortion, uv.y);
                gl_FragColor = texture2D(uMainSampler, warpedUV);
            }
        `;

        this.warpPipeline = this.scene.renderer.pipelines.add('Warp', {
            fragShader: warpShader
        });
    }

    setupResponsiveHandlers() {
        this.resizeObserver = new ResizeObserver(this.handleResize.bind(this));
        this.resizeObserver.observe(this.scene.game.canvas);
        
        // Handle device orientation changes
        window.addEventListener('orientationchange', () => {
            this.updateAnimationSettings();
        });

        // Handle visibility changes for performance
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });
    }

    detectDeviceTier() {
        const fps = this.scene.game.loop.targetFps;
        const gpu = this.detectGPUTier();
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile && (gpu === 'low' || fps < 60)) {
            return 'low';
        } else if (isMobile || gpu === 'medium' || fps < 144) {
            return 'medium';
        }
        return 'high';
    }

    detectGPUTier() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        if (!gl) return 'low';

        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();

        if (renderer.includes('nvidia') || renderer.includes('radeon')) {
            return 'high';
        } else if (renderer.includes('intel')) {
            return 'medium';
        }
        return 'low';
    }

    getAnimationSettings() {
        const settings = {
            high: {
                particleCount: 100,
                shaderQuality: 'high',
                transitionDuration: 1,
                enableBlur: true
            },
            medium: {
                particleCount: 50,
                shaderQuality: 'medium',
                transitionDuration: 0.8,
                enableBlur: false
            },
            low: {
                particleCount: 25,
                shaderQuality: 'low',
                transitionDuration: 0.5,
                enableBlur: false
            }
        };

        return settings[this.deviceTier];
    }

    handleResize(entries) {
        const entry = entries[0];
        const { width, height } = entry.contentRect;
        
        // Update shader resolution
        if (this.warpPipeline) {
            this.warpPipeline.setFloat2('resolution', width, height);
        }

        // Scale transitions based on screen size
        this.updateTransitionDistances(width, height);
    }

    updateTransitionDistances(width, height) {
        const baseDistance = Math.min(width, height) * 0.2;
        this.transitionDistances = {
            slide: baseDistance,
            zoom: {
                min: 0.5,
                max: 1 + (width / 3000)
            },
            warp: {
                scaleX: 1 + (width / 2000),
                scaleY: 1 + (height / 1000)
            }
        };
    }

    async transitionIn(elements, type = 'fade', duration = 500) {
        if (!elements) return;
        
        // Scale duration based on device tier
        duration *= this.animationSettings.transitionDuration;

        const startProps = this.getStartProperties(type);
        const endProps = this.getEndProperties(type);

        elements = Array.isArray(elements) ? elements : [elements];

        // Apply performance optimizations
        elements.forEach(element => {
            if (this.deviceTier !== 'high') {
                element.setPostPipeline(null); // Remove post-processing
            }
            Object.assign(element, startProps);
            element.setAlpha(0);
        });

        return new Promise(resolve => {
            this.scene.tweens.add({
                targets: elements,
                ...endProps,
                alpha: 1,
                duration: duration,
                ease: 'Cubic.easeOut',
                onComplete: resolve,
                onUpdate: (tween) => {
                    if (type === 'warp' && this.animationSettings.enableBlur) {
                        const blur = (1 - tween.progress) * 5;
                        elements.forEach(element => {
                            element.setBlur(blur);
                        });
                    }
                }
            });
        });
    }

    async transitionOut(elements, type = 'fade', duration = 500) {
        const endProps = this.getStartProperties(type);
        elements = Array.isArray(elements) ? elements : [elements];

        return new Promise(resolve => {
            this.scene.tweens.add({
                targets: elements,
                ...endProps,
                alpha: 0,
                duration: duration,
                ease: 'Cubic.easeIn',
                onComplete: resolve
            });
        });
    }

    getStartProperties(type) {
        switch(type) {
            case 'warp':
                return { scaleX: 0, scaleY: 2, alpha: 0 };
            case 'slide':
                return { x: '-=200', alpha: 0 };
            case 'zoom':
                return { scale: 0.5, alpha: 0 };
            default:
                return { alpha: 0 };
        }
    }

    getEndProperties(type) {
        switch(type) {
            case 'warp':
                return { scaleX: 1, scaleY: 1 };
            case 'slide':
                return { x: '+=200' };
            case 'zoom':
                return { scale: 1 };
            default:
                return {};
        }
    }

    createSpaceParticles(container) {
        const particles = this.scene.add.particles('particles');
        
        // Adjust particle settings based on device tier
        const emitter = particles.createEmitter({
            frame: 'star',
            quantity: this.animationSettings.particleCount / 2,
            frequency: 150 - (this.animationSettings.particleCount / 2),
            scale: { start: 0.5, end: 0 },
            speed: { 
                min: 50 * this.animationSettings.transitionDuration,
                max: 150 * this.animationSettings.transitionDuration
            },
            lifespan: 2000 * this.animationSettings.transitionDuration,
            blendMode: this.deviceTier === 'high' ? 'ADD' : 'NORMAL',
            alpha: { start: 1, end: 0 },
            angle: { min: 0, max: 360 }
        });

        if (container) {
            container.add(particles);
        }

        // Use instancing if available
        if (this.animationSettings.useInstancing) {
            emitter.setInstancing(true);
        }

        // Dynamic particle scaling
        const metrics = this.performanceMonitor.getMetricsReport();
        if (metrics.fps.average < 45) {
            emitter.quantity.propertyValue *= 0.7;
        }

        // Add performance monitoring
        this.monitorPerformance(emitter);
        
        return emitter;
    }

    monitorPerformance(emitter) {
        let frameCount = 0;
        let lastTime = performance.now();
        
        this.scene.events.on('update', () => {
            frameCount++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 1000) {
                const fps = frameCount;
                frameCount = 0;
                lastTime = currentTime;

                // Adjust particle count based on performance
                if (fps < 30 && emitter.quantity.propertyValue > 10) {
                    emitter.quantity.propertyValue *= 0.8;
                }
            }
        });
    }

    pulseElement(element, scale = 1.1, duration = 500) {
        this.scene.tweens.add({
            targets: element,
            scaleX: scale,
            scaleY: scale,
            duration: duration / 2,
            yoyo: true,
            ease: 'Quad.easeInOut'
        });
    }

    async sceneTransition(fromScene, toScene, type = 'warp') {
        const rt = fromScene.add.renderTexture(0, 0, 
            fromScene.cameras.main.width,
            fromScene.cameras.main.height
        );

        rt.draw(fromScene.children, 0, 0);
        
        const snapshot = fromScene.add.image(0, 0, rt);
        snapshot.setOrigin(0);
        snapshot.setPipeline('Warp');

        return new Promise(resolve => {
            fromScene.tweens.add({
                targets: snapshot,
                alpha: 0,
                duration: 1000,
                onUpdate: () => {
                    snapshot.pipeline.set1f('time', snapshot.alpha * 10);
                },
                onComplete: () => {
                    rt.destroy();
                    snapshot.destroy();
                    resolve();
                }
            });
        });
    }

    handleVisibilityChange() {
        const isHidden = document.hidden;
        this.scene.game.loop.sleep = isHidden;
        
        if (isHidden) {
            this.pauseAllAnimations();
        } else {
            this.resumeAllAnimations();
        }
    }

    pauseAllAnimations() {
        this.scene.tweens.pauseAll();
        this.scene.time.paused = true;
    }

    resumeAllAnimations() {
        this.scene.tweens.resumeAll();
        this.scene.time.paused = false;
    }

    setupPerformanceOptimizations() {
        // Dynamic quality adjustments based on device capabilities
        const metrics = this.performanceMonitor.getMetricsReport();
        
        if (metrics.gpu) {
            // Adjust shader complexity
            const maxTextureSize = metrics.gpu.maxTextureSize;
            this.animationSettings.textureQuality = maxTextureSize >= 4096 ? 'high' : 
                                                   maxTextureSize >= 2048 ? 'medium' : 'low';

            // Check for specific extensions
            const hasInstancedArrays = metrics.gpu.extensions.includes('ANGLE_instanced_arrays');
            this.animationSettings.useInstancing = hasInstancedArrays;
        }

        // Battery-aware optimizations
        if (metrics.battery !== null) {
            this.setupBatteryOptimizations();
        }

        // Network-aware optimizations
        if (metrics.network.latency) {
            this.setupNetworkOptimizations(metrics.network.latency.average);
        }
    }

    setupBatteryOptimizations() {
        const updateBatteryOptimizations = () => {
            const metrics = this.performanceMonitor.getMetricsReport();
            if (metrics.battery < 0.2) {
                this.animationSettings.particleCount *= 0.5;
                this.animationSettings.enableBlur = false;
                this.animationSettings.shaderQuality = 'low';
            }
        };

        // Update optimizations when battery level changes
        navigator.getBattery().then(battery => {
            battery.addEventListener('levelchange', updateBatteryOptimizations);
            updateBatteryOptimizations();
        });
    }

    setupNetworkOptimizations(averageLatency) {
        // Adjust animation sync frequency based on latency
        this.networkUpdateInterval = Math.max(
            50,
            Math.min(200, averageLatency)
        );
    }
} 
class ParticleSystem {
    constructor() {
        this.container = document.createElement('div');
        this.container.className = 'particle-container';
        document.body.appendChild(this.container);
        
        this.mouseX = window.innerWidth / 2;
        this.mouseY = window.innerHeight / 2;
        
        this.init();
        this.bindEvents();
        this.physics = new ParticlePhysics();
        this.startPhysicsLoop();
        this.config = new ParticleConfig();
        this.applyQualitySettings(this.config.detectOptimalQuality());
        this.startPerformanceMonitoring();
    }
    
    init() {
        this.createStars();
        this.createNebulas();
        this.createEnergyField();
        this.createSpeedLines();
        this.initBoostParticles();
        this.createWormhole();
        this.createPlasmaField();
        this.createAsteroidBelt();
        this.createQuantumParticles();
    }
    
    createStars(count = 100) {
        for (let i = 0; i < count; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.setProperty('--twinkle-duration', `${2 + Math.random() * 4}s`);
            star.style.left = `${Math.random() * 100}%`;
            star.style.top = `${Math.random() * 100}%`;
            star.style.width = star.style.height = `${1 + Math.random() * 2}px`;
            this.container.appendChild(star);
        }
    }
    
    createNebulas(count = 3) {
        const colors = ['#4a90e2', '#50e3c2', '#e3507a'];
        for (let i = 0; i < count; i++) {
            const nebula = document.createElement('div');
            nebula.className = 'nebula';
            nebula.style.background = `radial-gradient(circle at center, 
                ${colors[i]} 0%, transparent 70%)`;
            nebula.style.left = `${Math.random() * 100}%`;
            nebula.style.top = `${Math.random() * 100}%`;
            nebula.style.width = nebula.style.height = `${300 + Math.random() * 200}px`;
            this.container.appendChild(nebula);
        }
    }
    
    createEnergyField() {
        this.energyField = document.createElement('div');
        this.energyField.className = 'energy-field';
        this.container.appendChild(this.energyField);
    }
    
    createSpeedLines() {
        this.speedLines = document.createElement('div');
        this.speedLines.className = 'speed-lines';
        this.container.appendChild(this.speedLines);
    }
    
    initBoostParticles() {
        this.boostContainer = document.createElement('div');
        this.boostContainer.className = 'boost-particles';
        this.container.appendChild(this.boostContainer);
    }
    
    createWormhole() {
        const wormhole = document.createElement('div');
        wormhole.className = 'wormhole';
        wormhole.style.left = `${Math.random() * 80 + 10}%`;
        wormhole.style.top = `${Math.random() * 80 + 10}%`;
        this.container.appendChild(wormhole);
    }
    
    createPlasmaField() {
        const plasma = document.createElement('div');
        plasma.className = 'plasma-field';
        this.container.appendChild(plasma);
    }
    
    createAsteroidBelt(count = 20) {
        const belt = document.createElement('div');
        belt.className = 'asteroid-belt';
        this.container.appendChild(belt);

        for (let i = 0; i < count; i++) {
            const asteroid = document.createElement('div');
            asteroid.className = 'asteroid';
            
            // Random size between 5 and 20 pixels
            const size = 5 + Math.random() * 15;
            asteroid.style.width = `${size}px`;
            asteroid.style.height = `${size}px`;
            
            // Set custom properties for animation
            asteroid.style.setProperty('--rotation', `${Math.random() * 360}deg`);
            asteroid.style.setProperty('--depth', `${Math.random() * 500}px`);
            asteroid.style.setProperty('--float-duration', `${10 + Math.random() * 20}s`);
            
            belt.appendChild(asteroid);
        }
    }
    
    createIonTrails(shipPosition) {
        const trail = document.createElement('div');
        trail.className = 'ion-trail';
        trail.style.left = `${shipPosition.x}px`;
        trail.style.top = `${shipPosition.y}px`;
        this.container.appendChild(trail);

        trail.addEventListener('animationend', () => {
            trail.remove();
        });
    }
    
    createQuantumParticles(count = 15) {
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'quantum-particle';
            
            // Set random position
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${Math.random() * 100}%`;
            
            // Set random quantum fluctuation properties
            particle.style.setProperty('--quantum-duration', `${2 + Math.random() * 3}s`);
            particle.style.setProperty('--quantum-x', `${(Math.random() - 0.5) * 100}px`);
            particle.style.setProperty('--quantum-y', `${(Math.random() - 0.5) * 100}px`);
            
            this.container.appendChild(particle);
        }
    }
    
    bindEvents() {
        document.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
            this.updateEnergyField();
        });
        
        document.addEventListener('click', (e) => {
            this.createRipple(e.clientX, e.clientY);
        });
    }
    
    updateEnergyField() {
        const x = (this.mouseX / window.innerWidth) * 100;
        const y = (this.mouseY / window.innerHeight) * 100;
        this.energyField.style.setProperty('--mouse-x', `${x}%`);
        this.energyField.style.setProperty('--mouse-y', `${y}%`);
    }
    
    createRipple(x, y) {
        const ripple = document.createElement('div');
        ripple.className = 'ripple';
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        this.container.appendChild(ripple);
        
        ripple.addEventListener('animationend', () => {
            ripple.remove();
        });
    }
    
    activateBoost() {
        this.speedLines.style.opacity = '1';
        this.createBoostParticles();
    }
    
    deactivateBoost() {
        this.speedLines.style.opacity = '0';
    }
    
    createBoostParticles(count = 20) {
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('div');
            particle.className = 'boost-particle';
            this.setParticlePosition(particle);
            this.boostContainer.appendChild(particle);
            
            particle.addEventListener('animationend', () => {
                particle.remove();
            });
        }
    }
    
    setParticlePosition(particle) {
        const x = Math.random() * window.innerWidth;
        const y = Math.random() * window.innerHeight;
        const z = Math.random() * 500;
        
        particle.style.transform = `translate3d(${x}px, ${y}px, ${z}px)`;
    }

    updateParticles(shipVelocity) {
        // Update plasma field shift based on velocity
        if (this.plasmaField) {
            const shiftX = shipVelocity.x * 0.1;
            const shiftY = shipVelocity.y * 0.1;
            this.plasmaField.style.transform = `translate(${shiftX}px, ${shiftY}px)`;
        }

        // Create ion trails when ship is moving
        if (Math.abs(shipVelocity.x) > 0.1 || Math.abs(shipVelocity.y) > 0.1) {
            this.createIonTrails({
                x: window.innerWidth / 2,
                y: window.innerHeight / 2
            });
        }
    }

    setQuality(quality) {
        switch(quality) {
            case 'low':
                this.container.style.filter = 'none';
                break;
            case 'medium':
                this.container.style.filter = 'blur(1px)';
                break;
            case 'high':
                this.container.style.filter = 'blur(2px)';
                break;
        }
    }

    createCollisionEffect(x, y, type = 'default') {
        switch(type) {
            case 'shield':
                this.createShieldImpact(x, y);
                break;
            case 'asteroid':
                this.createAsteroidCollision(x, y);
                break;
            default:
                this.createBasicCollision(x, y);
        }
    }

    createBasicCollision(x, y) {
        // Create spark particles
        for (let i = 0; i < 8; i++) {
            const spark = document.createElement('div');
            spark.className = 'collision-spark';
            spark.style.left = `${x}px`;
            spark.style.top = `${y}px`;
            
            const angle = (i / 8) * Math.PI * 2;
            const distance = 20 + Math.random() * 20;
            const duration = 0.3 + Math.random() * 0.2;
            
            spark.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`;
            spark.style.animationDuration = `${duration}s`;
            
            this.container.appendChild(spark);
            spark.addEventListener('animationend', () => spark.remove());
        }

        // Create collision wave
        const wave = document.createElement('div');
        wave.className = 'collision-wave';
        wave.style.left = `${x - 50}px`;
        wave.style.top = `${y - 50}px`;
        this.container.appendChild(wave);
        wave.addEventListener('animationend', () => wave.remove());
    }

    createShieldImpact(x, y) {
        const impact = document.createElement('div');
        impact.className = 'shield-impact';
        impact.style.left = `${x - 50}px`;
        impact.style.top = `${y - 50}px`;
        impact.style.width = '100px';
        impact.style.height = '100px';
        this.container.appendChild(impact);
        impact.addEventListener('animationend', () => impact.remove());
    }

    createAsteroidCollision(x, y) {
        // Create debris particles
        for (let i = 0; i < 12; i++) {
            const debris = document.createElement('div');
            debris.className = 'collision-spark';
            debris.style.left = `${x}px`;
            debris.style.top = `${y}px`;
            debris.style.backgroundColor = '#8b8b8b';
            debris.style.width = '4px';
            debris.style.height = '4px';
            
            const angle = (i / 12) * Math.PI * 2;
            const distance = 30 + Math.random() * 30;
            const duration = 0.5 + Math.random() * 0.3;
            
            debris.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px)`;
            debris.style.animationDuration = `${duration}s`;
            
            this.container.appendChild(debris);
            debris.addEventListener('animationend', () => debris.remove());
        }
    }

    // Emission pattern methods
    createEmissionPattern(x, y, pattern = 'spiral', options = {}) {
        switch(pattern) {
            case 'spiral':
                this.createSpiralEmission(x, y, options);
                break;
            case 'burst':
                this.createBurstEmission(x, y, options);
                break;
            case 'pulse':
                this.createPulseEmission(x, y, options);
                break;
        }
    }

    createSpiralEmission(x, y, options = {}) {
        const spiral = document.createElement('div');
        spiral.className = 'emission-spiral';
        spiral.style.left = `${x - 50}px`;
        spiral.style.top = `${y - 50}px`;
        
        const particleCount = options.count || 12;
        const radius = options.radius || 50;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'emission-particle';
            
            const angle = (i / particleCount) * Math.PI * 2;
            const distance = radius;
            
            particle.style.left = `${Math.cos(angle) * distance + 50}px`;
            particle.style.top = `${Math.sin(angle) * distance + 50}px`;
            
            spiral.appendChild(particle);
        }
        
        this.container.appendChild(spiral);
        setTimeout(() => spiral.remove(), 10000);
    }

    createBurstEmission(x, y, options = {}) {
        const burst = document.createElement('div');
        burst.className = 'emission-burst';
        burst.style.left = `${x - 50}px`;
        burst.style.top = `${y - 50}px`;
        
        const particleCount = options.count || 16;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'emission-particle';
            
            const angle = (i / particleCount) * Math.PI * 2;
            const distance = 50;
            
            particle.style.left = `${Math.cos(angle) * distance + 50}px`;
            particle.style.top = `${Math.sin(angle) * distance + 50}px`;
            
            burst.appendChild(particle);
        }
        
        this.container.appendChild(burst);
        burst.addEventListener('animationend', () => burst.remove());
    }

    createPulseEmission(x, y, options = {}) {
        const interval = options.interval || 1000;
        const duration = options.duration || 5000;
        let elapsed = 0;
        
        const pulseInterval = setInterval(() => {
            this.createBurstEmission(x, y, { count: 8 });
            elapsed += interval;
            
            if (elapsed >= duration) {
                clearInterval(pulseInterval);
            }
        }, interval);
    }

    startPhysicsLoop() {
        const updatePhysics = () => {
            this.physics.update();
            this.renderPhysicsParticles();
            requestAnimationFrame(updatePhysics);
        };
        updatePhysics();
    }

    renderPhysicsParticles() {
        // Update existing physics-based particles
        this.physics.particles.forEach(particle => {
            let element = particle.element;
            
            if (!element) {
                element = document.createElement('div');
                element.className = 'physics-particle';
                element.style.width = `${particle.radius * 2}px`;
                element.style.height = `${particle.radius * 2}px`;
                element.style.backgroundColor = particle.color;
                this.container.appendChild(element);
                particle.element = element;
            }

            element.style.transform = `translate(${particle.x}px, ${particle.y}px)`;
            
            // Add motion blur based on velocity
            const speed = Math.sqrt(particle.vx * particle.vx + particle.vy * particle.vy);
            const blur = Math.min(speed * 0.5, 10);
            element.style.filter = `blur(${blur}px)`;
        });
    }

    createPhysicsCollision(x, y, type = 'default') {
        const options = {
            count: type === 'asteroid' ? 20 : 12,
            speed: type === 'asteroid' ? 8 : 5,
            color: type === 'asteroid' ? '#8b8b8b' : '#fff',
            radius: type === 'asteroid' ? 4 : 2
        };

        this.physics.addExplosion(x, y, options);

        if (type === 'shield') {
            this.createShieldImpact(x, y);
        }
    }

    createPhysicsEmission(x, y, pattern = 'spiral', options = {}) {
        switch(pattern) {
            case 'spiral':
                this.createPhysicsSpiralEmission(x, y, options);
                break;
            case 'burst':
                this.physics.addExplosion(x, y, {
                    count: options.count || 16,
                    speed: options.speed || 3,
                    color: options.color || '#00ffff',
                    radius: options.radius || 2,
                    life: options.life || 2000
                });
                break;
        }
    }

    createPhysicsSpiralEmission(x, y, options = {}) {
        const count = options.count || 12;
        const radius = options.radius || 50;
        const rotationSpeed = options.rotationSpeed || 0.1;
        
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const particle = this.physics.addParticle(x, y, {
                color: options.color || '#00ffff',
                radius: options.radius || 2,
                life: options.life || 5000,
                applyGravity: false
            });
            
            // Add circular motion
            particle.update = (deltaTime) => {
                particle.angle = (particle.angle || 0) + rotationSpeed * deltaTime;
                particle.x = x + Math.cos(particle.angle) * radius;
                particle.y = y + Math.sin(particle.angle) * radius;
            };
        }
    }

    createCheckpointEffect(x, y, radius = 100) {
        // Create checkpoint ring
        const ring = document.createElement('div');
        ring.className = 'checkpoint-ring';
        ring.style.left = `${x - radius}px`;
        ring.style.top = `${y - radius}px`;
        ring.style.width = `${radius * 2}px`;
        ring.style.height = `${radius * 2}px`;
        this.container.appendChild(ring);

        // Create particle container
        const particleContainer = document.createElement('div');
        particleContainer.className = 'checkpoint-particles';
        this.container.appendChild(particleContainer);

        // Create particles
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                particle.className = 'checkpoint-spark';
                const angle = Math.random() * Math.PI * 2;
                const distance = radius * (0.8 + Math.random() * 0.4);
                particle.style.left = `${x + Math.cos(angle) * distance}px`;
                particle.style.top = `${y + Math.sin(angle) * distance}px`;
                particleContainer.appendChild(particle);
                particle.addEventListener('animationend', () => particle.remove());
            }, i * 100);
        }

        setTimeout(() => {
            ring.remove();
            particleContainer.remove();
        }, 2000);
    }

    createBoostPadEffect(x, y, angle = 0) {
        const pad = document.createElement('div');
        pad.className = 'boost-pad';
        pad.style.left = `${x - 50}px`;
        pad.style.top = `${y - 10}px`;
        pad.style.transform = `rotate(${angle}rad)`;
        this.container.appendChild(pad);

        return pad; // Return for external management
    }

    createFinishLineEffect(x, y) {
        const container = document.createElement('div');
        container.className = 'finish-line-particles';
        this.container.appendChild(container);

        const createVictorySpark = () => {
            const spark = document.createElement('div');
            spark.className = 'victory-spark';
            spark.style.width = `${4 + Math.random() * 4}px`;
            spark.style.height = spark.style.width;
            spark.style.left = `${x + (Math.random() - 0.5) * 200}px`;
            spark.style.top = `${y + (Math.random() - 0.5) * 200}px`;
            container.appendChild(spark);
            spark.addEventListener('animationend', () => spark.remove());
        };

        // Create initial burst
        for (let i = 0; i < 30; i++) {
            setTimeout(createVictorySpark, i * 100);
        }

        // Continue with occasional sparks
        const interval = setInterval(createVictorySpark, 200);
        setTimeout(() => {
            clearInterval(interval);
            container.remove();
        }, 5000);
    }

    showPositionChange(x, y, change) {
        const indicator = document.createElement('div');
        indicator.className = 'position-change';
        indicator.textContent = change > 0 ? `+${change}` : change;
        indicator.style.left = `${x}px`;
        indicator.style.top = `${y}px`;
        indicator.style.color = change > 0 ? '#ff4444' : '#44ff44';
        this.container.appendChild(indicator);
        indicator.addEventListener('animationend', () => indicator.remove());
    }

    applyQualitySettings(quality) {
        const settings = this.config.setQuality(quality);
        if (!settings) return;

        // Update particle pool size
        this.physics.maxParticles = settings.maxParticles;
        this.physics.initParticlePool();

        // Update particle creation counts
        this.particleMultiplier = settings.particleDensity;

        // Update visual effects
        this.container.style.filter = settings.blurEffects ? 
            `blur(${settings.blurQuality}px)` : 'none';

        // Update physics settings
        this.physics.enableCollisions = settings.particleCollisions;
        this.physics.enablePhysics = settings.particlePhysics;

        // Update background effects
        this.updateBackgroundEffects(settings.backgroundEffects);

        // Update glow effects
        this.updateGlowEffects(settings.glowEffects);
    }

    startPerformanceMonitoring() {
        const monitor = () => {
            const fps = this.config.updateFPS();
            if (fps !== null) {
                // Optional: Log performance metrics
                console.debug(`FPS: ${fps.toFixed(1)}, Quality: ${this.config.currentQuality}`);
            }
            requestAnimationFrame(monitor);
        };
        monitor();
    }

    updateBackgroundEffects(enabled) {
        const bgElements = [
            '.nebula',
            '.wormhole',
            '.plasma-field'
        ];

        bgElements.forEach(selector => {
            const elements = this.container.querySelectorAll(selector);
            elements.forEach(el => {
                el.style.display = enabled ? 'block' : 'none';
            });
        });
    }

    updateGlowEffects(enabled) {
        const glowElements = [
            '.star::after',
            '.emission-particle',
            '.checkpoint-spark'
        ];

        // Add/remove glow effects class
        this.container.classList.toggle('glow-effects', enabled);
    }

    createParticles(type, count) {
        // Adjust particle count based on quality settings
        const adjustedCount = Math.floor(count * this.particleMultiplier);
        
        switch(type) {
            case 'explosion':
                return this.createExplosionParticles(adjustedCount);
            case 'trail':
                return this.createTrailParticles(adjustedCount);
            // ... other particle types
        }
    }
}

// Initialize when document is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.particleSystem = new ParticleSystem();
    window.particleSettings = new ParticleSettingsUI(window.particleSystem);
}); 
class ParticlePhysics {
    constructor() {
        this.particles = [];
        this.gravity = 0.1;
        this.friction = 0.98;
        this.lastTime = performance.now();
        this.boundaries = {
            left: 0,
            right: window.innerWidth,
            top: 0,
            bottom: window.innerHeight
        };
        
        this.updateBounds = this.updateBounds.bind(this);
        window.addEventListener('resize', this.updateBounds);
        this.quadTree = null;
        this.particlePool = [];
        this.maxParticles = 1000;
        this.activeParticles = new Set();
        this.initParticlePool();
    }

    initParticlePool() {
        for (let i = 0; i < this.maxParticles; i++) {
            this.particlePool.push({
                element: document.createElement('div'),
                active: false
            });
        }
    }

    getParticleFromPool() {
        for (let particle of this.particlePool) {
            if (!particle.active) {
                particle.active = true;
                this.activeParticles.add(particle);
                return particle;
            }
        }
        return null; // Pool is exhausted
    }

    returnParticleToPool(particle) {
        particle.active = false;
        this.activeParticles.delete(particle);
        // Reset particle properties
        particle.x = 0;
        particle.y = 0;
        particle.vx = 0;
        particle.vy = 0;
        particle.element.style.transform = '';
        particle.element.style.opacity = '0';
    }

    createParticle(x, y, options = {}) {
        return {
            x,
            y,
            vx: options.vx || (Math.random() - 0.5) * 10,
            vy: options.vy || (Math.random() - 0.5) * 10,
            mass: options.mass || 1,
            radius: options.radius || 2,
            life: options.life || 2000,
            color: options.color || '#fff',
            created: performance.now(),
            collisions: [],
            applyGravity: options.applyGravity ?? true,
            applyFriction: options.applyFriction ?? true,
            bounceCount: 0,
            maxBounces: options.maxBounces || 3
        };
    }

    update() {
        // Update quadtree for efficient collision detection
        this.updateQuadTree();

        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 16;
        this.lastTime = currentTime;

        for (const particle of this.activeParticles) {
            if (!this.updateParticle(particle, deltaTime, currentTime)) {
                this.returnParticleToPool(particle);
            }
        }
    }

    updateQuadTree() {
        this.quadTree = {
            bounds: this.boundaries,
            particles: [],
            divided: false
        };

        for (const particle of this.activeParticles) {
            this.insertIntoQuadTree(this.quadTree, particle);
        }
    }

    insertIntoQuadTree(node, particle) {
        if (!this.isInBounds(node.bounds, particle)) return;

        if (node.particles.length < 4) {
            node.particles.push(particle);
        } else {
            if (!node.divided) {
                this.subdivide(node);
            }
            this.insertIntoQuadTree(node.northwest, particle);
            this.insertIntoQuadTree(node.northeast, particle);
            this.insertIntoQuadTree(node.southwest, particle);
            this.insertIntoQuadTree(node.southeast, particle);
        }
    }

    handleCollisions(particle) {
        // Boundary collisions
        if (particle.x - particle.radius < this.boundaries.left) {
            particle.x = this.boundaries.left + particle.radius;
            particle.vx = Math.abs(particle.vx) * 0.8;
            particle.bounceCount++;
        }
        else if (particle.x + particle.radius > this.boundaries.right) {
            particle.x = this.boundaries.right - particle.radius;
            particle.vx = -Math.abs(particle.vx) * 0.8;
            particle.bounceCount++;
        }

        if (particle.y - particle.radius < this.boundaries.top) {
            particle.y = this.boundaries.top + particle.radius;
            particle.vy = Math.abs(particle.vy) * 0.8;
            particle.bounceCount++;
        }
        else if (particle.y + particle.radius > this.boundaries.bottom) {
            particle.y = this.boundaries.bottom - particle.radius;
            particle.vy = -Math.abs(particle.vy) * 0.8;
            particle.bounceCount++;
        }

        // Particle-particle collisions
        for (let other of this.particles) {
            if (particle === other) continue;

            const dx = other.x - particle.x;
            const dy = other.y - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < particle.radius + other.radius) {
                this.resolveCollision(particle, other);
            }
        }
    }

    resolveCollision(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Normal vector
        const nx = dx / distance;
        const ny = dy / distance;
        
        // Relative velocity
        const rvx = p2.vx - p1.vx;
        const rvy = p2.vy - p1.vy;
        
        // Relative velocity along normal
        const velAlongNormal = rvx * nx + rvy * ny;
        
        // Don't resolve if particles are moving apart
        if (velAlongNormal > 0) return;
        
        // Restitution (bounciness)
        const restitution = 0.8;
        
        // Impulse scalar
        const j = -(1 + restitution) * velAlongNormal;
        const impulse = j / (1/p1.mass + 1/p2.mass);
        
        // Apply impulse
        p1.vx -= (impulse * nx) / p1.mass;
        p1.vy -= (impulse * ny) / p1.mass;
        p2.vx += (impulse * nx) / p2.mass;
        p2.vy += (impulse * ny) / p2.mass;
    }

    updateBounds() {
        this.boundaries = {
            left: 0,
            right: window.innerWidth,
            top: 0,
            bottom: window.innerHeight
        };
    }

    addParticle(x, y, options = {}) {
        const particle = this.createParticle(x, y, options);
        this.particles.push(particle);
        return particle;
    }

    addExplosion(x, y, options = {}) {
        const count = options.count || 20;
        const speed = options.speed || 5;
        const particles = [];

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const velocity = speed + Math.random() * speed;
            
            particles.push(this.addParticle(x, y, {
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                life: 1000 + Math.random() * 1000,
                color: options.color || '#fff',
                radius: options.radius || 2,
                mass: options.mass || 1
            }));
        }

        return particles;
    }

    addGravityWell(x, y, strength = 1, radius = 100) {
        const well = { x, y, strength, radius };
        
        this.particles.forEach(particle => {
            const dx = well.x - particle.x;
            const dy = well.y - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < well.radius) {
                const force = (well.strength * (well.radius - distance)) / distance;
                particle.vx += (dx / distance) * force;
                particle.vy += (dy / distance) * force;
            }
        });
    }
} 
class GameEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.ship = null;
        this.gameLoop = null;
        this.lastTime = 0;
        this.assets = {};
        
        // Game state
        this.state = {
            running: false,
            paused: false
        };
        
        // Input state
        this.keys = {
            up: false,
            down: false,
            left: false,
            right: false,
            boost: false
        };
        
        // Bind event handlers
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
    }
    
    async loadAssets() {
        const shipSprites = {
            'default_ship': '/static/assets/ships/default_ship.png',
            'starfighter': '/static/assets/ships/starfighter.png',
            'interceptor': '/static/assets/ships/interceptor.png',
            'juggernaut': '/static/assets/ships/juggernaut.png'
        };
        
        console.log('Loading ship sprites...');
        for (const [key, path] of Object.entries(shipSprites)) {
            try {
                console.log(`Loading ${key} from ${path}`);
                this.assets[key] = await this.loadImage(path);
                console.log(`Successfully loaded ${key}`);
            } catch (error) {
                console.error(`Failed to load ${key} from ${path}:`, error);
                // Create a fallback colored triangle for missing sprites
                const canvas = document.createElement('canvas');
                canvas.width = 64;
                canvas.height = 32;
                const ctx = canvas.getContext('2d');
                
                // Different colors for different ships
                const colors = {
                    'default_ship': '#4488ff',
                    'starfighter': '#44ff88',
                    'interceptor': '#ff4488',
                    'juggernaut': '#ffff44'
                };
                
                ctx.fillStyle = colors[key];
                ctx.beginPath();
                ctx.moveTo(64, 16);  // tip
                ctx.lineTo(0, 0);    // top left
                ctx.lineTo(0, 32);   // bottom left
                ctx.closePath();
                ctx.fill();
                
                // Add engine ports
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 12, 8, 8);
                
                this.assets[key] = canvas;
            }
        }
        console.log('Asset loading complete:', this.assets);
    }
    
    loadImage(path) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = path;
        });
    }
    
    initShip(shipData) {
        console.log('Initializing ship with data:', shipData);
        const spriteKey = (shipData.sprite_key || 'default_ship.png').split('.')[0];
        console.log('Looking for sprite:', spriteKey);
        
        this.ship = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            rotation: 0,
            velocity: { x: 0, y: 0 },
            acceleration: 0,
            sprite: this.assets[spriteKey] || this.assets.default_ship,
            stats: {
                acceleration: shipData.stats?.acceleration || 50,
                max_speed: shipData.stats?.max_speed || 100,
                handling: shipData.stats?.handling || 50,
                shield_strength: shipData.stats?.shield_strength || 100,
                energy_capacity: shipData.stats?.energy_capacity || 100
            },
            width: 64,
            height: 32
        };
        
        console.log('Ship initialized:', this.ship);
    }
    
    handleKeyDown(e) {
        switch(e.key.toLowerCase()) {
            case 'w':
            case 'arrowup':
                this.keys.up = true;
                break;
            case 's':
            case 'arrowdown':
                this.keys.down = true;
                break;
            case 'a':
            case 'arrowleft':
                this.keys.left = true;
                break;
            case 'd':
            case 'arrowright':
                this.keys.right = true;
                break;
            case 'shift':
                this.keys.boost = true;
                break;
        }
    }
    
    handleKeyUp(e) {
        switch(e.key.toLowerCase()) {
            case 'w':
            case 'arrowup':
                this.keys.up = false;
                break;
            case 's':
            case 'arrowdown':
                this.keys.down = false;
                break;
            case 'a':
            case 'arrowleft':
                this.keys.left = false;
                break;
            case 'd':
            case 'arrowright':
                this.keys.right = false;
                break;
            case 'shift':
                this.keys.boost = false;
                break;
        }
    }
    
    update(deltaTime) {
        if (!this.ship || !this.state.running) return;
        
        // Handle rotation
        if (this.keys.left) this.ship.rotation -= 0.05;
        if (this.keys.right) this.ship.rotation += 0.05;
        
        // Handle acceleration
        if (this.keys.up) {
            const acceleration = this.keys.boost ? 
                this.ship.stats.acceleration * 1.5 : 
                this.ship.stats.acceleration;
                
            this.ship.velocity.x += Math.cos(this.ship.rotation) * acceleration * deltaTime;
            this.ship.velocity.y += Math.sin(this.ship.rotation) * acceleration * deltaTime;
        }
        
        // Apply drag
        const drag = 0.99;
        this.ship.velocity.x *= drag;
        this.ship.velocity.y *= drag;
        
        // Update position
        this.ship.x += this.ship.velocity.x;
        this.ship.y += this.ship.velocity.y;
        
        // Wrap around screen
        if (this.ship.x > this.canvas.width) this.ship.x = 0;
        if (this.ship.x < 0) this.ship.x = this.canvas.width;
        if (this.ship.y > this.canvas.height) this.ship.y = 0;
        if (this.ship.y < 0) this.ship.y = this.canvas.height;
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.ship) {
            // Save context
            this.ctx.save();
            
            // Translate to ship position
            this.ctx.translate(this.ship.x, this.ship.y);
            this.ctx.rotate(this.ship.rotation);
            
            // Draw ship
            this.ctx.drawImage(
                this.ship.sprite,
                -this.ship.width / 2,
                -this.ship.height / 2,
                this.ship.width,
                this.ship.height
            );
            
            // Draw engine glow when accelerating
            if (this.keys.up) {
                this.ctx.beginPath();
                this.ctx.moveTo(-this.ship.width / 2, 0);
                this.ctx.lineTo(-this.ship.width / 2 - 20, -10);
                this.ctx.lineTo(-this.ship.width / 2 - 20, 10);
                this.ctx.closePath();
                
                const gradient = this.ctx.createLinearGradient(
                    -this.ship.width / 2, 0,
                    -this.ship.width / 2 - 20, 0
                );
                gradient.addColorStop(0, 'rgba(0, 255, 255, 1)');
                gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
                this.ctx.fillStyle = gradient;
                this.ctx.fill();
            }
            
            // Restore context
            this.ctx.restore();
        }
    }
    
    start() {
        this.state.running = true;
        this.gameLoop = requestAnimationFrame(this.loop.bind(this));
    }
    
    loop(timestamp) {
        const deltaTime = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        
        this.update(deltaTime);
        this.render();
        
        if (this.state.running) {
            this.gameLoop = requestAnimationFrame(this.loop.bind(this));
        }
    }
    
    stop() {
        this.state.running = false;
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
        }
    }
} 
class TestScene extends Phaser.Scene {
    constructor() {
        super({ key: 'TestScene' });
        this.effectManager = null;
    }

    create() {
        // Setup scene
        this.effectManager = new EffectManager(this);
        
        // Create test ship
        this.testShip = this.createTestShip();
        this.effectManager.addShieldToShip(this.testShip);
        
        // Add controls
        this.setupControls();
        
        // Add test effects
        this.addTestEffects();
    }

    createTestShip() {
        const ship = new Ship(this, 400, 300, 'ship_1');
        ship.setInteractive();
        
        // Add engine effect
        const engine = new Sprite(this, 0, 20, 'engine_flame');
        engine.setName('engine');
        engine.setMaterial(this.effectManager.engineMaterial.clone());
        ship.add(engine);
        
        return ship;
    }

    setupControls() {
        // Mouse control for ship rotation
        this.input.on('pointermove', (pointer) => {
            if (this.testShip) {
                const angle = Phaser.Math.Angle.Between(
                    this.testShip.x, this.testShip.y,
                    pointer.x, pointer.y
                );
                this.testShip.rotation = angle;
            }
        });

        // Spacebar for thrust
        this.input.keyboard.on('keydown-SPACE', () => {
            this.effectManager.updateEngineThrust(this.testShip, 1.0);
        });

        this.input.keyboard.on('keyup-SPACE', () => {
            this.effectManager.updateEngineThrust(this.testShip, 0.0);
        });

        // Click for shield impact test
        this.input.on('pointerdown', (pointer) => {
            this.effectManager.handleShieldImpact(this.testShip, {
                x: pointer.x,
                y: pointer.y,
                z: 0
            });
            
            // Add heat source at impact
            const heatSource = this.effectManager.createHeatSource(
                pointer.x, pointer.y, 200, 1.0
            );
            this.heatSources.push(heatSource);
        });
    }

    addTestEffects() {
        this.heatSources = [];
        
        // Add some ambient heat sources
        for (let i = 0; i < 5; i++) {
            const heatSource = this.effectManager.createHeatSource(
                Phaser.Math.Between(0, 800),
                Phaser.Math.Between(0, 600),
                150,
                0.5
            );
            this.heatSources.push(heatSource);
        }
    }

    update(time, deltaTime) {
        // Update effects
        this.effectManager.updateEffects(deltaTime / 1000);
        
        // Update heat sources
        this.heatSources = this.heatSources.filter(source => {
            source.update(deltaTime / 1000);
            return source.intensity > 0;
        });
    }

    getHeatSources() {
        return this.heatSources;
    }
} 
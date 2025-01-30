class EffectManager {
    constructor(scene) {
        this.scene = scene;
        this.effects = new Map();
        this.setupEffects();
    }

    setupEffects() {
        // Create heat distortion post-process
        this.heatDistortion = new PostProcess(
            this.scene,
            EffectShaders.heatDistortion,
            {
                intensity: 0.0,
                resolution: [window.innerWidth, window.innerHeight]
            }
        );

        // Create shield effect for ships
        this.shieldMaterial = new ShaderMaterial(
            EffectShaders.shieldEffect,
            {
                shieldColor: [0.3, 0.7, 1.0],
                opacity: 0.8,
                impact: 0.0,
                impactPoint: [0, 0, 0]
            }
        );

        // Create engine effect
        this.engineMaterial = new ShaderMaterial(
            EffectShaders.engineThrust,
            {
                thrust: 0.0,
                flameTex: this.scene.textures.get('engine_flame')
            }
        );
    }

    updateEffects(deltaTime) {
        // Update heat distortion based on nearby heat sources
        const heatSources = this.scene.getHeatSources();
        let totalHeat = 0;
        
        heatSources.forEach(source => {
            const distance = Phaser.Math.Distance.Between(
                this.scene.camera.x, this.scene.camera.y,
                source.x, source.y
            );
            totalHeat += Math.max(0, 1 - distance / source.radius) * source.intensity;
        });

        this.heatDistortion.setUniform('intensity', totalHeat);

        // Update shield effects
        this.scene.ships.forEach(ship => {
            if (ship.shields.active) {
                const shield = this.effects.get(ship.id);
                if (shield) {
                    shield.material.uniforms.impact = Math.max(0, shield.material.uniforms.impact - deltaTime);
                }
            }
        });
    }

    addShieldToShip(ship) {
        const shieldMesh = new ShieldMesh(ship.geometry, this.shieldMaterial.clone());
        this.effects.set(ship.id, {
            mesh: shieldMesh,
            material: shieldMesh.material
        });
        ship.add(shieldMesh);
    }

    handleShieldImpact(ship, impact) {
        const shield = this.effects.get(ship.id);
        if (shield) {
            shield.material.uniforms.impact = 1.0;
            shield.material.uniforms.impactPoint = [impact.x, impact.y, impact.z];
        }
    }

    updateEngineThrust(ship, thrust) {
        const engine = ship.getObjectByName('engine');
        if (engine) {
            engine.material.uniforms.thrust = thrust;
        }
    }

    createHeatSource(x, y, radius, intensity) {
        return {
            x, y, radius, intensity,
            update: function(deltaTime) {
                this.intensity = Math.max(0, this.intensity - deltaTime * 0.5);
            }
        };
    }
} 
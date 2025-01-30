class ShaderOptimizer {
    constructor(gpuOptimizer) {
        this.gpuOptimizer = gpuOptimizer;
        this.capabilities = gpuOptimizer.capabilities;
        this.shaderPresets = this.createShaderPresets();
        this.uniformBuffers = new Map();
    }

    createShaderPresets() {
        return {
            high: {
                maxLights: 8,
                shadowQuality: 2048,
                particleComplexity: 'high',
                useNormalMapping: true,
                useEnvironmentMapping: true,
                usePBR: true
            },
            medium: {
                maxLights: 4,
                shadowQuality: 1024,
                particleComplexity: 'medium',
                useNormalMapping: true,
                useEnvironmentMapping: false,
                usePBR: false
            },
            low: {
                maxLights: 2,
                shadowQuality: 512,
                particleComplexity: 'low',
                useNormalMapping: false,
                useEnvironmentMapping: false,
                usePBR: false
            }
        };
    }

    getOptimizedShaders() {
        const preset = this.shaderPresets[this.gpuOptimizer.optimizationLevel];

        return {
            ship: this.createShipShader(preset),
            particles: this.createParticleShader(preset),
            environment: this.createEnvironmentShader(preset),
            postProcess: this.createPostProcessShader(preset)
        };
    }

    createShipShader(preset) {
        const vertexShader = `
            #version ${this.capabilities.webgl2 ? '300 es' : '100'}
            
            ${this.getShaderPrecision()}
            
            // Attributes
            attribute vec3 position;
            attribute vec2 uv;
            attribute vec3 normal;
            ${preset.useNormalMapping ? 'attribute vec3 tangent;' : ''}
            
            // Uniforms
            uniform mat4 modelViewMatrix;
            uniform mat4 projectionMatrix;
            ${this.generateLightUniforms(preset.maxLights)}
            
            // Varyings
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vViewPosition;
            ${preset.useNormalMapping ? 'varying mat3 vTBN;' : ''}
            
            void main() {
                vUv = uv;
                vNormal = normalize(normalMatrix * normal);
                
                ${preset.useNormalMapping ? this.generateTBNMatrix() : ''}
                
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                vViewPosition = -mvPosition.xyz;
                
                gl_Position = projectionMatrix * mvPosition;
            }
        `;

        const fragmentShader = `
            ${this.getShaderPrecision()}
            
            // Material properties
            uniform vec3 diffuseColor;
            uniform float roughness;
            uniform float metalness;
            
            // Textures
            uniform sampler2D diffuseMap;
            ${preset.useNormalMapping ? 'uniform sampler2D normalMap;' : ''}
            ${preset.useEnvironmentMapping ? 'uniform samplerCube envMap;' : ''}
            
            // Varyings
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vViewPosition;
            
            ${preset.usePBR ? this.generatePBRFunctions() : this.generatePhongFunctions()}
            
            void main() {
                vec4 diffuseColor = texture2D(diffuseMap, vUv) * vec4(diffuseColor, 1.0);
                
                ${preset.useNormalMapping ? `
                    vec3 normal = normalize(vTBN * (texture2D(normalMap, vUv).rgb * 2.0 - 1.0));
                ` : 'vec3 normal = normalize(vNormal);'}
                
                vec3 viewDir = normalize(vViewPosition);
                
                ${preset.usePBR ? 
                    this.generatePBRLighting(preset.maxLights) : 
                    this.generatePhongLighting(preset.maxLights)}
                
                ${preset.useEnvironmentMapping ? `
                    vec3 envColor = textureCube(envMap, reflect(-viewDir, normal)).rgb;
                    finalColor += envColor * (1.0 - roughness);
                ` : ''}
                
                gl_FragColor = vec4(finalColor, diffuseColor.a);
            }
        `;

        return { vertexShader, fragmentShader };
    }

    createParticleShader(preset) {
        // Optimized particle shader based on preset complexity
        const vertexShader = `
            ${this.getShaderPrecision()}
            
            attribute vec3 position;
            attribute vec2 uv;
            attribute vec4 particleColor;
            attribute float size;
            
            uniform mat4 modelViewMatrix;
            uniform mat4 projectionMatrix;
            uniform float time;
            
            varying vec2 vUv;
            varying vec4 vColor;
            
            ${preset.particleComplexity === 'high' ? `
                attribute vec3 velocity;
                attribute float age;
                uniform float turbulence;
                
                vec3 computeTurbulence(vec3 pos, float t) {
                    return pos + vec3(
                        sin(t + pos.x) * turbulence,
                        cos(t + pos.y) * turbulence,
                        sin(t + pos.z) * turbulence
                    );
                }
            ` : ''}
            
            void main() {
                vUv = uv;
                vColor = particleColor;
                
                vec3 pos = position;
                ${preset.particleComplexity === 'high' ? `
                    pos = computeTurbulence(pos + velocity * age, time);
                ` : ''}
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                gl_Position = projectionMatrix * mvPosition;
                gl_PointSize = size * (300.0 / -mvPosition.z);
            }
        `;

        return { vertexShader, fragmentShader: this.getParticleFragmentShader(preset) };
    }

    generatePBRFunctions() {
        return `
            float D_GGX(float NoH, float roughness) {
                float alpha = roughness * roughness;
                float alpha2 = alpha * alpha;
                float NoH2 = NoH * NoH;
                float denom = NoH2 * (alpha2 - 1.0) + 1.0;
                return alpha2 / (PI * denom * denom);
            }

            float G_Smith(float NoV, float NoL, float roughness) {
                float k = (roughness + 1.0) * (roughness + 1.0) / 8.0;
                float ggx1 = NoV / (NoV * (1.0 - k) + k);
                float ggx2 = NoL / (NoL * (1.0 - k) + k);
                return ggx1 * ggx2;
            }

            vec3 F_Schlick(float cosTheta, vec3 F0) {
                return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
            }
        `;
    }

    setupUniformBuffers() {
        if (!this.capabilities.webgl2) return;

        const gl = this.gpuOptimizer.game.renderer.gl;
        
        // Create UBO for frequently updated uniforms
        const transformUBO = gl.createBuffer();
        gl.bindBuffer(gl.UNIFORM_BUFFER, transformUBO);
        gl.bufferData(gl.UNIFORM_BUFFER, 16 * 4 * 2, gl.DYNAMIC_DRAW); // 2 mat4
        this.uniformBuffers.set('Transform', transformUBO);

        // Create UBO for lighting data
        const lightingUBO = gl.createBuffer();
        gl.bindBuffer(gl.UNIFORM_BUFFER, lightingUBO);
        gl.bufferData(gl.UNIFORM_BUFFER, 
            (16 + this.shaderPresets[this.gpuOptimizer.optimizationLevel].maxLights * 8) * 4,
            gl.DYNAMIC_DRAW
        );
        this.uniformBuffers.set('Lighting', lightingUBO);
    }

    updateUniformBuffers(scene) {
        if (!this.capabilities.webgl2) return;

        const gl = this.gpuOptimizer.game.renderer.gl;

        // Update transform UBO
        gl.bindBuffer(gl.UNIFORM_BUFFER, this.uniformBuffers.get('Transform'));
        gl.bufferSubData(gl.UNIFORM_BUFFER, 0, 
            new Float32Array([...scene.camera.viewMatrix, ...scene.camera.projectionMatrix]));

        // Update lighting UBO
        const lightingData = new Float32Array(this.packLightingData(scene.lights));
        gl.bindBuffer(gl.UNIFORM_BUFFER, this.uniformBuffers.get('Lighting'));
        gl.bufferSubData(gl.UNIFORM_BUFFER, 0, lightingData);
    }

    optimizeShaderCompilation(shader) {
        const gl = this.gpuOptimizer.game.renderer.gl;
        
        // Use parallel compilation if available
        if (this.capabilities.webgl2) {
            const ext = gl.getExtension('KHR_parallel_shader_compile');
            if (ext) {
                return new Promise(resolve => {
                    const checkCompilation = () => {
                        if (gl.getProgramParameter(shader.program, ext.COMPLETION_STATUS_KHR)) {
                            resolve(shader);
                        } else {
                            requestAnimationFrame(checkCompilation);
                        }
                    };
                    checkCompilation();
                });
            }
        }
        
        return Promise.resolve(shader);
    }
} 
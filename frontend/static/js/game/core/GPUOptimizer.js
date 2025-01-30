class GPUOptimizer {
    constructor(game) {
        this.game = game;
        this.capabilities = this.detectCapabilities();
        this.optimizationLevel = this.determineOptimizationLevel();
        this.shaderCache = new Map();
        this.texturePool = new Map();
        this.setupWebGLContext();
    }

    detectCapabilities() {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        
        return {
            webgl2: !!canvas.getContext('webgl2'),
            floatTextures: gl?.getExtension('OES_texture_float'),
            instancedArrays: gl?.getExtension('ANGLE_instanced_arrays'),
            anisotropicFiltering: gl?.getExtension('EXT_texture_filter_anisotropic'),
            compressedTextures: {
                s3tc: gl?.getExtension('WEBGL_compressed_texture_s3tc'),
                etc1: gl?.getExtension('WEBGL_compressed_texture_etc1'),
                astc: gl?.getExtension('WEBGL_compressed_texture_astc')
            },
            maxTextureSize: gl?.getParameter(gl.MAX_TEXTURE_SIZE),
            maxVaryings: gl?.getParameter(gl.MAX_VARYING_VECTORS),
            maxVertexAttribs: gl?.getParameter(gl.MAX_VERTEX_ATTRIBS)
        };
    }

    setupWebGLContext() {
        const renderer = this.game.renderer;
        const gl = renderer.gl;

        // Set optimal WebGL state
        gl.hint(gl.GENERATE_MIPMAP_HINT, gl.FASTEST);
        
        if (this.capabilities.anisotropicFiltering) {
            const max = gl.getParameter(
                this.capabilities.anisotropicFiltering.MAX_TEXTURE_MAX_ANISOTROPY_EXT
            );
            gl.texParameterf(gl.TEXTURE_2D, 
                this.capabilities.anisotropicFiltering.TEXTURE_MAX_ANISOTROPY_EXT, 
                Math.min(4, max) // Balance quality and performance
            );
        }

        // Setup VAO if available
        if (this.capabilities.webgl2) {
            renderer.currentVertexArray = gl.createVertexArray();
            gl.bindVertexArray(renderer.currentVertexArray);
        }
    }

    optimizeTexture(texture) {
        const gl = this.game.renderer.gl;
        
        // Generate mipmaps only for power-of-two textures
        const isPowerOfTwo = (value) => (value & (value - 1)) === 0;
        const canMipmap = isPowerOfTwo(texture.width) && isPowerOfTwo(texture.height);

        if (canMipmap) {
            gl.bindTexture(gl.TEXTURE_2D, texture.source.glTexture);
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }

        // Use compressed textures when available
        if (this.capabilities.compressedTextures.s3tc && texture.source.compressionAlgorithm === 'dxt') {
            // Implement DXT compression
            this.compressTexture(texture, 'dxt');
        }
    }

    compressTexture(texture, format) {
        // Implement texture compression based on format
        const gl = this.game.renderer.gl;
        const pixels = texture.source.image;
        
        switch(format) {
            case 'dxt':
                if (this.capabilities.compressedTextures.s3tc) {
                    // Use S3TC/DXT compression
                    const compressed = this.compressS3TC(pixels);
                    gl.compressedTexImage2D(gl.TEXTURE_2D, 0, gl.COMPRESSED_RGBA_S3TC_DXT5_EXT,
                        texture.width, texture.height, 0, compressed);
                }
                break;
            case 'etc1':
                if (this.capabilities.compressedTextures.etc1) {
                    // Use ETC1 compression for mobile
                    const compressed = this.compressETC1(pixels);
                    gl.compressedTexImage2D(gl.TEXTURE_2D, 0, gl.COMPRESSED_RGB_ETC1_WEBGL,
                        texture.width, texture.height, 0, compressed);
                }
                break;
        }
    }

    optimizeShader(shader) {
        // Cache compiled shaders
        const key = shader.fragmentSrc + shader.vertexSrc;
        if (this.shaderCache.has(key)) {
            return this.shaderCache.get(key);
        }

        // Optimize shader code
        shader.fragmentSrc = this.optimizeShaderCode(shader.fragmentSrc);
        shader.vertexSrc = this.optimizeShaderCode(shader.vertexSrc);

        // Compile and cache
        const compiled = this.compileShader(shader);
        this.shaderCache.set(key, compiled);
        return compiled;
    }

    optimizeShaderCode(code) {
        // Remove comments and unnecessary whitespace
        code = code.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '')
                  .replace(/\s+/g, ' ').trim();

        // Optimize precision qualifiers based on device
        if (this.optimizationLevel === 'low') {
            code = code.replace(/highp/g, 'mediump');
        }

        // Optimize floating point operations
        if (!this.capabilities.floatTextures) {
            code = code.replace(/float/g, 'mediump float');
        }

        return code;
    }

    createBatchRenderer(sprites) {
        if (!this.capabilities.instancedArrays) return null;

        // Create instanced renderer for sprite batching
        const instancedRenderer = {
            buffer: new Float32Array(sprites.length * 16), // 4x4 matrix per sprite
            vao: this.game.renderer.gl.createVertexArray(),
            count: sprites.length
        };

        // Setup instanced attributes
        this.setupInstancedAttributes(instancedRenderer);
        return instancedRenderer;
    }

    setupInstancedAttributes(renderer) {
        const gl = this.game.renderer.gl;
        gl.bindVertexArray(renderer.vao);

        // Setup instanced attribute divisors
        if (this.capabilities.instancedArrays) {
            const ext = this.capabilities.instancedArrays;
            ext.vertexAttribDivisorANGLE(0, 0); // vertices
            ext.vertexAttribDivisorANGLE(1, 1); // instance matrix
        }
    }

    optimizeGeometry(geometry) {
        // Implement geometry optimization strategies
        if (geometry.vertices.length > 1000) {
            this.decimateGeometry(geometry);
        }

        // Create VAO for geometry
        if (this.capabilities.webgl2) {
            this.createVAO(geometry);
        }
    }

    decimateGeometry(geometry) {
        // Implement mesh decimation for complex geometries
        // This is a simplified version - you'd want a more sophisticated algorithm in production
        if (geometry.vertices.length > 1000) {
            const reduction = 0.5; // Reduce vertex count by 50%
            const stride = Math.floor(1 / reduction);
            
            geometry.vertices = geometry.vertices.filter((_, index) => index % stride === 0);
            geometry.updateVertexBuffer();
        }
    }

    createVAO(geometry) {
        const gl = this.game.renderer.gl;
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);

        // Setup vertex attributes
        geometry.buffers.forEach((buffer, index) => {
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.enableVertexAttribArray(index);
            gl.vertexAttribPointer(index, buffer.itemSize, gl.FLOAT, false, 0, 0);
        });

        geometry.vao = vao;
    }
} 
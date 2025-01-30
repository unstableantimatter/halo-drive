class EffectShaders {
    static heatDistortion = {
        vertexShader: `
            attribute vec3 position;
            attribute vec2 uv;
            
            uniform mat4 modelViewMatrix;
            uniform mat4 projectionMatrix;
            
            varying vec2 vUv;
            
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            precision highp float;
            
            uniform sampler2D tDiffuse;
            uniform float time;
            uniform float intensity;
            uniform vec2 resolution;
            
            varying vec2 vUv;
            
            void main() {
                vec2 uv = vUv;
                
                // Create heat wave distortion
                float distortion = sin(uv.y * 10.0 + time) * 0.01 * intensity;
                distortion += cos(uv.x * 15.0 - time * 0.5) * 0.007 * intensity;
                
                // Add vertical heat rise effect
                float rise = fract(uv.y - time * 0.1);
                distortion += smoothstep(0.3, 0.7, rise) * 0.015 * intensity;
                
                // Sample the texture with distortion
                vec2 distortedUv = uv + vec2(distortion);
                vec4 color = texture2D(tDiffuse, distortedUv);
                
                // Add heat color tint
                float heat = smoothstep(0.2, 0.8, intensity);
                color.rgb += vec3(0.4, 0.2, 0.1) * heat * distortion * 2.0;
                
                gl_FragColor = color;
            }
        `
    };

    static shieldEffect = {
        vertexShader: `
            attribute vec3 position;
            attribute vec2 uv;
            attribute vec3 normal;
            
            uniform mat4 modelViewMatrix;
            uniform mat4 projectionMatrix;
            uniform float time;
            
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vViewPosition;
            
            void main() {
                vUv = uv;
                vNormal = normalize(normalMatrix * normal);
                
                // Add shield pulse animation
                float pulse = sin(time * 2.0) * 0.03;
                vec3 pos = position + normal * pulse;
                
                vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                vViewPosition = -mvPosition.xyz;
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            precision highp float;
            
            uniform vec3 shieldColor;
            uniform float opacity;
            uniform float time;
            uniform float impact;
            uniform vec3 impactPoint;
            
            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vViewPosition;
            
            void main() {
                // Fresnel effect
                vec3 viewDir = normalize(vViewPosition);
                float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 3.0);
                
                // Shield hexagon pattern
                vec2 hex = vUv * vec2(10.0, 17.32);
                hex.y += hex.x * 0.5;
                vec2 hexId = floor(hex);
                vec2 hexUv = fract(hex) - 0.5;
                float hexDist = length(hexUv);
                
                // Animate shield pattern
                float pattern = smoothstep(0.5, 0.45, hexDist);
                pattern *= sin(hexId.x * 0.5 + hexId.y * 0.5 + time) * 0.5 + 0.5;
                
                // Impact effect
                float impactWave = 0.0;
                if (impact > 0.0) {
                    float dist = length(vViewPosition - impactPoint);
                    float wave = sin(dist * 10.0 - time * 20.0) * 0.5 + 0.5;
                    impactWave = smoothstep(impact + 0.5, impact, dist) * wave;
                }
                
                // Combine effects
                vec3 color = shieldColor;
                color += pattern * shieldColor * 0.5;
                color += fresnel * shieldColor;
                color += impactWave * vec3(1.0);
                
                // Transparency
                float alpha = (fresnel * 0.5 + pattern * 0.3 + impactWave) * opacity;
                
                gl_FragColor = vec4(color, alpha);
            }
        `
    };

    static engineThrust = {
        vertexShader: `
            attribute vec3 position;
            attribute vec2 uv;
            
            uniform mat4 modelViewMatrix;
            uniform mat4 projectionMatrix;
            uniform float time;
            uniform float thrust;
            
            varying vec2 vUv;
            varying float vThrust;
            
            void main() {
                vUv = uv;
                vThrust = thrust;
                
                // Animate thrust expansion
                vec3 pos = position;
                pos.xy *= 1.0 + thrust * 0.2;
                pos.z += sin(time * 20.0 + position.x * 10.0) * thrust * 0.1;
                
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `,
        fragmentShader: `
            precision highp float;
            
            uniform sampler2D flameTex;
            uniform float time;
            
            varying vec2 vUv;
            varying float vThrust;
            
            void main() {
                // Scrolling flame texture
                vec2 flameUv = vUv;
                flameUv.y -= time * 2.0;
                
                vec4 flame = texture2D(flameTex, flameUv);
                
                // Add color variation based on thrust
                vec3 color = mix(
                    vec3(1.0, 0.3, 0.1),  // Low thrust
                    vec3(0.2, 0.5, 1.0),   // High thrust
                    vThrust
                );
                
                // Intensity falloff
                float intensity = smoothstep(1.0, 0.0, vUv.y);
                intensity *= vThrust;
                
                gl_FragColor = vec4(color * flame.rgb * intensity, flame.a * intensity);
            }
        `
    };
} 
class ParticleSettingsUI {
    constructor(particleSystem) {
        this.particleSystem = particleSystem;
        this.config = particleSystem.config;
        this.createUI();
        this.bindEvents();
    }

    createUI() {
        // Create toggle button
        this.toggleButton = document.createElement('button');
        this.toggleButton.className = 'settings-toggle';
        this.toggleButton.innerHTML = '<i class="fas fa-cog"></i>';
        document.body.appendChild(this.toggleButton);

        // Create settings panel
        this.panel = document.createElement('div');
        this.panel.className = 'settings-panel';
        this.panel.innerHTML = `
            <div class="settings-section">
                <h3>Visual Quality</h3>
                ${this.createQualityOptions()}
            </div>
            <div class="settings-section">
                <h3>Performance</h3>
                <div class="settings-toggle-switch">
                    <label class="toggle-switch">
                        <input type="checkbox" id="autoAdjust" ${this.config.autoAdjust ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                    <span>Auto-adjust quality</span>
                </div>
                <div class="fps-threshold">
                    <span>FPS Threshold:</span>
                    <input type="number" id="fpsThreshold" value="${this.config.fpsThreshold}" min="15" max="60">
                </div>
            </div>
            <div class="settings-section">
                <h3>Current FPS: <span id="currentFps">--</span></h3>
            </div>
        `;
        document.body.appendChild(this.panel);

        // Store references
        this.fpsDisplay = this.panel.querySelector('#currentFps');
    }

    createQualityOptions() {
        return ['ultra', 'high', 'medium', 'low']
            .map(quality => `
                <div class="quality-option">
                    <input type="radio" name="quality" value="${quality}" 
                        id="quality_${quality}" 
                        ${this.config.currentQuality === quality ? 'checked' : ''}>
                    <label for="quality_${quality}">${quality.charAt(0).toUpperCase() + quality.slice(1)}</label>
                </div>
            `).join('');
    }

    bindEvents() {
        // Toggle panel visibility
        this.toggleButton.addEventListener('click', () => {
            this.panel.classList.toggle('visible');
        });

        // Quality selection
        this.panel.querySelectorAll('input[name="quality"]').forEach(input => {
            input.addEventListener('change', (e) => {
                this.config.setQuality(e.target.value);
                this.particleSystem.applyQualitySettings(e.target.value);
            });
        });

        // Auto-adjust toggle
        this.panel.querySelector('#autoAdjust').addEventListener('change', (e) => {
            this.config.setAutoAdjust(e.target.checked);
        });

        // FPS threshold
        this.panel.querySelector('#fpsThreshold').addEventListener('change', (e) => {
            const value = parseInt(e.target.value);
            if (value >= 15 && value <= 60) {
                this.config.setFPSThreshold(value);
            }
        });

        // Update FPS display
        setInterval(() => {
            const fps = this.config.lastFps;
            if (fps) {
                this.fpsDisplay.textContent = fps.toFixed(1);
                this.fpsDisplay.style.color = fps < this.config.fpsThreshold ? '#ff4444' : '#44ff44';
            }
        }, 500);
    }
} 
class ClipRecorder {
    constructor(spectatorView) {
        this.spectatorView = spectatorView;
        this.isRecording = false;
        this.frames = [];
        this.recordingStart = null;
        this.clipSettings = {
            duration: 10000,
            frameRate: 30,
            quality: 10,
            width: 640,
            height: 360,
            startOffset: -5000, // Start 5 seconds before highlight
            speed: 1.0
        };
        this.editingFrames = [];
        this.setupGifEncoder();
    }

    setupGifEncoder() {
        this.updateGifEncoder();
    }

    updateGifEncoder() {
        this.gif = new GIF({
            workers: 2,
            quality: this.clipSettings.quality,
            width: this.clipSettings.width,
            height: this.clipSettings.height,
            workerScript: '/static/js/lib/gif.worker.js'
        });

        this.gif.on('finished', (blob) => {
            this.handleGifGenerated(blob);
        });
    }

    startRecording(timestamp) {
        this.isRecording = true;
        this.frames = [];
        this.recordingStart = timestamp + this.clipSettings.startOffset;
        
        this.captureCanvas = document.createElement('canvas');
        this.captureCanvas.width = this.clipSettings.width;
        this.captureCanvas.height = this.clipSettings.height;
        this.captureContext = this.captureCanvas.getContext('2d');

        this.recordInterval = setInterval(() => {
            this.captureFrame();
        }, 1000 / this.clipSettings.frameRate);

        setTimeout(() => {
            this.stopRecording();
        }, this.clipSettings.duration);
    }

    captureFrame() {
        if (!this.isRecording) return;

        // Get the game canvas
        const gameCanvas = document.querySelector('#gameCanvas');
        if (!gameCanvas) return;

        // Scale and draw the game canvas to our capture canvas
        this.captureContext.drawImage(
            gameCanvas, 
            0, 0, gameCanvas.width, gameCanvas.height,
            0, 0, this.captureCanvas.width, this.captureCanvas.height
        );

        // Add frame to our collection
        this.frames.push(this.captureCanvas.toDataURL('image/png'));
    }

    stopRecording() {
        this.isRecording = false;
        clearInterval(this.recordInterval);
        this.generateGif();
    }

    generateGif() {
        // Show loading indicator
        this.showLoadingIndicator();

        // Create temporary images from frames
        this.frames.forEach(frameData => {
            const image = new Image();
            image.src = frameData;
            image.onload = () => {
                this.gif.addFrame(image, { delay: 1000 / this.clipSettings.frameRate });
                
                // If this is the last frame, render the GIF
                if (this.gif.frames.length === this.frames.length) {
                    this.gif.render();
                }
            };
        });
    }

    handleGifGenerated(blob) {
        // Hide loading indicator
        this.hideLoadingIndicator();

        // Create object URL for the GIF
        const gifUrl = URL.createObjectURL(blob);
        
        // Show preview modal
        this.showPreviewModal(gifUrl);
    }

    showLoadingIndicator() {
        const loader = document.createElement('div');
        loader.className = 'gif-loading';
        loader.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="loading-text">Generating Highlight Clip...</div>
        `;
        document.body.appendChild(loader);
    }

    hideLoadingIndicator() {
        const loader = document.querySelector('.gif-loading');
        if (loader) loader.remove();
    }

    showPreviewModal(gifUrl) {
        const modal = document.createElement('div');
        modal.className = 'clip-preview-modal';
        modal.innerHTML = `
            <div class="clip-preview-content">
                <h3>Highlight Clip</h3>
                <img src="${gifUrl}" alt="Highlight Clip" class="clip-preview">
                <div class="clip-actions">
                    <button onclick="clipRecorder.downloadGif('${gifUrl}')">
                        Download GIF
                    </button>
                    <button onclick="clipRecorder.shareGif('${gifUrl}')">
                        Share
                    </button>
                    <button onclick="clipRecorder.closePreview()">
                        Close
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    downloadGif(gifUrl) {
        const a = document.createElement('a');
        a.href = gifUrl;
        a.download = `highlight_${Date.now()}.gif`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    shareGif(gifUrl) {
        // Upload to temporary storage or CDN
        this.uploadGif(gifUrl).then(publicUrl => {
            // Add GIF URL to highlight sharing
            const highlight = this.spectatorView.currentHighlight;
            this.spectatorView.commentary.shareHighlight(highlight, 'twitter', publicUrl);
        });
    }

    async uploadGif(gifUrl) {
        const formData = new FormData();
        const blob = await fetch(gifUrl).then(r => r.blob());
        formData.append('file', blob, 'highlight.gif');

        const response = await fetch('/api/upload/gif', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        return data.url;
    }

    closePreview() {
        const modal = document.querySelector('.clip-preview-modal');
        if (modal) modal.remove();
    }

    showClipEditor(frames) {
        const modal = document.createElement('div');
        modal.className = 'clip-editor-modal';
        modal.innerHTML = `
            <div class="clip-editor-content">
                <h3>Edit Highlight Clip</h3>
                <div class="preview-container">
                    <canvas id="previewCanvas"></canvas>
                    <div class="timeline">
                        <div class="timeline-frames">
                            ${frames.map((_, i) => `
                                <div class="frame-thumbnail" 
                                     data-index="${i}"
                                     onclick="clipRecorder.previewFrame(${i})">
                                </div>
                            `).join('')}
                        </div>
                        <div class="timeline-controls">
                            <input type="range" 
                                   min="0" 
                                   max="${frames.length - 1}" 
                                   value="0"
                                   oninput="clipRecorder.scrubTimeline(this.value)">
                        </div>
                    </div>
                </div>
                <div class="clip-settings">
                    <div class="setting-group">
                        <label>Clip Duration (seconds)</label>
                        <input type="range" 
                               min="5" max="30" 
                               value="${this.clipSettings.duration / 1000}"
                               oninput="clipRecorder.updateSetting('duration', this.value * 1000)">
                        <span class="setting-value">${this.clipSettings.duration / 1000}s</span>
                    </div>
                    <div class="setting-group">
                        <label>Frame Rate</label>
                        <input type="range" 
                               min="15" max="60" 
                               value="${this.clipSettings.frameRate}"
                               oninput="clipRecorder.updateSetting('frameRate', this.value)">
                        <span class="setting-value">${this.clipSettings.frameRate} fps</span>
                    </div>
                    <div class="setting-group">
                        <label>Quality</label>
                        <input type="range" 
                               min="1" max="20" 
                               value="${this.clipSettings.quality}"
                               oninput="clipRecorder.updateSetting('quality', this.value)">
                        <span class="setting-value">${this.clipSettings.quality}</span>
                    </div>
                    <div class="setting-group">
                        <label>Playback Speed</label>
                        <input type="range" 
                               min="0.25" max="2" step="0.25"
                               value="${this.clipSettings.speed}"
                               oninput="clipRecorder.updateSetting('speed', this.value)">
                        <span class="setting-value">${this.clipSettings.speed}x</span>
                    </div>
                    <div class="setting-group">
                        <label>Resolution</label>
                        <select onchange="clipRecorder.updateResolution(this.value)">
                            <option value="640,360" ${this.clipSettings.width === 640 ? 'selected' : ''}>640x360</option>
                            <option value="854,480" ${this.clipSettings.width === 854 ? 'selected' : ''}>854x480</option>
                            <option value="1280,720" ${this.clipSettings.width === 1280 ? 'selected' : ''}>1280x720</option>
                        </select>
                    </div>
                </div>
                <div class="trim-controls">
                    <button onclick="clipRecorder.setTrimStart()">Set Start</button>
                    <button onclick="clipRecorder.setTrimEnd()">Set End</button>
                    <button onclick="clipRecorder.resetTrim()">Reset Trim</button>
                </div>
                <div class="editor-actions">
                    <button onclick="clipRecorder.generateEditedGif()">Generate GIF</button>
                    <button onclick="clipRecorder.closeEditor()">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        this.editingFrames = [...frames];
        this.setupPreviewCanvas();
        this.generateThumbnails();
    }

    setupPreviewCanvas() {
        this.previewCanvas = document.getElementById('previewCanvas');
        this.previewCanvas.width = this.clipSettings.width;
        this.previewCanvas.height = this.clipSettings.height;
        this.previewContext = this.previewCanvas.getContext('2d');
    }

    generateThumbnails() {
        const thumbnails = document.querySelectorAll('.frame-thumbnail');
        thumbnails.forEach((thumb, i) => {
            const img = new Image();
            img.src = this.editingFrames[i];
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 60;
                canvas.height = 34;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, 60, 34);
                thumb.style.backgroundImage = `url(${canvas.toDataURL()})`;
            };
        });
    }

    updateSetting(setting, value) {
        this.clipSettings[setting] = parseFloat(value);
        document.querySelector(`[oninput="clipRecorder.updateSetting('${setting}', this.value)"] + .setting-value`)
            .textContent = setting === 'duration' ? `${value / 1000}s` : 
                          setting === 'speed' ? `${value}x` : value;
        
        if (setting === 'quality') {
            this.updateGifEncoder();
        }
    }

    updateResolution(value) {
        const [width, height] = value.split(',').map(Number);
        this.clipSettings.width = width;
        this.clipSettings.height = height;
        this.updateGifEncoder();
        this.setupPreviewCanvas();
    }

    previewFrame(index) {
        const img = new Image();
        img.src = this.editingFrames[index];
        img.onload = () => {
            this.previewContext.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
            this.previewContext.drawImage(img, 0, 0, this.previewCanvas.width, this.previewCanvas.height);
        };
    }

    scrubTimeline(value) {
        this.previewFrame(parseInt(value));
    }

    setTrimStart() {
        const currentFrame = parseInt(document.querySelector('.timeline-controls input').value);
        this.editingFrames = this.editingFrames.slice(currentFrame);
        this.generateThumbnails();
    }

    setTrimEnd() {
        const currentFrame = parseInt(document.querySelector('.timeline-controls input').value);
        this.editingFrames = this.editingFrames.slice(0, currentFrame + 1);
        this.generateThumbnails();
    }

    resetTrim() {
        this.editingFrames = [...this.frames];
        this.generateThumbnails();
    }

    generateEditedGif() {
        this.showLoadingIndicator();
        
        // Apply speed adjustment
        const frameDelay = (1000 / this.clipSettings.frameRate) / this.clipSettings.speed;
        
        // Process frames with current settings
        this.editingFrames.forEach(frameData => {
            const img = new Image();
            img.src = frameData;
            img.onload = () => {
                this.gif.addFrame(img, { delay: frameDelay });
                
                if (this.gif.frames.length === this.editingFrames.length) {
                    this.gif.render();
                }
            };
        });
    }

    closeEditor() {
        const modal = document.querySelector('.clip-editor-modal');
        if (modal) modal.remove();
    }
} 
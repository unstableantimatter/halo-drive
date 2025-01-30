class LoadingScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LoadingScene' });
    }

    preload() {
        // Create loading bar
        this.createLoadingBar();

        // Load all game assets
        this.loadShips();
        this.loadCourses();
        this.loadEffects();
        this.loadUI();

        // Loading progress events
        this.load.on('progress', this.updateLoadingBar, this);
        this.load.on('complete', this.loadComplete, this);
    }

    createLoadingBar() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 4, height / 2 - 30, width / 2, 50);

        const loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 50,
            text: 'Loading...',
            style: {
                font: '20px monospace',
                fill: '#ffffff'
            }
        });
        loadingText.setOrigin(0.5, 0.5);

        this.progressBar = progressBar;
        this.loadingText = loadingText;
    }

    loadShips() {
        // Load ship sprites and data
        Object.entries(GameConfig.SHIPS).forEach(([id, ship]) => {
            this.load.spritesheet(`ship_${id}`, 
                `/static/assets/ships/ship_${id}.png`,
                { frameWidth: 64, frameHeight: 64 }
            );
        });
    }

    loadCourses() {
        // Load course assets
        Object.entries(GameConfig.COURSES).forEach(([id, course]) => {
            this.load.image(`course_${id}_bg`, `/static/assets/courses/${id}/background.png`);
            this.load.json(`course_${id}_data`, `/static/assets/courses/${id}/data.json`);
        });

        // Load common course objects
        this.load.spritesheet('gravitational_bodies', 
            '/static/assets/courses/gravitational_bodies.png',
            { frameWidth: 128, frameHeight: 128 }
        );
    }

    loadEffects() {
        // Load particle effects
        this.load.atlas('particles', 
            '/static/assets/effects/particles.png',
            '/static/assets/effects/particles.json'
        );

        // Load sound effects
        this.load.audio('engine', '/static/assets/sounds/engine.mp3');
        this.load.audio('boost', '/static/assets/sounds/boost.mp3');
        this.load.audio('collision', '/static/assets/sounds/collision.mp3');
    }

    loadUI() {
        // Load UI elements
        this.load.atlas('ui_elements',
            '/static/assets/ui/elements.png',
            '/static/assets/ui/elements.json'
        );
        this.load.bitmapFont('race_font',
            '/static/assets/fonts/race_font.png',
            '/static/assets/fonts/race_font.xml'
        );
    }

    updateLoadingBar(value) {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        this.progressBar.clear();
        this.progressBar.fillStyle(0x4a90e2, 1);
        this.progressBar.fillRect(
            width / 4 + 10,
            height / 2 - 20,
            (width / 2 - 20) * value,
            30
        );

        const percent = Math.round(value * 100);
        this.loadingText.setText(`Loading... ${percent}%`);
    }

    loadComplete() {
        // Create animations
        this.createShipAnimations();
        this.createEffectAnimations();

        // Transition to menu scene
        this.scene.start('MenuScene');
    }

    createShipAnimations() {
        Object.entries(GameConfig.SHIPS).forEach(([id, ship]) => {
            this.anims.create({
                key: `ship_${id}_idle`,
                frames: this.anims.generateFrameNumbers(`ship_${id}`, { start: 0, end: 3 }),
                frameRate: 10,
                repeat: -1
            });
            this.anims.create({
                key: `ship_${id}_boost`,
                frames: this.anims.generateFrameNumbers(`ship_${id}`, { start: 4, end: 7 }),
                frameRate: 20,
                repeat: -1
            });
        });
    }

    createEffectAnimations() {
        // Create particle animations
        this.anims.create({
            key: 'engine_particles',
            frames: this.anims.generateFrameNames('particles', {
                prefix: 'engine_',
                start: 0,
                end: 5
            }),
            frameRate: 20,
            repeat: -1
        });

        this.anims.create({
            key: 'boost_particles',
            frames: this.anims.generateFrameNames('particles', {
                prefix: 'boost_',
                start: 0,
                end: 7
            }),
            frameRate: 30,
            repeat: -1
        });
    }
} 
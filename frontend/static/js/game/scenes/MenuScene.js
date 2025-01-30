class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
        this.selectedShip = null;
        this.selectedCourse = null;
        this.animations = null;
    }

    create() {
        this.animations = new AnimationManager(this);
        this.createBackground();
        this.createUI();
        this.setupEventListeners();
        this.animateMenuElements();
    }

    createBackground() {
        // Create animated space background
        this.starfield = this.add.tileSprite(0, 0, 
            this.cameras.main.width,
            this.cameras.main.height,
            'ui_elements', 'starfield'
        );
        this.starfield.setOrigin(0);
        
        // Add nebula effects
        this.nebula = this.add.sprite(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            'ui_elements', 'nebula'
        );
        this.nebula.setAlpha(0.3);
        
        // Add parallax effect
        this.tweens.add({
            targets: this.nebula,
            angle: 360,
            duration: 100000,
            repeat: -1
        });
    }

    createUI() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Create main menu container
        this.menuContainer = this.add.container(width / 2, height / 2);

        // Add game logo
        const logo = this.add.image(0, -200, 'ui_elements', 'logo');
        this.logo = logo;
        this.menuContainer.add(logo);

        // Create menu buttons
        this.createMenuButtons();
        
        // Create ship selection carousel
        this.createShipSelection();
        
        // Create course preview
        this.createCoursePreview();
        
        // Add player stats
        this.createPlayerStats();
    }

    createMenuButtons() {
        const buttonStyle = {
            fontSize: '24px',
            fontFamily: 'race_font',
            color: '#ffffff',
            backgroundColor: '#4a90e2',
            padding: { x: 20, y: 10 },
            fixedWidth: 300
        };

        const buttons = [
            { text: 'Single Player', callback: () => this.startSinglePlayer() },
            { text: 'Quick Match', callback: () => this.findMatch() },
            { text: 'Custom Game', callback: () => this.showCustomGame() },
            { text: 'Training', callback: () => this.startTraining() },
            { text: 'Options', callback: () => this.showOptions() }
        ];

        buttons.forEach((button, index) => {
            const y = index * 60;
            const buttonBg = this.add.rectangle(0, y, 300, 50, 0x4a90e2, 0.8)
                .setInteractive()
                .on('pointerover', () => {
                    buttonBg.setFillStyle(0x357abd);
                    this.sound.play('hover');
                })
                .on('pointerout', () => {
                    buttonBg.setFillStyle(0x4a90e2);
                })
                .on('pointerdown', button.callback);

            const text = this.add.text(0, y, button.text, buttonStyle)
                .setOrigin(0.5);

            this.menuContainer.add([buttonBg, text]);
        });
    }

    createShipSelection() {
        this.shipContainer = this.add.container(400, 0);
        
        // Create ship preview area
        const previewArea = this.add.rectangle(0, 0, 300, 200, 0x000000, 0.5);
        this.shipContainer.add(previewArea);

        // Add ships to carousel
        Object.entries(GameConfig.SHIPS).forEach(([id, ship], index) => {
            const shipSprite = this.add.sprite(index * 350, 0, `ship_${id}`)
                .setInteractive()
                .on('pointerdown', () => this.selectShip(id));
            
            const shipInfo = this.add.text(index * 350, 120, ship.name, {
                fontSize: '18px',
                color: '#ffffff'
            }).setOrigin(0.5);

            // Add ship stats
            const stats = this.createShipStats(ship, index * 350, 150);
            
            this.shipContainer.add([shipSprite, shipInfo, ...stats]);
        });

        this.menuContainer.add(this.shipContainer);
    }

    createShipStats(ship, x, y) {
        const stats = [
            { key: 'Speed', value: ship.max_speed },
            { key: 'Handling', value: ship.handling },
            { key: 'Fuel', value: ship.fuel_capacity }
        ];

        return stats.map((stat, index) => {
            const text = this.add.text(x, y + (index * 20), 
                `${stat.key}: ${stat.value}`, {
                    fontSize: '14px',
                    color: '#cccccc'
                }).setOrigin(0.5);
            return text;
        });
    }

    createCoursePreview() {
        this.courseContainer = this.add.container(-400, 0);
        
        Object.entries(GameConfig.COURSES).forEach(([id, course], index) => {
            const preview = this.add.image(0, index * 250, `course_${id}_bg`)
                .setScale(0.3)
                .setInteractive()
                .on('pointerdown', () => this.selectCourse(id));
            
            const info = this.createCourseInfo(course, 0, index * 250 + 100);
            
            this.courseContainer.add([preview, ...info]);
        });

        this.menuContainer.add(this.courseContainer);
    }

    createCourseInfo(course, x, y) {
        const info = [
            { key: 'Name', value: course.name },
            { key: 'Difficulty', value: '⭐'.repeat(course.difficulty) },
            { key: 'Length', value: `${course.length}m` }
        ];

        return info.map((item, index) => {
            const text = this.add.text(x, y + (index * 20),
                `${item.key}: ${item.value}`, {
                    fontSize: '14px',
                    color: '#ffffff'
                }).setOrigin(0.5);
            return text;
        });
    }

    createPlayerStats() {
        // Fetch player stats from backend
        fetch('/api/player/stats')
            .then(response => response.json())
            .then(stats => {
                const statsContainer = this.add.container(-400, -200);
                
                const statsBox = this.add.rectangle(0, 0, 250, 150, 0x000000, 0.7);
                const statsTitle = this.add.text(0, -60, 'Your Stats', {
                    fontSize: '20px',
                    color: '#ffffff'
                }).setOrigin(0.5);

                const statItems = [
                    { key: 'Races', value: stats.total_races },
                    { key: 'Wins', value: stats.wins },
                    { key: 'Best Time', value: this.formatTime(stats.best_time) },
                    { key: 'Rating', value: stats.rating }
                ];

                const statTexts = statItems.map((item, index) => {
                    return this.add.text(0, -30 + (index * 25),
                        `${item.key}: ${item.value}`, {
                            fontSize: '16px',
                            color: '#cccccc'
                        }).setOrigin(0.5);
                });

                statsContainer.add([statsBox, statsTitle, ...statTexts]);
                this.statsContainer = statsContainer;
                this.menuContainer.add(statsContainer);
            });
    }

    // Menu action handlers
    startSinglePlayer() {
        if (!this.selectedShip || !this.selectedCourse) {
            this.showError('Please select a ship and course');
            return;
        }

        fetch('/api/game/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                shipId: this.selectedShip,
                courseId: this.selectedCourse,
                aiOpponents: 3,
                aiDifficulty: 'Medium'
            })
        })
        .then(response => response.json())
        .then(session => {
            this.scene.start('RaceScene', { 
                sessionId: session.id,
                isMultiplayer: false
            });
        });
    }

    findMatch() {
        if (!this.selectedShip) {
            this.showError('Please select a ship first');
            return;
        }

        this.showMatchmaking();
        fetch('/api/matchmaking/queue', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                shipId: this.selectedShip
            })
        });
    }

    // Helper methods
    formatTime(ms) {
        if (!ms) return '--:--:---';
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const milliseconds = ms % 1000;
        return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    }

    showError(message) {
        const errorText = this.add.text(
            this.cameras.main.width / 2,
            this.cameras.main.height - 100,
            message,
            {
                fontSize: '20px',
                color: '#ff0000',
                backgroundColor: '#000000',
                padding: { x: 10, y: 5 }
            }
        ).setOrigin(0.5);

        this.time.delayedCall(3000, () => {
            errorText.destroy();
        });
    }

    update() {
        // Update starfield parallax
        this.starfield.tilePositionX += 0.5;
        this.starfield.tilePositionY += 0.2;
    }

    async animateMenuElements() {
        // Stagger the menu elements appearance
        const elements = [
            this.logo,
            this.menuContainer,
            this.shipContainer,
            this.courseContainer,
            this.statsContainer
        ];

        for (let i = 0; i < elements.length; i++) {
            await this.animations.transitionIn(
                elements[i], 
                i === 0 ? 'zoom' : 'slide',
                800
            );
            // Add space particles after each element
            if (i < elements.length - 1) {
                await this.scene.time.delayedCall(200);
            }
        }

        // Start background animations
        this.animateBackground();
    }

    animateBackground() {
        // Create floating particles
        this.animations.createSpaceParticles();

        // Animate nebula
        this.tweens.add({
            targets: this.nebula,
            angle: 360,
            duration: 100000,
            repeat: -1
        });

        // Add subtle pulse to stars
        this.time.addEvent({
            delay: 3000,
            callback: () => {
                const randomStar = Phaser.Math.RND.pick(this.starfield.list);
                this.animations.pulseElement(randomStar);
            },
            loop: true
        });
    }

    // Enhance existing methods with animations
    selectShip(id) {
        if (this.selectedShip === id) return;

        const shipSprite = this.shipContainer.list.find(
            item => item.texture && item.texture.key === `ship_${id}`
        );

        if (this.selectedShipSprite) {
            this.animations.transitionOut(this.selectedShipSprite, 'fade', 300);
        }

        this.selectedShip = id;
        this.selectedShipSprite = shipSprite;
        this.animations.pulseElement(shipSprite);
        
        // Create engine particles
        this.animations.createSpaceParticles(shipSprite);
    }

    async showMatchmaking() {
        // Transition out menu elements
        await Promise.all([
            this.animations.transitionOut(this.shipContainer, 'slide'),
            this.animations.transitionOut(this.courseContainer, 'slide'),
            this.animations.transitionOut(this.statsContainer, 'fade')
        ]);

        // Show matchmaking overlay with warp effect
        this.matchmakingOverlay = this.createMatchmakingOverlay();
        await this.animations.transitionIn(this.matchmakingOverlay, 'warp');
    }

    async startGame(sessionId, isMultiplayer) {
        // Capture current scene state
        await this.animations.sceneTransition(
            this,
            'RaceScene',
            AnimationManager.transitions.WARP
        );

        // Start race scene
        this.scene.start('RaceScene', { sessionId, isMultiplayer });
    }
} 
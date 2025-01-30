class HaloDriveGame {
    constructor() {
        this.config = {
            type: Phaser.AUTO,
            width: window.innerWidth,
            height: window.innerHeight,
            physics: {
                default: 'matter',
                matter: {
                    gravity: { y: 0 },
                    debug: process.env.NODE_ENV === 'development'
                }
            },
            scene: [LoadingScene, MenuScene, RaceScene],
            backgroundColor: '#000000'
        };
        
        this.game = new Phaser.Game(this.config);
        this.network = null;
        
        // Handle window resizing
        window.addEventListener('resize', () => {
            this.game.scale.resize(window.innerWidth, window.innerHeight);
        });
    }

    initNetwork(gameId) {
        this.network = new GameNetwork(gameId);
    }
} 
class SpectatorView {
    constructor(gameId) {
        this.gameId = gameId;
        this.network = new GameNetwork(gameId);
        this.trackedPlayer = null;
        this.camera = {
            x: 0,
            y: 0,
            zoom: 1,
            following: null
        };
        this.raceStats = new Map(); // Player stats during race
        this.replayData = []; // Store race data for replay
        this.highlights = [];
        this.reactions = new Map(); // timestamp -> [{emoji, count, users}]
        this.highlightDetectors = this.setupHighlightDetectors();
        this.setupControls();
        this.setupReactionHandlers();
        this.clipRecorder = new ClipRecorder(this);
    }

    setupControls() {
        // Camera Controls
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowLeft':
                    this.camera.x -= 10 / this.camera.zoom;
                    break;
                case 'ArrowRight':
                    this.camera.x += 10 / this.camera.zoom;
                    break;
                case 'ArrowUp':
                    this.camera.y -= 10 / this.camera.zoom;
                    break;
                case 'ArrowDown':
                    this.camera.y += 10 / this.camera.zoom;
                    break;
                case '+':
                    this.camera.zoom = Math.min(this.camera.zoom * 1.1, 3);
                    break;
                case '-':
                    this.camera.zoom = Math.max(this.camera.zoom * 0.9, 0.5);
                    break;
            }
            this.updateCamera();
        });

        // Mouse wheel zoom
        document.addEventListener('wheel', (e) => {
            if (e.deltaY < 0) {
                this.camera.zoom = Math.min(this.camera.zoom * 1.1, 3);
            } else {
                this.camera.zoom = Math.max(this.camera.zoom * 0.9, 0.5);
            }
            this.updateCamera();
        });
    }

    trackPlayer(playerId) {
        this.trackedPlayer = playerId;
        this.camera.following = playerId;
        this.updateSpectatorUI();
    }

    updateCamera() {
        if (this.camera.following) {
            const player = this.network.players.get(this.camera.following);
            if (player) {
                this.camera.x = player.position.x;
                this.camera.y = player.position.y;
            }
        }

        game.cameras.main.setZoom(this.camera.zoom);
        game.cameras.main.centerOn(this.camera.x, this.camera.y);
    }

    updateSpectatorUI() {
        const spectatorUI = document.getElementById('spectator-ui');
        if (!spectatorUI) return;

        spectatorUI.innerHTML = `
            <div class="spectator-controls">
                <div class="camera-controls">
                    <button onclick="spectatorView.resetCamera()">Reset Camera</button>
                    <div class="zoom-controls">
                        <button onclick="spectatorView.zoomIn()">+</button>
                        <button onclick="spectatorView.zoomOut()">-</button>
                    </div>
                </div>
                
                <div class="player-list">
                    <h3>Players</h3>
                    ${Array.from(this.network.players.values()).map(player => `
                        <div class="player-entry ${this.trackedPlayer === player.id ? 'active' : ''}"
                             onclick="spectatorView.trackPlayer('${player.id}')">
                            <span class="player-name">${player.username}</span>
                            <span class="player-position">P${player.position || '-'}</span>
                            <div class="player-stats">
                                <span>Speed: ${Math.round(player.velocity.length())}</span>
                                <span>Fuel: ${Math.round(player.fuel)}%</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="race-stats">
                    <h3>Race Statistics</h3>
                    <div class="stats-grid">
                        ${this.getRaceStats()}
                    </div>
                </div>
                
                <div class="replay-controls">
                    <button onclick="spectatorView.toggleReplay()">
                        ${this.isReplaying ? 'Live' : 'Replay'}
                    </button>
                    ${this.isReplaying ? `
                        <input type="range" 
                               min="0" 
                               max="${this.replayData.length - 1}"
                               value="${this.replayIndex}"
                               onchange="spectatorView.seekReplay(this.value)">
                    ` : ''}
                </div>
            </div>
        `;
    }

    getRaceStats() {
        const stats = [];
        for (const [playerId, playerStats] of this.raceStats) {
            const player = this.network.players.get(playerId);
            if (!player) continue;

            stats.push(`
                <div class="player-race-stats">
                    <h4>${player.username}</h4>
                    <div>Best Lap: ${this.formatTime(playerStats.bestLap)}</div>
                    <div>Last Lap: ${this.formatTime(playerStats.lastLap)}</div>
                    <div>Fuel Efficiency: ${playerStats.fuelEfficiency.toFixed(2)}</div>
                    <div>Top Speed: ${Math.round(playerStats.topSpeed)}</div>
                </div>
            `);
        }
        return stats.join('');
    }

    formatTime(ms) {
        if (!ms) return '--:--:---';
        const minutes = Math.floor(ms / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const milliseconds = ms % 1000;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${milliseconds.toString().padStart(3, '0')}`;
    }

    // Replay functionality
    startRecording() {
        this.recordingInterval = setInterval(() => {
            this.replayData.push({
                timestamp: Date.now(),
                players: Array.from(this.network.players.values()).map(player => ({
                    id: player.id,
                    position: { ...player.position },
                    velocity: { ...player.velocity },
                    fuel: player.fuel,
                    stats: this.raceStats.get(player.id)
                }))
            });
        }, 50); // Record at 20fps
    }

    toggleReplay() {
        this.isReplaying = !this.isReplaying;
        if (this.isReplaying) {
            this.replayIndex = 0;
            this.playReplay();
        } else {
            this.stopReplay();
        }
        this.updateSpectatorUI();
    }

    playReplay() {
        this.replayInterval = setInterval(() => {
            if (this.replayIndex >= this.replayData.length - 1) {
                this.toggleReplay();
                return;
            }
            this.replayIndex++;
            this.updateReplayFrame();
        }, 50);
    }

    seekReplay(index) {
        this.replayIndex = parseInt(index);
        this.updateReplayFrame();
    }

    updateReplayFrame() {
        const frame = this.replayData[this.replayIndex];
        frame.players.forEach(playerData => {
            const player = this.network.players.get(playerData.id);
            if (player) {
                player.position = playerData.position;
                player.velocity = playerData.velocity;
                player.fuel = playerData.fuel;
                this.raceStats.set(player.id, playerData.stats);
            }
        });
        this.updateCamera();
        this.updateSpectatorUI();
    }

    stopReplay() {
        clearInterval(this.replayInterval);
        this.network.reconnect(); // Reconnect to get live data
    }

    setupHighlightDetectors() {
        return {
            collision: (frame) => {
                // Detect player collisions or near-misses
                const players = frame.players;
                for (let i = 0; i < players.length; i++) {
                    for (let j = i + 1; j < players.length; j++) {
                        const dist = this.getDistance(players[i].position, players[j].position);
                        if (dist < 50) { // Close proximity threshold
                            return {
                                type: 'near_miss',
                                players: [players[i].id, players[j].id],
                                position: players[i].position
                            };
                        }
                    }
                }
            },
            overtake: (frame, prevFrame) => {
                if (!prevFrame) return null;
                // Detect position changes
                const positionChanges = frame.players.filter(player => {
                    const prevPlayer = prevFrame.players.find(p => p.id === player.id);
                    return prevPlayer && player.position !== prevPlayer.position;
                });
                if (positionChanges.length > 0) {
                    return {
                        type: 'overtake',
                        players: positionChanges.map(p => p.id),
                        position: positionChanges[0].position
                    };
                }
            },
            speedRecord: (frame) => {
                // Detect new speed records
                const speedRecords = frame.players.filter(player => {
                    const speed = Math.sqrt(
                        player.velocity.x * player.velocity.x + 
                        player.velocity.y * player.velocity.y
                    );
                    const stats = this.raceStats.get(player.id);
                    return stats && speed > stats.topSpeed;
                });
                if (speedRecords.length > 0) {
                    return {
                        type: 'speed_record',
                        players: speedRecords.map(p => p.id),
                        position: speedRecords[0].position
                    };
                }
            },
            fuelCritical: (frame) => {
                // Detect critically low fuel situations
                const lowFuel = frame.players.filter(player => player.fuel < 20);
                if (lowFuel.length > 0) {
                    return {
                        type: 'low_fuel',
                        players: lowFuel.map(p => p.id),
                        position: lowFuel[0].position
                    };
                }
            },
            gravitySlingshot: (frame, prevFrame) => {
                // Detect successful gravity assist maneuvers
                if (!prevFrame) return null;
                const slingshots = frame.players.filter(player => {
                    const prevPlayer = prevFrame.players.find(p => p.id === player.id);
                    if (!prevPlayer) return false;
                    
                    const speedBefore = Math.sqrt(
                        prevPlayer.velocity.x * prevPlayer.velocity.x +
                        prevPlayer.velocity.y * prevPlayer.velocity.y
                    );
                    const speedAfter = Math.sqrt(
                        player.velocity.x * player.velocity.x +
                        player.velocity.y * player.velocity.y
                    );
                    
                    return speedAfter > speedBefore * 1.5; // 50% speed increase
                });
                
                if (slingshots.length > 0) {
                    return {
                        type: 'gravity_slingshot',
                        players: slingshots.map(p => p.id),
                        position: slingshots[0].position
                    };
                }
            },
            perfectLine: (frame, prevFrame) => {
                // Detect optimal racing line through checkpoints
                const perfectLinePlayers = frame.players.filter(player => {
                    const checkpoint = this.getNextCheckpoint(player.position);
                    const angle = this.getApproachAngle(player.position, player.velocity, checkpoint);
                    return Math.abs(angle) < 0.1; // Nearly perfect approach angle
                });
                
                if (perfectLinePlayers.length > 0) {
                    return {
                        type: 'perfect_line',
                        players: perfectLinePlayers.map(p => p.id),
                        position: perfectLinePlayers[0].position
                    };
                }
            },
            fuelSave: (frame) => {
                // Detect efficient fuel management
                const efficientPlayers = frame.players.filter(player => {
                    const stats = this.raceStats.get(player.id);
                    return stats && player.fuel > stats.expectedFuel + 20; // 20% more fuel than expected
                });
                
                if (efficientPlayers.length > 0) {
                    return {
                        type: 'fuel_save',
                        players: efficientPlayers.map(p => p.id),
                        position: efficientPlayers[0].position
                    };
                }
            },
            comeback: (frame, prevFrame) => {
                // Detect significant position improvements
                if (!prevFrame) return null;
                const comebacks = frame.players.filter(player => {
                    const prevPlayer = prevFrame.players.find(p => p.id === player.id);
                    return prevPlayer && 
                           (prevPlayer.position - player.position) >= 2; // Gained 2+ positions
                });
                
                if (comebacks.length > 0) {
                    return {
                        type: 'comeback',
                        players: comebacks.map(p => p.id),
                        position: comebacks[0].position
                    };
                }
            }
        };
    }

    setupReactionHandlers() {
        this.socket.on('reaction_added', (data) => {
            this.addReaction(data.timestamp, data.emoji, data.userId);
            this.updateReactionsUI();
        });
    }

    detectHighlights(frame) {
        const prevFrame = this.replayData[this.replayData.length - 2];
        
        for (const [name, detector] of Object.entries(this.highlightDetectors)) {
            const highlight = detector(frame, prevFrame);
            if (highlight) {
                this.addHighlight(highlight);
            }
        }
    }

    addHighlight(highlight) {
        const timestamp = Date.now();
        this.highlights.push({
            ...highlight,
            timestamp,
            reactions: new Map()
        });
        this.updateHighlightsUI();
        
        // Auto-scroll to highlight if in replay mode
        if (this.isReplaying) {
            this.seekReplay(this.replayData.findIndex(frame => 
                frame.timestamp >= timestamp
            ));
        }
        
        // Start recording clip
        this.clipRecorder.startRecording(highlight.timestamp);
    }

    addReaction(timestamp, emoji, userId) {
        const reactions = this.reactions.get(timestamp) || new Map();
        const reaction = reactions.get(emoji) || { count: 0, users: new Set() };
        
        if (!reaction.users.has(userId)) {
            reaction.count++;
            reaction.users.add(userId);
            reactions.set(emoji, reaction);
            this.reactions.set(timestamp, reactions);
        }
    }

    sendReaction(timestamp, emoji) {
        this.socket.emit('add_reaction', {
            timestamp,
            emoji,
            gameId: this.gameId
        });
    }

    updateHighlightsUI() {
        const highlightsContainer = document.getElementById('highlights-container');
        if (!highlightsContainer) return;

        highlightsContainer.innerHTML = `
            <div class="highlights-list">
                ${this.highlights.map(highlight => `
                    <div class="highlight-entry" onclick="spectatorView.seekToHighlight(${highlight.timestamp})">
                        <div class="highlight-info">
                            <span class="highlight-type">${this.getHighlightIcon(highlight.type)}</span>
                            <span class="highlight-time">${this.formatTime(highlight.timestamp)}</span>
                            <span class="highlight-players">
                                ${highlight.players.map(id => 
                                    this.network.players.get(id)?.username
                                ).join(' vs ')}
                            </span>
                        </div>
                        <div class="highlight-reactions">
                            ${this.renderReactions(highlight.timestamp)}
                        </div>
                        <div class="reaction-buttons">
                            ${this.renderReactionButtons(highlight.timestamp)}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    getHighlightIcon(type) {
        const icons = {
            near_miss: '💥',
            overtake: '🏎️',
            speed_record: '⚡',
            low_fuel: '⛽',
            gravity_slingshot: '🌌',
            perfect_line: '🎯',
            fuel_save: '♻️',
            comeback: '🚀'
        };
        return icons[type] || '🎯';
    }

    renderReactions(timestamp) {
        const reactions = this.reactions.get(timestamp);
        if (!reactions) return '';

        return Array.from(reactions.entries()).map(([emoji, data]) => `
            <div class="reaction-bubble">
                <span class="emoji">${emoji}</span>
                <span class="count">${data.count}</span>
            </div>
        `).join('');
    }

    renderReactionButtons(timestamp) {
        const emojis = ['👏', '🔥', '😮', '🎉', '💪', '🏆'];
        return emojis.map(emoji => `
            <button class="reaction-button" 
                    onclick="spectatorView.sendReaction(${timestamp}, '${emoji}')">
                ${emoji}
            </button>
        `).join('');
    }

    seekToHighlight(timestamp) {
        const frameIndex = this.replayData.findIndex(frame => 
            frame.timestamp >= timestamp
        );
        if (frameIndex !== -1) {
            this.seekReplay(frameIndex);
        }
    }

    shareHighlight(highlight, platform, gifUrl = null) {
        const description = this.generateHighlightDescription(highlight);
        const gameUrl = `${window.location.origin}/game/${this.gameId}?t=${highlight.timestamp}`;
        
        // Add GIF URL to description if available
        const shareText = gifUrl ? `${description}\n${gifUrl}` : description;
        
        const shareUrls = {
            twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(gameUrl)}`,
            // ... rest of sharing URLs ...
        };
        // ... rest of method ...
    }
} 
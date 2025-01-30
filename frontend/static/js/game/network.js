class GameNetwork {
    constructor(gameId) {
        this.socket = io();
        this.gameId = gameId;
        this.gameState = {};
        this.players = new Map();
        this.setupSocketHandlers();
    }

    setupSocketHandlers() {
        // Connection handlers
        this.socket.on('connect', () => {
            console.log('Connected to game server');
            this.joinGame();
        });

        // Game state handlers
        this.socket.on('game_state', (state) => {
            this.updateGameState(state);
        });

        this.socket.on('player_update', (data) => {
            this.updatePlayerState(data);
        });

        this.socket.on('player_joined', (data) => {
            this.addPlayer(data);
        });

        this.socket.on('player_left', (data) => {
            this.removePlayer(data.user_id);
        });

        this.socket.on('race_start', (data) => {
            this.handleRaceStart(data);
        });

        this.socket.on('player_finished', (data) => {
            this.handlePlayerFinish(data);
        });

        // Party handlers
        this.socket.on('party_updated', (data) => {
            this.updatePartyUI(data);
        });
    }

    joinGame() {
        this.socket.emit('join_game', {
            session_id: this.gameId
        });
    }

    sendPosition(position, velocity, fuel) {
        this.socket.emit('game_update', {
            session_id: this.gameId,
            position: position,
            velocity: velocity,
            fuel: fuel
        });
    }

    finishRace(completionTime, fuelRemaining) {
        this.socket.emit('race_finished', {
            session_id: this.gameId,
            completion_time: completionTime,
            fuel_remaining: fuelRemaining
        });
    }

    updateGameState(state) {
        this.gameState = state;
        // Update game UI and physics
        game.updateFromState(state);
    }

    updatePlayerState(data) {
        if (this.players.has(data.user_id)) {
            const player = this.players.get(data.user_id);
            player.position = data.position;
            player.velocity = data.velocity;
            player.fuel = data.fuel;
            // Update player sprite/position
            game.updatePlayerPosition(data.user_id, data.position, data.velocity);
        }
    }
}

// Party management
class PartyManager {
    constructor() {
        this.socket = io();
        this.partyId = null;
        this.members = new Set();
        this.chatHistory = [];
        this.isSpectating = false;
        this.setupHandlers();
    }

    setupHandlers() {
        this.socket.on('party_updated', (data) => {
            this.updatePartyUI(data);
        });

        this.socket.on('party_message', (data) => {
            this.addChatMessage(data);
        });

        this.socket.on('party_kicked', () => {
            this.handleKicked();
        });
    }

    createParty() {
        fetch('/api/party/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            this.partyId = data.party_id;
            this.updatePartyUI(data);
        });
    }

    invitePlayer(username) {
        fetch('/api/party/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                party_id: this.partyId,
                username: username
            })
        });
    }

    updatePartyUI(partyData) {
        const partyContainer = document.getElementById('party-container');
        if (!partyContainer) return;

        if (!partyData) {
            partyContainer.innerHTML = `
                <button onclick="partyManager.createParty()">Create Party</button>
            `;
            return;
        }

        partyContainer.innerHTML = `
            <div class="party-header">
                <h3>Party Members</h3>
                ${this.isPartyLeader() ? `
                    <button onclick="partyManager.invitePlayer()">Invite Player</button>
                ` : ''}
                <button onclick="partyManager.leaveParty()">Leave Party</button>
            </div>
            
            <div class="party-members">
                ${partyData.members.map(member => `
                    <div class="party-member">
                        <span>${member.username}</span>
                        <span class="ship-selection">
                            ${this.renderShipSelector(member)}
                        </span>
                        <span class="ready-status">
                            ${member.ready ? '✓' : ''}
                        </span>
                        ${this.isPartyLeader() && member.user_id !== currentUser.id ? `
                            <button onclick="partyManager.kickMember('${member.user_id}')">
                                Kick
                            </button>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
            
            <div class="party-chat">
                <div class="chat-messages" id="chat-messages">
                    ${this.chatHistory.map(msg => this.renderChatMessage(msg)).join('')}
                </div>
                <div class="chat-input">
                    <input type="text" id="chat-input" placeholder="Type a message...">
                    <button onclick="partyManager.sendChatMessage()">Send</button>
                </div>
            </div>
            
            <div class="spectators">
                <h4>Spectators</h4>
                ${partyData.spectators.map(spec => `
                    <div class="spectator">${spec.username}</div>
                `).join('')}
            </div>
            
            ${this.isPartyLeader() ? `
                <button onclick="partyManager.startSearch()" 
                        ${this.canStartSearch() ? '' : 'disabled'}>
                    Start Search
                </button>
            ` : ''}
        `;
    }

    renderShipSelector(member) {
        if (member.user_id !== currentUser.id && !this.isPartyLeader()) {
            return `<span>Ship: ${member.ship_id || 'Not Selected'}</span>`;
        }

        return `
            <select onchange="updateShipSelection(event, '${member.user_id}')">
                ${Object.entries(SHIPS).map(([id, ship]) => `
                    <option value="${id}" ${member.ship_id === id ? 'selected' : ''}>
                        ${ship.name}
                    </option>
                `).join('')}
            </select>
        `;
    }

    sendMessage(message) {
        this.socket.emit('party_message', {
            party_id: this.partyId,
            message: message
        });
    }

    kickMember(userId) {
        this.socket.emit('party_action', {
            action: 'kick',
            party_id: this.partyId,
            target_id: userId
        });
    }

    leaveParty() {
        this.socket.emit('party_action', {
            action: 'leave',
            party_id: this.partyId
        });
        this.partyId = null;
        this.members.clear();
        this.updatePartyUI(null);
    }

    toggleSpectate() {
        this.isSpectating = !this.isSpectating;
        this.socket.emit('party_action', {
            action: 'spectate',
            party_id: this.partyId
        });
    }

    addChatMessage(data) {
        this.chatHistory.push(data);
        this.updateChatUI();
    }

    updateChatUI() {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        chatMessages.innerHTML = this.chatHistory.map(msg => this.renderChatMessage(msg)).join('');
    }

    renderChatMessage(msg) {
        const user = this.members.get(msg.user_id) || { username: 'Unknown' };
        return `
            <div class="chat-message">
                <span class="timestamp">${new Date(msg.timestamp).toLocaleTimeString()}</span>
                <span class="username">${user.username}:</span>
                <span class="message">${this.escapeHtml(msg.message)}</span>
            </div>
        `;
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    sendChatMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        if (message) {
            this.sendMessage(message);
            input.value = '';
        }
    }

    handleKicked() {
        alert('You have been kicked from the party');
        this.partyId = null;
        this.members.clear();
        this.updatePartyUI(null);
    }

    canStartSearch() {
        return Array.from(this.members.values()).every(member => member.ready);
    }
} 
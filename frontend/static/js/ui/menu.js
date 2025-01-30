// Game state management
let selectedShip = null;
let selectedCourse = null;
let gameSettings = {
    aiOpponents: 3,
    aiDifficulty: 'Medium',
    laps: 3
};

// Modal Management
const customGameModal = document.getElementById('customGameModal');

function showCustomGame() {
    customGameModal.style.display = 'block';
    // Reset selections
    selectedShip = null;
    selectedCourse = document.getElementById('courseSelect').value;
    updateSelectionUI();
}

function closeCustomGame() {
    customGameModal.style.display = 'none';
}

// Ship Selection
function selectShip(shipId) {
    selectedShip = shipId;
    updateSelectionUI();
    
    // Update all ship options to show selection
    document.querySelectorAll('.ship-option').forEach(ship => {
        ship.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
}

function updateSelectionUI() {
    const startButton = document.querySelector('.modal-buttons .primary');
    startButton.disabled = !(selectedShip && selectedCourse);
}

// Game Initialization Functions
async function startSinglePlayer() {
    showCustomGame();
}

async function findMatch() {
    try {
        const response = await fetch('/api/matchmaking/queue', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showMatchmakingStatus();
        }
    } catch (error) {
        showError('Failed to join matchmaking queue');
    }
}

async function startCustomGame() {
    if (!selectedShip || !selectedCourse) {
        showError('Please select both a ship and a course');
        return;
    }

    const settings = {
        shipId: selectedShip,
        courseId: selectedCourse,
        aiOpponents: parseInt(document.querySelector('input[type="number"][min="0"]').value),
        aiDifficulty: document.querySelector('select').value,
        laps: parseInt(document.querySelector('input[type="number"][min="1"]').value)
    };

    try {
        const response = await fetch('/api/game/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });

        if (response.ok) {
            const gameSession = await response.json();
            window.location.href = `/game/race/${gameSession.id}`;
        }
    } catch (error) {
        showError('Failed to create game session');
    }
}

// Lobby Browser
async function showLobbyBrowser() {
    try {
        const response = await fetch('/api/lobbies');
        const lobbies = await response.json();
        showLobbiesModal(lobbies);
    } catch (error) {
        showError('Failed to fetch lobbies');
    }
}

// Training Modes
function startTutorial() {
    window.location.href = '/game/tutorial';
}

async function showTimeTrials() {
    try {
        const response = await fetch('/api/timetrials/records');
        const records = await response.json();
        showTimeTrialsModal(records);
    } catch (error) {
        showError('Failed to load time trials');
    }
}

// Matchmaking Status UI
let matchmakingInterval;

function showMatchmakingStatus() {
    const statusModal = document.createElement('div');
    statusModal.className = 'modal matchmaking-modal';
    statusModal.innerHTML = `
        <div class="modal-content">
            <h2>Finding Match</h2>
            <div class="searching-animation">
                <div class="pulse"></div>
            </div>
            <div class="player-count">Players Found: <span id="playerCount">1</span>/4</div>
            <div class="estimated-time">Estimated Wait: <span id="waitTime">30</span>s</div>
            <button onclick="cancelMatchmaking()" class="cancel-button">Cancel</button>
        </div>
    `;
    document.body.appendChild(statusModal);
    statusModal.style.display = 'block';

    // Start polling for matchmaking status
    matchmakingInterval = setInterval(updateMatchmakingStatus, 2000);
}

async function updateMatchmakingStatus() {
    try {
        const response = await fetch('/api/matchmaking/status');
        const status = await response.json();
        
        document.getElementById('playerCount').textContent = status.playersFound;
        document.getElementById('waitTime').textContent = status.estimatedWait;

        if (status.matchReady) {
            clearInterval(matchmakingInterval);
            window.location.href = `/game/race/${status.gameId}`;
        }
    } catch (error) {
        console.error('Failed to update matchmaking status:', error);
    }
}

async function cancelMatchmaking() {
    try {
        await fetch('/api/matchmaking/cancel', { method: 'POST' });
        clearInterval(matchmakingInterval);
        document.querySelector('.matchmaking-modal').remove();
    } catch (error) {
        showError('Failed to cancel matchmaking');
    }
}

// UI Helpers
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Close modal when clicking outside
    window.onclick = (event) => {
        if (event.target === customGameModal) {
            closeCustomGame();
        }
    };

    // Update game settings when changed
    document.querySelectorAll('.settings-form input, .settings-form select').forEach(input => {
        input.addEventListener('change', (e) => {
            const setting = e.target.getAttribute('name');
            if (setting) {
                gameSettings[setting] = e.target.value;
            }
        });
    });

    // Initialize tooltips
    const shipOptions = document.querySelectorAll('.ship-option');
    shipOptions.forEach(ship => {
        ship.addEventListener('mouseover', showShipDetails);
        ship.addEventListener('mouseout', hideShipDetails);
    });
});

// Ship Details Tooltip
function showShipDetails(event) {
    const ship = event.currentTarget;
    const stats = ship.querySelector('.ship-stats').textContent;
    
    const tooltip = document.createElement('div');
    tooltip.className = 'ship-tooltip';
    tooltip.innerHTML = `
        <div class="tooltip-content">
            <h4>${ship.querySelector('h4').textContent}</h4>
            <div class="detailed-stats">${stats}</div>
        </div>
    `;
    
    ship.appendChild(tooltip);
}

function hideShipDetails(event) {
    const tooltip = event.currentTarget.querySelector('.ship-tooltip');
    if (tooltip) {
        tooltip.remove();
    }
} 
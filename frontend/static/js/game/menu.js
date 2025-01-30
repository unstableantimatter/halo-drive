class GameMenu {
    constructor() {
        this.selectedShip = null;
        this.selectedCourse = null;
        this.ships = [];
        this.courses = [];
        this.socket = io();
        
        this.initializeUI();
        this.loadContent();
        this.setupEventListeners();
    }
    
    async initializeUI() {
        this.shipCarousel = document.getElementById('shipCarousel');
        this.shipStats = document.getElementById('shipStats');
        this.courseGrid = document.getElementById('courseGrid');
        this.playerStats = document.getElementById('playerStats');
        
        // Initialize buttons
        this.quickMatchBtn = document.getElementById('quickMatch');
        this.practiceBtn = document.getElementById('practice');
        this.timeTrialsBtn = document.getElementById('timeTrials');
    }
    
    async loadContent() {
        try {
            // Load ships
            const shipsResponse = await fetch('/api/ships');
            this.ships = await shipsResponse.json();
            this.renderShips();
            
            // Load courses
            const coursesResponse = await fetch('/api/courses');
            this.courses = await coursesResponse.json();
            this.renderCourses();
            
            // Load player stats
            const leaderboardResponse = await fetch('/api/leaderboard');
            const leaderboard = await leaderboardResponse.json();
            this.renderPlayerStats(leaderboard);
        } catch (error) {
            console.error('Error loading content:', error);
            this.showError('Failed to load content. Please try again.');
        }
    }
    
    renderShips() {
        this.shipCarousel.innerHTML = this.ships.map((ship, index) => `
            <div class="ship-card ${index === 0 ? 'selected' : ''}" data-ship-id="${ship.id}">
                <img src="/static/assets/ships/${ship.sprite_key}.png" alt="${ship.name}">
                <h3>${ship.name}</h3>
            </div>
        `).join('');
        
        if (this.ships.length > 0) {
            this.selectShip(this.ships[0].id);
        }
    }
    
    renderCourses() {
        this.courseGrid.innerHTML = this.courses.map(course => `
            <div class="course-card" data-course-id="${course.id}">
                <img src="/static/assets/courses/${course.thumbnail_key}.png" alt="${course.name}">
                <div class="course-info">
                    <h3>${course.name}</h3>
                    <p class="difficulty ${course.difficulty}">${course.difficulty}</p>
                    <p class="par-time">Par Time: ${this.formatTime(course.par_time)}</p>
                </div>
            </div>
        `).join('');
    }
    
    renderPlayerStats(leaderboard) {
        const playerEntry = leaderboard.find(entry => entry.isCurrentUser);
        if (playerEntry) {
            this.playerStats.innerHTML = `
                <div class="stat-group">
                    <div class="stat">
                        <label>Rating</label>
                        <span>${playerEntry.rating}</span>
                    </div>
                    <div class="stat">
                        <label>Rank</label>
                        <span>#${playerEntry.rank}</span>
                    </div>
                    <div class="stat">
                        <label>Wins</label>
                        <span>${playerEntry.wins}</span>
                    </div>
                    <div class="stat">
                        <label>Races</label>
                        <span>${playerEntry.total_races}</span>
                    </div>
                </div>
            `;
        }
    }
    
    setupEventListeners() {
        // Ship selection
        this.shipCarousel.addEventListener('click', (e) => {
            const shipCard = e.target.closest('.ship-card');
            if (shipCard) {
                const shipId = shipCard.dataset.shipId;
                this.selectShip(shipId);
            }
        });
        
        // Course selection
        this.courseGrid.addEventListener('click', (e) => {
            const courseCard = e.target.closest('.course-card');
            if (courseCard) {
                const courseId = courseCard.dataset.courseId;
                this.selectCourse(courseId);
            }
        });
        
        // Game mode buttons
        this.quickMatchBtn.addEventListener('click', () => this.startQuickMatch());
        this.practiceBtn.addEventListener('click', () => this.startPractice());
        this.timeTrialsBtn.addEventListener('click', () => this.startTimeTrials());
        
        // Socket events
        this.socket.on('match_found', (data) => this.handleMatchFound(data));
    }
    
    selectShip(shipId) {
        this.selectedShip = shipId;
        const ship = this.ships.find(s => s.id === parseInt(shipId));
        
        // Update UI
        document.querySelectorAll('.ship-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.shipId === shipId);
        });
        
        // Update stats display
        if (ship) {
            this.shipStats.innerHTML = `
                <div class="stat-bars">
                    <div class="stat-bar">
                        <label>Speed</label>
                        <div class="bar"><div style="width: ${ship.stats.max_speed}%"></div></div>
                    </div>
                    <div class="stat-bar">
                        <label>Handling</label>
                        <div class="bar"><div style="width: ${ship.stats.handling}%"></div></div>
                    </div>
                    <div class="stat-bar">
                        <label>Shield</label>
                        <div class="bar"><div style="width: ${ship.stats.shield_strength}%"></div></div>
                    </div>
                    <div class="stat-bar">
                        <label>Boost</label>
                        <div class="bar"><div style="width: ${ship.stats.boost_capacity}%"></div></div>
                    </div>
                </div>
                <p class="ship-description">${ship.description}</p>
            `;
        }
    }
    
    selectCourse(courseId) {
        this.selectedCourse = courseId;
        document.querySelectorAll('.course-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.courseId === courseId);
        });
    }
    
    startQuickMatch() {
        if (!this.selectedShip || !this.selectedCourse) {
            this.showError('Please select both a ship and a course');
            return;
        }
        
        this.socket.emit('join_matchmaking', {
            ship_id: this.selectedShip,
            course_id: this.selectedCourse
        });
        
        this.showMatchmaking();
    }
    
    handleMatchFound(data) {
        window.location.href = `/game?session=${data.session_id}`;
    }
    
    // Utility methods
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = (seconds % 60).toFixed(3);
        return `${minutes}:${remainingSeconds.padStart(6, '0')}`;
    }
    
    showError(message) {
        // Implement error display
        console.error(message);
    }
    
    showMatchmaking() {
        // Implement matchmaking UI
    }
}

// Initialize menu when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.gameMenu = new GameMenu();
}); 
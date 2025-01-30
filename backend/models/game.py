from datetime import datetime
from backend import db

class Game(db.Model):
    __tablename__ = 'games'
    
    id = db.Column(db.Integer, primary_key=True)
    track_id = db.Column(db.Integer, db.ForeignKey('courses.id'), nullable=False)
    status = db.Column(db.String(20), default='waiting')  # waiting, in_progress, finished
    start_time = db.Column(db.DateTime)
    end_time = db.Column(db.DateTime)
    max_players = db.Column(db.Integer, default=8)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    sessions = db.relationship('GameSession', back_populates='game', cascade='all, delete-orphan')
    race_history = db.relationship('RaceHistory', back_populates='game')
    course = db.relationship('Course', back_populates='games')
    
    __table_args__ = (
        db.Index('idx_game_status', 'status'),
        db.Index('idx_game_track', 'track_id'),
        db.CheckConstraint('max_players > 0', name='check_max_players'),
        {'extend_existing': True}
    )
    
    def __repr__(self):
        return f'<Game {self.id} ({self.status})>'
    
    def get_player_count(self):
        """Get current number of players"""
        return len(self.sessions)
    
    def is_full(self):
        """Check if game is full"""
        return self.get_player_count() >= self.max_players
    
    def can_start(self):
        """Check if game can start"""
        return (self.status == 'waiting' and 
                self.get_player_count() >= 2 and
                all(session.is_ready for session in self.sessions))
    
    def start_game(self):
        """Start the game if possible"""
        if self.can_start():
            self.status = 'in_progress'
            self.start_time = datetime.utcnow()
            return True
        return False 
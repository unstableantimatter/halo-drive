from datetime import datetime
from backend import db

class RaceHistory(db.Model):
    __tablename__ = 'race_history'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    game_id = db.Column(db.Integer, db.ForeignKey('games.id'), nullable=False)
    track_id = db.Column(db.Integer, db.ForeignKey('courses.id'), nullable=False)
    ship_id = db.Column(db.Integer, db.ForeignKey('ships.id'), nullable=False)
    completion_time = db.Column(db.Float)
    position = db.Column(db.Integer)
    date = db.Column(db.DateTime, default=datetime.utcnow)
    rating_change = db.Column(db.Integer)
    experience_gained = db.Column(db.Integer)
    replay_data = db.Column(db.JSON)
    
    # Relationships
    user = db.relationship('User', back_populates='race_history')
    ship = db.relationship('Ship', back_populates='race_history')
    game = db.relationship('Game', back_populates='race_history')
    course = db.relationship('Course', back_populates='race_history')
    
    __table_args__ = (
        db.Index('idx_race_history_user', 'user_id'),
        db.Index('idx_race_history_game', 'game_id'),
        db.Index('idx_race_history_track', 'track_id'),
        db.Index('idx_race_history_ship', 'ship_id'),
        {'extend_existing': True}
    )
    
    def __repr__(self):
        return f'<RaceHistory {self.id} (User: {self.user_id}, Game: {self.game_id})>' 
from datetime import datetime
from backend import db
from backend.models import is_model_registered

if not is_model_registered('GameSession'):
    class GameSession(db.Model):
        __tablename__ = 'game_sessions'
        
        id = db.Column(db.Integer, primary_key=True)
        game_id = db.Column(db.Integer, db.ForeignKey('games.id'), nullable=False)
        user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
        ship_id = db.Column(db.Integer, db.ForeignKey('ships.id'), nullable=False)
        
        # Session state
        is_ready = db.Column(db.Boolean, default=False)
        is_connected = db.Column(db.Boolean, default=True)
        finish_time = db.Column(db.Float)  # Race completion time in seconds
        position = db.Column(db.Integer)  # Final race position
        dnf = db.Column(db.Boolean, default=False)  # Did Not Finish
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
        
        # Relationships
        user = db.relationship('User', back_populates='game_sessions')
        ship = db.relationship('Ship', back_populates='game_sessions')
        game = db.relationship('Game', back_populates='sessions')
        
        __table_args__ = (
            db.UniqueConstraint('game_id', 'user_id', name='unique_game_user'),
            db.Index('idx_game_session', 'game_id', 'user_id'),
            {'extend_existing': True}  # This should be the last item in the tuple
        ) 

        def __repr__(self):
            return f'<GameSession {self.id} (Game: {self.game_id}, User: {self.user_id})>'

        def to_dict(self):
            """Convert session to dictionary for JSON responses"""
            return {
                'id': self.id,
                'game_id': self.game_id,
                'user_id': self.user_id,
                'username': self.user.username,
                'ship_id': self.ship_id,
                'is_ready': self.is_ready,
                'is_connected': self.is_connected,
                'position': self.position,
                'finish_time': self.finish_time,
                'dnf': self.dnf
            } 
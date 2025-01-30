from datetime import datetime
from backend import db

class Ship(db.Model):
    __tablename__ = 'ships'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    description = db.Column(db.Text)
    sprite_key = db.Column(db.String(120))
    
    # Ship stats
    max_speed = db.Column(db.Integer, default=50)
    acceleration = db.Column(db.Integer, default=50)
    handling = db.Column(db.Integer, default=50)
    shield_strength = db.Column(db.Integer, default=50)
    energy_capacity = db.Column(db.Integer, default=50)
    
    # Requirements
    required_rating = db.Column(db.Integer, default=0)
    required_wins = db.Column(db.Integer, default=0)
    
    # Metadata
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    game_sessions = db.relationship('GameSession', back_populates='ship')
    race_history = db.relationship('RaceHistory', back_populates='ship')
    leaderboard_entries = db.relationship('Leaderboard', back_populates='ship')
    course_records = db.relationship('CourseRecord', back_populates='ship')
    
    # Asset info
    engine_position = db.Column(db.JSON)  # {x: float, y: float}
    collision_bounds = db.Column(db.JSON)  # {width: float, height: float}
    
    __table_args__ = (
        db.Index('idx_ship_rating', 'required_rating'),
        db.Index('idx_ship_active', 'is_active'),
        {'extend_existing': True}
    )

    def __repr__(self):
        return f'<Ship {self.name}>'

    def to_dict(self):
        """Convert ship to dictionary with nested stats"""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'sprite_key': self.sprite_key or 'default_ship.png',
            'required_rating': self.required_rating,
            'stats': {
                'max_speed': self.max_speed,
                'acceleration': self.acceleration,
                'handling': self.handling,
                'shield_strength': self.shield_strength,
                'energy_capacity': self.energy_capacity
            },
            'unlocked': True  # We'll implement proper unlocking logic later 
        } 
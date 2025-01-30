from datetime import datetime
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from backend.models import db
from backend.utils.db_utils import with_retry, optimize_query, batch_insert

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    is_active = db.Column(db.Boolean, default=True)
    
    # Game stats
    rating = db.Column(db.Integer, default=1000)
    races_completed = db.Column(db.Integer, default=0)
    wins = db.Column(db.Integer, default=0)
    best_time = db.Column(db.Float)
    experience_points = db.Column(db.Integer, default=0)
    current_ship = db.Column(db.Integer, db.ForeignKey('ships.id'), nullable=True)
    ship = db.relationship('Ship', foreign_keys=[current_ship], lazy=True)
    
    # Relationships
    game_sessions = db.relationship('GameSession', back_populates='user')
    race_history = db.relationship('RaceHistory', back_populates='user')
    leaderboard_entries = db.relationship('Leaderboard', back_populates='user')
    course_records = db.relationship('CourseRecord', back_populates='user')
    
    # Indexes
    __table_args__ = (
        db.Index('idx_user_rating', 'rating'),
        db.Index('idx_user_races', 'races_completed'),
        db.Index('idx_user_active', 'is_active'),
    )
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    @classmethod
    @with_retry()
    def get_by_username(cls, username):
        query = cls.query.filter_by(username=username)
        return optimize_query(query).first()

    @classmethod
    def bulk_create_users(cls, users):
        batch_insert(cls, users) 
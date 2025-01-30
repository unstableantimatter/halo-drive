from datetime import datetime
from backend import db

class Course(db.Model):
    __tablename__ = 'courses'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text)
    difficulty = db.Column(db.String(20), nullable=False)
    
    # Course data
    checkpoints = db.Column(db.JSON)  # [{x: float, y: float}, ...]
    gravity_wells = db.Column(db.JSON)  # [{x: float, y: float, strength: float}, ...]
    obstacles = db.Column(db.JSON)  # [{type: str, x: float, y: float, ...}, ...]
    
    # Course properties
    length = db.Column(db.Float)
    par_time = db.Column(db.Float, nullable=False)
    required_rating = db.Column(db.Integer, default=0)
    required_courses = db.Column(db.JSON)  # [course_id, ...]
    
    # Assets
    background_key = db.Column(db.String(50))
    thumbnail_key = db.Column(db.String(50))
    
    # Relationships
    games = db.relationship('Game', back_populates='course')
    race_history = db.relationship('RaceHistory', 
                                 primaryjoin="Course.id==foreign(RaceHistory.track_id)",
                                 back_populates='course')
    leaderboard_entries = db.relationship('Leaderboard',
                                        primaryjoin="Course.id==foreign(Leaderboard.track_id)",
                                        back_populates='course')
    course_records = db.relationship('CourseRecord',
                                   primaryjoin="Course.id==foreign(CourseRecord.track_id)",
                                   back_populates='course')
    
    __table_args__ = (
        db.Index('idx_course_rating', 'required_rating'),
        db.Index('idx_course_difficulty', 'difficulty'),
        {'extend_existing': True}
    )

    def __repr__(self):
        return f'<Course {self.name}>' 
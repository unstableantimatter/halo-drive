from datetime import datetime
from backend import db

class CourseRecord(db.Model):
    __tablename__ = 'course_records'
    
    id = db.Column(db.Integer, primary_key=True)
    track_id = db.Column(db.Integer, db.ForeignKey('courses.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    ship_id = db.Column(db.Integer, db.ForeignKey('ships.id'), nullable=False)
    best_time = db.Column(db.Float, nullable=False)
    date_achieved = db.Column(db.DateTime, default=datetime.utcnow)
    replay_data = db.Column(db.JSON)
    
    # Relationships
    user = db.relationship('User', back_populates='course_records')
    ship = db.relationship('Ship', back_populates='course_records')
    course = db.relationship('Course', back_populates='course_records')
    
    __table_args__ = (
        db.UniqueConstraint('track_id', 'ship_id', name='unique_track_ship'),
        db.Index('idx_course_record_track', 'track_id'),
        db.Index('idx_course_record_ship', 'ship_id'),
        {'extend_existing': True}
    )

    def __repr__(self):
        return f'<CourseRecord {self.id} (Track: {self.track_id}, Ship: {self.ship_id})>' 
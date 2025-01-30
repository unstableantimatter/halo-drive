from datetime import datetime
from backend import db

class Leaderboard(db.Model):
    __tablename__ = 'leaderboards'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    track_id = db.Column(db.Integer, db.ForeignKey('courses.id'), nullable=False)
    best_time = db.Column(db.Float)
    ship_id = db.Column(db.Integer, db.ForeignKey('ships.id'), nullable=False)
    date_achieved = db.Column(db.DateTime, default=datetime.utcnow)
    replay_data = db.Column(db.JSON)
    
    # Relationships
    user = db.relationship('User', back_populates='leaderboard_entries')
    ship = db.relationship('Ship', back_populates='leaderboard_entries')
    course = db.relationship('Course', back_populates='leaderboard_entries')
    
    __table_args__ = (
        db.UniqueConstraint('user_id', 'track_id', name='unique_user_track'),
        db.Index('idx_leaderboard_track', 'track_id'),
        db.Index('idx_leaderboard_user', 'user_id'),
        {'extend_existing': True}
    )

    def __repr__(self):
        return f'<Leaderboard {self.id} (User: {self.user_id}, Track: {self.track_id})>'

    def update_stats(self, race_result):
        self.total_races += 1
        if race_result.position == 1:
            self.wins += 1
        
        # Update best time if applicable
        course_id = str(race_result.course_id)
        if course_id not in self.best_times or race_result.finish_time < self.best_times[course_id]:
            self.best_times[course_id] = race_result.finish_time
        
        self.last_updated = datetime.utcnow()


# Move CourseRecord to its own file
# backend/models/course_record.py is now the source of truth for this model 
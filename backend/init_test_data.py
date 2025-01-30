from backend import app, db
from backend.models.ship import Ship
from backend.models.course import Course

def create_test_data():
    with app.app_context():
        # Create test ships
        ships = [
            Ship(
                name='Basic Ship',
                model='basic_v1',
                description='A basic starter ship',
                max_speed=100.0,
                acceleration=10.0,
                handling=5.0,
                shield_strength=100.0,
                energy_capacity=100.0,
                sprite_key='ship_basic'
            ),
            Ship(
                name='Advanced Ship',
                model='advanced_v1',
                description='An advanced racing ship',
                max_speed=150.0,
                acceleration=15.0,
                handling=7.0,
                shield_strength=80.0,
                energy_capacity=120.0,
                sprite_key='ship_advanced'
            )
        ]
        
        # Create test courses
        courses = [
            Course(
                name='Tutorial Track',
                description='A simple track for beginners',
                difficulty='easy',
                checkpoints=[
                    {'x': 100, 'y': 100},
                    {'x': 300, 'y': 300},
                    {'x': 500, 'y': 100}
                ],
                par_time=60.0,
                required_rating=0,
                background_key='track_tutorial',
                thumbnail_key='thumb_tutorial'
            ),
            Course(
                name='Beginner Circuit',
                description='A basic racing circuit',
                difficulty='easy',
                checkpoints=[
                    {'x': 100, 'y': 100},
                    {'x': 300, 'y': 300},
                    {'x': 500, 'y': 100},
                    {'x': 700, 'y': 300}
                ],
                par_time=90.0,
                required_rating=0,
                background_key='track_beginner',
                thumbnail_key='thumb_beginner'
            )
        ]
        
        # Add to database
        for ship in ships:
            db.session.add(ship)
        for course in courses:
            db.session.add(course)
            
        db.session.commit()
        print("Test data created successfully!")

if __name__ == '__main__':
    create_test_data() 
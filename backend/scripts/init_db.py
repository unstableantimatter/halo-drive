from backend.app import create_app, db
from backend.models.ship import Ship
from backend.models.course import Course

def init_db():
    app = create_app('development')
    with app.app_context():
        # Create tables
        db.create_all()
        
        # Add initial ships
        starter_ship = Ship(
            name="Starling",
            description="A balanced starter ship perfect for new pilots.",
            acceleration=0.5,
            max_speed=100.0,
            handling=0.7,
            shield_strength=100.0,
            boost_capacity=100.0,
            sprite_key="ship_1",
            engine_position={"x": 0, "y": 20},
            collision_bounds={"width": 32, "height": 32}
        )
        
        # Add initial course
        starter_course = Course(
            name="Training Ground",
            description="A simple course to learn the basics.",
            difficulty="easy",
            checkpoints=[
                {"x": 100, "y": 100},
                {"x": 300, "y": 300},
                {"x": 500, "y": 100}
            ],
            gravity_wells=[
                {"x": 300, "y": 200, "strength": 50, "radius": 100}
            ],
            length=1000.0,
            par_time=60.0,
            background_key="starfield",
            thumbnail_key="course_1_thumb"
        )
        
        db.session.add(starter_ship)
        db.session.add(starter_course)
        db.session.commit()

if __name__ == '__main__':
    init_db() 
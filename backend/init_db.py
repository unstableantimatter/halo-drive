from backend import app, db
from backend.models import init_models

def init_database():
    with app.app_context():
        # Create all tables
        db.create_all()
        
        # Initialize models
        init_models()
        
        print("Database initialized successfully!")

if __name__ == '__main__':
    init_database() 
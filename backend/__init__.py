# This file can be empty, it just marks the directory as a Python package

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_socketio import SocketIO
from flask_migrate import Migrate

# Initialize extensions
db = SQLAlchemy()
login_manager = LoginManager()
socketio = SocketIO()
migrate = Migrate()

# Make extensions available at package level
__all__ = ['db', 'login_manager', 'socketio', 'migrate', 'create_app']

def create_app():
    """Initialize the core application."""
    app = Flask(__name__,
                template_folder='../frontend/templates',
                static_folder='../frontend/static')
    
    # Load configuration
    app.config.from_object('backend.config.Config')
    
    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)
    socketio.init_app(app)
    migrate.init_app(app, db)
    
    with app.app_context():
        try:
            # Import and register blueprints
            from backend.routes import auth_bp, game_bp, api_bp
            
            # Register each blueprint with error handling
            for bp_name, blueprint in [
                ('auth', auth_bp),
                ('game', game_bp),
                ('api', api_bp)
            ]:
                try:
                    app.register_blueprint(blueprint)
                    print(f"Registered {bp_name} blueprint")
                except Exception as e:
                    print(f"Error registering {bp_name} blueprint: {e}")
                    raise
            
            # Initialize scheduler
            from backend.scheduler import init_scheduler
            init_scheduler(app)
            
            # Set up login manager
            @login_manager.user_loader
            def load_user(user_id):
                from backend.models.user import User
                return User.query.get(int(user_id))
                
        except Exception as e:
            print(f"Error during app initialization: {e}")
            raise
    
    return app, socketio

# Don't create app immediately
# app, socketio = create_app()  # Remove this line

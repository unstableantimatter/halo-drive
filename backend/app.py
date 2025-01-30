from flask import Flask, render_template
from flask_socketio import SocketIO
from flask_migrate import Migrate
from .utils.db_optimizations import optimize_sqlite

try:
    from .config import Config
except ImportError:
    from config import Config

# Import extensions from __init__
from . import db, login_manager, socketio, migrate
# Import model initialization
from .models import init_models

def create_app(config_name='default'):
    """Application factory function."""
    app = Flask(__name__, 
        template_folder='../frontend/templates',
        static_folder='../frontend/static'
    )
    
    # Load configuration
    app.config.from_object(Config)
    
    # Initialize extensions
    db.init_app(app)
    socketio.init_app(app, cors_allowed_origins="*")
    migrate.init_app(app, db)
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    
    # Apply SQLite optimizations
    optimize_sqlite(app, db)
    
    # Initialize CUDA if enabled
    if app.config['CUDA_ENABLED']:
        import cupy as cp
        cp.cuda.Device(app.config['CUDA_DEVICE']).use()
    
    # Register blueprints
    from .routes.auth import auth_bp
    from .routes.game import game_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(game_bp)
    
    # Initialize models
    with app.app_context():
        # Clear any existing models from the registry
        for key in list(db.Model.registry._class_registry.keys()):
            if key != '_sa_module_registry':
                db.Model.registry._class_registry.pop(key)
        
        # Initialize models
        models_data = init_models()
        models = models_data['models']
        
        # Create tables in order if they don't exist
        inspector = db.inspect(db.engine)
        if not inspector.get_table_names():
            for table in models_data['tables']:
                if not table.exists(db.engine):
                    table.create(db.engine)
    
    @login_manager.user_loader
    def load_user(user_id):
        from .models.user import User
        return User.query.get(int(user_id))
    
    from .routes import api
    app.register_blueprint(api.bp)
    
    from . import socket_events
    
    @app.route('/')
    def index():
        return render_template('index.html')
    
    return app, socketio

if __name__ == '__main__':
    app, socketio = create_app()
    socketio.run(app, debug=True) 
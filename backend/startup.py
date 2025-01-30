#!/usr/bin/env python3
import os
import sys
from pathlib import Path
from flask import Flask

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Now we can import from backend
from backend.models.ship import Ship
from backend.models.course import Course
import shutil
import importlib
import json
from datetime import datetime
from backend import create_app, db
from backend.models.user import User
from backend.models.leaderboard import Leaderboard
from werkzeug.security import generate_password_hash

class GameStartupManager:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.app = None
        self.db = None
        
        # Set up console encoding
        if sys.platform == 'win32':
            try:
                # Try to use UTF-8
                import locale
                locale.setlocale(locale.LC_ALL, 'en_US.UTF-8')
            except locale.Error:
                # Fallback to Windows CP65001 (UTF-8)
                os.system('chcp 65001')
        
        self.required_structure = {
            'backend': {
                'models': ['__init__.py', 'user.py', 'race_history.py'],
                'routes': ['__init__.py', 'auth.py', 'game.py', 'api.py'],
                'utils': ['__init__.py', 'backup.py', 'db_utils.py', 'db_optimizations.py'],
                'migrations': [],
                'database': [],
                'static': [],
                'templates': [],
                '__init__.py': None,
                'app.py': None,
                'config.py': 'config.example.py',
                'socket_events.py': None
            },
            'frontend': {
                'static': {
                    'css': ['main.css', 'particles.css', 'settings.css'],
                    'js': ['effects.js', 'particle-config.js', 'settings-ui.js']
                },
                'templates': ['index.html']
            }
        }
        
        self.required_packages = [
            'flask',
            'flask-sqlalchemy',
            'flask-login',
            'flask-socketio',
            'flask-migrate',
            'eventlet',
            'numpy',
            'sqlalchemy'
        ]

    def print_status(self, message, status=None, end='\n'):
        """Print formatted status message with fallback for non-Unicode terminals"""
        try:
            # Unicode status marks
            status_marks = {
                'OK': '✓',
                'FAIL': '✗',
                'WARN': '!',
                'INFO': 'ℹ'
            }
            mark = f" [{status_marks.get(status, '')}]" if status else ""
            print(f"{message}{mark}", end=end)
        except UnicodeEncodeError:
            # ASCII fallback status marks
            status_marks = {
                'OK': '[OK]',
                'FAIL': '[FAIL]',
                'WARN': '[WARN]',
                'INFO': '[INFO]'
            }
            mark = f" {status_marks.get(status, '')}" if status else ""
            print(f"{message}{mark}", end=end)
        
        sys.stdout.flush()  # Ensure immediate output

    def check_python_version(self):
        """Verify Python version meets requirements"""
        self.print_status("Checking Python version...", end='')
        if sys.version_info < (3, 7):
            self.print_status("", "FAIL")
            raise SystemError("Python 3.7 or higher is required")
        self.print_status("", "OK")

    def verify_directory_structure(self):
        """Check and create required directory structure"""
        self.print_status("\nVerifying directory structure:")
        
        # Make sure routes directory exists with __init__.py
        routes_dir = self.project_root / 'backend' / 'routes'
        routes_dir.mkdir(parents=True, exist_ok=True)
        init_file = routes_dir / '__init__.py'
        init_file.touch(exist_ok=True)
        self.print_status(f"Routes __init__.py exists: {init_file.exists()}", "INFO")
        self.print_status(f"Routes __init__.py size: {init_file.stat().st_size} bytes", "INFO")
        
        # Check auth.py exists and has content
        auth_file = routes_dir / 'auth.py'
        if auth_file.exists():
            self.print_status(f"auth.py exists, size: {auth_file.stat().st_size} bytes", "INFO")
            with open(auth_file, 'r') as f:
                content = f.read()
                self.print_status(f"auth.py content preview: {content[:200]}...", "INFO")
        else:
            self.print_status("auth.py does not exist!", "WARN")
        
        # Make sure utils directory exists with __init__.py
        utils_dir = self.project_root / 'backend' / 'utils'
        utils_dir.mkdir(parents=True, exist_ok=True)
        (utils_dir / '__init__.py').touch(exist_ok=True)
        (utils_dir / 'db_utils.py').touch(exist_ok=True)
        
        def check_directory(base_path, structure, current_path=Path()):
            if isinstance(structure, dict):
                for name, content in structure.items():
                    path = current_path / name
                    full_path = base_path / path
                    
                    if not full_path.exists():
                        self.print_status(f"Creating directory: {path}")
                        full_path.mkdir(parents=True, exist_ok=True)
                    
                    check_directory(base_path, content, path)
                    
            elif isinstance(structure, list):
                for filename in structure:
                    file_path = base_path / current_path / filename
                    if not file_path.exists():
                        self.print_status(f"Creating file: {current_path / filename}")
                        file_path.touch()
            
            elif isinstance(structure, str):
                # File with template
                dest_path = base_path / current_path
                template_path = base_path / Path(structure)
                if template_path.exists() and not dest_path.exists():
                    self.print_status(f"Creating file from template: {current_path}")
                    shutil.copy(template_path, dest_path)

        check_directory(self.project_root, self.required_structure)

    def check_dependencies(self):
        """Verify and install required Python packages"""
        self.print_status("\nChecking Python dependencies:")
        
        # Define version constraints
        version_constraints = {
            'flask': '>=2.0.1',
            'flask-sqlalchemy': '>=2.5.1',
            'flask-login': '>=0.5.0',
            'flask-socketio': '>=5.1.1',
            'flask-migrate': '>=3.1.0',
            'werkzeug': '<3.0.0',  # Add Werkzeug constraint
            'eventlet': '>=0.30.2',
            'numpy': '>=1.21.2',
            'sqlalchemy': '>=1.4.23'
        }
        
        missing = []
        updates_needed = []
        
        for package, version in version_constraints.items():
            try:
                module = importlib.import_module(package.replace('-', '_'))
                if hasattr(module, '__version__'):
                    current_version = module.__version__
                    self.print_status(f"Found {package} {current_version}", "OK")
                    
                    # Check if version meets constraints
                    from packaging import version as pkg_version
                    from packaging.specifiers import SpecifierSet
                    
                    if not SpecifierSet(version).contains(current_version):
                        updates_needed.append((package, version, current_version))
                else:
                    self.print_status(f"Found {package} (version unknown)", "WARN")
            except ImportError:
                missing.append(f"{package}{version}")
                self.print_status(f"Missing {package}", "WARN")
        
        if missing or updates_needed:
            self.print_status("\nUpdating dependencies...")
            try:
                import pip
                
                if missing:
                    self.print_status("Installing missing packages:")
                    for package in missing:
                        self.print_status(f"Installing {package}...", end='')
                        pip.main(['install', package])
                        self.print_status("", "OK")
                
                if updates_needed:
                    self.print_status("Updating packages:")
                    for package, required_version, current_version in updates_needed:
                        self.print_status(f"Updating {package} {current_version} to {required_version}...", end='')
                        pip.main(['install', f"{package}{required_version}", '--upgrade'])
                        self.print_status("", "OK")
                    
                    self.print_status("\nDependencies updated. Please restart the server.", "INFO")
                    sys.exit(0)
                    
            except Exception as e:
                raise RuntimeError(f"Failed to install/update dependencies: {e}")

    def verify_config(self):
        """Check configuration files"""
        self.print_status("\nVerifying configuration:")
        
        config_path = self.project_root / 'backend' / 'config.py'
        
        # If old config exists, back it up and create new one
        if config_path.exists():
            with open(config_path, 'r') as f:
                content = f.read()
                if 'postgresql' in content or 'DevelopmentConfig' in content:
                    backup_path = config_path.with_suffix('.py.bak')
                    self.print_status(f"Backing up old config to {backup_path}")
                    shutil.copy(config_path, backup_path)
                    config_path.unlink()  # Remove old config
        
        # Create new config
        self.print_status("Creating SQLite configuration")
        with open(config_path, 'w', encoding='utf-8') as f:
            f.write('''import os
from pathlib import Path

class Config:
    """Base configuration."""
    # Get the directory containing this file
    BASE_DIR = Path(__file__).parent

    # SQLite configuration
    DB_PATH = BASE_DIR / 'database' / 'space_racing.db'
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{DB_PATH}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Flask
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    FLASK_APP = os.getenv('FLASK_APP', 'backend/app.py')
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    DEBUG = True
    
    # Game Settings
    MAX_PLAYERS_PER_RACE = 8
    MATCHMAKING_TIMEOUT = 60  # seconds
    RACE_START_COUNTDOWN = 5  # seconds
    
    # CUDA Settings
    CUDA_ENABLED = False  # Default to False for compatibility
    CUDA_DEVICE = 0
    CUDA_ARCH = 'sm_89'  # Appropriate for recent GPUs
    
    # Performance
    PHYSICS_UPDATE_RATE = 60  # Hz
    NETWORK_UPDATE_RATE = 20  # Hz
    MAX_PREDICTION_FRAMES = 10
''')
        
        # Continue with verification as before...
        try:
            self._clear_config_imports()
            
            # Debug import paths
            backend_path = str(self.project_root / 'backend')
            if backend_path not in sys.path:
                sys.path.insert(0, backend_path)
            
            # Import and verify config
            import config
            Config = config.Config
            
            # Verify required attributes
            required_attrs = [
                'DB_PATH',
                'SQLALCHEMY_DATABASE_URI',
                'SECRET_KEY',
                'DEBUG'
            ]
            
            self.print_status("\nChecking required attributes:")
            for attr in required_attrs:
                self.print_status(f"Checking {attr}...", end='')
                if not hasattr(Config, attr):
                    self.print_status("", "FAIL")
                    raise AttributeError(f"Config missing {attr}")
                self.print_status("", "OK")
            
            self.print_status("\nConfiguration verification complete", "OK")
            
        except Exception as e:
            self.print_status(f"Configuration error: {str(e)}", "FAIL")
            raise RuntimeError(f"Configuration verification failed: {e}")

    def _clear_config_imports(self):
        """Clear any existing config imports"""
        modules_to_clear = ['config', 'backend.config']
        for module in modules_to_clear:
            if module in sys.modules:
                self.print_status(f"Clearing {module} from sys.modules", "INFO")
                del sys.modules[module]

    def _create_example_config(self, path):
        """Create the example config file"""
        example_content = '''import os
from pathlib import Path

class Config:
    # Get the directory containing this file
    BASE_DIR = Path(__file__).parent

    # SQLite configuration
    DB_PATH = BASE_DIR / 'database' / 'space_racing.db'
    
    # Database URI
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{DB_PATH}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Security
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-key-please-change-in-production')
    
    # Application settings
    DEBUG = os.getenv('FLASK_ENV', 'development') == 'development'
    
    # Game settings
    CUDA_ENABLED = False
    CUDA_DEVICE = 0
    
    # Socket settings
    SOCKET_PING_TIMEOUT = 5
    SOCKET_PING_INTERVAL = 1
'''
        with open(path, 'w', encoding='utf-8') as f:
            f.write(example_content)

    def verify_database(self):
        """Check database setup and create if missing"""
        self.print_status("\nVerifying database setup:")
        
        try:
            # Use the existing app context if available
            if self.app is None:
                # Import and create app first
                from backend import create_app, db
                self.app, _ = create_app()
                self.db = db
            
            with self.app.app_context():
                # Import models and db
                from backend.models import db, init_models
                from sqlalchemy import inspect
                
                # Initialize models with duplicate prevention
                models = init_models()
                
                try:
                    # Check if we can connect
                    db.engine.connect()
                    self.print_status("Database connection successful", "OK")
                    
                    # Check if tables exist
                    inspector = inspect(db.engine)
                    existing_tables = inspector.get_table_names()
                    
                    if not existing_tables:
                        # No tables exist, create them
                        self.print_status("Creating database tables...", end='')
                        db.create_all()
                        self.print_status("", "OK")
                        
                        # Initialize migrations
                        self._init_migrations()
                    else:
                        # Tables exist, verify structure
                        self.print_status(f"Found tables: {', '.join(existing_tables)}", "INFO")
                        self.print_status("Verifying table structure...", end='')
                        self._verify_table_structure(inspector)
                        self.print_status("", "OK")
                        
                        # Ensure migrations are initialized
                        self._init_migrations()
                    
                except Exception as e:
                    if "no such table" in str(e):
                        # Database exists but no tables
                        self.print_status("No tables found, creating...", end='')
                        db.create_all()
                        self.print_status("", "OK")
                        
                        # Initialize migrations
                        self._init_migrations()
                
        except Exception as e:
            self.print_status(f"Database error: {str(e)}", "FAIL")
            raise RuntimeError(f"Database setup failed: {e}")

    def _init_migrations(self):
        """Initialize or verify migrations"""
        try:
            self.print_status("Checking migrations...", end='')
            migrations_dir = self.project_root / 'backend' / 'migrations'
            
            from flask_migrate import init, stamp
            if not migrations_dir.exists():
                init(directory=str(migrations_dir))
                stamp(directory=str(migrations_dir))
                self.print_status("", "OK")
            else:
                self.print_status(" already initialized", "INFO")
        except Exception as e:
            self.print_status("", "FAIL")
            self.print_status(f"Migration error: {str(e)}", "WARN")

    def _verify_table_structure(self, inspector):
        """Verify database table structure matches models"""
        expected_tables = {
            'users': {
                'id': int,
                'username': str,
                'email': str,
                'password_hash': str,
                'created_at': datetime,
                'last_login': datetime,
                'is_active': bool,
                'rating': int,
                'races_completed': int,
                'wins': int,
                'best_time': float,
                'experience_points': int,
                'current_ship': int
            },
            'ships': {
                'id': int,
                'name': str,
                'model': str,
                'description': str,
                'max_speed': float,
                'acceleration': float,
                'handling': float,
                'shield_strength': float,
                'energy_capacity': float,
                'required_level': int,
                'unlock_cost': int,
                'created_at': datetime,
                'is_active': bool
            },
            'games': {
                'id': int,
                'track_id': str,
                'status': str,
                'start_time': datetime,
                'end_time': datetime,
                'max_players': int,
                'created_at': datetime
            },
            'game_sessions': {
                'id': int,
                'game_id': int,
                'user_id': int,
                'ship_id': int,
                'is_ready': bool,
                'is_connected': bool,
                'last_ping': datetime,
                'finish_time': float,
                'position': int,
                'dnf': bool
            },
            'race_history': {
                'id': int,
                'user_id': int,
                'game_id': int,
                'track_id': str,
                'ship_id': int,
                'completion_time': float,
                'position': int,
                'date': datetime,
                'rating_change': int,
                'experience_gained': int,
                'replay_data': dict
            },
            'leaderboards': {
                'id': int,
                'user_id': int,
                'track_id': str,
                'best_time': float,
                'ship_id': int,
                'date_achieved': datetime,
                'replay_data': dict
            },
            'course_records': {
                'id': int,
                'track_id': str,
                'user_id': int,
                'ship_id': int,
                'best_time': float,
                'date_achieved': datetime,
                'replay_data': dict
            },
            'courses': {
                'id': int,
                'name': str,
                'description': str,
                'difficulty': str,
                'checkpoints': dict,
                'gravity_wells': dict,
                'obstacles': dict,
                'length': float,
                'par_time': float,
                'required_rating': int,
                'required_courses': dict,
                'background_key': str,
                'thumbnail_key': str
            }
        }
        
        # Get all existing tables
        existing_tables = inspector.get_table_names()
        
        # First verify all expected tables exist
        for table_name in expected_tables:
            if table_name not in existing_tables:
                raise RuntimeError(f"Missing table: {table_name}")
        
        # Then verify columns for each table
        for table_name, expected_columns in expected_tables.items():
            columns = {col['name']: col['type'].__class__ for col in inspector.get_columns(table_name)}
            
            # Check for missing columns
            for column_name, expected_type in expected_columns.items():
                if column_name not in columns:
                    raise RuntimeError(f"Missing column: {table_name}.{column_name}")
                
                # Optionally check column type (commented out for now as SQLite types can be flexible)
                # actual_type = columns[column_name]
                # if not isinstance(actual_type, expected_type):
                #     raise RuntimeError(f"Column type mismatch: {table_name}.{column_name} "
                #                       f"expected {expected_type}, got {actual_type}")
        
        # Optionally check for unexpected columns
        for table_name in expected_tables:
            columns = {col['name'] for col in inspector.get_columns(table_name)}
            expected = set(expected_tables[table_name].keys())
            unexpected = columns - expected
            if unexpected:
                self.print_status(f"Warning: Unexpected columns in {table_name}: {', '.join(unexpected)}", "WARN")

    def verify_static_files(self):
        """Check if all required static files have content"""
        self.print_status("\nVerifying static files:")
        
        def check_file_content(file_path):
            if file_path.exists() and file_path.stat().st_size == 0:
                self.print_status(f"Warning: Empty file: {file_path}", "WARN")
        
        # Check CSS files
        css_dir = self.project_root / 'frontend' / 'static' / 'css'
        for css_file in ['main.css', 'particles.css', 'settings.css']:
            check_file_content(css_dir / css_file)
        
        # Check JS files
        js_dir = self.project_root / 'frontend' / 'static' / 'js'
        for js_file in ['effects.js', 'particle-config.js', 'settings-ui.js']:
            check_file_content(js_dir / js_file)

    def initialize_database(self):
        """Initialize database and create tables"""
        self.print_status("\nInitializing database:")
        
        try:
            # Import and create app first
            from backend import create_app, db
            self.app, _ = create_app()
            self.db = db
            
            with self.app.app_context():
                # Drop all tables if they exist
                self.print_status("Dropping existing tables...", end='')
                self.db.drop_all()
                self.print_status("", "OK")
                
                # Create all tables
                self.print_status("Creating tables...", end='')
                self.db.create_all()
                self.print_status("", "OK")
                
                # Initialize models
                from backend.models import init_models
                init_models()
                
                self.print_status("Database initialized", "OK")
                
                # Create test data if needed
                if self._should_create_test_data():
                    self.create_test_data()
                
        except Exception as e:
            self.print_status(f"Database initialization error: {str(e)}", "FAIL")
            raise RuntimeError(f"Database setup failed: {e}")

    def create_test_data(self):
        """Create test data for development"""
        self.print_status("\nCreating test data:")
        
        try:
            with self.app.app_context():
                # Create test ships
                ships = [
                    Ship(
                        name="Starfighter",
                        description="Balanced starter ship with good all-round capabilities",
                        sprite_key="starfighter.png",
                        max_speed=60,
                        acceleration=55,
                        handling=65,
                        shield_strength=50,
                        energy_capacity=50,
                        required_rating=0,
                        required_wins=0,
                        engine_position={"x": 0, "y": 0},
                        collision_bounds={"width": 64, "height": 32}
                    ),
                    Ship(
                        name="Interceptor",
                        description="Fast but fragile ship designed for experienced pilots",
                        sprite_key="interceptor.png",
                        max_speed=80,
                        acceleration=70,
                        handling=75,
                        shield_strength=30,
                        energy_capacity=40,
                        required_rating=1200,
                        required_wins=5,
                        engine_position={"x": 0, "y": 0},
                        collision_bounds={"width": 48, "height": 24}
                    ),
                    Ship(
                        name="Juggernaut",
                        description="Heavy ship with strong shields but poor maneuverability",
                        sprite_key="juggernaut.png",
                        max_speed=40,
                        acceleration=35,
                        handling=30,
                        shield_strength=85,
                        energy_capacity=70,
                        required_rating=1500,
                        required_wins=10,
                        engine_position={"x": 0, "y": 0},
                        collision_bounds={"width": 80, "height": 40}
                    )
                ]
                
                # Add ships first
                for ship in ships:
                    self.db.session.add(ship)
                self.db.session.commit()
                
                # Create test user
                test_user = User(
                    username="test_pilot",
                    email="test@example.com",
                    rating=1000,
                    races_completed=0,
                    wins=0
                )
                test_user.set_password("test123")
                self.db.session.add(test_user)
                
                # Create test courses
                courses = [
                    Course(
                        name="Asteroid Field",
                        description="Navigate through dense asteroid clusters",
                        difficulty=1,
                        par_time=120.0,
                        required_rating=0
                    ),
                    Course(
                        name="Solar Winds",
                        description="Race through solar flares and plasma storms",
                        difficulty=2,
                        par_time=180.0,
                        required_rating=1000
                    ),
                    Course(
                        name="Black Hole Run",
                        description="Expert course near a black hole's event horizon",
                        difficulty=3,
                        par_time=240.0,
                        required_rating=1500
                    )
                ]
                
                # Add to database
                for course in courses:
                    self.db.session.add(course)
                    self.print_status(f"Added course: {course.name}", "OK")
                
                self.db.session.commit()
                self.print_status("Test data created successfully", "OK")
                
        except Exception as e:
            self.print_status(f"Error creating test data: {str(e)}", "FAIL")
            self.db.session.rollback()
            raise RuntimeError(f"Failed to create test data: {e}")

    def _should_create_test_data(self):
        """Check if we should create test data"""
        if os.getenv('FLASK_ENV', 'development') == 'development':
            return True
        return False

    def run_server(self):
        """Start the game server"""
        self.print_status("\nStarting game server...")
        
        try:
            if not self.app:
                from backend import create_app
                self.app, socketio = create_app()
            else:
                from backend import socketio
            
            # Start the server
            host = '0.0.0.0'
            port = 5000
            self.print_status(f"Server running at http://localhost:{port}")
            socketio.run(self.app, host=host, port=port, debug=True)
            
        except Exception as e:
            self.print_status(f"Server error: {str(e)}", "FAIL")
            raise RuntimeError(f"Failed to start server: {e}")

    def create_config(self):
        """Create configuration files if they don't exist"""
        config_dir = self.project_root / 'backend'
        config_path = config_dir / 'config.py'
        example_path = config_dir / 'config.example.py'
        
        # Create the example config if it doesn't exist
        if not example_path.exists():
            self.print_status("Creating config.example.py")
            example_content = '''import os
from pathlib import Path

class Config:
    # Get the directory containing this file
    BASE_DIR = Path(__file__).parent

    # SQLite configuration
    DB_PATH = BASE_DIR / 'database' / 'space_racing.db'
    
    # Database URI
    SQLALCHEMY_DATABASE_URI = f'sqlite:///{DB_PATH}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Security
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-key-please-change-in-production')
    
    # Application settings
    DEBUG = os.getenv('FLASK_ENV', 'development') == 'development'
    
    # Game settings
    CUDA_ENABLED = False
    CUDA_DEVICE = 0
    
    # Socket settings
    SOCKET_PING_TIMEOUT = 5
    SOCKET_PING_INTERVAL = 1
'''
            with open(example_path, 'w', encoding='utf-8') as f:
                f.write(example_content)
        
        # Create the actual config if it doesn't exist
        if not config_path.exists():
            self.print_status("Creating config.py from example")
            shutil.copy(example_path, config_path)

    def run(self):
        """Run all startup checks and initialize the server"""
        try:
            print("\n=== Space Racing Game Startup ===\n")
            
            # Run all checks
            self.check_python_version()
            self.verify_directory_structure()
            self.check_dependencies()
            self.create_config()
            self.verify_config()
            
            # Initialize database and app first
            self.initialize_database()
            
            # Then verify database and files using existing app context
            self.verify_database()
            self.verify_static_files()
            
            print("\n=== All checks passed successfully ===")
            
            # Start the server using existing app
            self.run_server()
            
        except Exception as e:
            print(f"\nStartup failed: {e}")
            sys.exit(1)

def main():
    manager = GameStartupManager()
    manager.run()

if __name__ == '__main__':
    main() 
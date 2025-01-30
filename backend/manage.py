#!/usr/bin/env python3
import os
import sys
import subprocess
import platform
from pathlib import Path
import importlib
import webbrowser
import time
import json
from datetime import datetime
import locale
import argparse

class GameServerManager:
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        self.backend_dir = self.project_root / 'backend'
        self.frontend_dir = self.project_root / 'frontend'
        self.state_file = self.backend_dir / '.setup_state.json'
        self.required_dirs = [
            'backend/migrations',
            'backend/static',
            'frontend/static/css',
            'frontend/static/js',
            'frontend/templates'
        ]
        self.required_packages = [
            'flask',
            'sqlalchemy',
            'alembic',
            'flask-sqlalchemy',
            'flask-login',
            'python-dotenv',
            'flask-migrate'
        ]
        self.load_state()
        
        # Set up console encoding
        if platform.system() == 'Windows':
            # Force UTF-8 on Windows
            try:
                locale.setlocale(locale.LC_ALL, 'en_US.UTF-8')
            except locale.Error:
                os.system('chcp 65001')

    def load_state(self):
        """Load previous setup state"""
        try:
            if self.state_file.exists():
                with open(self.state_file) as f:
                    self.state = json.load(f)
            else:
                self.state = {
                    'last_setup': None,
                    'last_migration': None,
                    'model_hashes': {},
                    'db_version': None
                }
        except Exception as e:
            print(f"Warning: Could not load setup state: {e}")
            self.state = {}

    def save_state(self):
        """Save current setup state"""
        try:
            with open(self.state_file, 'w') as f:
                json.dump(self.state, f, indent=2)
        except Exception as e:
            print(f"Warning: Could not save setup state: {e}")

    def print_status(self, message, status="", end="\n"):
        """Print formatted status message with fallback for non-Unicode terminals"""
        try:
            status_colors = {
                "OK": "\033[92m✓\033[0m",    # Green checkmark
                "FAIL": "\033[91m×\033[0m",   # Red X
                "WARN": "\033[93m!\033[0m",   # Yellow !
                "INFO": "\033[94m*\033[0m",   # Blue *
            }
            status_mark = status_colors.get(status, "")
            print(f"{message:<50} {status_mark}", end=end)
        except UnicodeEncodeError:
            # Fallback for terminals that don't support Unicode
            status_marks = {
                "OK": "[OK]",
                "FAIL": "[FAIL]",
                "WARN": "[WARN]",
                "INFO": "[INFO]",
            }
            status_mark = status_marks.get(status, "")
            print(f"{message:<50} {status_mark}", end=end)
        sys.stdout.flush()

    def check_python_version(self):
        self.print_status("Checking Python version...", end="")
        required_version = (3, 7)
        current_version = sys.version_info[:2]
        
        if current_version < required_version:
            self.print_status("", "FAIL")
            raise SystemError(
                f"Python {required_version[0]}.{required_version[1]} or higher is required. "
                f"Found version {current_version[0]}.{current_version[1]}"
            )
        self.print_status("", "OK")

    def check_directory_structure(self):
        self.print_status("Checking directory structure...")
        missing_dirs = []
        
        for dir_path in self.required_dirs:
            full_path = self.project_root / dir_path
            if not full_path.exists():
                missing_dirs.append(dir_path)
                
        if missing_dirs:
            self.print_status("Creating missing directories:", "INFO")
            for dir_path in missing_dirs:
                self.print_status(f"  Creating {dir_path}...", end="")
                try:
                    (self.project_root / dir_path).mkdir(parents=True, exist_ok=True)
                    self.print_status("", "OK")
                except Exception as e:
                    self.print_status("", "FAIL")
                    raise e

        self.print_status("Directory structure complete", "OK")

    def check_dependencies(self):
        self.print_status("Checking Python dependencies...")
        missing_packages = []
        
        for package in self.required_packages:
            try:
                importlib.import_module(package.split('-')[0])
            except ImportError:
                missing_packages.append(package)
                
        if missing_packages:
            self.print_status("Installing missing packages:", "INFO")
            for package in missing_packages:
                self.print_status(f"  Installing {package}...", end="")
                try:
                    subprocess.check_call([
                        sys.executable, '-m', 'pip', 'install', package
                    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    self.print_status("", "OK")
                except Exception as e:
                    self.print_status("", "FAIL")
                    raise e

        self.print_status("All dependencies installed", "OK")

    def get_model_hash(self):
        """Generate a hash of the current model definitions"""
        import hashlib
        model_files = [
            self.backend_dir / 'models' / f 
            for f in os.listdir(self.backend_dir / 'models') 
            if f.endswith('.py')
        ]
        
        hasher = hashlib.md5()
        for file_path in sorted(model_files):
            with open(file_path, 'rb') as f:
                hasher.update(f.read())
        return hasher.hexdigest()

    def check_database(self):
        """Check database configuration and connection"""
        self.print_status("Checking database configuration...", end="")
        
        # Check if config exists
        config_path = self.backend_dir / 'config.py'
        if not config_path.exists():
            config_example = self.backend_dir / 'config.example.py'
            if config_example.exists():
                self.print_status("", "WARN")
                self.print_status("Creating config.py from example...", end="")
                import shutil
                shutil.copy(config_example, config_path)
                self.print_status("", "OK")
            else:
                self.print_status("", "FAIL")
                raise FileNotFoundError("Missing config.py and config.example.py files")

        # Import database configuration
        sys.path.insert(0, str(self.backend_dir))
        from config import Config
        
        try:
            from sqlalchemy import create_engine, inspect
            
            # Ensure database directory exists
            Config.DB_PATH.parent.mkdir(exist_ok=True)
            
            # Create engine and test connection
            engine = create_engine(Config.SQLALCHEMY_DATABASE_URI)
            inspector = inspect(engine)
            tables = inspector.get_table_names()
            
            # Store current DB state
            self.state['db_version'] = {
                'tables': tables,
                'columns': {
                    table: [col['name'] for col in inspector.get_columns(table)]
                    for table in tables
                }
            }
            
            self.print_status("", "OK")
            
        except Exception as e:
            self.print_status("", "FAIL")
            raise ConnectionError(f"Database setup failed: {str(e)}")

    def run_migrations(self):
        self.print_status("Checking database migrations...", end="")
        os.chdir(str(self.backend_dir))
        
        try:
            needs_init = not (self.backend_dir / 'migrations').exists()
            if needs_init:
                self.print_status("", "INFO")
                self.print_status("Initializing database migrations...", end="")
                subprocess.check_call(
                    ['flask', 'db', 'init'],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
                self.print_status("", "OK")

            # Check if we need to generate a new migration
            if self.state.get('needs_migration'):
                self.print_status("Generating new migration...", end="")
                subprocess.check_call(
                    ['flask', 'db', 'migrate', '-m', f"Auto-migration {datetime.now().isoformat()}"],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
                self.print_status("", "OK")

            # Apply migrations
            self.print_status("Applying database migrations...", end="")
            subprocess.check_call(
                ['flask', 'db', 'upgrade'],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            self.print_status("", "OK")

            # Update state
            self.state['last_migration'] = datetime.now().isoformat()
            self.state['needs_migration'] = False
            
        except subprocess.CalledProcessError as e:
            self.print_status("", "FAIL")
            raise RuntimeError(f"Migration failed: {str(e)}")

    def verify_database_state(self):
        """Verify database is in a consistent state"""
        self.print_status("Verifying database state...", end="")
        
        try:
            # Import models
            from models.user import User
            from models.race_history import RaceHistory
            
            # Verify tables exist and have correct schema
            sys.path.insert(0, str(self.backend_dir))
            from config import Config
            from sqlalchemy import create_engine, inspect
            
            engine = create_engine(Config.SQLALCHEMY_DATABASE_URI)
            inspector = inspect(engine)
            
            # Add your verification logic here
            required_tables = {'user', 'race_history'}
            existing_tables = set(inspector.get_table_names())
            
            if not required_tables.issubset(existing_tables):
                missing = required_tables - existing_tables
                self.print_status("", "FAIL")
                raise RuntimeError(f"Missing tables: {missing}")
                
            self.print_status("", "OK")
            
        except Exception as e:
            self.print_status("", "FAIL")
            raise RuntimeError(f"Database verification failed: {str(e)}")

    def start_server(self, debug=True):
        self.print_status("Starting game server...", "INFO")
        os.chdir(str(self.backend_dir))
        
        # Set environment variables
        os.environ['FLASK_APP'] = 'app.py'
        if debug:
            os.environ['FLASK_ENV'] = 'development'
            
        # Open browser after a short delay
        def open_browser():
            time.sleep(2)
            webbrowser.open('http://localhost:5000')
            
        if debug:
            from threading import Thread
            Thread(target=open_browser).start()
            
        # Start the server
        try:
            subprocess.check_call(['flask', 'run'])
        except KeyboardInterrupt:
            self.print_status("Server stopped by user", "INFO")
        except Exception as e:
            self.print_status("Server failed to start", "FAIL")
            raise e

    def setup_and_run(self, debug=True):
        try:
            print("\n=== Space Racing Game Server Setup ===\n")
            self.check_python_version()
            self.check_directory_structure()
            self.check_dependencies()
            self.check_database()
            self.run_migrations()
            self.verify_database_state()
            
            # Save setup state
            self.state['last_setup'] = datetime.now().isoformat()
            self.save_state()
            
            print("\n=== Setup Complete ===\n")
            self.start_server(debug)
            
        except Exception as e:
            self.print_error(f"Setup failed: {str(e)}")
            sys.exit(1)

    def print_error(self, message):
        """Print error message with fallback for non-Unicode terminals"""
        try:
            print(f"\n❌ {message}")
        except UnicodeEncodeError:
            print(f"\n[ERROR] {message}")

    def print_success(self, message):
        """Print success message with fallback for non-Unicode terminals"""
        try:
            print(f"\n✓ {message}")
        except UnicodeEncodeError:
            print(f"\n[SUCCESS] {message}")

    def optimize_database(self):
        """Run database optimization tasks"""
        self.print_status("Optimizing database...", end="")
        
        try:
            from sqlalchemy import create_engine, text
            from config import Config
            
            engine = create_engine(Config.SQLALCHEMY_DATABASE_URI)
            with engine.connect() as conn:
                # Run VACUUM to reclaim space and defragment
                conn.execute(text('VACUUM'))
                
                # Analyze tables for query optimization
                conn.execute(text('ANALYZE'))
                
                # Optimize indexes
                conn.execute(text('PRAGMA optimize'))
                
            self.print_status("", "OK")
            
        except Exception as e:
            self.print_status("", "FAIL")
            raise RuntimeError(f"Database optimization failed: {str(e)}")

    def backup_database(self, note=None):
        """Create a database backup"""
        self.print_status("Creating database backup...", end="")
        
        try:
            from utils.backup import DatabaseBackup
            from config import Config
            
            backup_dir = Config.DB_PATH.parent / 'backups'
            backup = DatabaseBackup(Config.DB_PATH, backup_dir)
            backup_path, metadata = backup.create_backup(note)
            
            self.print_status("", "OK")
            print(f"\nBackup created: {backup_path}")
            print(f"Tables backed up: {', '.join(metadata['tables'].keys())}")
            print(f"Total size: {metadata['size'] / 1024 / 1024:.2f} MB")
            if note:
                print(f"Note: {note}")
            
        except Exception as e:
            self.print_status("", "FAIL")
            raise RuntimeError(f"Backup failed: {str(e)}")

    def restore_database(self, backup_name):
        """Restore database from backup"""
        self.print_status(f"Restoring database from {backup_name}...", end="")
        
        try:
            from utils.backup import DatabaseBackup
            from config import Config
            
            backup_dir = Config.DB_PATH.parent / 'backups'
            backup = DatabaseBackup(Config.DB_PATH, backup_dir)
            
            backup_path = backup_dir / backup_name
            backup.restore_backup(backup_path)
            
            self.print_status("", "OK")
            print("\nDatabase restored successfully!")
            
        except Exception as e:
            self.print_status("", "FAIL")
            raise RuntimeError(f"Restore failed: {str(e)}")

    def list_backups(self):
        """List available database backups"""
        try:
            from utils.backup import DatabaseBackup
            from config import Config
            
            backup_dir = Config.DB_PATH.parent / 'backups'
            backup = DatabaseBackup(Config.DB_PATH, backup_dir)
            backups = backup.list_backups()
            
            if not backups:
                print("\nNo backups found.")
                return
            
            print("\nAvailable backups:")
            for b in backups:
                meta = b['metadata']
                print(f"\n{b['file']}")
                print(f"  Created: {meta['timestamp']}")
                print(f"  Size: {meta['size'] / 1024 / 1024:.2f} MB")
                print(f"  Tables: {', '.join(meta['tables'].keys())}")
                if meta['note']:
                    print(f"  Note: {meta['note']}")
            
        except Exception as e:
            raise RuntimeError(f"Failed to list backups: {str(e)}")

def main():
    parser = argparse.ArgumentParser(description='Game Server Management Script')
    parser.add_argument('--no-debug', action='store_true', help='Run in production mode')
    parser.add_argument('--check-only', action='store_true', help='Only run checks without starting server')
    parser.add_argument('--force-migrate', action='store_true', help='Force database migration')
    parser.add_argument('--optimize-db', action='store_true', 
                       help='Run database optimizations')
    parser.add_argument('--backup', action='store_true',
                       help='Create a database backup')
    parser.add_argument('--backup-note',
                       help='Add a note to the backup')
    parser.add_argument('--restore',
                       help='Restore database from backup file')
    parser.add_argument('--list-backups', action='store_true',
                       help='List available backups')
    args = parser.parse_args()

    try:
        manager = GameServerManager()
        
        if args.force_migrate:
            manager.state['needs_migration'] = True
        
        if args.backup:
            manager.backup_database(args.backup_note)
        elif args.restore:
            manager.restore_database(args.restore)
        elif args.list_backups:
            manager.list_backups()
        elif args.check_only:
            print("\n=== Running System Checks ===\n")
            manager.check_python_version()
            manager.check_directory_structure()
            manager.check_dependencies()
            manager.check_database()
            manager.verify_database_state()
            manager.print_success("All checks passed successfully!")
        else:
            if args.optimize_db:
                manager.optimize_database()
            manager.setup_and_run(debug=not args.no_debug)
            
    except Exception as e:
        manager.print_error(f"Operation failed: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main() 
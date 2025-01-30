import os
import sys
import importlib
from pathlib import Path

# Get the current directory
current_dir = Path(__file__).parent
print(f"\nDebug: Routes directory is {current_dir}")

def debug_import(module_name, package):
    """Helper function to debug imports"""
    print(f"\nTrying to import {module_name} from {package}")
    try:
        module = importlib.import_module(module_name, package)
        print(f"Successfully imported {module_name}")
        print(f"Module location: {module.__file__}")
        print(f"Module contents: {dir(module)}")
        return module
    except Exception as e:
        print(f"Error importing {module_name}: {str(e)}")
        print(f"Current sys.path: {sys.path}")
        raise

# Import blueprints using their 'bp' name
try:
    print("\nDebug: Starting blueprint imports")
    
    # Try importing each blueprint
    auth = debug_import('.auth', 'backend.routes')
    game = debug_import('.game', 'backend.routes')
    api = debug_import('.api', 'backend.routes')
    
    print("\nDebug: Getting blueprint objects")
    # Get the blueprints
    auth_bp = getattr(auth, 'bp', None)
    if auth_bp is None:
        print(f"Warning: 'bp' not found in auth module. Available attributes: {dir(auth)}")
    game_bp = getattr(game, 'bp', None)
    if game_bp is None:
        print(f"Warning: 'bp' not found in game module. Available attributes: {dir(game)}")
    api_bp = getattr(api, 'bp', None)
    if api_bp is None:
        print(f"Warning: 'bp' not found in api module. Available attributes: {dir(api)}")
    
    print("\nDebug: Blueprint imports complete")
    
except ImportError as e:
    print(f"\nError importing blueprints: {e}")
    print(f"Current working directory: {os.getcwd()}")
    print(f"Python path: {sys.path}")
    raise

# Export the blueprint names
__all__ = ['auth_bp', 'game_bp', 'api_bp']

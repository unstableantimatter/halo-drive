import os
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

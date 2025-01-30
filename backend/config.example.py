import os
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
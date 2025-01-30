# This file can be empty since models are imported in backend/__init__.py
# Do not import db here to avoid circular imports

from backend import db  # Import db from backend package

# Track registered models to prevent duplicates
_registered_models = set()

# Make sure init_models is in __all__
__all__ = ['db', 'init_models', 'is_model_registered']

def init_models():
    """Initialize models in correct dependency order"""
    global _registered_models
    _registered_models.clear()
    
    # Import models - order matters for foreign key relationships
    from .user import User
    from .ship import Ship
    from .course import Course
    from .game import Game
    from .game_session import GameSession
    from .race_history import RaceHistory
    from .leaderboard import Leaderboard
    from .course_record import CourseRecord
    
    # Register models in order
    models = {
        'User': User,
        'Ship': Ship,
        'Course': Course,
        'Game': Game,
        'GameSession': GameSession,
        'RaceHistory': RaceHistory,
        'Leaderboard': Leaderboard,
        'CourseRecord': CourseRecord
    }
    
    # Add to registered models set
    for model in models.values():
        _registered_models.add(model.__name__)
    
    return models

def is_model_registered(model_name):
    """Check if a model has already been registered"""
    return model_name in _registered_models

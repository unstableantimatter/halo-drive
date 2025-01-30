class GameConfig:
    """Game-specific configuration."""
    # Ship configurations
    SHIPS = {
        'default': {
            'name': 'Standard Ship',
            'stats': {
                'acceleration': 1.0,
                'max_speed': 1.0,
                'handling': 1.0,
                'shield_strength': 1.0,
                'energy_capacity': 1.0
            },
            'required_rating': 0,
            'required_wins': 0
        },
        'advanced': {
            'name': 'Advanced Ship',
            'stats': {
                'acceleration': 1.2,
                'max_speed': 1.2,
                'handling': 1.1,
                'shield_strength': 1.1,
                'energy_capacity': 1.2
            },
            'required_rating': 1200,
            'required_wins': 10
        }
    }
    
    # Course configurations
    COURSES = {
        'tutorial': {
            'name': 'Tutorial Track',
            'difficulty': 'easy',
            'par_time': 60.0,
            'required_rating': 0,
            'checkpoints': [
                {'x': 100, 'y': 100},
                {'x': 300, 'y': 300},
                {'x': 500, 'y': 100}
            ]
        },
        'beginner': {
            'name': 'Beginner Circuit',
            'difficulty': 'easy',
            'par_time': 90.0,
            'required_rating': 0,
            'checkpoints': [
                {'x': 100, 'y': 100},
                {'x': 300, 'y': 300},
                {'x': 500, 'y': 100},
                {'x': 700, 'y': 300}
            ]
        }
    } 
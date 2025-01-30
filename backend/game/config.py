class GameConfig:
    # Ship configurations
    SHIPS = {
        1: {
            'name': 'Stellar Scout',
            'acceleration': 1.2,
            'max_speed': 500,
            'handling': 1.5,
            'fuel_capacity': 1000
        },
        2: {
            'name': 'Nova Runner',
            'acceleration': 1.5,
            'max_speed': 600,
            'handling': 1.2,
            'fuel_capacity': 800
        },
        3: {
            'name': 'Gravity Master',
            'acceleration': 1.0,
            'max_speed': 450,
            'handling': 2.0,
            'fuel_capacity': 1200
        },
        4: {
            'name': 'Quantum Dart',
            'acceleration': 2.0,
            'max_speed': 700,
            'handling': 1.0,
            'fuel_capacity': 600
        }
    }

    # Race courses
    COURSES = {
        1: {
            'name': 'Nebula Nexus',
            'difficulty': 1,
            'gravitational_bodies': 5,
            'length': 10000
        },
        2: {
            'name': 'Pulsar Paradise',
            'difficulty': 2,
            'gravitational_bodies': 7,
            'length': 12000
        },
        3: {
            'name': 'Black Hole Boulevard',
            'difficulty': 3,
            'gravitational_bodies': 8,
            'length': 15000
        },
        4: {
            'name': 'Asteroid Alley',
            'difficulty': 4,
            'gravitational_bodies': 10,
            'length': 18000
        },
        5: {
            'name': 'Supernova Sprint',
            'difficulty': 5,
            'gravitational_bodies': 12,
            'length': 20000
        }
    }

    # Physics constants
    PHYSICS = {
        'base_gravity': 9.81,
        'fuel_consumption_rate': 1.0,
        'boost_multiplier': 2.0,
        'drag_coefficient': 0.1,
        'angular_velocity': 3.0
    }

    # Multiplayer settings
    MULTIPLAYER = {
        'max_players': 4,
        'countdown_time': 5,
        'min_players_to_start': 2,
        'max_wait_time': 60
    } 
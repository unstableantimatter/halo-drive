from flask import Blueprint, render_template, jsonify, request
from flask_login import login_required, current_user
from backend.models.ship import Ship
from backend.models.course import Course
from backend.models.leaderboard import Leaderboard
from backend.game.matchmaking import GameConfig, matchmaking_queue
from backend.models import db
from backend.models.user import User
import uuid

# Remove url_prefix to handle root route
bp = Blueprint('game', __name__)

@bp.route('/')
def index():
    """Landing page"""
    return render_template('index.html')

@bp.route('/menu')
@login_required
def menu():
    """Game menu"""
    try:
        global_ranking = db.session.query(User).filter(
            User.rating > current_user.rating
        ).count() + 1
    except Exception:
        global_ranking = 0
    
    # Get available ships
    try:
        ships = Ship.query.all()
        if not ships:  # If no ships exist, create default ones
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
                    required_rating=0
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
                    required_rating=1200
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
                    required_rating=1500
                ),
                Ship(
                    name="Default Ship",
                    description="Basic starter ship",
                    sprite_key="default_ship.png",
                    max_speed=50,
                    acceleration=50,
                    handling=50,
                    shield_strength=50,
                    energy_capacity=50,
                    required_rating=0
                )
            ]
            for ship in ships:
                db.session.add(ship)
            db.session.commit()
        
        ships = [ship.to_dict() for ship in ships]
        
    except Exception as e:
        print(f"Error loading ships: {e}")
        ships = [{
            'id': 0,
            'name': 'Default Ship',
            'description': 'Basic starter ship',
            'sprite_key': 'default_ship.png',
            'required_rating': 0,
            'stats': {
                'max_speed': 50,
                'acceleration': 50,
                'handling': 50,
                'shield_strength': 50,
                'energy_capacity': 50
            },
            'unlocked': True
        }]
    
    return render_template('game/menu.html',
                         user=current_user,
                         global_ranking=global_ranking,
                         ships=ships)

@bp.route('/leaderboard')
def leaderboard():
    """Global leaderboard"""
    leaderboard_entries = Leaderboard.query.order_by(
        Leaderboard.rating.desc()
    ).limit(100).all()
    
    return render_template('game/leaderboard.html',
                         entries=leaderboard_entries)

@bp.route('/play')
@login_required
def play():
    """Main game view"""
    game_mode = request.args.get('mode', 'single')
    ship_id = request.args.get('ship_id')
    
    # Get selected ship or default
    if ship_id:
        ship = Ship.query.get(ship_id)
    else:
        ship = Ship.query.filter_by(required_rating=0).first()
    
    # Convert ship to dict for template
    ship_data = ship.to_dict() if ship else None
    
    return render_template('game/play.html',
                         user=current_user,
                         ship=ship_data,
                         game_mode=game_mode)

@bp.route('/api/ships')
@login_required
def get_ships():
    """Get available ships for current user"""
    ships = Ship.query.all()
    available_ships = []
    
    for ship in ships:
        if (current_user.rating >= ship.required_rating and 
            current_user.wins >= ship.required_wins):
            available_ships.append({
                'id': ship.id,
                'name': ship.name,
                'description': ship.description,
                'required_rating': ship.required_rating,
                'stats': {
                    'acceleration': ship.acceleration,
                    'max_speed': ship.max_speed,
                    'handling': ship.handling,
                    'shield_strength': ship.shield_strength,
                    'energy_capacity': ship.energy_capacity
                },
                'sprite_key': ship.sprite_key
            })
    
    return jsonify(available_ships)

@bp.route('/api/courses')
@login_required
def get_courses():
    """Get available courses for current user"""
    courses = Course.query.all()
    available_courses = []
    
    for course in courses:
        if current_user.rating >= course.required_rating:
            available_courses.append({
                'id': course.id,
                'name': course.name,
                'description': course.description,
                'difficulty': course.difficulty,
                'par_time': course.par_time,
                'thumbnail_key': course.thumbnail_key
            })
    
    return jsonify(available_courses)

@bp.route('/api/matchmaking/join', methods=['POST'])
@login_required
def join_matchmaking():
    """Join matchmaking queue"""
    data = request.get_json()
    ship_id = data.get('ship_id')
    course_id = data.get('course_id')
    
    # Add to matchmaking queue
    matchmaking_queue.add_player({
        'user_id': current_user.id,
        'rating': current_user.rating,
        'ship_id': ship_id
    })
    
    return jsonify({'status': 'queued'})

@bp.route('/api/matchmaking/status')
@login_required
def matchmaking_status():
    """Get current matchmaking status"""
    status = matchmaking_queue.get_status(current_user.id)
    return jsonify(status)

@bp.route('/test')
def test_route():
    return jsonify({
        'status': 'ok',
        'message': 'Game server is running!',
        'socket_status': 'enabled'
    })

@bp.route('/create_lobby', methods=['POST'])
@login_required
def create_lobby():
    """Create a new game lobby"""
    lobby_id = str(uuid.uuid4())
    # Add lobby creation logic here
    return jsonify({'lobby_id': lobby_id})

@bp.route('/lobby')
@login_required
def lobby():
    """Show lobby page"""
    lobby_id = request.args.get('id')
    lobby_code = request.args.get('code')
    return render_template('game/lobby.html', 
                         lobby_id=lobby_id,
                         lobby_code=lobby_code)

@bp.route('/lobbies')
@login_required
def lobbies():
    """Show lobby browser"""
    return render_template('game/lobbies.html') 
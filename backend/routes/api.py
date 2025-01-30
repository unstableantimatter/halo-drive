from flask import Blueprint, jsonify, request, current_app
from flask_login import login_required, current_user
from datetime import datetime
from backend.app import db
from backend.models.game_session import GameSession
from backend.models.game import Game
from backend.models.leaderboard import Leaderboard
from backend.game.matchmaking import MatchmakingQueue
import os
from werkzeug.utils import secure_filename
import time

bp = Blueprint('api', __name__, url_prefix='/api')
matchmaking_queue = MatchmakingQueue()

# Game Session Management
@bp.route('/game/create', methods=['POST'])
@login_required
def create_game():
    data = request.get_json()
    
    # Create game first
    game = GameSession(
        track_id=data['courseId'],
        status='waiting',
        max_players=data.get('maxPlayers', 8)
    )
    db.session.add(game)
    db.session.flush()  # Get game.id
    
    # Create session for the player
    session = GameSession(
        game_id=game.id,
        user_id=current_user.id,
        ship_id=data['shipId'],
        is_ready=True
    )
    db.session.add(session)
    db.session.commit()
    
    return jsonify(session.to_dict())

@bp.route('/game/<int:game_id>/join', methods=['POST'])
@login_required
def join_game(game_id):
    data = request.get_json()
    game = GameSession.query.get_or_404(game_id)
    
    if game.status != 'waiting':
        return jsonify({'error': 'Game already in progress'}), 400
    
    session = GameSession(
        game_id=game_id,
        user_id=current_user.id,
        ship_id=data['shipId']
    )
    db.session.add(session)
    db.session.commit()
    
    return jsonify(session.to_dict())

# Matchmaking System
@bp.route('/matchmaking/queue', methods=['POST'])
@login_required
def join_matchmaking():
    data = request.get_json()
    matchmaking_queue.add_player(current_user.id, data.get('shipId'))
    return jsonify({'status': 'queued'})

@bp.route('/matchmaking/status', methods=['GET'])
@login_required
def matchmaking_status():
    status = matchmaking_queue.get_status(current_user.id)
    return jsonify(status)

@bp.route('/matchmaking/cancel', methods=['POST'])
@login_required
def cancel_matchmaking():
    matchmaking_queue.remove_player(current_user.id)
    return jsonify({'status': 'cancelled'})

# Lobby Management
@bp.route('/lobbies', methods=['GET'])
@login_required
def list_lobbies():
    games = Game.query.filter_by(
        status='waiting'
    ).all()
    return jsonify([{
        'id': game.id,
        'track_id': game.track_id,
        'status': game.status,
        'player_count': len(game.sessions),
        'max_players': game.max_players,
        'created_at': game.created_at.isoformat(),
        'players': [{
            'user_id': session.user_id,
            'username': session.user.username,
            'ship_id': session.ship_id,
            'is_ready': session.is_ready
        } for session in game.sessions]
    } for game in games])

# Time Trials
@bp.route('/timetrials/records', methods=['GET'])
@login_required
def time_trial_records():
    track_id = request.args.get('track_id')
    query = GameSession.query.join(Game).filter(
        Game.status == 'completed'
    ).order_by(GameSession.finish_time)
    
    if track_id:
        query = query.filter(Game.track_id == track_id)
    
    records = query.limit(10).all()
    return jsonify([{
        'user_id': record.user_id,
        'username': record.user.username,
        'finish_time': record.finish_time,
        'ship_id': record.ship_id,
        'track_id': record.game.track_id,
        'date': record.game.end_time.isoformat()
    } for record in records])

# Game Progress Updates
@bp.route('/game/<int:game_id>/ready', methods=['POST'])
@login_required
def player_ready(game_id):
    session = GameSession.query.filter_by(
        game_id=game_id,
        user_id=current_user.id
    ).first_or_404()
    
    session.is_ready = True
    db.session.commit()
    
    # Check if all players are ready
    game = GameSession.query.get(game_id)
    all_ready = all(s.is_ready for s in game.sessions)
    
    if all_ready:
        game.status = 'in_progress'
        game.start_time = datetime.utcnow()
        db.session.commit()
    
    return jsonify(session.to_dict())

@bp.route('/game/<int:session_id>/finish', methods=['POST'])
@login_required
def finish_race(session_id):
    data = request.get_json()
    session = GameSession.query.get(session_id)
    if session:
        session.completion_time = data['completionTime']
        session.fuel_remaining = data['fuelRemaining']
        session.position = data['position']
        
        if all(s.position for s in session.sessions):
            session.status = 'completed'
            session.completed_at = datetime.utcnow()
            
            # Update leaderboard
            leaderboard = Leaderboard.query.filter_by(user_id=current_user.id).first()
            if leaderboard:
                leaderboard.total_races += 1
                if session.position == 1:
                    leaderboard.wins += 1
                if not leaderboard.best_time or session.completion_time < leaderboard.best_time:
                    leaderboard.best_time = session.completion_time
        
        db.session.commit()
    return jsonify(session.to_dict())

@bp.route('/upload/gif', methods=['POST'])
@login_required
def upload_gif():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if file:
        filename = secure_filename(f'highlight_{current_user.id}_{int(time.time())}.gif')
        filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Generate public URL
        public_url = f"{request.host_url}uploads/{filename}"
        
        return jsonify({
            'url': public_url
        }) 
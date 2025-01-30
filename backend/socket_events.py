from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect
from flask_login import current_user
from backend import socketio, db
from backend.models.game_session import GameSession
from backend.models.game import Game
from backend.models.race_history import RaceHistory
from backend.models.leaderboard import Leaderboard
import json
import uuid
from datetime import datetime, timedelta

# Active game tracking
active_games = {}  # {game_id: {player_states: {}, last_updates: {}, disconnected_players: {}}}

# Constants
CLEANUP_INTERVAL = 30  # seconds
RECONNECT_TIMEOUT = 60  # seconds to allow for reconnection
INACTIVE_TIMEOUT = 30  # seconds before considering a player inactive

def cleanup_inactive_games():
    """Clean up inactive games and sessions"""
    try:
        with db.session.begin():
            # Find inactive games
            cutoff = datetime.utcnow() - timedelta(minutes=5)
            inactive_games = Game.query.filter(
                (Game.status == 'waiting') & 
                (Game.created_at < cutoff)
            ).all()
            
            # Delete inactive games
            for game in inactive_games:
                db.session.delete(game)
            
            # Find disconnected sessions
            inactive_sessions = GameSession.query.filter_by(
                is_connected=False
            ).all()
            
            # Delete inactive sessions
            for session in inactive_sessions:
                db.session.delete(session)
                
    except Exception as e:
        print(f"Error in cleanup_inactive_games: {e}")
        db.session.rollback()

def end_game_early(game_id):
    """End a game early due to too many disconnections"""
    game = Game.query.get(game_id)
    if not game:
        return
    
    game.status = 'completed'
    game.end_time = datetime.utcnow()
    
    # Mark disconnected players as DNF
    for session in game.sessions:
        if not session.is_connected:
            session.dnf = True
    
    db.session.commit()
    
    # Notify remaining players
    emit('game_ended_early', {
        'reason': 'too_many_disconnections'
    }, room=f'game_{game_id}')
    
    # Clean up game state
    if game_id in active_games:
        del active_games[game_id]

def handle_player_disconnect(game_id, user_id):
    """Handle player disconnection"""
    game = Game.query.get(game_id)
    if not game:
        return
        
    if game_id not in active_games:
        return
        
    game_state = active_games[game_id]
    
    # Track disconnect time
    if 'disconnected_players' not in game_state:
        game_state['disconnected_players'] = {}
    game_state['disconnected_players'][user_id] = datetime.utcnow()
    
    # Save current state
    if user_id in game_state['player_states']:
        game_state['last_states'] = game_state['last_states'] or {}
        game_state['last_states'][user_id] = game_state['player_states'][user_id]
    
    # Notify other players
    emit('player_disconnected', {
        'user_id': user_id,
        'reconnect_timeout': RECONNECT_TIMEOUT
    }, room=f'game_{game_id}')

def handle_player_timeout(game_id, user_id):
    """Handle player timeout (didn't reconnect in time)"""
    game = Game.query.get(game_id)
    if not game:
        return
        
    session = GameSession.query.filter_by(
        game_id=game_id,
        user_id=user_id
    ).first()
    
    if session:
        session.dnf = True
        db.session.commit()
    
    # Remove from tracking
    if game_id in active_games:
        game_state = active_games[game_id]
        if 'disconnected_players' in game_state:
            game_state['disconnected_players'].pop(user_id, None)
        game_state['player_states'].pop(user_id, None)
        game_state['last_updates'].pop(user_id, None)
    
    # Notify other players
    emit('player_timeout', {
        'user_id': user_id
    }, room=f'game_{game_id}')

@socketio.on('connect')
def handle_connect():
    if not current_user.is_authenticated:
        return False
    
    # Check for active sessions
    sessions = GameSession.query.filter_by(
        user_id=current_user.id,
        is_connected=False
    ).all()
    
    active_session = None
    for session in sessions:
        if session.game.status in ['waiting', 'in_progress']:
            active_session = session
            break
    
    if active_session:
        # Handle reconnection
        game_id = active_session.game_id
        if game_id in active_games:
            game_state = active_games[game_id]
            
            # Remove from disconnected players
            if 'disconnected_players' in game_state:
                game_state['disconnected_players'].pop(current_user.id, None)
            
            # Restore last state if exists
            if 'last_states' in game_state and current_user.id in game_state['last_states']:
                game_state['player_states'][current_user.id] = game_state['last_states'][current_user.id]
            
            # Update connection status
            active_session.is_connected = True
            db.session.commit()
            
            # Join game room
            join_room(f'game_{game_id}')
            
            # Notify other players
            emit('player_reconnected', {
                'user_id': current_user.id,
                'state': game_state['player_states'].get(current_user.id)
            }, room=f'game_{game_id}')
            
            # Send current game state to reconnected player
            emit('game_state', {
                'id': active_session.game_id,
                'track_id': active_session.game.track_id,
                'status': active_session.game.status,
                'players': [{
                    'user_id': s.user_id,
                    'username': s.user.username,
                    'ship_id': s.ship_id,
                    'is_ready': s.is_ready,
                    'state': game_state['player_states'].get(s.user_id)
                } for s in active_session.game.sessions]
            })
    
    emit('connection_success', {'user_id': current_user.id})

@socketio.on('disconnect')
def handle_disconnect():
    if not current_user.is_authenticated:
        return
    
    # Find active game sessions
    sessions = GameSession.query.filter_by(
        user_id=current_user.id,
        is_connected=True
    ).all()
    
    for session in sessions:
        if session.game.status in ['waiting', 'in_progress']:
            # Mark as disconnected
            session.is_connected = False
            db.session.commit()
            
            # Handle disconnect in game state
            handle_player_disconnect(session.game_id, current_user.id)
    
    # Leave all rooms
    for game_id in active_games:
        leave_room(f'game_{game_id}')
    leave_room(f'user_{current_user.id}')

@socketio.on('join_game')
def handle_join_game(data):
    game_id = data['game_id']
    game = Game.query.get(game_id)
    
    if game and game.status == 'waiting' and not game.is_full():
        # Get or create session
        session = GameSession.query.filter_by(
            game_id=game_id,
            user_id=current_user.id
        ).first()
        
        if not session:
            session = GameSession(
                game_id=game_id,
                user_id=current_user.id,
                ship_id=data.get('ship_id')
            )
            db.session.add(session)
            db.session.commit()
        
        # Join game room
        join_room(f'game_{game_id}')
        
        # Initialize player state tracking
        if game_id not in active_games:
            active_games[game_id] = {
                'player_states': {},
                'last_updates': {}
            }
        
        # Notify others
        emit('player_joined', {
            'user_id': current_user.id,
            'username': current_user.username,
            'ship_id': session.ship_id
        }, room=f'game_{game_id}')

@socketio.on('game_update')
def handle_game_update(data):
    game_id = data['game_id']
    if game_id in active_games:
        state = {
            'position': data['position'],
            'velocity': data['velocity'],
            'fuel': data['fuel'],
            'timestamp': datetime.utcnow().timestamp()
        }
        
        active_games[game_id]['player_states'][current_user.id] = state
        active_games[game_id]['last_updates'][current_user.id] = datetime.utcnow()
        
        # Broadcast to other players
        emit('player_update', {
            'user_id': current_user.id,
            **state
        }, room=f'game_{game_id}')

@socketio.on('race_finished')
def handle_race_finished(data):
    game_id = data['game_id']
    game = Game.query.get(game_id)
    
    if game and game.status == 'in_progress':
        session = GameSession.query.filter_by(
            game_id=game_id,
            user_id=current_user.id
        ).first()
        
        if session:
            # Update session results
            session.finish_time = data['time']
            session.position = data['position']
            session.fuel_remaining = data.get('fuel_remaining')
            
            # Create race history entry
            race = RaceHistory(
                user_id=current_user.id,
                game_id=game_id,
                track_id=game.track_id,
                ship_id=session.ship_id,
                completion_time=session.finish_time,
                position=session.position,
                completed=True,
                replay_data=data.get('replay_data')
            )
            db.session.add(race)
            
            # Check if race is complete
            all_finished = all(s.finish_time is not None for s in game.sessions)
            if all_finished:
                game.status = 'completed'
                game.end_time = datetime.utcnow()
                
                # Update ratings for all players
                update_ratings(game)
            
            db.session.commit()
            
            # Notify players
            emit('race_results', {
                'position': session.position,
                'time': session.finish_time,
                'rating_change': race.rating_change
            }, room=f'game_{game_id}')

@socketio.on('spectate_game')
def handle_spectate(data):
    game_id = data['game_id']
    game = Game.query.get(game_id)
    
    if game and game.status != 'completed':
        join_room(f'game_{game_id}_spectators')
        
        # Send current game state
        emit('game_state', {
            'id': game.id,
            'track_id': game.track_id,
            'status': game.status,
            'players': [{
                'user_id': session.user_id,
                'username': session.user.username,
                'ship_id': session.ship_id,
                'is_ready': session.is_ready,
                'position': session.position,
                'finish_time': session.finish_time,
                'state': active_games.get(game_id, {}).get('player_states', {}).get(session.user_id)
            } for session in game.sessions]
        })

def update_ratings(game):
    """Update ratings for all players in a completed game"""
    sessions = sorted(
        game.sessions,
        key=lambda s: (s.finish_time is None, s.finish_time or float('inf'))
    )
    
    for i, session in enumerate(sessions):
        position = i + 1
        rating_change = calculate_rating_change(
            session.user.rating,
            position,
            [{
                'user_id': s.user_id,
                'rating': s.user.rating,
                'position': j + 1
            } for j, s in enumerate(sessions)]
        )
        
        # Update user rating
        session.user.rating += rating_change
        
        # Update race history rating change
        race = RaceHistory.query.filter_by(
            game_id=game.id,
            user_id=session.user_id
        ).first()
        if race:
            race.rating_change = rating_change

def calculate_rating_change(player_rating, position, players):
    """Calculate ELO-based rating change"""
    expected_scores = []
    actual_scores = []
    K = 32  # Rating change factor
    
    for p in players:
        if p['user_id'] != current_user.id:
            rating_diff = (p['rating'] - player_rating) / 400.0
            expected_score = 1 / (1 + 10 ** rating_diff)
            expected_scores.append(expected_score)
            actual_scores.append(1.0 if position < p['position'] else 0.0)
    
    rating_change = K * sum(a - e for a, e in zip(actual_scores, expected_scores))
    return int(rating_change)

@socketio.on('party_message')
def handle_party_message(data):
    party_id = data['party_id']
    message = data['message']
    matchmaking_queue.send_party_message(party_id, current_user.id, message)

@socketio.on('party_action')
def handle_party_action(data):
    action = data['action']
    party_id = data['party_id']
    target_id = data.get('target_id')
    
    if action == 'kick':
        matchmaking_queue.kick_member(party_id, current_user.id, target_id)
    elif action == 'leave':
        matchmaking_queue.leave_party(party_id, current_user.id)
    elif action == 'spectate':
        matchmaking_queue.add_spectator(party_id, current_user.id)

@socketio.on('add_reaction')
def handle_reaction(data):
    timestamp = data['timestamp']
    emoji = data['emoji']
    game_id = data['gameId']
    
    # Broadcast the reaction to all spectators
    emit('reaction_added', {
        'timestamp': timestamp,
        'emoji': emoji,
        'userId': current_user.id,
        'username': current_user.username
    }, room=f'game_{game_id}_spectators')

@socketio.on('add_comment')
def handle_comment(data):
    timestamp = data['timestamp']
    comment = data['message']
    game_id = data['gameId']
    
    emit('comment_added', {
        'timestamp': timestamp,
        'userId': current_user.id,
        'comment': comment
    }, room=f'game_{game_id}_spectators')

@socketio.on('join_matchmaking')
def handle_join_matchmaking(data):
    ship_id = data.get('ship_id')
    course_id = data.get('course_id')
    
    # Add to matchmaking queue
    player = {
        'user_id': current_user.id,
        'username': current_user.username,
        'rating': current_user.rating,
        'ship_id': ship_id
    }
    
    matchmaking_queue.append(player)
    check_matchmaking(course_id)

def check_matchmaking(course_id):
    if len(matchmaking_queue) >= 2:
        # Create game with first 4 players in queue
        players = matchmaking_queue[:4]
        del matchmaking_queue[:4]
        
        # Create game and sessions
        game_id = create_game_session(players, course_id)
        
        # Notify players
        for player in players:
            emit('match_found', {
                'game_id': game_id,
                'players': [p for p in players if p['user_id'] != player['user_id']]
            }, room=f"user_{player['user_id']}")

@socketio.on('game_state')
def handle_game_state(data):
    session_id = data['session_id']
    if session_id in active_sessions:
        session = active_sessions[session_id]
        session['states'][current_user.id] = data['state']
        
        # Broadcast to other players in session
        emit('game_state_update', {
            'player_id': current_user.id,
            'state': data['state']
        }, room=session_id)

@socketio.on('race_complete')
def handle_race_complete(data):
    game_id = data['game_id']
    finish_time = data['time']
    position = data['position']
    
    # Update game session
    game = Game.query.get(game_id)
    session = GameSession.query.filter_by(
        game_id=game_id,
        user_id=current_user.id
    ).first()
    
    session.finish_time = finish_time
    session.position = position
    
    # Create race history entry
    race = RaceHistory(
        user_id=current_user.id,
        game_id=game_id,
        track_id=game.track_id,
        ship_id=session.ship_id,
        completion_time=finish_time,
        position=position,
        completed=True,
        replay_data=data.get('replay_data')
    )
    
    db.session.add(race)
    db.session.commit()
    
    # Calculate and update ratings
    update_ratings(game)
    
    emit('race_results', {
        'position': position,
        'time': finish_time,
        'rating_change': race.rating_change
    }, room=current_user.id)

def create_game_session(players, course_id):
    """Create a new game and associated sessions"""
    # Create the game
    game = Game(
        track_id=course_id,
        status='waiting',
        max_players=len(players)
    )
    db.session.add(game)
    
    # Create sessions for each player
    for player in players:
        session = GameSession(
            game=game,
            user_id=player['user_id'],
            ship_id=player['ship_id']
        )
        db.session.add(session)
    
    db.session.commit()
    return game.id 
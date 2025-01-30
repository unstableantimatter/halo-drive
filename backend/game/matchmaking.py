from datetime import datetime
from collections import defaultdict
from threading import Lock
from flask_socketio import emit
from backend.app import socketio, db
from backend.models.game_session import GameSession
from backend.models.leaderboard import Leaderboard
from backend.config import Config
from statistics import mean
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from backend.models.game import Game

@dataclass
class Party:
    id: str
    leader_id: int
    members: List[int]
    ship_ids: dict  # {user_id: ship_id}
    ready: bool = False
    chat_history: List[dict] = field(default_factory=list)  # [{user_id, message, timestamp}]
    spectators: List[int] = field(default_factory=list)
    
    def add_chat_message(self, user_id: int, message: str):
        self.chat_history.append({
            'user_id': user_id,
            'message': message,
            'timestamp': datetime.utcnow().isoformat()
        })
        if len(self.chat_history) > 50:  # Keep last 50 messages
            self.chat_history.pop(0)

@dataclass
class GameConfig:
    """Game configuration settings"""
    # Ship configurations
    SHIPS = {
        'basic': {
            'name': 'Basic Ship',
            'description': 'A reliable starter ship',
            'stats': {
                'max_speed': 100.0,
                'acceleration': 10.0,
                'handling': 5.0,
                'shield_strength': 100.0,
                'energy_capacity': 100.0
            },
            'requirements': {
                'rating': 0,
                'wins': 0
            }
        },
        'advanced': {
            'name': 'Advanced Ship',
            'description': 'A high-performance racing ship',
            'stats': {
                'max_speed': 150.0,
                'acceleration': 15.0,
                'handling': 7.0,
                'shield_strength': 80.0,
                'energy_capacity': 120.0
            },
            'requirements': {
                'rating': 1000,
                'wins': 5
            }
        }
    }

    # Course configurations
    COURSES = {
        'tutorial': {
            'name': 'Tutorial Track',
            'description': 'A simple track for beginners',
            'difficulty': 'easy',
            'checkpoints': [
                {'x': 100, 'y': 100},
                {'x': 300, 'y': 300},
                {'x': 500, 'y': 100}
            ],
            'par_time': 60.0,
            'required_rating': 0
        },
        'beginner': {
            'name': 'Beginner Circuit',
            'description': 'A basic racing circuit',
            'difficulty': 'easy',
            'checkpoints': [
                {'x': 100, 'y': 100},
                {'x': 300, 'y': 300},
                {'x': 500, 'y': 100},
                {'x': 700, 'y': 300}
            ],
            'par_time': 90.0,
            'required_rating': 0
        }
    }

    # Matchmaking settings
    MAX_RATING_DIFF = 300
    MIN_PLAYERS = 2
    MAX_PLAYERS = 8
    MATCHMAKING_TIMEOUT = 60  # seconds

class MatchmakingQueue:
    """Handles matchmaking queue and party management"""
    def __init__(self):
        self.queued_players = {}  # {user_id: PlayerQueueEntry}
        self.parties = {}  # {party_id: Party}
        self.lock = Lock()
        self.rating_buckets = defaultdict(list)  # {rating_range: [user_ids]}
        self.queue: List[Dict[str, Any]] = []
        self.last_check = datetime.utcnow()
    
    class PlayerQueueEntry:
        def __init__(self, user_id, ship_id, rating, party_id=None):
            self.user_id = user_id
            self.ship_id = ship_id
            self.rating = rating
            self.join_time = datetime.utcnow()
            self.matched_session = None
            self.party_id = party_id
    
    def create_party(self, leader_id: int) -> str:
        party_id = f"party_{leader_id}_{datetime.utcnow().timestamp()}"
        party = Party(
            id=party_id,
            leader_id=leader_id,
            members=[leader_id],
            ship_ids={}
        )
        self.parties[party_id] = party
        return party_id
    
    def join_party(self, party_id: str, user_id: int) -> bool:
        party = self.parties.get(party_id)
        if party and len(party.members) < Config.MATCHMAKING_MAX_PLAYERS:
            party.members.append(user_id)
            socketio.emit('party_updated', party.__dict__, room=f'party_{party_id}')
            return True
        return False
    
    def set_ship(self, party_id: str, user_id: int, ship_id: int) -> bool:
        party = self.parties.get(party_id)
        if party and user_id in party.members:
            party.ship_ids[user_id] = ship_id
            socketio.emit('party_updated', party.__dict__, room=f'party_{party_id}')
            return True
        return False
    
    def add_party_to_queue(self, party_id: str) -> bool:
        with self.lock:
            party = self.parties.get(party_id)
            if not party or not all(uid in party.ship_ids for uid in party.members):
                return False
            
            # Calculate average party rating
            ratings = [
                Leaderboard.query.filter_by(user_id=uid).first().rating or 1000
                for uid in party.members
            ]
            avg_rating = mean(ratings)
            
            # Add all party members to queue
            for user_id in party.members:
                entry = self.PlayerQueueEntry(
                    user_id=user_id,
                    ship_id=party.ship_ids[user_id],
                    rating=avg_rating,
                    party_id=party_id
                )
                self.queued_players[user_id] = entry
            
            bucket = (avg_rating // Config.MATCHMAKING_RATING_RANGE) * Config.MATCHMAKING_RATING_RANGE
            self.rating_buckets[bucket].extend(party.members)
            
            self._try_create_match(bucket)
            return True
    
    def remove_player(self, user_id):
        with self.lock:
            if user_id in self.queued_players:
                entry = self.queued_players[user_id]
                bucket = (entry.rating // Config.MATCHMAKING_RATING_RANGE) * Config.MATCHMAKING_RATING_RANGE
                self.rating_buckets[bucket].remove(user_id)
                del self.queued_players[user_id]
                return True
            return False
    
    def get_status(self, user_id):
        entry = self.queued_players.get(user_id)
        if not entry:
            return {'status': 'not_queued'}
        
        if entry.matched_session:
            return {
                'status': 'match_found',
                'gameId': entry.matched_session,
                'matchReady': True
            }
        
        wait_time = (datetime.utcnow() - entry.join_time).total_seconds()
        players_in_range = len(self.rating_buckets[
            (entry.rating // Config.MATCHMAKING_RATING_RANGE) * Config.MATCHMAKING_RATING_RANGE
        ])
        
        return {
            'status': 'searching',
            'waitTime': wait_time,
            'playersInQueue': players_in_range,
            'estimatedWait': max(0, Config.MATCHMAKING_MAX_WAIT - wait_time)
        }
    
    def _try_create_match(self, rating_bucket):
        players_in_bucket = self.rating_buckets[rating_bucket]
        parties_in_bucket = self._group_by_party(players_in_bucket)
        
        if self._can_create_match(parties_in_bucket):
            selected_parties = self._select_parties(parties_in_bucket)
            self._create_match_with_parties(selected_parties)
    
    def _group_by_party(self, player_ids):
        parties = defaultdict(list)
        for pid in player_ids:
            entry = self.queued_players[pid]
            parties[entry.party_id or pid].append(pid)
        return parties
    
    def _can_create_match(self, parties):
        total_players = sum(len(members) for members in parties.values())
        return Config.MATCHMAKING_MIN_PLAYERS <= total_players <= Config.MATCHMAKING_MAX_PLAYERS
    
    def _select_parties(self, parties):
        # Implementation of _select_parties method
        pass
    
    def _create_match_with_parties(self, selected_parties):
        """Create a game and sessions for matched parties"""
        # Flatten all players from selected parties
        all_players = []
        for party_id, members in selected_parties.items():
            all_players.extend(members)
        
        # Create the game
        game = Game(
            track_id='random',  # You might want to implement track selection
            status='waiting',
            max_players=len(all_players)
        )
        db.session.add(game)
        db.session.flush()  # Get game.id
        
        # Create sessions for all players
        for user_id in all_players:
            entry = self.queued_players[user_id]
            session = GameSession(
                game_id=game.id,
                user_id=user_id,
                ship_id=entry.ship_id
            )
            db.session.add(session)
            
            # Update player entry with matched session
            entry.matched_session = game.id
        
        db.session.commit()
        
        # Notify all players
        for user_id in all_players:
            socketio.emit('match_found', {
                'game_id': game.id,
                'track_id': game.track_id,
                'players': [{
                    'user_id': s.user_id,
                    'username': s.user.username,
                    'ship_id': s.ship_id
                } for s in game.sessions if s.user_id != user_id]
            }, room=f'user_{user_id}')
        
        return game.id

    def _notify_matched_players(self, game_id):
        """Notify players about match details"""
        game = Game.query.get(game_id)
        if not game:
            return
        
        for session in game.sessions:
            socketio.emit('match_found', {
                'game_id': game.id,
                'track_id': game.track_id,
                'players': [{
                    'user_id': s.user_id,
                    'username': s.user.username,
                    'ship_id': s.ship_id,
                    'is_ready': s.is_ready
                } for s in game.sessions if s.user_id != session.user_id]
            }, room=f'user_{session.user_id}')
    
    def kick_member(self, party_id: str, leader_id: int, target_id: int) -> bool:
        party = self.parties.get(party_id)
        if not party or party.leader_id != leader_id:
            return False
        
        if target_id in party.members:
            party.members.remove(target_id)
            if target_id in party.ship_ids:
                del party.ship_ids[target_id]
        
            socketio.emit('party_updated', party.__dict__, room=f'party_{party_id}')
            socketio.emit('party_kicked', {}, room=f'user_{target_id}')
            return True
        return False
    
    def leave_party(self, party_id: str, user_id: int) -> bool:
        party = self.parties.get(party_id)
        if not party or user_id not in party.members:
            return False
        
        party.members.remove(user_id)
        if user_id in party.ship_ids:
            del party.ship_ids[user_id]
        
        if user_id == party.leader_id and party.members:
            party.leader_id = party.members[0]  # Transfer leadership
        
        if not party.members:
            del self.parties[party_id]  # Delete empty party
        else:
            socketio.emit('party_updated', party.__dict__, room=f'party_{party_id}')
        
        return True
    
    def add_spectator(self, party_id: str, user_id: int) -> bool:
        party = self.parties.get(party_id)
        if not party or user_id in party.members:
            return False
        
        if user_id not in party.spectators:
            party.spectators.append(user_id)
            socketio.emit('party_updated', party.__dict__, room=f'party_{party_id}')
        return True
    
    def send_party_message(self, party_id: str, user_id: int, message: str) -> bool:
        party = self.parties.get(party_id)
        if not party or (user_id not in party.members and user_id not in party.spectators):
            return False
        
        party.add_chat_message(user_id, message)
        socketio.emit('party_message', {
            'user_id': user_id,
            'message': message,
            'timestamp': datetime.utcnow().isoformat()
        }, room=f'party_{party_id}')
        return True

    def add_player(self, player_data: Dict[str, Any]) -> None:
        """Add a player to the matchmaking queue"""
        self.queue.append({
            'user_id': player_data['user_id'],
            'rating': player_data['rating'],
            'ship_id': player_data.get('ship_id'),
            'joined_at': datetime.utcnow(),
            'party_id': player_data.get('party_id')
        })
    
    def find_match(self, course_id: str) -> List[Dict[str, Any]]:
        """Find suitable players for a match"""
        if len(self.queue) < GameConfig.MIN_PLAYERS:
            return []
        
        # Sort by wait time
        self.queue.sort(key=lambda x: x['joined_at'])
        
        # Find players with similar ratings
        anchor = self.queue[0]
        match = [anchor]
        
        for player in self.queue[1:]:
            if len(match) >= GameConfig.MAX_PLAYERS:
                break
                
            # Check rating difference
            if abs(player['rating'] - anchor['rating']) <= GameConfig.MAX_RATING_DIFF:
                match.append(player)
        
        # Only return if we have enough players
        if len(match) >= GameConfig.MIN_PLAYERS:
            # Remove matched players from queue
            for player in match:
                self.remove_player(player['user_id'])
            return match
            
        return []

# Create global queue instance
matchmaking_queue = MatchmakingQueue() 
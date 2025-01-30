from flask import Blueprint, request, jsonify, render_template, redirect, url_for, flash
from flask_login import login_user, logout_user, login_required, current_user
from backend.models.user import User
from backend import db
from werkzeug.security import generate_password_hash

print("\nDebug: Creating auth blueprint")
bp = Blueprint('auth', __name__, url_prefix='/auth')
print(f"Debug: Created auth blueprint: {bp}")

@bp.route('/debug')
def debug():
    """Debug route to verify blueprint is working"""
    return jsonify({
        'message': 'Auth blueprint is working',
        'blueprint_name': bp.name,
        'url_prefix': bp.url_prefix
    })

@bp.route('/register', methods=['GET', 'POST'])
def register():
    """Handle user registration"""
    if current_user.is_authenticated:
        return redirect(url_for('game.menu'))
        
    if request.method == 'GET':
        return render_template('auth/register.html')
    
    data = request.get_json()
    
    # Check if user exists
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 400
    
    # Create new user
    user = User(
        username=data['username'],
        email=data['email']
    )
    user.set_password(data['password'])
    
    try:
        db.session.add(user)
        db.session.commit()
        return jsonify({'message': 'User created successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@bp.route('/login', methods=['GET', 'POST'])
def login():
    """Handle user login"""
    if current_user.is_authenticated:
        return redirect(url_for('game.menu'))
        
    if request.method == 'GET':
        return render_template('auth/login.html')
    
    # Handle both form data and JSON
    if request.is_json:
        data = request.get_json()
    else:
        data = request.form
    
    user = User.query.filter_by(username=data.get('username')).first()
    
    if user and user.check_password(data.get('password')):
        login_user(user)
        if request.is_json:
            return jsonify({
                'id': user.id,
                'username': user.username,
                'rating': user.rating
            })
        return redirect(url_for('game.menu'))
    
    if request.is_json:
        return jsonify({'error': 'Invalid username or password'}), 401
    
    flash('Invalid username or password', 'error')
    return redirect(url_for('auth.login'))

@bp.route('/logout')
@login_required
def logout():
    """Handle user logout"""
    logout_user()
    return redirect(url_for('game.index'))

@bp.route('/me')
@login_required
def get_current_user():
    """Get current user info"""
    return jsonify({
        'id': current_user.id,
        'username': current_user.username,
        'rating': current_user.rating,
        'races_completed': current_user.races_completed,
        'wins': current_user.wins
    })

@bp.route('/profile')
@login_required
def profile():
    """Show user profile page"""
    return render_template('auth/profile.html', user=current_user) 
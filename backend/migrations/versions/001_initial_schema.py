"""Initial schema

Revision ID: 001
Revises: None
Create Date: 2024-01-20 12:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '001'
down_revision = None

def upgrade():
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(80), unique=True, nullable=False),
        sa.Column('email', sa.String(120), unique=True, nullable=False),
        sa.Column('password_hash', sa.String(128)),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
        sa.Column('rating', sa.Integer(), default=1000),
        sa.Column('races_completed', sa.Integer(), default=0),
        sa.Column('wins', sa.Integer(), default=0),
        sa.Column('best_time', sa.Float()),
        sa.PrimaryKeyConstraint('id')
    )

    # Create ships table
    op.create_table(
        'ships',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(80), unique=True, nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('acceleration', sa.Float(), nullable=False),
        sa.Column('max_speed', sa.Float(), nullable=False),
        sa.Column('handling', sa.Float(), nullable=False),
        sa.Column('shield_strength', sa.Float(), nullable=False),
        sa.Column('boost_capacity', sa.Float(), nullable=False),
        sa.Column('required_rating', sa.Integer(), default=0),
        sa.Column('required_wins', sa.Integer(), default=0),
        sa.Column('sprite_key', sa.String(80), nullable=False),
        sa.Column('engine_position', postgresql.JSON()),
        sa.Column('collision_bounds', postgresql.JSON()),
        sa.PrimaryKeyConstraint('id')
    )

    # Create courses table
    op.create_table(
        'courses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(80), unique=True, nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('difficulty', sa.String(20), nullable=False),
        sa.Column('checkpoints', postgresql.JSON(), nullable=False),
        sa.Column('gravity_wells', postgresql.JSON()),
        sa.Column('obstacles', postgresql.JSON()),
        sa.Column('length', sa.Float(), nullable=False),
        sa.Column('par_time', sa.Float(), nullable=False),
        sa.Column('required_rating', sa.Integer(), default=0),
        sa.Column('required_courses', postgresql.JSON()),
        sa.Column('background_key', sa.String(80)),
        sa.Column('thumbnail_key', sa.String(80)),
        sa.PrimaryKeyConstraint('id')
    )

    # Create race_history table
    op.create_table(
        'race_history',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('course_id', sa.Integer(), sa.ForeignKey('courses.id'), nullable=False),
        sa.Column('ship_id', sa.Integer(), sa.ForeignKey('ships.id')),
        sa.Column('finish_time', sa.Float()),
        sa.Column('position', sa.Integer()),
        sa.Column('completed', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()')),
        sa.Column('rating_change', sa.Integer()),
        sa.Column('replay_data', postgresql.JSON()),
        sa.PrimaryKeyConstraint('id')
    )

    # Create leaderboards table
    op.create_table(
        'leaderboards',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('rating', sa.Integer(), default=1000),
        sa.Column('rank', sa.Integer()),
        sa.Column('total_races', sa.Integer(), default=0),
        sa.Column('wins', sa.Integer(), default=0),
        sa.Column('best_times', postgresql.JSON(), default=dict),
        sa.Column('last_updated', sa.DateTime(), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id')
    )

def downgrade():
    op.drop_table('leaderboards')
    op.drop_table('race_history')
    op.drop_table('courses')
    op.drop_table('ships')
    op.drop_table('users') 
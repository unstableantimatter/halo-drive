"""update course records structure

Revision ID: update_course_records
Revises: 
Create Date: 2024-02-20
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

def upgrade():
    # Drop old table
    op.drop_table('course_records')
    
    # Create new table with correct structure
    op.create_table('course_records',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('track_id', sa.String(length=50), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('ship_id', sa.Integer(), nullable=False),
        sa.Column('best_time', sa.Float(), nullable=False),
        sa.Column('date_achieved', sa.DateTime(), nullable=True),
        sa.Column('replay_data', sqlite.JSON(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('track_id', name='unique_track_record')
    )
    op.create_index('idx_course_time', 'course_records', ['track_id', 'best_time'])

def downgrade():
    op.drop_table('course_records') 
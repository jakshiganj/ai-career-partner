"""Add auth_provider and reset tokens

Revision ID: 8f4e2280fe33
Revises: 13a2c7482061
Create Date: 2026-05-14 00:50:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = '8f4e2280fe33'
down_revision: Union[str, Sequence[str], None] = '13a2c7482061'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Add auth_provider with default 'email' for existing rows
    op.add_column('users', sa.Column('auth_provider', sa.String(), nullable=True, server_default='email'))
    # Add password reset fields
    op.add_column('users', sa.Column('reset_token', sa.String(), nullable=True))
    op.add_column('users', sa.Column('reset_token_expires', sa.DateTime(), nullable=True))

def downgrade() -> None:
    op.drop_column('users', 'reset_token_expires')
    op.drop_column('users', 'reset_token')
    op.drop_column('users', 'auth_provider')

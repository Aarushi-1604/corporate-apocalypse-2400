"""add sit and nonsit registration fields to players table

Revision ID: 3a9e1b2c4d5e
Revises: 227c1ff91039
Create Date: 2026-10-08 14:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3a9e1b2c4d5e'
down_revision: Union[str, Sequence[str], None] = '227c1ff91039'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'players',
        sa.Column('registration_type', sa.Text(), server_default='SIT', nullable=False)
    )
    op.add_column(
        'players',
        sa.Column('phone_number', sa.Text(), nullable=True)
    )
    op.add_column(
        'players',
        sa.Column('institution_name', sa.Text(), nullable=True)
    )
    op.alter_column('players', 'prn', existing_type=sa.Text(), nullable=True)
    op.alter_column('players', 'email', existing_type=sa.Text(), nullable=True)
    op.alter_column('players', 'department', existing_type=sa.Text(), nullable=True)
    op.alter_column('players', 'year_of_study', existing_type=sa.Text(), nullable=True)


def downgrade() -> None:
    op.alter_column('players', 'year_of_study', existing_type=sa.Text(), nullable=False)
    op.alter_column('players', 'department', existing_type=sa.Text(), nullable=False)
    op.alter_column('players', 'email', existing_type=sa.Text(), nullable=False)
    op.alter_column('players', 'prn', existing_type=sa.Text(), nullable=False)
    op.drop_column('players', 'institution_name')
    op.drop_column('players', 'phone_number')
    op.drop_column('players', 'registration_type')

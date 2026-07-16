"""fix ts to timestamptz in position_reports and aircraft_positions

Revision ID: 6828efc9c5b6
Revises: 0003
Create Date: 2026-07-16 23:28:43.596501

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '6828efc9c5b6'
down_revision: Union[str, None] = '0003'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        'position_reports', 'ts',
        type_=sa.TIMESTAMP(timezone=True),
        existing_type=sa.TIMESTAMP(timezone=False),
        postgresql_using='ts AT TIME ZONE \'UTC\'',
    )
    op.alter_column(
        'aircraft_positions', 'ts',
        type_=sa.TIMESTAMP(timezone=True),
        existing_type=sa.TIMESTAMP(timezone=False),
        postgresql_using='ts AT TIME ZONE \'UTC\'',
    )


def downgrade() -> None:
    op.alter_column(
        'aircraft_positions', 'ts',
        type_=sa.TIMESTAMP(timezone=False),
        existing_type=sa.TIMESTAMP(timezone=True),
    )
    op.alter_column(
        'position_reports', 'ts',
        type_=sa.TIMESTAMP(timezone=False),
        existing_type=sa.TIMESTAMP(timezone=True),
    )

"""add aircraft vertical_rate + origin_country columns

Revision ID: d1004_aircraft_extend
Revises: d1003_vessel_events
Create Date: 2026-07-19

"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "d1004_aircraft_extend"
down_revision: Union[str, None] = "d1003_vessel_events"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("aircraft_positions", sa.Column("vertical_rate", sa.Float(), nullable=True))
    op.add_column("aircraft_positions", sa.Column("origin_country", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("aircraft_positions", "origin_country")
    op.drop_column("aircraft_positions", "vertical_rate")

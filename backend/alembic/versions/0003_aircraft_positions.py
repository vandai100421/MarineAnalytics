"""aircraft_positions hypertable

Revision ID: 0003
Revises: 0002
Create Date: 2026-07-16

"""

from typing import Union
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "aircraft_positions",
        sa.Column("hex", sa.Text, nullable=False),
        sa.Column("ts", sa.DateTime(timezone=True), nullable=False),
        sa.Column("lat", sa.Float, nullable=False),
        sa.Column("lon", sa.Float, nullable=False),
        sa.Column("alt", sa.Float),
        sa.Column("gs", sa.Float),
        sa.Column("track", sa.Float),
        sa.Column("flight", sa.Text),
        sa.Column("reg", sa.Text),
        sa.Column("type", sa.Text),
    )
    op.create_index("idx_aircraft_hex_ts", "aircraft_positions", ["hex", "ts"])
    op.execute("SELECT create_hypertable('aircraft_positions', 'ts', if_not_exists => TRUE)")


def downgrade() -> None:
    op.drop_table("aircraft_positions")

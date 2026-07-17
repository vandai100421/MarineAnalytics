"""idle_events table (hypertable)

Revision ID: b1003_idle
Revises: b1002_seed
Create Date: 2026-07-17

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b1003_idle"
down_revision: Union[str, None] = "b1002_seed"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "idle_events",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("mmsi", sa.BigInteger, nullable=False, index=True),
        sa.Column("start_ts", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_ts", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_minutes", sa.Float, nullable=True),
        sa.Column("start_lat", sa.Float, nullable=False),
        sa.Column("start_lon", sa.Float, nullable=False),
        sa.Column("end_lat", sa.Float, nullable=True),
        sa.Column("end_lon", sa.Float, nullable=True),
        sa.Column("avg_sog", sa.Float, nullable=True),
        sa.Column("max_sog", sa.Float, nullable=True),
    )
    op.create_index("idx_idle_mmsi_start", "idle_events", ["mmsi", sa.text("start_ts DESC")])
    op.create_index("idx_idle_start_lat_lon", "idle_events", ["start_ts", "start_lat", "start_lon"])
    op.execute(
        "DO $$ BEGIN "
        "IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN "
        "PERFORM create_hypertable('idle_events', 'start_ts', if_not_exists => TRUE); "
        "PERFORM add_compression_policy('idle_events', INTERVAL '7 days'); "
        "PERFORM add_retention_policy('idle_events', INTERVAL '90 days'); "
        "END IF; "
        "END $$"
    )


def downgrade() -> None:
    op.drop_table("idle_events")

"""add vessel_events table for anomaly detection

Revision ID: d1003_vessel_events
Revises: d1002_port_calls
Create Date: 2026-07-19

"""

import sqlalchemy as sa
from alembic import op
from collections.abc import Sequence
from typing import Union

revision: str = "d1003_vessel_events"
down_revision: Union[str, None] = "d1001_vessel_particulars"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "vessel_events",
        sa.Column("id", sa.BigInteger(), primary_key=True),
        sa.Column("mmsi", sa.BigInteger(), nullable=False),
        sa.Column("event_type", sa.Text(), nullable=False),
        sa.Column("ts", sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("lat", sa.Float(), nullable=True),
        sa.Column("lon", sa.Float(), nullable=True),
        sa.Column("severity", sa.Text(), nullable=False, server_default=sa.text("'info'")),
        sa.Column("details", sa.JSON(), nullable=True),
    )
    op.create_index(
        "idx_vessel_events_mmsi",
        "vessel_events",
        ["mmsi", sa.text("ts DESC")],
    )
    op.create_index(
        "idx_vessel_events_type",
        "vessel_events",
        ["event_type", sa.text("ts DESC")],
    )


def downgrade() -> None:
    op.drop_index("idx_vessel_events_type", table_name="vessel_events")
    op.drop_index("idx_vessel_events_mmsi", table_name="vessel_events")
    op.drop_table("vessel_events")

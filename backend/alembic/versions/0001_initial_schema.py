"""initial schema: vessels, position_reports, geofences, alerts

Revision ID: 0001
Revises:
Create Date: 2026-07-16

"""

from typing import Union
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from geoalchemy2 import Geography

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "vessels",
        sa.Column("mmsi", sa.BigInteger, primary_key=True),
        sa.Column("name", sa.Text),
        sa.Column("ship_type", sa.SmallInteger),
        sa.Column("ship_type_name", sa.Text),
        sa.Column("callsign", sa.Text),
        sa.Column("imo", sa.BigInteger),
        sa.Column("dim_a", sa.SmallInteger),
        sa.Column("dim_b", sa.SmallInteger),
        sa.Column("dim_c", sa.SmallInteger),
        sa.Column("dim_d", sa.SmallInteger),
        sa.Column("destination", sa.Text),
        sa.Column("eta", sa.DateTime(timezone=True)),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "position_reports",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("mmsi", sa.BigInteger, nullable=False),
        sa.Column("ts", sa.DateTime(timezone=True), nullable=False),
        sa.Column("lat", sa.Float, nullable=False),
        sa.Column("lon", sa.Float, nullable=False),
        sa.Column("sog", sa.Float),
        sa.Column("cog", sa.Float),
        sa.Column("heading", sa.Float),
        sa.Column("nav_status", sa.SmallInteger),
        sa.Column("rot", sa.Float),
        sa.Column("source", sa.Text, server_default="aisstream"),
    )
    op.create_index("idx_pos_mmsi_ts", "position_reports", ["mmsi", "ts"])

    op.execute("SELECT create_hypertable('position_reports', 'ts', if_not_exists => TRUE)")

    op.create_table(
        "geofences",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("name", sa.String, nullable=False),
        sa.Column("type", sa.String, nullable=False),
        sa.Column("geom", Geography("POLYGON", srid=4326), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "alerts",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("mmsi", sa.BigInteger, nullable=False),
        sa.Column(
            "geofence_id",
            sa.Integer,
            sa.ForeignKey("geofences.id", name="fk_alerts_geofences"),
        ),
        sa.Column("ts", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("event_type", sa.String, nullable=False),
        sa.Column("lat", sa.Float),
        sa.Column("lon", sa.Float),
    )
    op.create_index("idx_alerts_ts", "alerts", ["ts"])


def downgrade() -> None:
    op.drop_table("alerts")
    op.drop_table("geofences")
    op.drop_table("position_reports")
    op.drop_table("vessels")

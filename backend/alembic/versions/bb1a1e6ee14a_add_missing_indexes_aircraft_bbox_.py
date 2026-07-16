"""add missing indexes aircraft bbox + alerts geofence

Revision ID: bb1a1e6ee14a
Revises: e0d077546415
Create Date: 2026-07-16 23:34:39.193930

"""

from typing import Sequence, Union

from alembic import op


revision: str = "bb1a1e6ee14a"
down_revision: Union[str, None] = "e0d077546415"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_index(
        "idx_aircraft_ts_lat_lon",
        "aircraft_positions",
        ["ts", "lat", "lon"],
        if_not_exists=True,
    )
    op.create_index(
        "idx_alerts_geofence_ts",
        "alerts",
        ["geofence_id", "ts"],
        if_not_exists=True,
    )


def downgrade() -> None:
    op.drop_index("idx_alerts_geofence_ts", if_exists=True)
    op.drop_index("idx_aircraft_ts_lat_lon", if_exists=True)

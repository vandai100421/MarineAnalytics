"""ports + port_arrivals tables (hypertable)

Revision ID: b1001_ports
Revises: a1001_photo
Create Date: 2026-07-17

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from geoalchemy2 import Geography

revision: str = "b1001_ports"
down_revision: Union[str, None] = "a1001_photo"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ports",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("country_code", sa.String(2)),
        sa.Column("unlocode", sa.Text),
        sa.Column("lat", sa.Float, nullable=False),
        sa.Column("lon", sa.Float, nullable=False),
        sa.Column("radius_m", sa.Integer, server_default="5000"),
        sa.Column("type", sa.Text, server_default="sea_port"),
        sa.Column("geom", Geography("POINT", srid=4326), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_ports_geom ON ports USING GIST (geom)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_ports_country ON ports (country_code)"
    )

    op.create_table(
        "port_arrivals",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("mmsi", sa.BigInteger, nullable=False),
        sa.Column(
            "port_id",
            sa.Integer,
            sa.ForeignKey("ports.id", name="fk_port_arrivals_ports", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("arrived_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("departed_at", sa.DateTime(timezone=True)),
        sa.Column("dwell_minutes", sa.Float),
        sa.Column("anchorage", sa.Boolean, server_default="false"),
        sa.Column("lat", sa.Float),
        sa.Column("lon", sa.Float),
    )
    op.create_index(
        "idx_port_arrivals_port_time",
        "port_arrivals",
        ["port_id", "arrived_at"],
    )
    op.create_index(
        "idx_port_arrivals_mmsi",
        "port_arrivals",
        ["mmsi", "arrived_at"],
    )
    op.execute(
        "DO $$ BEGIN "
        "IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN "
        "PERFORM create_hypertable('port_arrivals', 'arrived_at', if_not_exists => TRUE); "
        "END IF; "
        "END $$"
    )


def downgrade() -> None:
    op.drop_table("port_arrivals")
    op.drop_index("idx_ports_country", if_exists=True)
    op.drop_index("idx_ports_geom", if_exists=True)
    op.drop_table("ports")

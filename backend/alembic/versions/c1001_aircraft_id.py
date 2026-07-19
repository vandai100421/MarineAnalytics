"""add id column to aircraft_positions

Revision ID: c1001_aircraft_id
Revises: b1004_fleets
Create Date: 2026-07-19

"""
from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "c1001_aircraft_id"
down_revision: Union[str, None] = "b1004_fleets"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        "CREATE SEQUENCE IF NOT EXISTS aircraft_positions_id_seq START 1"
    )
    op.add_column(
        "aircraft_positions",
        sa.Column(
            "id",
            sa.BigInteger,
            nullable=False,
            server_default=sa.text("nextval('aircraft_positions_id_seq')"),
        ),
    )
    op.execute("SELECT setval('aircraft_positions_id_seq', COALESCE((SELECT MAX(id) FROM aircraft_positions), 1))")
    op.create_primary_key("aircraft_positions_pkey", "aircraft_positions", ["id"])


def downgrade() -> None:
    op.drop_constraint("aircraft_positions_pkey", "aircraft_positions", type_="primary")
    op.drop_column("aircraft_positions", "id")
    op.execute("DROP SEQUENCE IF EXISTS aircraft_positions_id_seq")

"""fleets + fleet_members tables

Revision ID: b1004_fleets
Revises: b1003_idle
Create Date: 2026-07-17

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b1004_fleets"
down_revision: Union[str, None] = "b1003_idle"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "fleets",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("color", sa.String(7), nullable=False, server_default="#3b82f6"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_fleets_name", "fleets", ["name"])

    op.create_table(
        "fleet_members",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column(
            "fleet_id",
            sa.Integer,
            sa.ForeignKey("fleets.id", name="fk_fleet_members_fleets", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("mmsi", sa.BigInteger, nullable=False),
        sa.Column("added_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("fleet_id", "mmsi", name="uq_fleet_member"),
    )
    op.create_index("idx_fleet_members_mmsi", "fleet_members", ["mmsi"])
    op.create_index("idx_fleet_members_fleet", "fleet_members", ["fleet_id"])


def downgrade() -> None:
    op.drop_table("fleet_members")
    op.drop_table("fleets")

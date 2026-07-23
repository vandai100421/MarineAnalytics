"""add vessel particulars columns

Revision ID: d1001_vessel_particulars
Revises: c1001_aircraft_id
Create Date: 2026-07-19

"""

from collections.abc import Sequence
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "d1001_vessel_particulars"
down_revision: Union[str, None] = "c1001_aircraft_id"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("vessels", sa.Column("gt", sa.Integer(), nullable=True))
    op.add_column("vessels", sa.Column("dwt", sa.Integer(), nullable=True))
    op.add_column("vessels", sa.Column("loa", sa.Float(), nullable=True))
    op.add_column("vessels", sa.Column("beam", sa.Float(), nullable=True))
    op.add_column("vessels", sa.Column("draught_max", sa.Float(), nullable=True))
    op.add_column("vessels", sa.Column("year_built", sa.SmallInteger(), nullable=True))
    op.add_column("vessels", sa.Column("flag", sa.Text(), nullable=True))
    op.add_column("vessels", sa.Column("ais_class", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("vessels", "ais_class")
    op.drop_column("vessels", "flag")
    op.drop_column("vessels", "year_built")
    op.drop_column("vessels", "draught_max")
    op.drop_column("vessels", "beam")
    op.drop_column("vessels", "loa")
    op.drop_column("vessels", "dwt")
    op.drop_column("vessels", "gt")

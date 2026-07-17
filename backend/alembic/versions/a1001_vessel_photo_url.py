"""add vessel photo_url column

Revision ID: a1001_photo
Revises: bb1a1e6ee14a
Create Date: 2026-07-17

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a1001_photo"
down_revision: Union[str, None] = "bb1a1e6ee14a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("vessels", sa.Column("photo_url", sa.Text), schema=None)


def downgrade() -> None:
    op.drop_column("vessels", "photo_url", schema=None)

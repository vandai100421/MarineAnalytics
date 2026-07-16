"""continuous aggregate vessel_counts_hourly

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-16

"""

from typing import Union
from collections.abc import Sequence

from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        CREATE MATERIALIZED VIEW IF NOT EXISTS vessel_counts_hourly
        WITH (timescaledb.continuous) AS
        SELECT
            time_bucket('1 hour', ts) AS bucket,
            mmsi,
            count(*) AS report_count,
            avg(sog) AS avg_sog,
            max(sog) AS max_sog
        FROM position_reports
        GROUP BY bucket, mmsi
        WITH NO DATA
        """
    )
    op.execute(
        "SELECT add_continuous_aggregate_policy("
        "'vessel_counts_hourly', "
        "start_offset => INTERVAL '2 hours', "
        "end_offset => INTERVAL '5 minutes', "
        "schedule_interval => INTERVAL '1 hour')"
    )


def downgrade() -> None:
    op.execute("DROP MATERIALIZED VIEW IF EXISTS vessel_counts_hourly")

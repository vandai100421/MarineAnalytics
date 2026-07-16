"""compression retention policy + daily aggregate

Revision ID: e0d077546415
Revises: 6828efc9c5b6
Create Date: 2026-07-16 23:33:54.041181

"""

from typing import Sequence, Union

from alembic import op


revision: str = "e0d077546415"
down_revision: Union[str, None] = "6828efc9c5b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "DO $$ BEGIN "
        "IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN "
        "ALTER TABLE position_reports SET ("
        "timescaledb.compress, "
        "timescaledb.compress_segmentby = 'mmsi', "
        "timescaledb.compress_orderby = 'ts DESC'); "
        "PERFORM add_compression_policy('position_reports', INTERVAL '7 days'); "
        "PERFORM add_retention_policy('position_reports', INTERVAL '90 days'); "
        "END IF; "
        "END $$"
    )

    op.execute(
        "DO $$ BEGIN "
        "IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN "
        "CREATE MATERIALIZED VIEW IF NOT EXISTS vessel_counts_daily "
        "WITH (timescaledb.continuous) AS "
        "SELECT time_bucket('1 day', ts) AS bucket, mmsi, "
        "count(*) AS report_count, avg(sog) AS avg_sog, max(sog) AS max_sog "
        "FROM position_reports GROUP BY bucket, mmsi WITH NO DATA; "
        "PERFORM add_continuous_aggregate_policy('vessel_counts_daily', "
        "start_offset => INTERVAL '2 days', end_offset => INTERVAL '1 hour', "
        "schedule_interval => INTERVAL '1 day'); "
        "END IF; "
        "END $$"
    )


def downgrade() -> None:
    op.execute("DROP MATERIALIZED VIEW IF EXISTS vessel_counts_daily")
    op.execute(
        "DO $$ BEGIN "
        "IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN "
        "PERFORM remove_retention_policy('position_reports', if_exists => true); "
        "PERFORM remove_compression_policy('position_reports', if_exists => true); "
        "ALTER TABLE position_reports SET (timescaledb.compress = false); "
        "END IF; "
        "END $$"
    )

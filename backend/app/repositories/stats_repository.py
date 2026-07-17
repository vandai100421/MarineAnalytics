from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.models.position import PositionReport

logger = get_logger(__name__)

_CAGG_HOURLY = (
    "SELECT EXISTS (SELECT 1 FROM timescaledb_information.hypertables "
    "WHERE hypertable_name = 'vessel_counts_hourly')"
)
_CAGG_DAILY = (
    "SELECT EXISTS (SELECT 1 FROM timescaledb_information.hypertables "
    "WHERE hypertable_name = 'vessel_counts_daily')"
)


class StatsRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def _cagg_available(self, query: str) -> bool:
        try:
            async with self._session.begin_nested():
                result = await self._session.execute(text(query))
                return bool(result.scalar())
        except Exception as exc:
            logger.warning("cagg_check_failed", error=str(exc))
            return False

    async def get_hourly_counts(self, hours: int = 24) -> list[dict[str, Any]]:
        now = datetime.now(UTC)
        start = now - timedelta(hours=hours)

        if await self._cagg_available(_CAGG_HOURLY):
            stmt = text(
                """
                SELECT bucket AS ts, count(DISTINCT mmsi) AS vessel_count, avg_sog
                FROM vessel_counts_hourly
                WHERE bucket >= :start AND bucket <= :now
                GROUP BY bucket, avg_sog
                ORDER BY bucket ASC
                """
            )
            result = await self._session.execute(stmt, {"start": start, "now": now})
            rows = result.all()
            return [
                {"ts": row[0], "vessel_count": row[1], "avg_sog": float(row[2] or 0)}
                for row in rows
            ]

        return await self._hourly_from_raw(start, now)

    async def _hourly_from_raw(
        self, start: datetime, now: datetime
    ) -> list[dict[str, Any]]:
        hour = func.date_trunc("hour", PositionReport.ts).label("hour")
        stmt = (
            select(
                hour.label("ts"),
                func.count(PositionReport.mmsi.distinct()).label("vessel_count"),
                func.avg(PositionReport.sog).label("avg_sog"),
            )
            .where(PositionReport.ts >= start, PositionReport.ts <= now)
            .group_by(hour)
            .order_by(hour)
        )
        result = await self._session.execute(stmt)
        rows = result.all()
        return [
            {"ts": row[0], "vessel_count": row[1], "avg_sog": float(row[2] or 0)}
            for row in rows
        ]

    async def get_daily_counts(self, days: int = 30) -> list[dict[str, Any]]:
        now = datetime.now(UTC)
        start = now - timedelta(days=days)

        if await self._cagg_available(_CAGG_DAILY):
            stmt = text(
                """
                SELECT bucket AS ts, count(DISTINCT mmsi) AS vessel_count, avg_sog
                FROM vessel_counts_daily
                WHERE bucket >= :start AND bucket <= :now
                GROUP BY bucket, avg_sog
                ORDER BY bucket ASC
                """
            )
            result = await self._session.execute(stmt, {"start": start, "now": now})
            rows = result.all()
            return [
                {"ts": row[0], "vessel_count": row[1], "avg_sog": float(row[2] or 0)}
                for row in rows
            ]

        return await self._daily_from_raw(start, now)

    async def _daily_from_raw(
        self, start: datetime, now: datetime
    ) -> list[dict[str, Any]]:
        day = func.date_trunc("day", PositionReport.ts).label("day")
        stmt = (
            select(
                day.label("ts"),
                func.count(PositionReport.mmsi.distinct()).label("vessel_count"),
                func.avg(PositionReport.sog).label("avg_sog"),
            )
            .where(PositionReport.ts >= start, PositionReport.ts <= now)
            .group_by(day)
            .order_by(day)
        )
        result = await self._session.execute(stmt)
        rows = result.all()
        return [
            {"ts": row[0], "vessel_count": row[1], "avg_sog": float(row[2] or 0)}
            for row in rows
        ]

    async def get_timeseries(self, period: str = "24h") -> list[dict[str, Any]]:
        if period == "24h":
            return await self.get_hourly_counts(24)
        if period == "7d":
            return await self.get_daily_counts(7)
        if period == "30d":
            return await self.get_daily_counts(30)
        return await self.get_hourly_counts(24)

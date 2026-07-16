from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.position import PositionReport

MAX_TRACK_POINTS = 5000


class PositionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_track(
        self,
        mmsi: int,
        time_from: datetime | None = None,
        time_to: datetime | None = None,
        limit: int = MAX_TRACK_POINTS,
    ) -> list[PositionReport]:
        total = await self.count_reports(mmsi, time_from, time_to)
        if total == 0:
            return []

        if total <= limit:
            return await self._query_track(mmsi, time_from, time_to, limit)

        step = max(1, total // limit)
        return await self._query_track_downsampled(mmsi, time_from, time_to, step)

    async def _query_track(
        self,
        mmsi: int,
        time_from: datetime | None,
        time_to: datetime | None,
        limit: int,
    ) -> list[PositionReport]:
        stmt = select(PositionReport).where(PositionReport.mmsi == mmsi)
        if time_from is not None:
            stmt = stmt.where(PositionReport.ts >= time_from)
        if time_to is not None:
            stmt = stmt.where(PositionReport.ts <= time_to)
        stmt = stmt.order_by(PositionReport.ts.asc()).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def _query_track_downsampled(
        self,
        mmsi: int,
        time_from: datetime | None,
        time_to: datetime | None,
        step: int,
    ) -> list[PositionReport]:
        stmt = select(PositionReport).where(PositionReport.mmsi == mmsi)
        if time_from is not None:
            stmt = stmt.where(PositionReport.ts >= time_from)
        if time_to is not None:
            stmt = stmt.where(PositionReport.ts <= time_to)
        stmt = stmt.order_by(PositionReport.ts.asc())
        result = await self._session.execute(stmt)
        all_rows = list(result.scalars().all())
        return all_rows[::step]

    async def count_reports(
        self,
        mmsi: int,
        time_from: datetime | None = None,
        time_to: datetime | None = None,
    ) -> int:
        stmt = select(func.count()).select_from(PositionReport).where(PositionReport.mmsi == mmsi)
        if time_from is not None:
            stmt = stmt.where(PositionReport.ts >= time_from)
        if time_to is not None:
            stmt = stmt.where(PositionReport.ts <= time_to)
        result = await self._session.execute(stmt)
        return result.scalar_one()

    async def get_heatmap_points(
        self,
        time_from: datetime | None = None,
        time_to: datetime | None = None,
        bbox: tuple[float, float, float, float] | None = None,
        limit: int = 10000,
    ) -> list[tuple[float, float]]:
        stmt = select(PositionReport.lat, PositionReport.lon)
        if time_from is not None:
            stmt = stmt.where(PositionReport.ts >= time_from)
        if time_to is not None:
            stmt = stmt.where(PositionReport.ts <= time_to)
        if bbox is not None:
            min_lon, min_lat, max_lon, max_lat = bbox
            stmt = stmt.where(
                PositionReport.lon >= min_lon,
                PositionReport.lon <= max_lon,
                PositionReport.lat >= min_lat,
                PositionReport.lat <= max_lat,
            )
        stmt = stmt.order_by(PositionReport.ts.desc()).limit(limit)
        result = await self._session.execute(stmt)
        return [(row[0], row[1]) for row in result.all()]

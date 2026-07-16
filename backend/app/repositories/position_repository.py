from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.position import PositionReport


class PositionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_track(
        self,
        mmsi: int,
        time_from: datetime | None = None,
        time_to: datetime | None = None,
        limit: int = 5000,
    ) -> list[PositionReport]:
        stmt = select(PositionReport).where(PositionReport.mmsi == mmsi)
        if time_from is not None:
            stmt = stmt.where(PositionReport.ts >= time_from)
        if time_to is not None:
            stmt = stmt.where(PositionReport.ts <= time_to)
        stmt = stmt.order_by(PositionReport.ts.asc()).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

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

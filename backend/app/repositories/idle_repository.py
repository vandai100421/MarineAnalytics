from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.idle import IdleEvent


class IdleRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def start_event(
        self,
        mmsi: int,
        lat: float,
        lon: float,
    ) -> IdleEvent:
        event = IdleEvent(
            mmsi=mmsi,
            start_ts=datetime.now(UTC),
            start_lat=lat,
            start_lon=lon,
        )
        self._session.add(event)
        await self._session.commit()
        await self._session.refresh(event)
        return event

    async def end_event(
        self,
        mmsi: int,
        end_lat: float,
        end_lon: float,
        avg_sog: float,
        max_sog: float,
    ) -> bool:
        stmt = (
            select(IdleEvent)
            .where(IdleEvent.mmsi == mmsi, IdleEvent.end_ts.is_(None))
            .order_by(IdleEvent.start_ts.desc())
            .limit(1)
        )
        result = await self._session.execute(stmt)
        event = result.scalar_one_or_none()
        if event is None:
            return False
        now = datetime.now(UTC)
        duration = (now - event.start_ts).total_seconds() / 60.0
        event.end_ts = now
        event.end_lat = end_lat
        event.end_lon = end_lon
        event.duration_minutes = round(duration, 1)
        event.avg_sog = round(avg_sog, 2)
        event.max_sog = round(max_sog, 2)
        await self._session.commit()
        return True

    async def has_active_event(self, mmsi: int) -> bool:
        stmt = (
            select(func.count())
            .select_from(IdleEvent)
            .where(IdleEvent.mmsi == mmsi, IdleEvent.end_ts.is_(None))
        )
        result = await self._session.execute(stmt)
        return result.scalar_one() > 0

    async def get_events(
        self,
        bbox: tuple[float, float, float, float] | None = None,
        time_from: datetime | None = None,
        time_to: datetime | None = None,
        active_only: bool = False,
        limit: int = 100,
    ) -> list[IdleEvent]:
        stmt = select(IdleEvent)
        if bbox:
            min_lon, min_lat, max_lon, max_lat = bbox
            stmt = stmt.where(
                IdleEvent.start_lon >= min_lon,
                IdleEvent.start_lon <= max_lon,
                IdleEvent.start_lat >= min_lat,
                IdleEvent.start_lat <= max_lat,
            )
        if time_from:
            stmt = stmt.where(IdleEvent.start_ts >= time_from)
        if time_to:
            stmt = stmt.where(IdleEvent.start_ts <= time_to)
        if active_only:
            stmt = stmt.where(IdleEvent.end_ts.is_(None))
        stmt = stmt.order_by(IdleEvent.start_ts.desc()).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_events_for_vessel(
        self,
        mmsi: int,
        time_from: datetime | None = None,
        time_to: datetime | None = None,
        limit: int = 50,
    ) -> list[IdleEvent]:
        stmt = select(IdleEvent).where(IdleEvent.mmsi == mmsi)
        if time_from:
            stmt = stmt.where(IdleEvent.start_ts >= time_from)
        if time_to:
            stmt = stmt.where(IdleEvent.start_ts <= time_to)
        stmt = stmt.order_by(IdleEvent.start_ts.desc()).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_active_idle_count(self) -> int:
        stmt = (
            select(func.count())
            .select_from(IdleEvent)
            .where(IdleEvent.end_ts.is_(None))
        )
        result = await self._session.execute(stmt)
        return result.scalar_one()

    async def get_idle_summary(self) -> dict[str, Any]:
        total_stmt = select(func.count()).select_from(IdleEvent)
        active_stmt = (
            select(func.count())
            .select_from(IdleEvent)
            .where(IdleEvent.end_ts.is_(None))
        )
        avg_duration_stmt = (
            select(func.avg(IdleEvent.duration_minutes))
            .where(IdleEvent.duration_minutes.is_not(None))
        )
        total_result = await self._session.execute(total_stmt)
        active_result = await self._session.execute(active_stmt)
        avg_result = await self._session.execute(avg_duration_stmt)
        return {
            "total_events": total_result.scalar_one(),
            "active_idle": active_result.scalar_one(),
            "avg_duration_minutes": round(float(avg_result.scalar_one() or 0), 1),
        }

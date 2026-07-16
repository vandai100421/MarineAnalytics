from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alert import Alert


class AlertRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        mmsi: int,
        geofence_id: int | None,
        event_type: str,
        lat: float | None = None,
        lon: float | None = None,
    ) -> Alert:
        alert = Alert(
            mmsi=mmsi,
            geofence_id=geofence_id,
            event_type=event_type,
            lat=lat,
            lon=lon,
        )
        self._session.add(alert)
        await self._session.commit()
        await self._session.refresh(alert)
        return alert

    async def get_recent(
        self,
        time_from: datetime | None = None,
        geofence_id: int | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Alert]:
        stmt = select(Alert).order_by(Alert.ts.desc())
        if time_from is not None:
            stmt = stmt.where(Alert.ts >= time_from)
        if geofence_id is not None:
            stmt = stmt.where(Alert.geofence_id == geofence_id)
        stmt = stmt.limit(limit).offset(offset)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def count(
        self,
        time_from: datetime | None = None,
        geofence_id: int | None = None,
    ) -> int:
        stmt = select(func.count()).select_from(Alert)
        if time_from is not None:
            stmt = stmt.where(Alert.ts >= time_from)
        if geofence_id is not None:
            stmt = stmt.where(Alert.geofence_id == geofence_id)
        result = await self._session.execute(stmt)
        return result.scalar_one()

    async def has_recent_alert(
        self,
        mmsi: int,
        geofence_id: int,
        event_type: str,
        window_minutes: int = 30,
    ) -> bool:
        from datetime import UTC, timedelta
        from datetime import datetime as dt

        cutoff = dt.now(UTC) - timedelta(minutes=window_minutes)
        stmt = (
            select(func.count())
            .select_from(Alert)
            .where(
                Alert.mmsi == mmsi,
                Alert.geofence_id == geofence_id,
                Alert.event_type == event_type,
                Alert.ts >= cutoff,
            )
        )
        result = await self._session.execute(stmt)
        return result.scalar_one() > 0

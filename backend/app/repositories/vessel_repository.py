from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.vessel import Vessel


class VesselRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_mmsi(self, mmsi: int) -> Vessel | None:
        stmt = select(Vessel).where(Vessel.mmsi == mmsi)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_many(
        self,
        limit: int = 50,
        offset: int = 0,
        ship_type: int | None = None,
    ) -> list[Vessel]:
        stmt = select(Vessel).offset(offset).limit(limit)
        if ship_type is not None:
            stmt = stmt.where(Vessel.ship_type == ship_type)
        stmt = stmt.order_by(Vessel.updated_at.desc())
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def count(self, ship_type: int | None = None) -> int:
        from sqlalchemy import func

        stmt = select(func.count()).select_from(Vessel)
        if ship_type is not None:
            stmt = stmt.where(Vessel.ship_type == ship_type)
        result = await self._session.execute(stmt)
        return result.scalar_one()

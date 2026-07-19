from sqlalchemy import func, or_, select, update
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
            base = (ship_type // 10) * 10
            stmt = stmt.where(
                Vessel.ship_type >= base,
                Vessel.ship_type < base + 10,
            )
        stmt = stmt.order_by(Vessel.updated_at.desc())
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def count(self, ship_type: int | None = None) -> int:
        stmt = select(func.count()).select_from(Vessel)
        if ship_type is not None:
            base = (ship_type // 10) * 10
            stmt = stmt.where(
                Vessel.ship_type >= base,
                Vessel.ship_type < base + 10,
            )
        result = await self._session.execute(stmt)
        return result.scalar_one()

    async def search(self, query: str, limit: int = 10) -> list[Vessel]:
        q = query.strip()
        if not q:
            return []
        num: int | None = None
        try:
            num = int(q)
        except ValueError:
            pass

        stmt = select(Vessel).limit(limit)
        if num is not None:
            stmt = stmt.where(
                or_(
                    Vessel.mmsi == num,
                    Vessel.imo == num,
                    Vessel.name.ilike(f"%{q}%"),
                    Vessel.callsign.ilike(f"%{q}%"),
                )
            )
        else:
            stmt = stmt.where(
                or_(
                    Vessel.name.ilike(f"%{q}%"),
                    Vessel.callsign.ilike(f"%{q}%"),
                    Vessel.destination.ilike(f"%{q}%"),
                )
            )
        stmt = stmt.order_by(Vessel.updated_at.desc())
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def list_vessels(
        self,
        limit: int = 50,
        offset: int = 0,
        ship_type: int | None = None,
        name: str | None = None,
        destination: str | None = None,
    ) -> tuple[list[Vessel], int]:
        stmt = select(Vessel)
        count_stmt = select(func.count()).select_from(Vessel)
        if ship_type is not None:
            base = (ship_type // 10) * 10
            stmt = stmt.where(
                Vessel.ship_type >= base,
                Vessel.ship_type < base + 10,
            )
            count_stmt = count_stmt.where(
                Vessel.ship_type >= base,
                Vessel.ship_type < base + 10,
            )
        if name:
            stmt = stmt.where(Vessel.name.ilike(f"%{name}%"))
            count_stmt = count_stmt.where(Vessel.name.ilike(f"%{name}%"))
        if destination:
            stmt = stmt.where(Vessel.destination.ilike(f"%{destination}%"))
            count_stmt = count_stmt.where(Vessel.destination.ilike(f"%{destination}%"))
        stmt = stmt.order_by(Vessel.updated_at.desc()).offset(offset).limit(limit)
        result = await self._session.execute(stmt)
        vessels = list(result.scalars().all())
        count_result = await self._session.execute(count_stmt)
        total = count_result.scalar_one()
        return vessels, total

    async def update_photo(self, mmsi: int, photo_url: str) -> bool:
        stmt = (
            update(Vessel)
            .where(Vessel.mmsi == mmsi)
            .values(photo_url=photo_url)
            .returning(Vessel.mmsi)
        )
        result = await self._session.execute(stmt)
        await self._session.commit()
        return result.scalar_one_or_none() is not None

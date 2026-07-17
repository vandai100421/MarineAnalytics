from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.port import Port, PortArrival


class PortRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_ports(
        self,
        bbox: tuple[float, float, float, float] | None = None,
        country: str | None = None,
        port_type: str | None = None,
        limit: int = 200,
    ) -> list[Port]:
        stmt = select(Port)
        if bbox:
            min_lon, min_lat, max_lon, max_lat = bbox
            stmt = stmt.where(
                Port.lon >= min_lon,
                Port.lon <= max_lon,
                Port.lat >= min_lat,
                Port.lat <= max_lat,
            )
        if country:
            stmt = stmt.where(Port.country_code == country.upper())
        if port_type:
            stmt = stmt.where(Port.type == port_type)
        stmt = stmt.limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id(self, port_id: int) -> Port | None:
        stmt = select(Port).where(Port.id == port_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def find_nearby(self, lon: float, lat: float, radius_m: int = 5000) -> list[Port]:
        stmt = (
            select(Port)
            .where(
                text(
                    "ST_DWithin(ports.geom, "
                    "ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography, "
                    "ports.radius_m)"
                )
            )
            .params(lon=lon, lat=lat)
            .limit(5)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_active_arrivals(self, port_id: int) -> list[PortArrival]:
        stmt = (
            select(PortArrival)
            .where(PortArrival.port_id == port_id, PortArrival.departed_at.is_(None))
            .order_by(PortArrival.arrived_at.desc())
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_arrivals(
        self,
        port_id: int,
        time_from: datetime | None = None,
        time_to: datetime | None = None,
        limit: int = 100,
    ) -> list[PortArrival]:
        stmt = select(PortArrival).where(PortArrival.port_id == port_id)
        if time_from:
            stmt = stmt.where(PortArrival.arrived_at >= time_from)
        if time_to:
            stmt = stmt.where(PortArrival.arrived_at <= time_to)
        stmt = stmt.order_by(PortArrival.arrived_at.desc()).limit(limit)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def count_arrivals(self, port_id: int) -> int:
        stmt = select(func.count()).select_from(PortArrival).where(PortArrival.port_id == port_id)
        result = await self._session.execute(stmt)
        return result.scalar_one()

    async def start_arrival(
        self,
        mmsi: int,
        port_id: int,
        lat: float,
        lon: float,
        anchorage: bool = False,
    ) -> PortArrival:
        arrival = PortArrival(
            mmsi=mmsi,
            port_id=port_id,
            arrived_at=datetime.now(UTC),
            lat=lat,
            lon=lon,
            anchorage=anchorage,
        )
        self._session.add(arrival)
        await self._session.commit()
        await self._session.refresh(arrival)
        return arrival

    async def end_arrival(self, mmsi: int, port_id: int) -> bool:
        stmt = (
            select(PortArrival)
            .where(
                PortArrival.mmsi == mmsi,
                PortArrival.port_id == port_id,
                PortArrival.departed_at.is_(None),
            )
            .order_by(PortArrival.arrived_at.desc())
            .limit(1)
        )
        result = await self._session.execute(stmt)
        arrival = result.scalar_one_or_none()
        if arrival is None:
            return False
        now = datetime.now(UTC)
        dwell = (now - arrival.arrived_at).total_seconds() / 60.0
        upd = (
            update(PortArrival)
            .where(PortArrival.id == arrival.id)
            .values(departed_at=now, dwell_minutes=round(dwell, 1))
        )
        await self._session.execute(upd)
        await self._session.commit()
        return True

    async def has_active_arrival(self, mmsi: int, port_id: int) -> bool:
        stmt = (
            select(func.count())
            .select_from(PortArrival)
            .where(
                PortArrival.mmsi == mmsi,
                PortArrival.port_id == port_id,
                PortArrival.departed_at.is_(None),
            )
        )
        result = await self._session.execute(stmt)
        return result.scalar_one() > 0

    async def get_active_arrival_for_vessel(self, mmsi: int) -> PortArrival | None:
        stmt = (
            select(PortArrival)
            .where(PortArrival.mmsi == mmsi, PortArrival.departed_at.is_(None))
            .order_by(PortArrival.arrived_at.desc())
            .limit(1)
        )
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_congestion_all(self, limit: int = 10) -> list[dict[str, Any]]:
        stmt = (
            select(
                Port.id.label("port_id"),
                Port.name.label("name"),
                Port.country_code.label("country_code"),
                func.count(PortArrival.id).label("vessel_count"),
            )
            .join(PortArrival, PortArrival.port_id == Port.id)
            .where(PortArrival.departed_at.is_(None))
            .group_by(Port.id, Port.name, Port.country_code)
            .order_by(func.count(PortArrival.id).desc())
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        rows = result.all()
        return [
            {
                "port_id": r[0],
                "name": r[1],
                "country_code": r[2],
                "vessel_count": r[3],
                "avg_dwell_minutes": 0.0,
                "anchorage_count": 0,
            }
            for r in rows
        ]

    async def get_congestion(self, port_id: int) -> dict[str, Any] | None:
        port = await self.get_by_id(port_id)
        if port is None:
            return None
        active = await self.get_active_arrivals(port_id)
        anchorage_count = sum(1 for a in active if a.anchorage)
        avg_dwell = 0.0
        if active:
            now = datetime.now(UTC)
            dwells = [(now - a.arrived_at).total_seconds() / 60.0 for a in active]
            avg_dwell = round(sum(dwells) / len(dwells), 1)
        return {
            "port_id": port_id,
            "name": port.name,
            "country_code": port.country_code,
            "vessel_count": len(active),
            "avg_dwell_minutes": avg_dwell,
            "anchorage_count": anchorage_count,
        }

    async def count_ports(self) -> int:
        stmt = select(func.count()).select_from(Port)
        result = await self._session.execute(stmt)
        return result.scalar_one()

    async def find_by_name_fuzzy(self, query: str, limit: int = 5) -> list[Port]:
        stmt = (
            select(Port)
            .where(Port.name.ilike(f"%{query}%"))
            .order_by(Port.name)
            .limit(limit)
        )
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_all_ports(self) -> list[Port]:
        stmt = select(Port).order_by(Port.name)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

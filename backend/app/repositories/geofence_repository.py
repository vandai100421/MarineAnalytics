from __future__ import annotations

from geoalchemy2.elements import WKTElement
from geoalchemy2.functions import ST_Contains, ST_Within
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.geofence import Geofence


def _coords_to_wkt(coordinates: list[list[float]]) -> WKTElement:
    points = ", ".join(f"{lon} {lat}" for lon, lat in coordinates)
    return WKTElement(f"POLYGON(({points}))", srid=4326)


def _wkt_to_coords(geom: object) -> list[list[float]]:
    text = str(geom)
    if "POLYGON" not in text:
        return []
    import re

    match = re.search(r"\(\((.+)\)\)", text)
    if not match:
        return []
    raw = match.group(1)
    coords: list[list[float]] = []
    for pair in raw.split(","):
        parts = pair.strip().split()
        if len(parts) >= 2:
            coords.append([float(parts[0]), float(parts[1])])
    return coords


class GeofenceRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(
        self,
        name: str,
        type_: str,
        coordinates: list[list[float]],
        description: str | None = None,
    ) -> Geofence:
        geom = _coords_to_wkt(coordinates)
        geofence = Geofence(
            name=name,
            type=type_,
            geom=geom,
            description=description,
        )
        self._session.add(geofence)
        await self._session.commit()
        await self._session.refresh(geofence)
        return geofence

    async def get_all(self) -> list[Geofence]:
        stmt = select(Geofence).order_by(Geofence.created_at.desc())
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id(self, geofence_id: int) -> Geofence | None:
        stmt = select(Geofence).where(Geofence.id == geofence_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def delete(self, geofence_id: int) -> bool:
        stmt = delete(Geofence).where(Geofence.id == geofence_id)
        result = await self._session.execute(stmt)
        await self._session.commit()
        rowcount: int = getattr(result, "rowcount", 0)
        return rowcount > 0

    async def find_containing(
        self,
        lon: float,
        lat: float,
    ) -> list[Geofence]:
        point = WKTElement(f"POINT({lon} {lat})", srid=4326)
        stmt = select(Geofence).where(ST_Contains(Geofence.geom, point))
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def check_point_in_geofence(
        self,
        geofence_id: int,
        lon: float,
        lat: float,
    ) -> bool:
        geofence = await self.get_by_id(geofence_id)
        if geofence is None:
            return False
        point = WKTElement(f"POINT({lon} {lat})", srid=4326)
        stmt = select(ST_Within(point, geofence.geom))
        result = await self._session.execute(stmt)
        return bool(result.scalar())

from __future__ import annotations

import json

from geoalchemy2.elements import WKTElement
from geoalchemy2.functions import ST_AsGeoJSON, ST_Contains, ST_Within
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.geofence import Geofence


def _coords_to_wkt(coordinates: list[list[float]]) -> WKTElement:
    points = ", ".join(f"{lon} {lat}" for lon, lat in coordinates)
    return WKTElement(f"POLYGON(({points}))", srid=4326)


def _geojson_to_coords(geojson_str: str | None) -> list[list[float]]:
    if not geojson_str:
        return []
    try:
        geojson = json.loads(geojson_str)
        rings = geojson.get("coordinates", [])
        if rings and len(rings) > 0:
            return [[pt[0], pt[1]] for pt in rings[0]]
    except (json.JSONDecodeError, IndexError, TypeError):
        pass
    return []


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

    async def get_all(self) -> list[tuple[Geofence, str | None]]:
        stmt = select(Geofence, ST_AsGeoJSON(Geofence.geom)).order_by(Geofence.created_at.desc())
        result = await self._session.execute(stmt)
        return [(row[0], row[1]) for row in result.all()]

    async def get_by_id(self, geofence_id: int) -> tuple[Geofence, str | None] | None:
        stmt = select(Geofence, ST_AsGeoJSON(Geofence.geom)).where(Geofence.id == geofence_id)
        result = await self._session.execute(stmt)
        row = result.first()
        if row is None:
            return None
        return (row[0], row[1])

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
        result = await self.get_by_id(geofence_id)
        if result is None:
            return False
        geofence, _ = result
        point = WKTElement(f"POINT({lon} {lat})", srid=4326)
        stmt = select(ST_Within(point, geofence.geom))
        result_stmt = await self._session.execute(stmt)
        return bool(result_stmt.scalar())

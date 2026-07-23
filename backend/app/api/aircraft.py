from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.redis import get_redis
from app.schemas.aircraft import AircraftPositionResponse

router = APIRouter(prefix="/api/v1/aircraft", tags=["aircraft"])


@router.get("/positions", response_model=list[AircraftPositionResponse])
async def get_aircraft_positions(
    bbox: str | None = Query(None, description="min_lon,min_lat,max_lon,max_lat"),
    redis: Redis = Depends(get_redis),  # type: ignore[type-arg]
    session: AsyncSession = Depends(get_session),
) -> list[AircraftPositionResponse]:
    positions: list[AircraftPositionResponse] = []

    async for key in redis.scan_iter(match="air:*", count=200):
        data = await redis.hgetall(key)
        if not data:
            continue

        lat = _to_float(data.get("lat"))
        lon = _to_float(data.get("lon"))
        if lat is None or lon is None:
            continue

        if bbox and not _in_bbox(lon, lat, bbox):
            continue

        positions.append(
            AircraftPositionResponse(
                hex=data.get("hex", ""),
                ts=data.get("ts", ""),
                lat=lat,
                lon=lon,
                alt=_to_float(data.get("alt")),
                gs=_to_float(data.get("gs")),
                track=_to_float(data.get("track")),
                flight=data.get("flight"),
                reg=data.get("reg"),
                type=data.get("type"),
                vertical_rate=_to_float(data.get("vertical_rate")),
                origin_country=data.get("origin_country"),
            )
        )

    return positions


def _in_bbox(lon: float, lat: float, bbox: str) -> bool:
    try:
        parts = [float(x) for x in bbox.split(",")]
        if len(parts) != 4:
            return True
        min_lon, min_lat, max_lon, max_lat = parts
        return min_lon <= lon <= max_lon and min_lat <= lat <= max_lat
    except ValueError:
        return True


def _to_float(value: str | None) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None

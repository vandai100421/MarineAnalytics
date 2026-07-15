from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select

from app.core.db import get_session
from app.core.redis import get_redis
from app.models.vessel import Vessel
from app.schemas.position import VesselPositionResponse
from app.schemas.vessel import VesselResponse

router = APIRouter(prefix="/api/v1/vessels", tags=["vessels"])


@router.get("/positions", response_model=list[VesselPositionResponse])
async def get_positions(
    bbox: str | None = Query(
        None, description="min_lon,min_lat,max_lon,max_lat"
    ),
    session=Depends(get_session),
) -> list[VesselPositionResponse]:
    redis = await get_redis()
    keys = await redis.keys("pos:*")
    if not keys:
        return []

    positions: list[VesselPositionResponse] = []
    for key in keys:
        data = await redis.hgetall(key)
        if not data:
            continue
        lat = float(data.get("lat", 0))
        lon = float(data.get("lon", 0))

        if bbox and not _in_bbox(lon, lat, bbox):
            continue

        positions.append(
            VesselPositionResponse(
                mmsi=int(data.get("mmsi", 0)),
                lat=lat,
                lon=lon,
                sog=float(data.get("sog", 0)),
                cog=float(data.get("cog", 0)),
                heading=float(data.get("heading", 0)),
                ts=data.get("ts", datetime.now(timezone.utc).isoformat()),
            )
        )
    return positions


@router.get("/{mmsi}", response_model=VesselResponse)
async def get_vessel(
    mmsi: int,
    session=Depends(get_session),
) -> VesselResponse:
    stmt = select(Vessel).where(Vessel.mmsi == mmsi)
    result = await session.execute(stmt)
    vessel = result.scalar_one_or_none()
    if vessel is None:
        raise HTTPException(status_code=404, detail=f"Vessel {mmsi} not found")
    return VesselResponse.model_validate(vessel)


def _in_bbox(lon: float, lat: float, bbox: str) -> bool:
    try:
        parts = [float(x) for x in bbox.split(",")]
        if len(parts) != 4:
            return True
        min_lon, min_lat, max_lon, max_lat = parts
        return min_lon <= lon <= max_lon and min_lat <= lat <= max_lat
    except ValueError:
        return True

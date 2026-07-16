from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.errors import ProblemDetail
from app.core.redis import get_redis
from app.repositories.position_repository import PositionRepository
from app.repositories.vessel_repository import VesselRepository
from app.schemas.position import (
    PositionReportResponse,
    TrackResponse,
    VesselPositionResponse,
)
from app.schemas.vessel import VesselResponse

router = APIRouter(prefix="/api/v1/vessels", tags=["vessels"])


@router.get("/positions", response_model=list[VesselPositionResponse])
async def get_positions(
    bbox: str | None = Query(None, description="min_lon,min_lat,max_lon,max_lat"),
    ship_type: int | None = Query(None, description="Filter by AIS ship type code"),
    min_sog: float | None = Query(None, description="Minimum speed over ground"),
    redis: Redis = Depends(get_redis),  # type: ignore[type-arg]
    session: AsyncSession = Depends(get_session),
) -> list[VesselPositionResponse]:
    positions: list[VesselPositionResponse] = []

    async for key in redis.scan_iter(match="pos:*", count=200):
        data = await redis.hgetall(key)
        if not data:
            continue

        lat = _to_float(data.get("lat"))
        lon = _to_float(data.get("lon"))
        if lat is None or lon is None:
            continue

        if bbox and not _in_bbox(lon, lat, bbox):
            continue

        mmsi = _to_int(data.get("mmsi"))
        if mmsi is None:
            continue

        sog = _to_float(data.get("sog")) or 0.0
        if min_sog is not None and sog < min_sog:
            continue

        if ship_type is not None:
            vessel_repo = VesselRepository(session)
            vessel = await vessel_repo.get_by_mmsi(mmsi)
            if vessel is None or vessel.ship_type != ship_type:
                continue

        positions.append(
            VesselPositionResponse(
                mmsi=mmsi,
                lat=lat,
                lon=lon,
                sog=sog,
                cog=_to_float(data.get("cog")) or 0.0,
                heading=_to_float(data.get("heading")) or 0.0,
                ts=data.get("ts", ""),
            )
        )

    return positions


@router.get("/{mmsi}", response_model=VesselResponse)
async def get_vessel(
    mmsi: int,
    session: AsyncSession = Depends(get_session),
) -> VesselResponse:
    repo = VesselRepository(session)
    vessel = await repo.get_by_mmsi(mmsi)
    if vessel is None:
        raise ProblemDetail(
            status_code=404,
            title="Not Found",
            detail=f"Vessel {mmsi} not found",
        )
    return VesselResponse.model_validate(vessel)


@router.get("/{mmsi}/track", response_model=TrackResponse)
async def get_vessel_track(
    mmsi: int,
    time_from: datetime | None = Query(None, alias="from"),
    time_to: datetime | None = Query(None, alias="to"),
    limit: int = Query(5000, ge=1, le=50000),
    session: AsyncSession = Depends(get_session),
) -> TrackResponse:
    repo = PositionRepository(session)
    vessel_repo = VesselRepository(session)
    vessel = await vessel_repo.get_by_mmsi(mmsi)
    if vessel is None:
        raise ProblemDetail(
            status_code=404,
            title="Not Found",
            detail=f"Vessel {mmsi} not found",
        )

    reports = await repo.get_track(mmsi, time_from, time_to, limit)
    total = await repo.count_reports(mmsi, time_from, time_to)

    return TrackResponse(
        mmsi=mmsi,
        total=total,
        points=[PositionReportResponse.model_validate(r) for r in reports],
    )


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


def _to_int(value: str | None) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None

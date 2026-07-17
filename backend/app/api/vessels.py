from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.errors import ProblemDetail
from app.core.redis import get_redis
from app.models.vessel import Vessel
from app.repositories.position_repository import PositionRepository
from app.repositories.vessel_repository import VesselRepository
from app.schemas.port import PredictedEtaResponse
from app.schemas.position import (
    PaginatedResponse,
    PositionReportResponse,
    TrackResponse,
    VesselListResponse,
    VesselPositionResponse,
)
from app.schemas.vessel import VesselPhotoUpdate, VesselResponse, VesselSearchResult
from app.services.eta_calculator import EtaCalculator

router = APIRouter(prefix="/api/v1/vessels", tags=["vessels"])


@router.get("/search", response_model=list[VesselSearchResult])
async def search_vessels(
    q: str = Query(..., min_length=1, description="Search by name, MMSI, IMO, callsign"),
    limit: int = Query(10, ge=1, le=50),
    session: AsyncSession = Depends(get_session),
) -> list[VesselSearchResult]:
    repo = VesselRepository(session)
    vessels = await repo.search(q, limit)
    return [VesselSearchResult.model_validate(v) for v in vessels]


@router.get("/list", response_model=PaginatedResponse[VesselListResponse])
async def list_vessels(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    ship_type: int | None = Query(None),
    name: str | None = Query(None),
    destination: str | None = Query(None),
    session: AsyncSession = Depends(get_session),
) -> PaginatedResponse[VesselListResponse]:
    repo = VesselRepository(session)
    vessels, total = await repo.list_vessels(limit, offset, ship_type, name, destination)
    return PaginatedResponse(
        total=total,
        limit=limit,
        offset=offset,
        items=[VesselListResponse.model_validate(v) for v in vessels],
    )


@router.get("/positions", response_model=list[VesselPositionResponse])
async def get_positions(
    bbox: str | None = Query(None, description="min_lon,min_lat,max_lon,max_lat"),
    ship_type: int | None = Query(None, description="Filter by AIS ship type code"),
    min_sog: float | None = Query(None, description="Minimum speed over ground"),
    max_sog: float | None = Query(None, description="Maximum speed over ground"),
    name: str | None = Query(None, description="Filter by vessel name (substring)"),
    destination: str | None = Query(None, description="Filter by destination (substring)"),
    redis: Redis = Depends(get_redis),  # type: ignore[type-arg]
    session: AsyncSession = Depends(get_session),
) -> list[VesselPositionResponse]:
    keys: list[str] = []
    async for key in redis.scan_iter(match="pos:*", count=2000):
        keys.append(key)

    if not keys:
        return []

    pipe = redis.pipeline()
    for key in keys:
        pipe.hgetall(key)
    results = await pipe.execute()

    name_lower = name.lower() if name else None
    dest_lower = destination.lower() if destination else None
    vessel_cache: dict[int, Vessel | None] = {}

    positions: list[VesselPositionResponse] = []
    for data in results:
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
        if max_sog is not None and sog > max_sog:
            continue

        if ship_type is not None or name_lower or dest_lower:
            if mmsi not in vessel_cache:
                vessel_repo = VesselRepository(session)
                vessel_cache[mmsi] = await vessel_repo.get_by_mmsi(mmsi)
            vessel = vessel_cache[mmsi]
            if vessel is None:
                continue
            if ship_type is not None and vessel.ship_type != ship_type:
                continue
            if name_lower and (vessel.name is None or name_lower not in vessel.name.lower()):
                continue
            if dest_lower and (
                vessel.destination is None or dest_lower not in vessel.destination.lower()
            ):
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


@router.get("/cluster", response_model=list[VesselPositionResponse])
async def get_cluster_positions(
    bbox: str | None = Query(None, description="min_lon,min_lat,max_lon,max_lat"),
    precision: int = Query(
        2, ge=1, le=6, description="Grid precision (1=10deg, 2=1deg, 3=0.1deg)"
    ),
    redis: Redis = Depends(get_redis),  # type: ignore[type-arg]
) -> list[VesselPositionResponse]:
    import math

    parsed_bbox: tuple[float, float, float, float] | None = None
    if bbox:
        try:
            parts = [float(x) for x in bbox.split(",")]
            if len(parts) == 4:
                parsed_bbox = (parts[0], parts[1], parts[2], parts[3])
        except ValueError:
            pass

    keys: list[str] = []
    async for key in redis.scan_iter(match="pos:*", count=2000):
        keys.append(key)

    if not keys:
        return []

    pipe = redis.pipeline()
    for key in keys:
        pipe.hgetall(key)
    results = await pipe.execute()

    grid_size = math.pow(10, 1 - precision)
    grid: dict[tuple[float, float], dict[str, object]] = {}

    for data in results:
        if not data:
            continue
        lat = _to_float(data.get("lat"))
        lon = _to_float(data.get("lon"))
        if lat is None or lon is None:
            continue
        if parsed_bbox is not None:
            min_lon, min_lat, max_lon, max_lat = parsed_bbox
            if not (min_lon <= lon <= max_lon and min_lat <= lat <= max_lat):
                continue

        grid_lat = round(lat / grid_size) * grid_size
        grid_lon = round(lon / grid_size) * grid_size
        key_cell = (grid_lat, grid_lon)
        if key_cell not in grid:
            grid[key_cell] = {
                "mmsi": 0,
                "lat": grid_lat,
                "lon": grid_lon,
                "sog": 0.0,
                "cog": 0.0,
                "heading": 0.0,
                "ts": "",
                "count": 0,
            }
        cell = grid[key_cell]
        current_count: int = cell["count"]  # type: ignore[assignment]
        cell["count"] = current_count + 1

    result: list[VesselPositionResponse] = []
    for cell in grid.values():
        count: int = cell.pop("count")  # type: ignore[assignment]
        resp = VesselPositionResponse(
            mmsi=count,
            lat=cell["lat"],
            lon=cell["lon"],
            sog=0.0,
            cog=0.0,
            heading=0.0,
            ts="",
        )
        result.append(resp)

    return result


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


@router.get("/{mmsi}/realtime", response_model=VesselPositionResponse)
async def get_vessel_realtime(
    mmsi: int,
    redis: Redis = Depends(get_redis),  # type: ignore[type-arg]
) -> VesselPositionResponse:
    data = await redis.hgetall(f"pos:{mmsi}")
    if not data:
        raise ProblemDetail(
            status_code=404,
            title="Not Found",
            detail=f"Vessel {mmsi} not in realtime cache",
        )
    lat = _to_float(data.get("lat"))
    lon = _to_float(data.get("lon"))
    if lat is None or lon is None:
        raise ProblemDetail(
            status_code=404,
            title="Not Found",
            detail=f"Vessel {mmsi} has no position",
        )
    return VesselPositionResponse(
        mmsi=mmsi,
        lat=lat,
        lon=lon,
        sog=_to_float(data.get("sog")) or 0.0,
        cog=_to_float(data.get("cog")) or 0.0,
        heading=_to_float(data.get("heading")) or 0.0,
        ts=data.get("ts", ""),
    )


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


@router.post("/{mmsi}/photo", response_model=VesselResponse)
async def set_vessel_photo(
    mmsi: int,
    body: VesselPhotoUpdate,
    session: AsyncSession = Depends(get_session),
) -> VesselResponse:
    repo = VesselRepository(session)
    updated = await repo.update_photo(mmsi, body.photo_url)
    if not updated:
        raise ProblemDetail(
            status_code=404,
            title="Not Found",
            detail=f"Vessel {mmsi} not found",
        )
    vessel = await repo.get_by_mmsi(mmsi)
    return VesselResponse.model_validate(vessel)


@router.get("/{mmsi}/eta", response_model=PredictedEtaResponse)
async def get_vessel_eta(
    mmsi: int,
    session: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis),  # type: ignore[type-arg]
) -> PredictedEtaResponse:
    vessel_repo = VesselRepository(session)
    vessel = await vessel_repo.get_by_mmsi(mmsi)
    if vessel is None:
        raise ProblemDetail(
            status_code=404,
            title="Not Found",
            detail=f"Vessel {mmsi} not found",
        )
    calculator = EtaCalculator(session, redis)
    result = await calculator.calculate(mmsi)
    return PredictedEtaResponse.model_validate(result)


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

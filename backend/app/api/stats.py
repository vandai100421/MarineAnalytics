from __future__ import annotations

import time
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.redis import get_redis
from app.models.vessel import Vessel
from app.repositories.port_repository import PortRepository
from app.repositories.position_repository import PositionRepository
from app.repositories.stats_repository import StatsRepository
from app.schemas.port import PortCongestionListResponse, PortCongestionResponse
from app.schemas.stats import (
    ByTypeResponse,
    HeatmapResponse,
    OverviewResponse,
    TimeSeriesPoint,
    TimeSeriesResponse,
    TypeCount,
)

router = APIRouter(prefix="/api/v1/stats", tags=["stats"])

_overview_cache: OverviewResponse | None = None
_overview_cache_time: float = 0.0
_CACHE_TTL = 5.0


@router.get("/overview", response_model=OverviewResponse)
async def get_overview(
    session: AsyncSession = Depends(get_session),
) -> OverviewResponse:
    global _overview_cache, _overview_cache_time
    now = time.monotonic()
    if _overview_cache is not None and (now - _overview_cache_time) < _CACHE_TTL:
        return _overview_cache

    redis = await get_redis()
    keys: list[str] = []
    async for key in redis.scan_iter(match="pos:*", count=2000):
        keys.append(key)

    if not keys:
        active_count = 0
        speeds: list[float] = []
    else:
        pipe = redis.pipeline()
        for key in keys:
            pipe.hgetall(key)
        results = await pipe.execute()

        active_count = 0
        speeds = []
        for data in results:
            if not data:
                continue
            active_count += 1
            try:
                speeds.append(float(data.get("sog", 0)))
            except (ValueError, TypeError):
                pass

    avg_sog = sum(speeds) / len(speeds) if speeds else 0.0

    stmt = select(func.count()).select_from(Vessel)
    result = await session.execute(stmt)
    total_vessels = result.scalar_one()

    response = OverviewResponse(
        active_vessels=active_count,
        total_vessels=total_vessels,
        avg_sog=round(avg_sog, 2),
    )
    _overview_cache = response
    _overview_cache_time = now
    return response


@router.get("/by-type", response_model=ByTypeResponse)
async def get_by_type(
    session: AsyncSession = Depends(get_session),
) -> ByTypeResponse:
    stmt = (
        select(Vessel.ship_type, Vessel.ship_type_name, func.count())
        .where(Vessel.ship_type.isnot(None))
        .group_by(Vessel.ship_type, Vessel.ship_type_name)
        .order_by(func.count().desc())
    )
    result = await session.execute(stmt)
    rows = result.all()

    return ByTypeResponse(
        types=[
            TypeCount(
                ship_type=row[0],
                ship_type_name=row[1] or "Unknown",
                count=row[2],
            )
            for row in rows
        ]
    )


@router.get("/heatmap", response_model=HeatmapResponse)
async def get_heatmap(
    bbox: str | None = Query(None, description="min_lon,min_lat,max_lon,max_lat"),
    time_from: datetime | None = Query(None, alias="from"),
    time_to: datetime | None = Query(None, alias="to"),
    session: AsyncSession = Depends(get_session),
) -> HeatmapResponse:
    repo = PositionRepository(session)
    parsed_bbox: tuple[float, float, float, float] | None = None
    if bbox:
        try:
            parts = [float(x) for x in bbox.split(",")]
            if len(parts) == 4:
                parsed_bbox = (parts[0], parts[1], parts[2], parts[3])
        except ValueError:
            pass

    points = await repo.get_heatmap_points(time_from, time_to, parsed_bbox)
    return HeatmapResponse(
        points=[[lon, lat] for lat, lon in points],
        total=len(points),
    )


@router.get("/timeseries", response_model=TimeSeriesResponse)
async def get_timeseries(
    period: str = Query("24h", pattern="^(24h|7d|30d)$"),
    session: AsyncSession = Depends(get_session),
) -> TimeSeriesResponse:
    repo = StatsRepository(session)
    data = await repo.get_timeseries(period)
    return TimeSeriesResponse(
        period=period,
        points=[
            TimeSeriesPoint(
                ts=row["ts"],
                vessel_count=row["vessel_count"],
                avg_sog=round(row["avg_sog"], 2),
            )
            for row in data
        ],
    )


@router.get("/port-congestion", response_model=PortCongestionListResponse)
async def get_port_congestion(
    limit: int = Query(10, ge=1, le=50),
    session: AsyncSession = Depends(get_session),
) -> PortCongestionListResponse:
    repo = PortRepository(session)
    data = await repo.get_congestion_all(limit)
    return PortCongestionListResponse(
        ports=[
            PortCongestionResponse(
                port_id=d["port_id"],
                name=d["name"],
                country_code=d["country_code"],
                vessel_count=d["vessel_count"],
                avg_dwell_minutes=d["avg_dwell_minutes"],
                anchorage_count=d["anchorage_count"],
            )
            for d in data
        ]
    )

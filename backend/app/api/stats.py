from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.redis import get_redis
from app.models.vessel import Vessel
from app.repositories.position_repository import PositionRepository
from app.schemas.stats import ByTypeResponse, HeatmapResponse, OverviewResponse, TypeCount

router = APIRouter(prefix="/api/v1/stats", tags=["stats"])


@router.get("/overview", response_model=OverviewResponse)
async def get_overview(
    session: AsyncSession = Depends(get_session),
) -> OverviewResponse:
    redis = await get_redis()
    active_count = 0
    speeds: list[float] = []

    async for key in redis.scan_iter(match="pos:*", count=500):
        data = await redis.hgetall(key)
        if not data:
            continue
        active_count += 1
        try:
            sog = float(data.get("sog", 0))
            speeds.append(sog)
        except (ValueError, TypeError):
            pass

    avg_sog = sum(speeds) / len(speeds) if speeds else 0.0

    stmt = select(func.count()).select_from(Vessel)
    result = await session.execute(stmt)
    total_vessels = result.scalar_one()

    return OverviewResponse(
        active_vessels=active_count,
        total_vessels=total_vessels,
        avg_sog=round(avg_sog, 2),
    )


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

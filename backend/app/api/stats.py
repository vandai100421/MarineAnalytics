from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.redis import get_redis
from app.models.vessel import Vessel
from app.schemas.stats import ByTypeResponse, OverviewResponse, TypeCount

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


@router.get("/heatmap")
async def get_heatmap(
    bbox: str | None = Query(None, description="min_lon,min_lat,max_lon,max_lat"),
    session: AsyncSession = Depends(get_session),
) -> dict[str, object]:
    from app.models.position import PositionReport

    stmt = select(PositionReport.lat, PositionReport.lon).limit(10000)
    result = await session.execute(stmt)
    rows = result.all()

    return {
        "points": [[row[1], row[0]] for row in rows],
        "total": len(rows),
    }

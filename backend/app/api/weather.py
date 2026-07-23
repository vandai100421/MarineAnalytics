from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.services.weather import get_wind_grid

router = APIRouter(prefix="/api/v1/weather", tags=["weather"])


@router.get("/wind")
async def get_wind(
    bbox: str = Query(..., description="min_lon,min_lat,max_lon,max_lat"),
    session: AsyncSession = Depends(get_session),
) -> dict[str, object]:
    try:
        parts = [float(x) for x in bbox.split(",")]
        if len(parts) != 4:
            return {"points": []}
        min_lon, min_lat, max_lon, max_lat = parts
    except ValueError:
        return {"points": []}

    points = await get_wind_grid(min_lon, min_lat, max_lon, max_lat)
    return {"points": points}

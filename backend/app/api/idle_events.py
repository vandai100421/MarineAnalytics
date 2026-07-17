from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.repositories.idle_repository import IdleRepository
from app.schemas.idle import IdleEventListResponse, IdleEventResponse, IdleSummaryResponse

router = APIRouter(prefix="/api/v1/idle-events", tags=["idle-events"])


def _parse_bbox(bbox: str | None) -> tuple[float, float, float, float] | None:
    if not bbox:
        return None
    try:
        parts = [float(x) for x in bbox.split(",")]
        if len(parts) == 4:
            return (parts[0], parts[1], parts[2], parts[3])
    except ValueError:
        pass
    return None


@router.get("", response_model=IdleEventListResponse)
async def list_idle_events(
    bbox: str | None = Query(None, description="min_lon,min_lat,max_lon,max_lat"),
    time_from: datetime | None = Query(None, alias="from"),
    time_to: datetime | None = Query(None, alias="to"),
    active_only: bool = Query(False, description="Only currently idle vessels"),
    limit: int = Query(100, ge=1, le=500),
    session: AsyncSession = Depends(get_session),
) -> IdleEventListResponse:
    repo = IdleRepository(session)
    parsed_bbox = _parse_bbox(bbox)
    events = await repo.get_events(parsed_bbox, time_from, time_to, active_only, limit)
    return IdleEventListResponse(
        total=len(events),
        events=[IdleEventResponse.model_validate(e) for e in events],
    )


@router.get("/summary", response_model=IdleSummaryResponse)
async def get_idle_summary(
    session: AsyncSession = Depends(get_session),
) -> IdleSummaryResponse:
    repo = IdleRepository(session)
    summary = await repo.get_idle_summary()
    return IdleSummaryResponse(**summary)

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.repositories.alert_repository import AlertRepository
from app.schemas.geofence import AlertResponse, AlertsListResponse

router = APIRouter(prefix="/api/v1/alerts", tags=["alerts"])


@router.get("", response_model=AlertsListResponse)
async def list_alerts(
    time_from: datetime | None = Query(None, alias="from"),
    geofence_id: int | None = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_session),
) -> AlertsListResponse:
    repo = AlertRepository(session)
    alerts = await repo.get_recent(time_from, geofence_id, limit, offset)
    total = await repo.count(time_from, geofence_id)
    return AlertsListResponse(
        total=total,
        alerts=[AlertResponse.model_validate(a) for a in alerts],
    )

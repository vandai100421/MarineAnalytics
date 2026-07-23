from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.errors import ProblemDetail
from app.core.redis import get_redis
from app.repositories.port_repository import PortRepository
from app.schemas.port import (
    PortArrivalResponse,
    PortArrivalsListResponse,
    PortCongestionListResponse,
    PortCongestionResponse,
    PortResponse,
)

router = APIRouter(prefix="/api/v1/ports", tags=["ports"])


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


@router.get("", response_model=list[PortResponse])
async def list_ports(
    bbox: str | None = Query(None, description="min_lon,min_lat,max_lon,max_lat"),
    country: str | None = Query(None, description="ISO country code (2 letters)"),
    port_type: str | None = Query(None, description="sea_port | river_port | anchorage"),
    limit: int = Query(200, ge=1, le=500),
    session: AsyncSession = Depends(get_session),
) -> list[PortResponse]:
    repo = PortRepository(session)
    parsed_bbox = _parse_bbox(bbox)
    ports = await repo.list_ports(parsed_bbox, country, port_type, limit)
    return [PortResponse.model_validate(p) for p in ports]


@router.get("/congestion", response_model=PortCongestionListResponse)
async def list_congested_ports(
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


@router.get("/{port_id}", response_model=PortResponse)
async def get_port(
    port_id: int,
    session: AsyncSession = Depends(get_session),
) -> PortResponse:
    repo = PortRepository(session)
    port = await repo.get_by_id(port_id)
    if port is None:
        raise ProblemDetail(
            status_code=404,
            title="Not Found",
            detail=f"Port {port_id} not found",
        )
    return PortResponse.model_validate(port)


@router.get("/{port_id}/arrivals", response_model=PortArrivalsListResponse)
async def get_port_arrivals(
    port_id: int,
    time_from: datetime | None = Query(None, alias="from"),
    time_to: datetime | None = Query(None, alias="to"),
    limit: int = Query(100, ge=1, le=1000),
    session: AsyncSession = Depends(get_session),
) -> PortArrivalsListResponse:
    repo = PortRepository(session)
    port = await repo.get_by_id(port_id)
    if port is None:
        raise ProblemDetail(
            status_code=404,
            title="Not Found",
            detail=f"Port {port_id} not found",
        )
    arrivals = await repo.get_arrivals(port_id, time_from, time_to, limit)
    total = await repo.count_arrivals(port_id)
    return PortArrivalsListResponse(
        total=total,
        arrivals=[PortArrivalResponse.model_validate(a) for a in arrivals],
    )


@router.get("/{port_id}/congestion", response_model=PortCongestionResponse)
async def get_port_congestion(
    port_id: int,
    session: AsyncSession = Depends(get_session),
) -> PortCongestionResponse:
    repo = PortRepository(session)
    data = await repo.get_congestion(port_id)
    if data is None:
        raise ProblemDetail(
            status_code=404,
            title="Not Found",
            detail=f"Port {port_id} not found",
        )
    return PortCongestionResponse(**data)


@router.get("/{port_id}/vessels")
async def get_port_vessels(
    port_id: int,
    session: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis),  # type: ignore[type-arg]
) -> list[dict[str, object]]:
    repo = PortRepository(session)
    port = await repo.get_by_id(port_id)
    if port is None:
        raise ProblemDetail(
            status_code=404,
            title="Not Found",
            detail=f"Port {port_id} not found",
        )

    active = await repo.get_active_arrivals(port_id)
    if not active:
        return []

    mmsi_set = {a.mmsi for a in active}
    result: list[dict[str, object]] = []
    for mmsi in mmsi_set:
        data = await redis.hgetall(f"pos:{mmsi}")
        if data and data.get("lat") and data.get("lon"):
            try:
                result.append(
                    {
                        "mmsi": mmsi,
                        "lat": float(data["lat"]),
                        "lon": float(data["lon"]),
                        "sog": float(data.get("sog", 0)),
                        "cog": float(data.get("cog", 0)),
                        "heading": float(data.get("heading", 0)),
                        "ts": data.get("ts", ""),
                    }
                )
            except (ValueError, TypeError):
                continue
    return result


@router.get("/{port_id}/expected-arrivals")
async def get_port_expected_arrivals(
    port_id: int,
    hours: int = Query(24, ge=1, le=168),
    limit: int = Query(50, ge=1, le=200),
    session: AsyncSession = Depends(get_session),
) -> dict[str, object]:
    from datetime import UTC, datetime, timedelta

    from sqlalchemy import select

    from app.models.vessel import Vessel

    repo = PortRepository(session)
    port = await repo.get_by_id(port_id)
    if port is None:
        raise ProblemDetail(
            status_code=404,
            title="Not Found",
            detail=f"Port {port_id} not found",
        )

    now = datetime.now(UTC)
    horizon = now + timedelta(hours=hours)

    stmt = (
        select(Vessel)
        .where(Vessel.eta.isnot(None))
        .where(Vessel.eta >= now)
        .where(Vessel.eta <= horizon)
        .where(Vessel.destination.ilike(f"%{port.name}%"))
        .limit(limit)
    )
    result = await session.execute(stmt)
    vessels = result.scalars().all()

    return {
        "total": len(vessels),
        "port_name": port.name,
        "horizon_hours": hours,
        "vessels": [
            {
                "mmsi": v.mmsi,
                "name": v.name,
                "destination": v.destination,
                "eta": v.eta.isoformat() if v.eta else None,
                "ship_type_name": v.ship_type_name,
            }
            for v in vessels
        ],
    }


@router.get("/{port_id}/recent-departures")
async def get_port_recent_departures(
    port_id: int,
    hours: int = Query(24, ge=1, le=168),
    limit: int = Query(50, ge=1, le=200),
    session: AsyncSession = Depends(get_session),
) -> dict[str, object]:
    from datetime import UTC, datetime, timedelta

    from sqlalchemy import select

    from app.models.port import PortArrival

    repo = PortRepository(session)
    port = await repo.get_by_id(port_id)
    if port is None:
        raise ProblemDetail(
            status_code=404,
            title="Not Found",
            detail=f"Port {port_id} not found",
        )

    since = datetime.now(UTC) - timedelta(hours=hours)
    stmt = (
        select(PortArrival)
        .where(PortArrival.port_id == port_id)
        .where(PortArrival.departed_at.isnot(None))
        .where(PortArrival.departed_at >= since)
        .order_by(PortArrival.departed_at.desc())
        .limit(limit)
    )
    result = await session.execute(stmt)
    departures = result.scalars().all()

    return {
        "total": len(departures),
        "port_name": port.name,
        "horizon_hours": hours,
        "departures": [
            {
                "id": d.id,
                "mmsi": d.mmsi,
                "arrived_at": d.arrived_at.isoformat() if d.arrived_at else None,
                "departed_at": d.departed_at.isoformat() if d.departed_at else None,
                "dwell_minutes": d.dwell_minutes,
                "anchorage": d.anchorage,
            }
            for d in departures
        ],
    }

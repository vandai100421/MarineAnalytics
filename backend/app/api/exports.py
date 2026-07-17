from __future__ import annotations

import csv
import io
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.redis import get_redis
from app.repositories.alert_repository import AlertRepository
from app.repositories.port_repository import PortRepository
from app.repositories.position_repository import PositionRepository
from app.repositories.stats_repository import StatsRepository
from app.repositories.vessel_repository import VesselRepository

router = APIRouter(prefix="/api/v1/exports", tags=["exports"])


def _csv_stream(rows: list[list[Any]], headers: list[str]) -> io.BytesIO:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(headers)
    for row in rows:
        writer.writerow(row)
    output = io.BytesIO()
    output.write(buffer.getvalue().encode("utf-8"))
    output.seek(0)
    return output


@router.get("/vessels.csv")
async def export_vessels_csv(
    bbox: str | None = Query(None),
    ship_type: int | None = Query(None),
    min_sog: float | None = Query(None),
    redis: Redis = Depends(get_redis),  # type: ignore[type-arg]
    session: AsyncSession = Depends(get_session),
) -> StreamingResponse:
    keys: list[str] = []
    async for key in redis.scan_iter(match="pos:*", count=2000):
        keys.append(key)

    pipe = redis.pipeline()
    for key in keys:
        pipe.hgetall(key)
    results = await pipe.execute()

    vessel_cache: dict[int, Any] = {}
    rows: list[list[Any]] = []

    for data in results:
        if not data:
            continue
        lat = _to_float(data.get("lat"))
        lon = _to_float(data.get("lon"))
        if lat is None or lon is None:
            continue
        if bbox:
            parts = [float(x) for x in bbox.split(",")]
            if len(parts) == 4:
                if not (parts[0] <= lon <= parts[2] and parts[1] <= lat <= parts[3]):
                    continue
        mmsi = _to_int(data.get("mmsi"))
        if mmsi is None:
            continue
        sog = _to_float(data.get("sog")) or 0.0
        if min_sog is not None and sog < min_sog:
            continue

        name = ""
        if ship_type is not None or True:
            if mmsi not in vessel_cache:
                repo = VesselRepository(session)
                vessel_cache[mmsi] = await repo.get_by_mmsi(mmsi)
            vessel = vessel_cache[mmsi]
            if vessel is not None:
                if ship_type is not None and vessel.ship_type != ship_type:
                    continue
                name = vessel.name or ""
            elif ship_type is not None:
                continue

        rows.append(
            [
                mmsi,
                name,
                round(lat, 6),
                round(lon, 6),
                round(sog, 2),
                round(_to_float(data.get("cog")) or 0, 1),
                round(_to_float(data.get("heading")) or 0, 1),
                data.get("ts", ""),
            ]
        )

    headers = ["mmsi", "name", "lat", "lon", "sog", "cog", "heading", "ts"]
    buf = _csv_stream(rows, headers)
    return StreamingResponse(
        buf,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=vessels.csv"},
    )


@router.get("/vessels/{mmsi}/track.csv")
async def export_track_csv(
    mmsi: int,
    time_from: datetime | None = Query(None, alias="from"),
    time_to: datetime | None = Query(None, alias="to"),
    limit: int = Query(5000, ge=1, le=50000),
    session: AsyncSession = Depends(get_session),
) -> StreamingResponse:
    repo = PositionRepository(session)
    reports = await repo.get_track(mmsi, time_from, time_to, limit)

    rows: list[list[Any]] = []
    for r in reports:
        rows.append(
            [
                r.ts.isoformat(),
                round(r.lat, 6),
                round(r.lon, 6),
                round(r.sog, 2) if r.sog is not None else "",
                round(r.cog, 1) if r.cog is not None else "",
                round(r.heading, 1) if r.heading is not None else "",
                r.nav_status if r.nav_status is not None else "",
            ]
        )

    headers = ["ts", "lat", "lon", "sog", "cog", "heading", "nav_status"]
    buf = _csv_stream(rows, headers)
    return StreamingResponse(
        buf,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=track_{mmsi}.csv"},
    )


@router.get("/alerts.csv")
async def export_alerts_csv(
    time_from: datetime | None = Query(None, alias="from"),
    geofence_id: int | None = Query(None),
    limit: int = Query(1000, ge=1, le=10000),
    session: AsyncSession = Depends(get_session),
) -> StreamingResponse:
    repo = AlertRepository(session)
    alerts = await repo.get_recent(time_from, geofence_id, limit=limit)

    rows: list[list[Any]] = []
    for a in alerts:
        rows.append(
            [
                a.id,
                a.mmsi,
                a.geofence_id if a.geofence_id is not None else "",
                a.ts.isoformat(),
                a.event_type,
                round(a.lat, 6) if a.lat is not None else "",
                round(a.lon, 6) if a.lon is not None else "",
            ]
        )

    headers = ["id", "mmsi", "geofence_id", "ts", "event_type", "lat", "lon"]
    buf = _csv_stream(rows, headers)
    return StreamingResponse(
        buf,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=alerts.csv"},
    )


@router.get("/stats/timeseries.csv")
async def export_timeseries_csv(
    period: str = Query("24h", pattern="^(24h|7d|30d)$"),
    session: AsyncSession = Depends(get_session),
) -> StreamingResponse:
    repo = StatsRepository(session)
    data = await repo.get_timeseries(period)

    rows: list[list[Any]] = []
    for row in data:
        rows.append(
            [
                row["ts"].isoformat(),
                row["vessel_count"],
                round(row["avg_sog"], 2),
            ]
        )

    headers = ["ts", "vessel_count", "avg_sog"]
    buf = _csv_stream(rows, headers)
    return StreamingResponse(
        buf,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=timeseries_{period}.csv"},
    )


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


@router.get("/ports/{port_id}/arrivals.csv")
async def export_port_arrivals_csv(
    port_id: int,
    limit: int = Query(1000, ge=1, le=10000),
    session: AsyncSession = Depends(get_session),
) -> StreamingResponse:
    repo = PortRepository(session)
    arrivals = await repo.get_arrivals(port_id, limit=limit)

    rows: list[list[Any]] = []
    for a in arrivals:
        rows.append(
            [
                a.id,
                a.mmsi,
                a.port_id,
                a.arrived_at.isoformat(),
                a.departed_at.isoformat() if a.departed_at else "",
                round(a.dwell_minutes, 1) if a.dwell_minutes else "",
                "yes" if a.anchorage else "no",
                round(a.lat, 6) if a.lat is not None else "",
                round(a.lon, 6) if a.lon is not None else "",
            ]
        )

    headers = [
        "id", "mmsi", "port_id", "arrived_at", "departed_at",
        "dwell_minutes", "anchorage", "lat", "lon",
    ]
    buf = _csv_stream(rows, headers)
    return StreamingResponse(
        buf,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=port_{port_id}_arrivals.csv"},
    )

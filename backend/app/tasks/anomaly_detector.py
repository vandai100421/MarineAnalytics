from __future__ import annotations

import asyncio
import math
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.core.db import async_session_factory
from app.core.logging import get_logger
from app.models.vessel_event import VesselEvent

logger = get_logger("anomaly_detector")

STALE_THRESHOLD_MINUTES = 30
GAP_THRESHOLD_MINUTES = 30
SPEED_ANOMALY_KNOTS = 35.0
POSITION_JUMP_NM = 50.0
MAX_VESSEL_SPEED_KN = 30.0

EARTH_RADIUS_NM = 3440.065


def _haversine_nm(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    rlat1, rlon1 = math.radians(lat1), math.radians(lon1)
    rlat2, rlon2 = math.radians(lat2), math.radians(lon2)
    dlat = rlat2 - rlat1
    dlon = rlon2 - rlon1
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlon / 2) ** 2
    )
    return 2 * EARTH_RADIUS_NM * math.asin(math.sqrt(a))


async def _insert_event(
    mmsi: int,
    event_type: str,
    severity: str,
    lat: float | None,
    lon: float | None,
    details: dict[str, object] | None = None,
) -> None:
    async with async_session_factory() as session:
        stmt = (
            insert(VesselEvent)
            .values(
                mmsi=mmsi,
                event_type=event_type,
                severity=severity,
                lat=lat,
                lon=lon,
                details=details,
                ts=datetime.now(UTC),
            )
            .on_conflict_do_nothing()
        )
        await session.execute(stmt)
        await session.commit()


async def detect_anomalies() -> None:
    from app.models.position import PositionReport

    now = datetime.now(UTC)
    since = now - timedelta(hours=2)

    async with async_session_factory() as session:
        stmt = (
            select(PositionReport)
            .where(PositionReport.ts >= since)
            .order_by(PositionReport.mmsi, PositionReport.ts)
        )
        result = await session.execute(stmt)
        reports = result.scalars().all()

    if not reports:
        return

    by_mmsi: dict[int, list[PositionReport]] = {}
    for r in reports:
        by_mmsi.setdefault(r.mmsi, []).append(r)

    events_inserted = 0

    for mmsi, pts in by_mmsi.items():
        latest = pts[-1]

        if (now - latest.ts).total_seconds() > STALE_THRESHOLD_MINUTES * 60:
            await _insert_event(
                mmsi,
                "stale",
                "warning",
                latest.lat,
                latest.lon,
                {"minutes_stale": (now - latest.ts).total_seconds() / 60},
            )
            events_inserted += 1

        for i in range(1, len(pts)):
            prev = pts[i - 1]
            curr = pts[i]

            gap_min = (curr.ts - prev.ts).total_seconds() / 60
            if gap_min > GAP_THRESHOLD_MINUTES:
                await _insert_event(
                    mmsi,
                    "gap",
                    "warning",
                    curr.lat,
                    curr.lon,
                    {"gap_minutes": gap_min, "prev_ts": prev.ts.isoformat()},
                )
                events_inserted += 1
                continue

            if prev.lat is None or prev.lon is None or curr.lat is None or curr.lon is None:
                continue

            distance = _haversine_nm(prev.lat, prev.lon, curr.lat, curr.lon)
            hours = (curr.ts - prev.ts).total_seconds() / 3600
            if hours <= 0:
                continue
            implied_speed = distance / hours if hours > 0 else 0

            if distance > POSITION_JUMP_NM and implied_speed > MAX_VESSEL_SPEED_KN * 3:
                await _insert_event(
                    mmsi,
                    "spoofing",
                    "critical",
                    curr.lat,
                    curr.lon,
                    {
                        "distance_nm": distance,
                        "implied_speed_kn": implied_speed,
                        "prev_ts": prev.ts.isoformat(),
                    },
                )
                events_inserted += 1
                continue

            if curr.sog is not None and curr.sog > SPEED_ANOMALY_KNOTS:
                await _insert_event(
                    mmsi,
                    "speed_anomaly",
                    "warning",
                    curr.lat,
                    curr.lon,
                    {"sog": curr.sog, "threshold": SPEED_ANOMALY_KNOTS},
                )
                events_inserted += 1

            if (
                prev.cog is not None
                and curr.cog is not None
                and abs(((curr.cog - prev.cog + 180) % 360) - 180) > 120
                and (curr.sog or 0) > 5
            ):
                await _insert_event(
                    mmsi,
                    "course_anomaly",
                    "info",
                    curr.lat,
                    curr.lon,
                    {
                        "prev_cog": prev.cog,
                        "curr_cog": curr.cog,
                        "change": abs(((curr.cog - prev.cog + 180) % 360) - 180),
                    },
                )
                events_inserted += 1

    if events_inserted > 0:
        logger.info("anomaly_detection_complete", events_inserted=events_inserted)


async def run_anomaly_detector(interval_seconds: int = 300) -> None:
    logger.info("anomaly_detector_started", interval=interval_seconds)
    while True:
        try:
            await detect_anomalies()
        except Exception as exc:
            logger.error("anomaly_detector_error", error=str(exc))
        await asyncio.sleep(interval_seconds)

from __future__ import annotations

from app.core.db import async_session_factory
from app.core.logging import get_logger
from app.ingestion.decoder import DecodedMessage
from app.repositories.alert_repository import AlertRepository
from app.repositories.geofence_repository import GeofenceRepository

logger = get_logger("geofence_engine")

DEDUP_WINDOW_MINUTES = 30


async def check_position_against_geofences(msg: DecodedMessage) -> None:
    if msg.lat is None or msg.lon is None:
        return

    try:
        async with async_session_factory() as session:
            geo_repo = GeofenceRepository(session)
            alert_repo = AlertRepository(session)

            containing = await geo_repo.find_containing(msg.lon, msg.lat)

            for geofence in containing:
                if await alert_repo.has_recent_alert(
                    msg.mmsi,
                    geofence.id,
                    "enter",
                    DEDUP_WINDOW_MINUTES,
                ):
                    continue

                await alert_repo.create(
                    mmsi=msg.mmsi,
                    geofence_id=geofence.id,
                    event_type="enter",
                    lat=msg.lat,
                    lon=msg.lon,
                )
                logger.info(
                    "geofence_alert_created",
                    mmsi=msg.mmsi,
                    geofence_id=geofence.id,
                    geofence_name=geofence.name,
                    event="enter",
                )
    except Exception as exc:
        logger.error("geofence_check_error", mmsi=msg.mmsi, error=str(exc))

from __future__ import annotations

import asyncio
from typing import Any

import httpx

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("opensky")

OPENSKY_URL = "https://opensky-network.org/api/states/all"

MS_TO_KNOTS = 1.94384
M_TO_FEET = 3.28084


async def poll_opensky() -> None:
    settings = get_settings()
    if not settings.opensky_enabled:
        logger.info("opensky_disabled_not_enabled")
        return

    if settings.opensky_username and settings.opensky_password:
        auth = (settings.opensky_username, settings.opensky_password)
    else:
        auth = None

    logger.info(
        "opensky_started",
        poll_interval=settings.opensky_poll_interval_seconds,
        authenticated=auth is not None,
    )

    while True:
        try:
            await _fetch_and_process(auth)
        except asyncio.CancelledError:
            logger.info("opensky_client_cancelled")
            raise
        except Exception as exc:
            logger.error("opensky_error", error=str(exc))
        await asyncio.sleep(settings.opensky_poll_interval_seconds)


async def _fetch_and_process(auth: tuple[str, str] | None) -> None:
    from app.ingestion.adsb_writer import write_aircraft_positions

    settings = get_settings()
    params: dict[str, float] = {}
    bbox = settings.opensky_bbox_params
    if bbox:
        lamin, lomin, lamax, lomax = bbox
        params["lamin"] = lamin
        params["lomin"] = lomin
        params["lamax"] = lamax
        params["lomax"] = lomax

    async with httpx.AsyncClient() as client:
        response = await client.get(
            OPENSKY_URL, params=params, auth=auth, timeout=15.0
        )
        if response.status_code == 429:
            logger.warning("opensky_rate_limited")
            return
        response.raise_for_status()
        data = response.json()

    states = data.get("states") or []
    if not states:
        logger.info("opensky_no_states")
        return

    aircraft_list: list[dict[str, Any]] = [
        a for a in (_convert_state(s) for s in states) if a is not None
    ]
    if not aircraft_list:
        return

    await write_aircraft_positions(aircraft_list)
    logger.info("opensky_fetched", count=len(aircraft_list))


def _convert_state(state: list[Any]) -> dict[str, Any] | None:
    if len(state) < 11:
        return None
    icao24 = (state[0] or "").strip()
    lat = state[6]
    lon = state[5]
    if not icao24 or lat is None or lon is None:
        return None

    callsign = (state[1] or "").strip()
    baro_alt = state[7]
    geo_alt = state[13] if len(state) > 13 else None
    alt_m = geo_alt if geo_alt is not None else baro_alt
    velocity_ms = state[9]
    true_track = state[10]

    return {
        "hex": icao24,
        "lat": float(lat),
        "lon": float(lon),
        "alt_baro": round(alt_m * M_TO_FEET, 1) if alt_m is not None else None,
        "gs": round(velocity_ms * MS_TO_KNOTS, 1) if velocity_ms is not None else None,
        "track": round(float(true_track), 1) if true_track is not None else None,
        "flight": callsign or None,
        "reg": None,
        "type": None,
    }

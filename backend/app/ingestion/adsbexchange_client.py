from __future__ import annotations

import asyncio

import httpx

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("adsbexchange")

ADSBEXCHANGE_URL = "https://adsbexchange.com/api/aircraft/v2"
POLL_INTERVAL = 10.0


async def poll_adsbexchange() -> None:
    settings = get_settings()
    if not settings.adsbexchange_api_key:
        logger.info("adsbexchange_disabled_no_api_key")
        return

    while True:
        try:
            await _fetch_and_process()
        except asyncio.CancelledError:
            logger.info("adsbexchange_client_cancelled")
            raise
        except Exception as exc:
            logger.error("adsbexchange_error", error=str(exc))
        await asyncio.sleep(POLL_INTERVAL)


async def _fetch_and_process() -> None:
    from app.ingestion.adsb_writer import write_aircraft_positions

    settings = get_settings()
    headers = {"api-key": settings.adsbexchange_api_key}

    async with httpx.AsyncClient() as client:
        response = await client.get(ADSBEXCHANGE_URL, headers=headers, timeout=15.0)
        response.raise_for_status()
        data = response.json()

    aircraft_list = data.get("ac", [])
    if not aircraft_list:
        return

    await write_aircraft_positions(aircraft_list)
    logger.info("adsbexchange_fetched", count=len(aircraft_list))

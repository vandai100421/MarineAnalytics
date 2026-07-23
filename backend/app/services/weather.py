from __future__ import annotations

import asyncio
from typing import Any

import httpx

from app.core.logging import get_logger

logger = get_logger("weather")

OPENSKY_MARINE_URL = "https://marine-api.open-meteo.com/v1/marine"
OPENMETEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

_cache: dict[str, tuple[float, dict[str, Any]]] = {}
_CACHE_TTL = 600.0


async def get_wind_grid(
    min_lon: float,
    min_lat: float,
    max_lon: float,
    max_lat: float,
) -> list[dict[str, Any]]:
    import time

    cache_key = f"wind_{min_lon:.1f}_{min_lat:.1f}_{max_lon:.1f}_{max_lat:.1f}"
    now = time.time()
    cached = _cache.get(cache_key)
    if cached and now - cached[0] < _CACHE_TTL:
        return list(cached[1].get("points", []))

    dlon = max_lon - min_lon
    dlat = max_lat - min_lat
    if dlon <= 0 or dlat <= 0:
        return []

    cols = min(max(int(dlon / 2), 3), 12)
    rows = min(max(int(dlat / 2), 3), 12)
    step_lon = dlon / cols
    step_lat = dlat / rows

    points: list[dict[str, Any]] = []
    coros: list[asyncio.Task[dict[str, Any] | None]] = []

    async with httpx.AsyncClient() as client:
        for r in range(rows + 1):
            for c in range(cols + 1):
                lat = min_lat + r * step_lat
                lon = min_lon + c * step_lon
                coros.append(asyncio.create_task(_fetch_point(client, lat, lon)))

        results = await asyncio.gather(*coros, return_exceptions=True)

    for r in range(rows + 1):
        for c in range(cols + 1):
            idx = r * (cols + 1) + c
            if idx >= len(results):
                continue
            res = results[idx]
            if isinstance(res, dict):
                points.append(res)

    _cache[cache_key] = (now, {"points": points})
    logger.debug("wind_grid_fetched", points=len(points))
    return points


async def _fetch_point(
    client: httpx.AsyncClient,
    lat: float,
    lon: float,
) -> dict[str, Any] | None:
    params: dict[str, str | float] = {
        "latitude": lat,
        "longitude": lon,
        "current": "wind_speed_10m,wind_direction_10m,wave_height",
    }
    try:
        response = await client.get(OPENMETEO_FORECAST_URL, params=params, timeout=10.0)
        if response.status_code != 200:
            return None
        data = response.json()
        current = data.get("current", {})
        if not isinstance(current, dict):
            return None
        return {
            "lat": lat,
            "lon": lon,
            "wind_speed": current.get("wind_speed_10m"),
            "wind_direction": current.get("wind_direction_10m"),
            "wave_height": current.get("wave_height"),
        }
    except (httpx.HTTPError, KeyError, ValueError):
        return None

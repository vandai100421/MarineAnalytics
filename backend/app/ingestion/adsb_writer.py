from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy.dialects.postgresql import insert

from app.core.db import async_session_factory
from app.core.logging import get_logger
from app.core.redis import get_redis
from app.models.aircraft import AircraftPosition

logger = get_logger("adsb_writer")

REDIS_AIR_KEY_PREFIX = "air:"
REDIS_AIR_TTL = 600


async def write_aircraft_positions(aircraft_list: list[dict[str, Any]]) -> None:
    if not aircraft_list:
        return

    rows: list[dict[str, Any]] = []
    now = datetime.now(UTC)

    for ac in aircraft_list:
        hex_id = ac.get("hex", "").strip()
        lat = ac.get("lat")
        lon = ac.get("lon")
        if not hex_id or lat is None or lon is None:
            continue

        rows.append(
            {
                "hex": hex_id,
                "ts": now,
                "lat": float(lat),
                "lon": float(lon),
                "alt": _to_float(ac.get("alt_baro")),
                "gs": _to_float(ac.get("gs")),
                "track": _to_float(ac.get("track")),
                "flight": _clean_str(ac.get("flight")),
                "reg": ac.get("reg"),
                "type": ac.get("type"),
                "vertical_rate": _to_float(ac.get("vertical_rate")),
                "origin_country": ac.get("origin_country"),
            }
        )

    if not rows:
        return

    try:
        async with async_session_factory() as session:
            await session.execute(insert(AircraftPosition), rows)
            await session.commit()
    except Exception as exc:
        logger.error("aircraft_db_error", error=str(exc), count=len(rows))

    await _cache_aircraft_positions(rows)
    logger.debug("aircraft_positions_written", count=len(rows))


async def _cache_aircraft_positions(rows: list[dict[str, Any]]) -> None:
    redis = await get_redis()
    for row in rows:
        key = f"{REDIS_AIR_KEY_PREFIX}{row['hex']}"
        mapping: dict[str, str | float] = {
            "hex": str(row["hex"]),
            "lat": str(row["lat"]),
            "lon": str(row["lon"]),
            "ts": row["ts"].isoformat(),
        }
        if row["alt"] is not None:
            mapping["alt"] = str(row["alt"])
        if row["gs"] is not None:
            mapping["gs"] = str(row["gs"])
        if row["track"] is not None:
            mapping["track"] = str(row["track"])
        if row["flight"]:
            mapping["flight"] = str(row["flight"])
        if row["reg"]:
            mapping["reg"] = str(row["reg"])
        if row["type"]:
            mapping["type"] = str(row["type"])
        if row.get("vertical_rate") is not None:
            mapping["vertical_rate"] = str(row["vertical_rate"])
        if row.get("origin_country"):
            mapping["origin_country"] = str(row["origin_country"])

        await redis.hset(key, mapping=mapping)  # type: ignore[arg-type]
        await redis.expire(key, REDIS_AIR_TTL)


def _to_float(value: Any) -> float | None:
    if value is None or value == "ground":
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def _clean_str(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None

from datetime import datetime, timezone

from sqlalchemy.dialects.postgresql import insert

from app.core.db import async_session_factory
from app.core.logging import get_logger
from app.core.redis import get_redis
from app.ingestion.decoder import DecodedMessage
from app.models.position import PositionReport
from app.models.vessel import Vessel

logger = get_logger("writer")

REDIS_POS_KEY_PREFIX = "pos:"
REDIS_POS_TTL = 3600


async def write_position(msg: DecodedMessage) -> None:
    async with async_session_factory() as session:
        stmt = insert(PositionReport).values(
            mmsi=msg.mmsi,
            ts=msg.ts or datetime.now(timezone.utc),
            lat=msg.lat,
            lon=msg.lon,
            sog=msg.sog,
            cog=msg.cog,
            heading=msg.heading,
            nav_status=msg.nav_status,
            rot=msg.rot,
            source="aisstream",
        )
        await session.execute(stmt)
        await session.commit()

    await _cache_position(msg)
    logger.debug("position_written", mmsi=msg.mmsi, lat=msg.lat, lon=msg.lon)


async def upsert_vessel(msg: DecodedMessage) -> None:
    async with async_session_factory() as session:
        stmt = insert(Vessel).values(
            mmsi=msg.mmsi,
            name=msg.name,
            ship_type=msg.ship_type,
            callsign=msg.callsign,
            imo=msg.imo,
            dim_a=msg.dim_a,
            dim_b=msg.dim_b,
            dim_c=msg.dim_c,
            dim_d=msg.dim_d,
            destination=msg.destination,
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=[Vessel.mmsi],
            set_={
                "name": msg.name,
                "ship_type": msg.ship_type,
                "callsign": msg.callsign,
                "imo": msg.imo,
                "dim_a": msg.dim_a,
                "dim_b": msg.dim_b,
                "dim_c": msg.dim_c,
                "dim_d": msg.dim_d,
                "destination": msg.destination,
            },
        )
        await session.execute(stmt)
        await session.commit()

    logger.debug("vessel_upserted", mmsi=msg.mmsi, name=msg.name)


async def _cache_position(msg: DecodedMessage) -> None:
    redis = await get_redis()
    key = f"{REDIS_POS_KEY_PREFIX}{msg.mmsi}"
    await redis.hset(
        key,
        mapping={
            "mmsi": msg.mmsi,
            "lat": msg.lat,
            "lon": msg.lon,
            "sog": msg.sog or 0,
            "cog": msg.cog or 0,
            "heading": msg.heading or 0,
            "ts": (msg.ts or datetime.now(timezone.utc)).isoformat(),
        },
    )
    await redis.expire(key, REDIS_POS_TTL)

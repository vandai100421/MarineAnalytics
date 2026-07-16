import asyncio
from datetime import UTC, datetime

from sqlalchemy.dialects.postgresql import insert

from app.core.db import async_session_factory
from app.core.logging import get_logger
from app.core.redis import get_redis
from app.ingestion.decoder import DecodedMessage
from app.ingestion.metrics import metrics
from app.models.position import PositionReport
from app.models.vessel import Vessel

logger = get_logger("writer")

REDIS_POS_KEY_PREFIX = "pos:"
REDIS_POS_TTL = 3600


async def write_position(msg: DecodedMessage) -> None:
    async with async_session_factory() as session:
        stmt = insert(PositionReport).values(
            mmsi=msg.mmsi,
            ts=msg.ts or datetime.now(UTC),
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
    metrics.record_position_written()
    logger.debug("position_written", mmsi=msg.mmsi, lat=msg.lat, lon=msg.lon)

    from app.alerts.geofence_engine import check_position_against_geofences

    await check_position_against_geofences(msg)


async def upsert_vessel(msg: DecodedMessage) -> None:
    async with async_session_factory() as session:
        stmt = insert(Vessel).values(
            mmsi=msg.mmsi,
            name=msg.name,
            ship_type=msg.ship_type,
            ship_type_name=msg.ship_type_name,
            callsign=msg.callsign,
            imo=msg.imo,
            dim_a=msg.dim_a,
            dim_b=msg.dim_b,
            dim_c=msg.dim_c,
            dim_d=msg.dim_d,
            destination=msg.destination,
            eta=msg.eta,
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=[Vessel.mmsi],
            set_={
                "name": msg.name,
                "ship_type": msg.ship_type,
                "ship_type_name": msg.ship_type_name,
                "callsign": msg.callsign,
                "imo": msg.imo,
                "dim_a": msg.dim_a,
                "dim_b": msg.dim_b,
                "dim_c": msg.dim_c,
                "dim_d": msg.dim_d,
                "destination": msg.destination,
                "eta": msg.eta,
            },
        )
        await session.execute(stmt)
        await session.commit()

    metrics.record_vessel_upserted()
    logger.debug("vessel_upserted", mmsi=msg.mmsi, name=msg.name)


async def _cache_position(msg: DecodedMessage) -> None:
    redis = await get_redis()
    key = f"{REDIS_POS_KEY_PREFIX}{msg.mmsi}"
    await redis.hset(
        key,
        mapping={
            "mmsi": str(msg.mmsi),
            "lat": str(msg.lat),
            "lon": str(msg.lon),
            "sog": str(msg.sog or 0),
            "cog": str(msg.cog or 0),
            "heading": str(msg.heading or 0),
            "ts": (msg.ts or datetime.now(UTC)).isoformat(),
        },
    )
    await redis.expire(key, REDIS_POS_TTL)


class BatchWriter:
    def __init__(self, batch_size: int, flush_interval: float) -> None:
        self._batch_size = batch_size
        self._flush_interval = flush_interval
        self._position_buffer: list[DecodedMessage] = []
        self._vessel_buffer: list[DecodedMessage] = []
        self._lock = asyncio.Lock()
        self._flush_task: asyncio.Task[None] | None = None

    async def add_position(self, msg: DecodedMessage) -> None:
        async with self._lock:
            self._position_buffer.append(msg)
            if len(self._position_buffer) >= self._batch_size:
                await self._flush_positions_locked()

    async def add_vessel(self, msg: DecodedMessage) -> None:
        async with self._lock:
            self._vessel_buffer.append(msg)
            if len(self._vessel_buffer) >= self._batch_size:
                await self._flush_vessels_locked()

    async def start(self) -> None:
        self._flush_task = asyncio.create_task(self._flush_loop())

    async def stop(self) -> None:
        if self._flush_task is not None:
            self._flush_task.cancel()
            try:
                await self._flush_task
            except asyncio.CancelledError:
                pass
            self._flush_task = None
        await self.flush_all()

    async def flush_all(self) -> None:
        async with self._lock:
            await self._flush_positions_locked()
            await self._flush_vessels_locked()

    async def _flush_loop(self) -> None:
        while True:
            await asyncio.sleep(self._flush_interval)
            try:
                await self.flush_all()
            except Exception as exc:
                logger.error("batch_flush_error", error=str(exc))

    async def _flush_positions_locked(self) -> None:
        if not self._position_buffer:
            return
        buffer = self._position_buffer[:]
        self._position_buffer.clear()
        now = datetime.now(UTC)
        rows = [
            {
                "mmsi": m.mmsi,
                "ts": m.ts or now,
                "lat": m.lat,
                "lon": m.lon,
                "sog": m.sog,
                "cog": m.cog,
                "heading": m.heading,
                "nav_status": m.nav_status,
                "rot": m.rot,
                "source": "aisstream",
            }
            for m in buffer
        ]
        try:
            async with async_session_factory() as session:
                await session.execute(insert(PositionReport), rows)
                await session.commit()
            for m in buffer:
                await _cache_position(m)
            for _ in buffer:
                metrics.record_position_written()
            logger.debug("positions_batched", count=len(buffer))
        except Exception as exc:
            logger.error("position_batch_error", error=str(exc), count=len(buffer))

    async def _flush_vessels_locked(self) -> None:
        if not self._vessel_buffer:
            return
        buffer = self._vessel_buffer[:]
        self._vessel_buffer.clear()
        for m in buffer:
            try:
                async with async_session_factory() as session:
                    stmt = insert(Vessel).values(
                        mmsi=m.mmsi,
                        name=m.name,
                        ship_type=m.ship_type,
                        ship_type_name=m.ship_type_name,
                        callsign=m.callsign,
                        imo=m.imo,
                        dim_a=m.dim_a,
                        dim_b=m.dim_b,
                        dim_c=m.dim_c,
                        dim_d=m.dim_d,
                        destination=m.destination,
                        eta=m.eta,
                    )
                    stmt = stmt.on_conflict_do_update(
                        index_elements=[Vessel.mmsi],
                        set_={
                            "name": m.name,
                            "ship_type": m.ship_type,
                            "ship_type_name": m.ship_type_name,
                            "callsign": m.callsign,
                            "imo": m.imo,
                            "dim_a": m.dim_a,
                            "dim_b": m.dim_b,
                            "dim_c": m.dim_c,
                            "dim_d": m.dim_d,
                            "destination": m.destination,
                            "eta": m.eta,
                        },
                    )
                    await session.execute(stmt)
                    await session.commit()
                metrics.record_vessel_upserted()
            except Exception as exc:
                logger.error("vessel_upsert_error", mmsi=m.mmsi, error=str(exc))
        logger.debug("vessels_batched", count=len(buffer))

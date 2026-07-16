from __future__ import annotations

import asyncio
import json
import time
from dataclasses import dataclass, field

from app.core.config import get_settings
from app.core.logging import get_logger
from app.core.redis import get_redis

logger = get_logger("sse")

REDIS_POS_KEY_PREFIX = "pos:"

_positions_cache: list[dict[str, object]] = []
_positions_cache_time: float = 0.0
_CACHE_TTL = 1.0


@dataclass(eq=False)
class Subscriber:
    queue: asyncio.Queue[str] = field(default_factory=lambda: asyncio.Queue(maxsize=500))
    bbox: tuple[float, float, float, float] | None = None
    min_sog: float = 0.0
    active: bool = True


class SubscriberManager:
    def __init__(self, max_clients: int = 200) -> None:
        self._subscribers: set[Subscriber] = set()
        self._max_clients = max_clients
        self._broadcast_task: asyncio.Task[None] | None = None

    @property
    def client_count(self) -> int:
        return len(self._subscribers)

    def add(self, sub: Subscriber) -> bool:
        if len(self._subscribers) >= self._max_clients:
            return False
        self._subscribers.add(sub)
        logger.info("sse_subscriber_added", total=len(self._subscribers))
        return True

    def remove(self, sub: Subscriber) -> None:
        self._subscribers.discard(sub)
        logger.info("sse_subscriber_removed", total=len(self._subscribers))

    async def start_broadcaster(self, interval: float = 1.0) -> None:
        self._broadcast_task = asyncio.create_task(self._broadcast_loop(interval))

    async def stop_broadcaster(self) -> None:
        if self._broadcast_task is not None:
            self._broadcast_task.cancel()
            try:
                await self._broadcast_task
            except asyncio.CancelledError:
                pass
            self._broadcast_task = None

    async def _broadcast_loop(self, interval: float) -> None:
        logger.info("sse_broadcaster_started", interval=interval)
        while True:
            try:
                await asyncio.sleep(interval)
                await self._broadcast()
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.error("sse_broadcast_error", error=str(exc))

    async def _broadcast(self) -> None:
        if not self._subscribers:
            return

        positions = await self._get_positions_cached()
        if not positions:
            return

        for sub in list(self._subscribers):
            if not sub.active:
                self.remove(sub)
                continue

            filtered = positions
            if sub.bbox is not None:
                min_lon, min_lat, max_lon, max_lat = sub.bbox
                filtered = [
                    p
                    for p in positions
                    if min_lon <= float(p["lon"]) <= max_lon  # type: ignore[arg-type]
                    and min_lat <= float(p["lat"]) <= max_lat  # type: ignore[arg-type]
                ]

            if sub.min_sog > 0:
                filtered = [p for p in filtered if float(p["sog"]) >= sub.min_sog]  # type: ignore[arg-type]

            if not filtered:
                continue

            try:
                sub.queue.put_nowait(json.dumps(filtered))
            except asyncio.QueueFull:
                logger.warning("sse_queue_full", dropping=len(filtered))

    async def _get_positions_cached(self) -> list[dict[str, object]]:
        global _positions_cache, _positions_cache_time
        now = time.monotonic()
        if _positions_cache and (now - _positions_cache_time) < _CACHE_TTL:
            return _positions_cache

        redis = await get_redis()
        keys: list[str] = []
        async for key in redis.scan_iter(match=f"{REDIS_POS_KEY_PREFIX}*", count=2000):
            keys.append(key)

        if not keys:
            return []

        pipe = redis.pipeline()
        for key in keys:
            pipe.hgetall(key)
        results = await pipe.execute()

        positions: list[dict[str, object]] = []
        for data in results:
            if not data:
                continue
            lat = _to_float(data.get("lat"))
            lon = _to_float(data.get("lon"))
            if lat is None or lon is None:
                continue
            mmsi = _to_int(data.get("mmsi"))
            if mmsi is None:
                continue
            positions.append(
                {
                    "mmsi": mmsi,
                    "lat": lat,
                    "lon": lon,
                    "sog": _to_float(data.get("sog")) or 0.0,
                    "cog": _to_float(data.get("cog")) or 0.0,
                    "heading": _to_float(data.get("heading")) or 0.0,
                    "ts": data.get("ts", ""),
                }
            )

        _positions_cache = positions
        _positions_cache_time = now
        return positions


subscriber_manager = SubscriberManager(max_clients=get_settings().sse_max_clients)


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

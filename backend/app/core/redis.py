from __future__ import annotations

from typing import Any

from redis.asyncio import Redis, from_url

from app.core.config import get_settings

_redis: Redis[Any] | None = None


async def get_redis() -> Redis:  # type: ignore[type-arg]
    global _redis
    if _redis is None:
        _redis = from_url(
            get_settings().redis_url,
            decode_responses=True,
            encoding="utf-8",
        )
    return _redis


async def close_redis() -> None:
    global _redis
    if _redis is not None:
        await _redis.aclose()  # type: ignore[attr-defined]
        _redis = None

from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Query
from sse_starlette.sse import EventSourceResponse

from app.core.config import get_settings
from app.core.logging import get_logger
from app.realtime.broadcaster import Subscriber, subscriber_manager

logger = get_logger("sse")

router = APIRouter(prefix="/sse", tags=["realtime"])


@router.get("/positions")
async def sse_positions(
    bbox: str | None = Query(None, description="min_lon,min_lat,max_lon,max_lat"),
    min_sog: float | None = Query(None, description="Minimum speed over ground"),
) -> EventSourceResponse:
    settings = get_settings()

    parsed_bbox: tuple[float, float, float, float] | None = None
    if bbox:
        try:
            parts = [float(x) for x in bbox.split(",")]
            if len(parts) == 4:
                parsed_bbox = (parts[0], parts[1], parts[2], parts[3])
        except ValueError:
            pass

    sub = Subscriber(
        bbox=parsed_bbox,
        min_sog=min_sog or 0.0,
    )

    accepted = subscriber_manager.add(sub)
    if not accepted:
        return EventSourceResponse(
            _error_stream("Server at maximum capacity"),
            ping=int(settings.sse_heartbeat_seconds),
        )

    async def event_stream() -> AsyncGenerator[dict[str, str], None]:
        try:
            yield {"event": "connected", "data": json.dumps({"status": "connected"})}
            while sub.active:
                try:
                    data = await asyncio.wait_for(
                        sub.queue.get(), timeout=settings.sse_heartbeat_seconds
                    )
                    yield {"event": "positions", "data": data}
                except TimeoutError:
                    yield {"event": "ping", "data": "{}"}
        except asyncio.CancelledError:
            pass
        finally:
            subscriber_manager.remove(sub)

    return EventSourceResponse(event_stream(), ping=int(settings.sse_heartbeat_seconds))


async def _error_stream(msg: str) -> AsyncGenerator[dict[str, str], None]:
    yield {"event": "error", "data": json.dumps({"error": msg})}

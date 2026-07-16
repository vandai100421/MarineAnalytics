from __future__ import annotations

import asyncio
import json
from typing import TYPE_CHECKING

from websockets.asyncio.client import connect

from app.core.config import get_settings
from app.core.logging import get_logger
from app.ingestion.metrics import metrics

if TYPE_CHECKING:
    from app.ingestion.writer import BatchWriter

logger = get_logger("aisstream")

AISSTREAM_URL = "wss://stream.aisstream.io/v0/stream"
MAX_RECONNECT_BACKOFF = 60
INITIAL_BACKOFF = 1

_batch_writer: BatchWriter | None = None


def _build_subscribe_payload() -> dict[str, object]:
    settings = get_settings()
    bbox = settings.bbox_list
    if not bbox:
        bbox = [[-90, -180], [90, 180]]
    payload: dict[str, object] = {
        "Apikey": settings.aisstream_api_key,
        "BoundingBoxes": [bbox],
    }
    return payload


async def connect_aisstream() -> None:
    global _batch_writer
    settings = get_settings()
    if not settings.aisstream_api_key:
        logger.warning("aisstream_disabled_no_api_key")
        return

    from app.ingestion.writer import BatchWriter

    _batch_writer = BatchWriter(
        batch_size=settings.ingestion_batch_size,
        flush_interval=settings.ingestion_flush_interval_seconds,
    )
    await _batch_writer.start()
    logger.info(
        "batch_writer_started",
        batch_size=settings.ingestion_batch_size,
        flush_interval=settings.ingestion_flush_interval_seconds,
    )

    backoff = INITIAL_BACKOFF
    await metrics.start_periodic_log(interval=60.0)
    try:
        while True:
            try:
                await _run_connection()
                backoff = INITIAL_BACKOFF
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                logger.warning("aisstream_disconnected", error=str(exc), backoff=backoff)
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, MAX_RECONNECT_BACKOFF)
    finally:
        if _batch_writer is not None:
            await _batch_writer.stop()
            _batch_writer = None
        await metrics.stop_periodic_log()


async def _run_connection() -> None:
    payload = _build_subscribe_payload()
    logger.info("aisstream_connecting", url=AISSTREAM_URL)

    async with connect(AISSTREAM_URL) as ws:
        await ws.send(json.dumps(payload))
        logger.info("aisstream_subscribed")

        async for raw in ws:
            try:
                message = json.loads(raw)
                await _handle_message(message)
            except json.JSONDecodeError:
                logger.warning("aisstream_invalid_json", raw=raw[:200])
            except Exception as exc:
                logger.error("aisstream_message_error", error=str(exc))
                metrics.record_decode_error()


async def _handle_message(message: dict[str, object]) -> None:
    from app.ingestion.decoder import decode_message

    message_type_raw = message.get("MessageType", "")
    message_type = str(message_type_raw) if message_type_raw is not None else ""

    metadata_raw = message.get("MetaData", {})
    metadata: dict[str, object] = dict(metadata_raw) if isinstance(metadata_raw, dict) else {}

    payload_raw = message.get("Message", {})
    payload: dict[str, object] = dict(payload_raw) if isinstance(payload_raw, dict) else {}

    metrics.record_message(message_type)

    decoded = decode_message(message_type, metadata, payload)
    if decoded is None:
        return

    if _batch_writer is None:
        return

    if decoded.kind == "position":
        await _batch_writer.add_position(decoded)
        if decoded.name is not None or decoded.ship_type is not None:
            await _batch_writer.add_vessel(decoded)
    elif decoded.kind == "static":
        await _batch_writer.add_vessel(decoded)

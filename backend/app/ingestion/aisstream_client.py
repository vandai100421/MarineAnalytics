import asyncio
import json

from websockets.asyncio.client import connect

from app.core.config import get_settings
from app.core.logging import get_logger
from app.ingestion.metrics import metrics

logger = get_logger("aisstream")

AISSTREAM_URL = "wss://stream.aisstream.io/v0/stream"
MAX_RECONNECT_BACKOFF = 60
INITIAL_BACKOFF = 1


def _build_subscribe_payload() -> dict[str, object]:
    settings = get_settings()
    payload: dict[str, object] = {
        "APIKey": settings.aisstream_api_key,
        "BoundingBoxes": [settings.bbox_list] if settings.bbox_list else None,
    }
    return payload


async def connect_aisstream() -> None:
    backoff = INITIAL_BACKOFF
    await metrics.start_periodic_log(interval=60.0)
    while True:
        try:
            await _run_connection()
            backoff = INITIAL_BACKOFF
        except asyncio.CancelledError:
            logger.info("aisstream_client_cancelled")
            await metrics.stop_periodic_log()
            raise
        except Exception as exc:
            logger.warning("aisstream_disconnected", error=str(exc), backoff=backoff)
            await asyncio.sleep(backoff)
            backoff = min(backoff * 2, MAX_RECONNECT_BACKOFF)


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
    from app.ingestion.writer import upsert_vessel, write_position

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

    if decoded.kind == "position":
        await write_position(decoded)
        if decoded.name is not None or decoded.ship_type is not None:
            await upsert_vessel(decoded)
    elif decoded.kind == "static":
        await upsert_vessel(decoded)

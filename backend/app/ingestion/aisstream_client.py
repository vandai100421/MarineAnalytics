import asyncio
import json

import websockets
from websockets.asyncio.client import connect

from app.core.config import get_settings
from app.core.logging import get_logger

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
    while True:
        try:
            await _run_connection()
            backoff = INITIAL_BACKOFF
        except asyncio.CancelledError:
            logger.info("aisstream_client_cancelled")
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


async def _handle_message(message: dict[str, object]) -> None:
    from app.ingestion.decoder import decode_message
    from app.ingestion.writer import write_position, upsert_vessel

    message_type = message.get("MessageType", "")
    metadata = message.get("MetaData", {})
    payload = message.get("Message", {})

    decoded = decode_message(message_type, metadata, payload)
    if decoded is None:
        return

    if decoded.kind == "position":
        await write_position(decoded)
    elif decoded.kind == "static":
        await upsert_vessel(decoded)

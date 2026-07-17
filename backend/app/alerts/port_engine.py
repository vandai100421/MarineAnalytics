from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.core.db import async_session_factory
from app.core.logging import get_logger
from app.ingestion.decoder import DecodedMessage
from app.repositories.port_repository import PortRepository

logger = get_logger(__name__)

IDLE_SPEED_THRESHOLD = 0.5
DEPARTURE_SPEED_THRESHOLD = 3.0
PORT_COUNT_CACHE_TTL_SECONDS = 60

_port_count_cache: int | None = None
_port_count_cache_time: float = 0.0

_vessel_port_state: dict[int, tuple[int, datetime]] = {}

_arrival_debounce: dict[int, datetime] = {}
ARRIVAL_DEBOUNCE_SECONDS = 600


def _now_ts() -> float:
    return datetime.now(UTC).timestamp()


async def _get_port_count() -> int:
    global _port_count_cache, _port_count_cache_time
    now = _now_ts()
    if (
        _port_count_cache is not None
        and (now - _port_count_cache_time) < PORT_COUNT_CACHE_TTL_SECONDS
    ):
        return _port_count_cache
    try:
        async with async_session_factory() as session:
            repo = PortRepository(session)
            count = await repo.count_ports()
            _port_count_cache = count
            _port_count_cache_time = now
            return count
    except Exception as exc:
        logger.warning("port_count_failed", error=str(exc))
        return 0


def invalidate_port_cache() -> None:
    global _port_count_cache, _port_count_cache_time
    _port_count_cache = None
    _port_count_cache_time = 0.0


async def check_position_against_ports(msg: DecodedMessage) -> None:
    if msg.lat is None or msg.lon is None or msg.mmsi is None:
        return

    try:
        port_count = await _get_port_count()
        if port_count == 0:
            return

        mmsi = msg.mmsi
        lat = msg.lat
        lon = msg.lon
        sog = msg.sog or 0.0
        now = datetime.now(UTC)

        async with async_session_factory() as session:
            repo = PortRepository(session)

            if sog < IDLE_SPEED_THRESHOLD:
                last_debounce = _arrival_debounce.get(mmsi)
                if last_debounce is not None and (
                    now - last_debounce
                ).total_seconds() < ARRIVAL_DEBOUNCE_SECONDS:
                    pass
                else:
                    nearby = await repo.find_nearby(lon, lat)
                    if nearby:
                        port = nearby[0]
                        already_active = await repo.has_active_arrival(mmsi, port.id)
                        if not already_active:
                            anchorage = (port.type == "anchorage")
                            await repo.start_arrival(
                                mmsi=mmsi,
                                port_id=port.id,
                                lat=lat,
                                lon=lon,
                                anchorage=anchorage,
                            )
                            _vessel_port_state[mmsi] = (port.id, now)
                            _arrival_debounce[mmsi] = now
                            logger.info(
                                "port_arrival_detected",
                                mmsi=mmsi,
                                port_id=port.id,
                                port_name=port.name,
                                anchorage=anchorage,
                            )

            elif sog > DEPARTURE_SPEED_THRESHOLD:
                if mmsi in _vessel_port_state:
                    port_id, _ = _vessel_port_state[mmsi]
                    ended = await repo.end_arrival(mmsi, port_id)
                    if ended:
                        del _vessel_port_state[mmsi]
                        logger.info(
                            "port_departure_detected",
                            mmsi=mmsi,
                            port_id=port_id,
                        )

        cutoff = now - timedelta(hours=2)
        stale = [m for m, (_, t) in _vessel_port_state.items() if t < cutoff]
        for m in stale:
            del _vessel_port_state[m]

        stale_debounce = [m for m, t in _arrival_debounce.items() if t < cutoff]
        for m in stale_debounce:
            del _arrival_debounce[m]

    except Exception as exc:
        logger.error("port_check_error", mmsi=msg.mmsi, error=str(exc))

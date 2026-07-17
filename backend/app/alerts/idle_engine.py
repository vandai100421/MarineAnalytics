from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.core.db import async_session_factory
from app.core.logging import get_logger
from app.ingestion.decoder import DecodedMessage
from app.repositories.idle_repository import IdleRepository

logger = get_logger(__name__)

IDLE_SOG_THRESHOLD = 0.5
RESUME_SOG_THRESHOLD = 1.0
IDLE_DEBOUNCE_SECONDS = 600
SPEED_HISTORY_MAX = 60

_vessel_idle_state: dict[int, dict[str, object]] = {}
_vessel_speed_history: dict[int, list[tuple[float, float]]] = {}


def _now_ts() -> float:
    return datetime.now(UTC).timestamp()


async def check_position_for_idle(msg: DecodedMessage) -> None:
    if msg.lat is None or msg.lon is None or msg.mmsi is None:
        return

    try:
        mmsi = msg.mmsi
        lat = msg.lat
        lon = msg.lon
        sog = msg.sog or 0.0
        now = datetime.now(UTC)

        history = _vessel_speed_history.setdefault(mmsi, [])
        history.append((sog, now.timestamp()))
        if len(history) > SPEED_HISTORY_MAX:
            history.pop(0)

        if sog < IDLE_SOG_THRESHOLD:
            state = _vessel_idle_state.get(mmsi)
            if state is None:
                _vessel_idle_state[mmsi] = {
                    "idle_start": now,
                    "start_lat": lat,
                    "start_lon": lon,
                    "sog_samples": [sog],
                    "db_recorded": False,
                }
            else:
                raw_samples = state.get("sog_samples", [])
                samples = raw_samples if isinstance(raw_samples, list) else []
                samples.append(sog)
                state["sog_samples"] = samples[-SPEED_HISTORY_MAX:]

                raw_start = state.get("idle_start")
                idle_start = raw_start if isinstance(raw_start, datetime) else now
                elapsed = (now - idle_start).total_seconds()

                if elapsed >= IDLE_DEBOUNCE_SECONDS and not state.get("db_recorded"):
                    async with async_session_factory() as session:
                        repo = IdleRepository(session)
                        already = await repo.has_active_event(mmsi)
                        if not already:
                            await repo.start_event(mmsi, lat, lon)
                            state["db_recorded"] = True
                            logger.info(
                                "idle_event_started",
                                mmsi=mmsi,
                                lat=lat,
                                lon=lon,
                                elapsed_minutes=round(elapsed / 60, 1),
                            )

        elif sog > RESUME_SOG_THRESHOLD:
            state = _vessel_idle_state.pop(mmsi, None)
            if state and state.get("db_recorded"):
                raw_samples = state.get("sog_samples", [0.0])
                end_samples = raw_samples if isinstance(raw_samples, list) else [0.0]
                nums = [s for s in end_samples if isinstance(s, (int, float))]
                avg_sog = sum(nums) / len(nums) if nums else 0.0
                max_sog = max(nums) if nums else 0.0
                async with async_session_factory() as session:
                    repo = IdleRepository(session)
                    ended = await repo.end_event(mmsi, lat, lon, avg_sog, max_sog)
                    if ended:
                        logger.info(
                            "idle_event_ended",
                            mmsi=mmsi,
                            end_lat=lat,
                            end_lon=lon,
                            avg_sog=round(avg_sog, 2),
                        )

        cutoff = now - timedelta(hours=2)
        stale: list[int] = []
        for m, s in _vessel_idle_state.items():
            raw = s.get("idle_start")
            if isinstance(raw, datetime) and raw < cutoff:
                stale.append(m)
        for m in stale:
            del _vessel_idle_state[m]
        stale_hist = [
            m for m, h in _vessel_speed_history.items() if not h or h[-1][1] < cutoff.timestamp()
        ]
        for m in stale_hist:
            del _vessel_speed_history[m]

    except Exception as exc:
        logger.error("idle_check_error", mmsi=msg.mmsi, error=str(exc))

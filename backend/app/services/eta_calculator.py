from __future__ import annotations

import math
from datetime import UTC, datetime, timedelta
from difflib import SequenceMatcher

from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.port import Port
from app.repositories.port_repository import PortRepository
from app.repositories.vessel_repository import VesselRepository

EARTH_RADIUS_NM = 3440.065
MIN_SOG_FOR_ETA = 0.5
CONFIDENCE_THRESHOLD = 0.45
PORT_CACHE_TTL = 300

_port_cache: list[Port] | None = None
_port_cache_ts: float = 0.0


def haversine_nm(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    rlat1, rlat2 = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlon / 2) ** 2
    )
    return 2 * EARTH_RADIUS_NM * math.asin(math.sqrt(a))


def _normalize_destination(dest: str) -> str:
    cleaned = dest.strip().upper().replace("\x00", "")
    for sep in (" - ", " → ", ">>", "::"):
        cleaned = cleaned.split(sep)[0]
    return cleaned.strip()


def _match_score(dest: str, port_name: str) -> float:
    d = _normalize_destination(dest)
    p = port_name.upper()
    if d == p:
        return 1.0
    if d in p or p in d:
        longer = max(len(d), len(p))
        shorter = min(len(d), len(p))
        return shorter / longer * 0.95
    return SequenceMatcher(None, d, p).ratio()


async def _get_ports(session: AsyncSession) -> list[Port]:
    global _port_cache, _port_cache_ts
    now = datetime.now(UTC).timestamp()
    if _port_cache is not None and now - _port_cache_ts < PORT_CACHE_TTL:
        return _port_cache
    repo = PortRepository(session)
    _port_cache = await repo.get_all_ports()
    _port_cache_ts = now
    return _port_cache


def _match_destination(
    destination: str, ports: list[Port]
) -> tuple[Port | None, float]:
    best_port: Port | None = None
    best_score = 0.0
    for port in ports:
        score = _match_score(destination, port.name)
        if port.unlocode and _normalize_destination(destination) == port.unlocode.upper():
            score = 1.0
        if score > best_score:
            best_score = score
            best_port = port
    return best_port, best_score


class EtaCalculator:
    def __init__(self, session: AsyncSession, redis: Redis) -> None:  # type: ignore[type-arg]
        self._session = session
        self._redis = redis

    async def calculate(self, mmsi: int) -> dict[str, object]:
        vessel_repo = VesselRepository(self._session)
        vessel = await vessel_repo.get_by_mmsi(mmsi)
        if vessel is None:
            return {
                "mmsi": mmsi,
                "destination_raw": None,
                "matched_port": None,
                "match_confidence": 0.0,
                "distance_nm": None,
                "current_sog": 0.0,
                "eta_hours": None,
                "eta_time": None,
                "ais_eta": None,
            }

        pos_data = await self._redis.hgetall(f"pos:{mmsi}")
        lat = _to_float(pos_data.get("lat"))
        lon = _to_float(pos_data.get("lon"))
        sog = _to_float(pos_data.get("sog")) or 0.0

        destination = vessel.destination or ""
        matched_port: Port | None = None
        confidence = 0.0
        distance_nm: float | None = None
        eta_hours: float | None = None
        eta_time: datetime | None = None

        if destination and lat is not None and lon is not None:
            ports = await _get_ports(self._session)
            matched_port, confidence = _match_destination(destination, ports)

            if matched_port and confidence >= CONFIDENCE_THRESHOLD and sog >= MIN_SOG_FOR_ETA:
                distance_nm = haversine_nm(lat, lon, matched_port.lat, matched_port.lon)
                eta_hours = distance_nm / sog
                eta_time = datetime.now(UTC) + timedelta(hours=eta_hours)

        ais_eta = vessel.eta if vessel.eta and vessel.eta.year > 2000 else None

        return {
            "mmsi": mmsi,
            "destination_raw": destination or None,
            "matched_port": matched_port,
            "match_confidence": round(confidence, 2),
            "distance_nm": round(distance_nm, 1) if distance_nm is not None else None,
            "current_sog": round(sog, 1),
            "eta_hours": round(eta_hours, 1) if eta_hours is not None else None,
            "eta_time": eta_time,
            "ais_eta": ais_eta,
        }


def _to_float(value: str | None) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None

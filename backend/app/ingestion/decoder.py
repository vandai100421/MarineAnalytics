from dataclasses import dataclass
from datetime import datetime

from pyais import decode

from app.core.logging import get_logger

logger = get_logger("decoder")

DYNAMIC_MESSAGE_TYPES = {"PositionReport", "PositionReportInt", "StandardClassBPositionReport"}
STATIC_MESSAGE_TYPES = {"ShipStaticData", "StaticDataReport"}


@dataclass
class DecodedMessage:
    mmsi: int
    kind: str  # "position" | "static"
    ts: datetime | None
    lat: float | None = None
    lon: float | None = None
    sog: float | None = None
    cog: float | None = None
    heading: float | None = None
    nav_status: int | None = None
    rot: float | None = None
    name: str | None = None
    ship_type: int | None = None
    callsign: str | None = None
    imo: int | None = None
    dim_a: int | None = None
    dim_b: int | None = None
    dim_c: int | None = None
    dim_d: int | None = None
    destination: str | None = None
    eta: datetime | None = None


def decode_message(
    message_type: str,
    metadata: dict[str, object],
    payload: dict[str, object],
) -> DecodedMessage | None:
    mmsi = _extract_mmsi(metadata, payload)
    if mmsi is None or mmsi <= 0:
        return None

    ts = _parse_timestamp(metadata.get("ShipUtc"))

    if message_type in DYNAMIC_MESSAGE_TYPES:
        return _decode_dynamic(message_type, mmsi, ts, payload)
    if message_type in STATIC_MESSAGE_TYPES:
        return _decode_static(message_type, mmsi, ts, payload)

    return None


def _decode_dynamic(
    message_type: str,
    mmsi: int,
    ts: datetime | None,
    payload: dict[str, object],
) -> DecodedMessage | None:
    lat = payload.get("Latitude")
    lon = payload.get("Longitude")
    if lat is None or lon is None:
        return None

    return DecodedMessage(
        mmsi=mmsi,
        kind="position",
        ts=ts,
        lat=float(lat),
        lon=float(lon),
        sog=_to_float(payload.get("Sog")),
        cog=_to_float(payload.get("Cog")),
        heading=_to_float(payload.get("TrueHeading")),
        nav_status=_to_int(payload.get("NavigationalStatus")),
        rot=_to_float(payload.get("RateOfTurn")),
    )


def _decode_static(
    message_type: str,
    mmsi: int,
    ts: datetime | None,
    payload: dict[str, object],
) -> DecodedMessage | None:
    name = payload.get("Name")
    if isinstance(name, str):
        name = name.strip("@").strip()

    ship_type = _to_int(payload.get("Type"))
    callsign = payload.get("CallSign")
    if isinstance(callsign, str):
        callsign = callsign.strip("@").strip()

    dim_a = _to_int(payload.get("Dimension", {}).get("A")) if isinstance(
        payload.get("Dimension"), dict
    ) else None
    dim_b = _to_int(payload.get("Dimension", {}).get("B")) if isinstance(
        payload.get("Dimension"), dict
    ) else None
    dim_c = _to_int(payload.get("Dimension", {}).get("C")) if isinstance(
        payload.get("Dimension"), dict
    ) else None
    dim_d = _to_int(payload.get("Dimension", {}).get("D")) if isinstance(
        payload.get("Dimension"), dict
    ) else None

    imo = _to_int(payload.get("ImoNumber"))
    destination = payload.get("Destination")
    if isinstance(destination, str):
        destination = destination.strip("@").strip()

    return DecodedMessage(
        mmsi=mmsi,
        kind="static",
        ts=ts,
        name=name,
        ship_type=ship_type,
        callsign=callsign,
        imo=imo,
        dim_a=dim_a,
        dim_b=dim_b,
        dim_c=dim_c,
        dim_d=dim_d,
        destination=destination,
    )


def _extract_mmsi(metadata: dict[str, object], payload: dict[str, object]) -> int | None:
    mmsi = metadata.get("MMSI") or payload.get("MMSI")
    return _to_int(mmsi)


def _parse_timestamp(value: object) -> datetime | None:
    if value is None:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


def _to_float(value: object) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def _to_int(value: object) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        return None

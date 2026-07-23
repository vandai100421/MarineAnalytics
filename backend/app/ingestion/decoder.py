from dataclasses import dataclass
from datetime import datetime

from app.core.logging import get_logger
from app.ingestion.ship_types import get_ship_type_name

logger = get_logger("decoder")

DYNAMIC_MESSAGE_TYPES = {
    "PositionReport",
    "PositionReportInt",
    "StandardClassBPositionReport",
    "ExtendedClassBPositionReport",
    "LongRangeAisBroadcast",
}
STATIC_MESSAGE_TYPES = {"ShipStaticData", "StaticDataReport"}


@dataclass
class DecodedMessage:
    mmsi: int
    kind: str
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
    ship_type_name: str | None = None
    callsign: str | None = None
    imo: int | None = None
    dim_a: int | None = None
    dim_b: int | None = None
    dim_c: int | None = None
    dim_d: int | None = None
    destination: str | None = None
    eta: datetime | None = None
    ais_class: str | None = None
    draught: float | None = None


def decode_message(
    message_type: str,
    metadata: dict[str, object],
    payload: dict[str, object],
) -> DecodedMessage | None:
    if message_type and message_type in payload:
        inner = payload[message_type]
        if isinstance(inner, dict):
            payload = inner

    mmsi = _extract_mmsi(metadata, payload)
    if mmsi is None or mmsi <= 0:
        return None

    ts = _parse_timestamp(metadata.get("ShipUtc"))

    if message_type in DYNAMIC_MESSAGE_TYPES:
        return _decode_dynamic(message_type, mmsi, ts, payload)
    if message_type in STATIC_MESSAGE_TYPES:
        return _decode_static(mmsi, ts, payload)

    return None


def _decode_dynamic(
    message_type: str,
    mmsi: int,
    ts: datetime | None,
    payload: dict[str, object],
) -> DecodedMessage | None:
    lat = _to_float(payload.get("Latitude"))
    lon = _to_float(payload.get("Longitude"))
    if lat is None or lon is None:
        return None

    ais_class = "A"
    if message_type in ("StandardClassBPositionReport", "ExtendedClassBPositionReport"):
        ais_class = "B"
    elif message_type == "LongRangeAisBroadcast":
        ais_class = "SAT"

    msg = DecodedMessage(
        mmsi=mmsi,
        kind="position",
        ts=ts,
        lat=lat,
        lon=lon,
        sog=_to_float(payload.get("Sog")),
        cog=_to_float(payload.get("Cog")),
        heading=_to_float(payload.get("TrueHeading")),
        nav_status=_to_int(payload.get("NavigationalStatus")),
        rot=_to_float(payload.get("RateOfTurn")),
        ais_class=ais_class,
    )

    if message_type == "StandardClassBPositionReport":
        name = _clean_str(payload.get("Name"))
        ship_type = _to_int(payload.get("Type"))
        callsign = _clean_str(payload.get("CallSign"))
        if name or ship_type or callsign:
            msg.name = name
            msg.ship_type = ship_type
            msg.ship_type_name = get_ship_type_name(ship_type)
            msg.callsign = callsign
            dim_a, dim_b, dim_c, dim_d = _extract_dimensions(payload)
            msg.dim_a = dim_a
            msg.dim_b = dim_b
            msg.dim_c = dim_c
            msg.dim_d = dim_d

    return msg


def _decode_static(
    mmsi: int,
    ts: datetime | None,
    payload: dict[str, object],
) -> DecodedMessage | None:
    name = _clean_str(payload.get("Name"))
    ship_type = _to_int(payload.get("Type"))
    callsign = _clean_str(payload.get("CallSign"))
    imo = _to_int(payload.get("ImoNumber"))
    destination = _clean_str(payload.get("Destination"))
    eta = _parse_eta(payload.get("Eta"))
    dim_a, dim_b, dim_c, dim_d = _extract_dimensions(payload)
    draught = _to_float(payload.get("MaximumActualDraught"))

    return DecodedMessage(
        mmsi=mmsi,
        kind="static",
        ts=ts,
        name=name,
        ship_type=ship_type,
        ship_type_name=get_ship_type_name(ship_type),
        callsign=callsign,
        imo=imo,
        dim_a=dim_a,
        dim_b=dim_b,
        dim_c=dim_c,
        dim_d=dim_d,
        destination=destination,
        eta=eta,
        ais_class="A",
        draught=draught,
    )


def _extract_dimensions(
    payload: dict[str, object],
) -> tuple[int | None, int | None, int | None, int | None]:
    dimension = payload.get("Dimension")
    if not isinstance(dimension, dict):
        return None, None, None, None
    return (
        _to_int(dimension.get("A")),
        _to_int(dimension.get("B")),
        _to_int(dimension.get("C")),
        _to_int(dimension.get("D")),
    )


def _extract_mmsi(metadata: dict[str, object], payload: dict[str, object]) -> int | None:
    mmsi = metadata.get("MMSI") or payload.get("MMSI") or payload.get("UserID")
    return _to_int(mmsi)


def _parse_timestamp(value: object) -> datetime | None:
    if value is None:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


def _parse_eta(value: object) -> datetime | None:
    if value is None:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


def _clean_str(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip("@").strip()
    return text or None


def _to_float(value: object) -> float | None:
    if value is None:
        return None
    try:
        return float(value)  # type: ignore[arg-type]
    except (ValueError, TypeError):
        return None


def _to_int(value: object) -> int | None:
    if value is None:
        return None
    try:
        return int(float(value))  # type: ignore[arg-type]
    except (ValueError, TypeError):
        return None

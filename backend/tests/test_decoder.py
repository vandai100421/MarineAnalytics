from datetime import UTC, datetime

from app.ingestion.decoder import decode_message


def test_decode_position_report_type_1():
    metadata = {
        "MMSI": 538006987,
        "ShipUtc": "2026-07-16T08:30:00.000Z",
    }
    payload = {
        "MessageID": 1,
        "RepeatIndicator": 0,
        "UserID": 538006987,
        "NavigationalStatus": 0,
        "Sog": 12.3,
        "Longitude": 108.2,
        "Latitude": 16.0,
        "Cog": 45.0,
        "TrueHeading": 45,
        "RateOfTurn": 0.0,
    }

    result = decode_message("PositionReport", metadata, payload)

    assert result is not None
    assert result.mmsi == 538006987
    assert result.kind == "position"
    assert result.lat == 16.0
    assert result.lon == 108.2
    assert result.sog == 12.3
    assert result.cog == 45.0
    assert result.heading == 45.0
    assert result.nav_status == 0
    assert result.ts == datetime(2026, 7, 16, 8, 30, 0, tzinfo=UTC)


def test_decode_position_report_int_type_18():
    metadata = {"MMSI": 123456789, "ShipUtc": "2026-07-16T09:00:00.000Z"}
    payload = {
        "MessageID": 18,
        "Sog": 8.5,
        "Longitude": 109.0,
        "Latitude": 16.5,
        "Cog": 90.0,
        "TrueHeading": 90,
    }

    result = decode_message("PositionReportInt", metadata, payload)

    assert result is not None
    assert result.kind == "position"
    assert result.mmsi == 123456789
    assert result.lat == 16.5
    assert result.lon == 109.0
    assert result.sog == 8.5
    assert result.cog == 90.0
    assert result.heading == 90.0
    assert result.nav_status is None


def test_decode_standard_class_b_type_19():
    metadata = {"MMSI": 987654321, "ShipUtc": "2026-07-16T10:00:00.000Z"}
    payload = {
        "MessageID": 19,
        "Sog": 5.0,
        "Longitude": 110.0,
        "Latitude": 17.0,
        "Cog": 180.0,
        "TrueHeading": 180,
        "Name": "FISHING BOAT@@",
        "Type": 30,
        "CallSign": "FB123@@",
        "Dimension": {"A": 5, "B": 10, "C": 2, "D": 2},
    }

    result = decode_message("StandardClassBPositionReport", metadata, payload)

    assert result is not None
    assert result.kind == "position"
    assert result.mmsi == 987654321
    assert result.lat == 17.0
    assert result.lon == 110.0
    assert result.name == "FISHING BOAT"
    assert result.ship_type == 30
    assert result.ship_type_name == "Fishing"
    assert result.callsign == "FB123"
    assert result.dim_a == 5
    assert result.dim_b == 10
    assert result.dim_c == 2
    assert result.dim_d == 2


def test_decode_ship_static_data_type_5():
    metadata = {
        "MMSI": 538006987,
        "ShipName": "TEST VESSEL",
        "ShipUtc": "2026-07-16T08:30:00.000Z",
    }
    payload = {
        "MessageID": 5,
        "Name": "TEST VESSEL@@",
        "CallSign": "TEST@@@",
        "Type": 70,
        "Dimension": {"A": 10, "B": 20, "C": 5, "D": 5},
        "ImoNumber": 1234567,
        "Destination": "SINGAPORE@@",
        "Eta": "2026-07-20T12:00:00.000Z",
    }

    result = decode_message("ShipStaticData", metadata, payload)

    assert result is not None
    assert result.mmsi == 538006987
    assert result.kind == "static"
    assert result.name == "TEST VESSEL"
    assert result.callsign == "TEST"
    assert result.ship_type == 70
    assert result.ship_type_name == "Cargo"
    assert result.imo == 1234567
    assert result.dim_a == 10
    assert result.dim_b == 20
    assert result.destination == "SINGAPORE"
    assert result.eta == datetime(2026, 7, 20, 12, 0, 0, tzinfo=UTC)


def test_decode_static_data_report_type_24():
    metadata = {"MMSI": 111222333, "ShipUtc": "2026-07-16T11:00:00.000Z"}
    payload = {
        "MessageID": 24,
        "Name": "CARGO SHIP@@",
        "CallSign": "CS001@@",
        "Type": 71,
        "Dimension": {"A": 20, "B": 40, "C": 8, "D": 8},
        "Destination": "TOKYO@@",
    }

    result = decode_message("StaticDataReport", metadata, payload)

    assert result is not None
    assert result.kind == "static"
    assert result.mmsi == 111222333
    assert result.name == "CARGO SHIP"
    assert result.ship_type == 71
    assert result.ship_type_name == "Cargo"
    assert result.callsign == "CS001"
    assert result.dim_a == 20
    assert result.dim_b == 40
    assert result.destination == "TOKYO"


def test_decode_missing_lat_lon_returns_none():
    metadata = {"MMSI": 538006987}
    payload = {"Sog": 12.3}

    result = decode_message("PositionReport", metadata, payload)

    assert result is None


def test_decode_invalid_mmsi_returns_none():
    metadata = {"MMSI": 0}
    payload = {"Latitude": 16.0, "Longitude": 108.2}

    result = decode_message("PositionReport", metadata, payload)

    assert result is None


def test_decode_unknown_message_type_returns_none():
    metadata = {"MMSI": 538006987}
    payload = {}

    result = decode_message("UnknownType", metadata, payload)

    assert result is None


def test_decode_mmsi_from_user_id_fallback():
    metadata: dict[str, object] = {}
    payload = {
        "UserID": 555666777,
        "Latitude": 10.0,
        "Longitude": 100.0,
        "Sog": 1.0,
        "Cog": 0.0,
        "TrueHeading": 0,
    }

    result = decode_message("PositionReport", metadata, payload)

    assert result is not None
    assert result.mmsi == 555666777


def test_decode_malformed_payload_fields():
    metadata = {"MMSI": 123, "ShipUtc": "not-a-date"}
    payload = {
        "Latitude": "not-a-number",
        "Longitude": 108.2,
        "Sog": None,
        "NavigationalStatus": "invalid",
    }

    result = decode_message("PositionReport", metadata, payload)

    assert result is None

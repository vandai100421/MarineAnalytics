from datetime import datetime

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
    assert result.lat == 108.2
    assert result.lon == 16.0
    assert result.sog == 12.3
    assert result.cog == 45.0
    assert result.heading == 45.0
    assert result.nav_status == 0
    assert result.ts == datetime(2026, 7, 16, 8, 30, 0)


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
    }

    result = decode_message("ShipStaticData", metadata, payload)

    assert result is not None
    assert result.mmsi == 538006987
    assert result.kind == "static"
    assert result.name == "TEST VESSEL"
    assert result.callsign == "TEST"
    assert result.ship_type == 70
    assert result.imo == 1234567
    assert result.dim_a == 10
    assert result.dim_b == 20
    assert result.destination == "SINGAPORE"


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

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.alerts.geofence_engine import check_position_against_geofences
from app.ingestion.decoder import DecodedMessage


@pytest.mark.asyncio
async def test_check_position_skips_when_no_lat_lon():
    msg = DecodedMessage(mmsi=123, kind="position", ts=None, lat=None, lon=None)
    await check_position_against_geofences(msg)


@pytest.mark.asyncio
async def test_check_position_creates_alert_on_enter():
    msg = DecodedMessage(
        mmsi=123,
        kind="position",
        ts=datetime.now(UTC),
        lat=16.0,
        lon=108.2,
    )

    mock_geofence = MagicMock()
    mock_geofence.id = 1
    mock_geofence.name = "Restricted Zone"

    mock_geo_repo = AsyncMock()
    mock_geo_repo.find_containing = AsyncMock(return_value=[mock_geofence])

    mock_alert_repo = AsyncMock()
    mock_alert_repo.has_recent_alert = AsyncMock(return_value=False)
    mock_alert_repo.create = AsyncMock()

    with (
        patch("app.alerts.geofence_engine.async_session_factory") as mock_factory,
        patch(
            "app.alerts.geofence_engine.GeofenceRepository",
            return_value=mock_geo_repo,
        ),
        patch(
            "app.alerts.geofence_engine.AlertRepository",
            return_value=mock_alert_repo,
        ),
        patch("app.alerts.geofence_engine._get_geofence_count", return_value=1),
    ):
        mock_session = AsyncMock()
        mock_factory.return_value.__aenter__ = AsyncMock(return_value=mock_session)
        mock_factory.return_value.__aexit__ = AsyncMock(return_value=None)

        await check_position_against_geofences(msg)

    mock_alert_repo.create.assert_called_once_with(
        mmsi=123,
        geofence_id=1,
        event_type="enter",
        lat=16.0,
        lon=108.2,
    )


@pytest.mark.asyncio
async def test_check_position_dedup_skips_recent_alert():
    msg = DecodedMessage(
        mmsi=456,
        kind="position",
        ts=datetime.now(UTC),
        lat=16.0,
        lon=108.2,
    )

    mock_geofence = MagicMock()
    mock_geofence.id = 1
    mock_geofence.name = "Restricted Zone"

    mock_geo_repo = AsyncMock()
    mock_geo_repo.find_containing = AsyncMock(return_value=[mock_geofence])

    mock_alert_repo = AsyncMock()
    mock_alert_repo.has_recent_alert = AsyncMock(return_value=True)
    mock_alert_repo.create = AsyncMock()

    with (
        patch("app.alerts.geofence_engine.async_session_factory") as mock_factory,
        patch(
            "app.alerts.geofence_engine.GeofenceRepository",
            return_value=mock_geo_repo,
        ),
        patch(
            "app.alerts.geofence_engine.AlertRepository",
            return_value=mock_alert_repo,
        ),
        patch("app.alerts.geofence_engine._get_geofence_count", return_value=1),
    ):
        mock_session = AsyncMock()
        mock_factory.return_value.__aenter__ = AsyncMock(return_value=mock_session)
        mock_factory.return_value.__aexit__ = AsyncMock(return_value=None)

        await check_position_against_geofences(msg)

    mock_alert_repo.create.assert_not_called()


@pytest.mark.asyncio
async def test_check_position_no_geofences_matching():
    msg = DecodedMessage(
        mmsi=789,
        kind="position",
        ts=datetime.now(UTC),
        lat=0.0,
        lon=0.0,
    )

    mock_geo_repo = AsyncMock()
    mock_geo_repo.find_containing = AsyncMock(return_value=[])

    mock_alert_repo = AsyncMock()
    mock_alert_repo.create = AsyncMock()

    with (
        patch("app.alerts.geofence_engine.async_session_factory") as mock_factory,
        patch(
            "app.alerts.geofence_engine.GeofenceRepository",
            return_value=mock_geo_repo,
        ),
        patch(
            "app.alerts.geofence_engine.AlertRepository",
            return_value=mock_alert_repo,
        ),
        patch("app.alerts.geofence_engine._get_geofence_count", return_value=1),
    ):
        mock_session = AsyncMock()
        mock_factory.return_value.__aenter__ = AsyncMock(return_value=mock_session)
        mock_factory.return_value.__aexit__ = AsyncMock(return_value=None)

        await check_position_against_geofences(msg)

    mock_alert_repo.create.assert_not_called()

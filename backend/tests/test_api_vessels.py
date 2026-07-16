from unittest.mock import AsyncMock

import pytest

from tests.conftest import _make_pos_data


@pytest.mark.asyncio
async def test_get_positions_empty(client, mock_redis):
    response = await client.get("/api/v1/vessels/positions")

    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_get_positions_returns_vessels(client, mock_redis):
    mock_redis._scan_keys = [b"pos:123", b"pos:456"]
    mock_redis.hgetall = AsyncMock(
        side_effect=[
            _make_pos_data(123, 16.0, 108.2),
            _make_pos_data(456, 17.0, 109.0),
        ]
    )

    response = await client.get("/api/v1/vessels/positions")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["mmsi"] == 123
    assert data[0]["lat"] == 16.0
    assert data[0]["lon"] == 108.2


@pytest.mark.asyncio
async def test_get_positions_bbox_filter(client, mock_redis):
    mock_redis._scan_keys = [b"pos:123", b"pos:456"]
    mock_redis.hgetall = AsyncMock(
        side_effect=[
            _make_pos_data(123, 16.0, 108.2),
            _make_pos_data(456, 50.0, 0.0),
        ]
    )

    response = await client.get("/api/v1/vessels/positions?bbox=100,10,120,20")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["mmsi"] == 123


@pytest.mark.asyncio
async def test_get_positions_min_sog_filter(client, mock_redis):
    mock_redis._scan_keys = [b"pos:123", b"pos:456"]
    mock_redis.hgetall = AsyncMock(
        side_effect=[
            _make_pos_data(123, 16.0, 108.2),
            {**_make_pos_data(456, 17.0, 109.0), "sog": "1.0"},
        ]
    )

    response = await client.get("/api/v1/vessels/positions?min_sog=5.0")

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["mmsi"] == 123


@pytest.mark.asyncio
async def test_get_vessel_not_found(client, mock_session):
    from app.repositories.vessel_repository import VesselRepository

    mock_repo = AsyncMock()
    mock_repo.get_by_mmsi = AsyncMock(return_value=None)

    original_init = VesselRepository.__init__
    VesselRepository.__init__ = lambda self, session: None  # type: ignore[method-assign]
    VesselRepository.get_by_mmsi = mock_repo.get_by_mmsi  # type: ignore[method-assign]

    response = await client.get("/api/v1/vessels/999")

    VesselRepository.__init__ = original_init  # type: ignore[method-assign]

    assert response.status_code == 404
    body = response.json()
    assert body["title"] == "Not Found"
    assert body["status"] == 404
    assert "999" in body["detail"]


@pytest.mark.asyncio
async def test_rfc7807_error_format(client, mock_session):
    from app.repositories.vessel_repository import VesselRepository

    mock_repo = AsyncMock()
    mock_repo.get_by_mmsi = AsyncMock(return_value=None)

    original_init = VesselRepository.__init__
    VesselRepository.__init__ = lambda self, session: None  # type: ignore[method-assign]
    VesselRepository.get_by_mmsi = mock_repo.get_by_mmsi  # type: ignore[method-assign]

    response = await client.get("/api/v1/vessels/123")

    VesselRepository.__init__ = original_init  # type: ignore[method-assign]

    body = response.json()
    assert "type" in body
    assert "title" in body
    assert "status" in body
    assert "detail" in body


@pytest.mark.asyncio
async def test_health(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

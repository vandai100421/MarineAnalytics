from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.api.vessels import router as vessels_router
from app.core.db import get_session
from app.core.errors import register_error_handlers
from app.core.redis import get_redis


class AsyncScanIter:
    def __init__(self, keys: list[bytes]) -> None:
        self._keys = keys
        self._index = 0

    def __aiter__(self):
        return self

    async def __anext__(self):
        if self._index >= len(self._keys):
            raise StopAsyncIteration
        key = self._keys[self._index]
        self._index += 1
        return key


class MockPipeline:
    def __init__(self) -> None:
        self._commands: list = []

    def hgetall(self, key: str) -> None:
        self._commands.append(("hgetall", key))

    async def execute(self) -> list:
        return self._results


@pytest.fixture
def mock_redis():
    redis = AsyncMock()
    redis._scan_keys: list[bytes] = []
    redis._hgetall_results: list[dict[str, str]] = []
    redis.scan_iter = MagicMock(side_effect=lambda **kwargs: AsyncScanIter(redis._scan_keys))

    def _pipeline():
        pipe = MockPipeline()
        pipe._results = redis._hgetall_results
        return pipe

    redis.pipeline = MagicMock(side_effect=_pipeline)
    redis.hgetall = AsyncMock()
    return redis


@pytest.fixture
def mock_session():
    return AsyncMock()


@pytest.fixture
async def client(mock_redis, mock_session):
    app = FastAPI()
    app.include_router(vessels_router)
    register_error_handlers(app)

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    async def override_redis():
        return mock_redis

    async def override_session():
        return mock_session

    app.dependency_overrides[get_redis] = override_redis
    app.dependency_overrides[get_session] = override_session

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


def _make_pos_data(mmsi: int, lat: float, lon: float) -> dict[str, str]:
    return {
        "mmsi": str(mmsi),
        "lat": str(lat),
        "lon": str(lon),
        "sog": "12.5",
        "cog": "45.0",
        "heading": "45.0",
        "ts": "2026-07-16T08:30:00+00:00",
    }

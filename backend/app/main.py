import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.aircraft import router as aircraft_router
from app.api.alerts import router as alerts_router
from app.api.geofences import router as geofences_router
from app.api.monitoring import router as monitoring_router
from app.api.stats import router as stats_router
from app.api.vessels import router as vessels_router
from app.core.config import get_settings
from app.core.errors import register_error_handlers
from app.core.logging import get_logger, setup_logging
from app.core.rate_limiter import RateLimitMiddleware
from app.core.redis import close_redis, get_redis
from app.realtime.broadcaster import subscriber_manager
from app.realtime.sse import router as sse_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    setup_logging()
    logger = get_logger("app")
    settings = get_settings()
    logger.info(
        "starting_backend",
        host=settings.backend_host,
        port=settings.backend_port,
    )

    redis = await get_redis()
    await redis.ping()
    logger.info("redis_connected", url=settings.redis_url)

    from app.ingestion.adsbexchange_client import poll_adsbexchange
    from app.ingestion.aisstream_client import connect_aisstream

    ingestion_task = asyncio.create_task(connect_aisstream())
    logger.info("ingestion_task_started")

    adsb_task = asyncio.create_task(poll_adsbexchange())
    logger.info("adsb_task_started")

    await subscriber_manager.start_broadcaster(interval=settings.sse_batch_interval_seconds)
    logger.info("sse_broadcaster_started")

    yield

    await subscriber_manager.stop_broadcaster()
    ingestion_task.cancel()
    adsb_task.cancel()
    for task in (ingestion_task, adsb_task):
        try:
            await task
        except (asyncio.CancelledError, Exception) as exc:
            if not isinstance(exc, asyncio.CancelledError):
                logger.warning("task_stopped_with_error", error=str(exc))
    await close_redis()
    logger.info("backend_stopped")


def create_app() -> FastAPI:
    app = FastAPI(
        title="MarineAnalytics API",
        version="0.1.0",
        lifespan=lifespan,
        openapi_url="/api/v1/openapi.json",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RateLimitMiddleware)

    app.include_router(vessels_router)
    app.include_router(aircraft_router)
    app.include_router(stats_router)
    app.include_router(geofences_router)
    app.include_router(alerts_router)
    app.include_router(sse_router)
    app.include_router(monitoring_router)
    register_error_handlers(app)

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()

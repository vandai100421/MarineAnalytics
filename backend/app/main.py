from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.vessels import router as vessels_router
from app.core.config import get_settings
from app.core.logging import get_logger, setup_logging
from app.core.redis import close_redis, get_redis


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

    yield

    await close_redis()
    logger.info("backend_stopped")


def create_app() -> FastAPI:
    settings = get_settings()
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

    app.include_router(vessels_router)

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()

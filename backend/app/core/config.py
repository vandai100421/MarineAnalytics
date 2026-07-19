from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    aisstream_api_key: str = Field(default="", alias="AISSTREAM_API_KEY")
    aisstream_bbox: str = Field(default="", alias="AISSTREAM_BBOX")

    database_url: str = Field(
        default="postgresql+asyncpg://marine:marine@localhost:5432/marineanalytics",
        alias="DATABASE_URL",
    )

    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")

    backend_host: str = Field(default="0.0.0.0", alias="BACKEND_HOST")
    backend_port: int = Field(default=8000, alias="BACKEND_PORT")
    backend_log_level: str = Field(default="info", alias="BACKEND_LOG_LEVEL")

    sse_batch_interval_seconds: float = Field(default=1.0, alias="SSE_BATCH_INTERVAL_SECONDS")
    sse_heartbeat_seconds: float = Field(default=15.0, alias="SSE_HEARTBEAT_SECONDS")
    sse_max_clients: int = Field(default=200, alias="SSE_MAX_CLIENTS")

    rate_limit_enabled: bool = Field(default=True, alias="RATE_LIMIT_ENABLED")
    rate_limit_per_minute: int = Field(default=120, alias="RATE_LIMIT_PER_MINUTE")

    ingestion_flush_interval_seconds: float = Field(
        default=2.0, alias="INGESTION_FLUSH_INTERVAL_SECONDS"
    )
    ingestion_batch_size: int = Field(default=200, alias="INGESTION_BATCH_SIZE")

    adsbexchange_api_key: str = Field(default="", alias="ADSBEXCHANGE_API_KEY")

    opensky_enabled: bool = Field(default=False, alias="OPENSKY_ENABLED")
    opensky_username: str = Field(default="", alias="OPENSKY_USERNAME")
    opensky_password: str = Field(default="", alias="OPENSKY_PASSWORD")
    opensky_poll_interval_seconds: float = Field(
        default=60.0, alias="OPENSKY_POLL_INTERVAL_SECONDS"
    )
    opensky_bbox: str = Field(default="", alias="OPENSKY_BBOX")

    @property
    def bbox_list(self) -> list[list[float]] | None:
        if not self.aisstream_bbox.strip():
            return None
        parts = [float(x) for x in self.aisstream_bbox.split(",")]
        if len(parts) != 4:
            return None
        min_lon, min_lat, max_lon, max_lat = parts
        return [[min_lat, min_lon], [max_lat, max_lon]]

    @property
    def opensky_bbox_params(self) -> tuple[float, float, float, float] | None:
        bbox = self.opensky_bbox.strip() or self.aisstream_bbox.strip()
        if not bbox:
            return None
        parts = [float(x) for x in bbox.split(",")]
        if len(parts) != 4:
            return None
        min_lon, min_lat, max_lon, max_lat = parts
        return min_lat, min_lon, max_lat, max_lon


@lru_cache
def get_settings() -> Settings:
    return Settings()

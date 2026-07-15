from datetime import datetime

from pydantic import BaseModel


class VesselPositionResponse(BaseModel):
    mmsi: int
    lat: float
    lon: float
    sog: float
    cog: float
    heading: float
    ts: str


class PositionReportResponse(BaseModel):
    mmsi: int
    ts: datetime
    lat: float
    lon: float
    sog: float | None = None
    cog: float | None = None
    heading: float | None = None
    nav_status: int | None = None


class PaginatedResponse(BaseModel):
    total: int
    limit: int
    offset: int
    items: list  # type: ignore[type-arg]

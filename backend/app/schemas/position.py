from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    total: int
    limit: int
    offset: int
    items: list[T]


class VesselPositionResponse(BaseModel):
    mmsi: int
    lat: float
    lon: float
    sog: float
    cog: float
    heading: float
    ts: str


class VesselListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    mmsi: int
    name: str | None = None
    ship_type: int | None = None
    ship_type_name: str | None = None
    destination: str | None = None
    updated_at: datetime


class PositionReportResponse(BaseModel):
    mmsi: int
    ts: datetime
    lat: float
    lon: float
    sog: float | None = None
    cog: float | None = None
    heading: float | None = None
    nav_status: int | None = None


class TrackResponse(BaseModel):
    mmsi: int
    total: int
    points: list[PositionReportResponse]

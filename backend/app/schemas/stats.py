from datetime import datetime

from pydantic import BaseModel


class OverviewResponse(BaseModel):
    active_vessels: int
    total_vessels: int
    avg_sog: float


class TypeCount(BaseModel):
    ship_type: int
    ship_type_name: str
    count: int


class ByTypeResponse(BaseModel):
    types: list[TypeCount]


class HeatmapResponse(BaseModel):
    points: list[list[float]]
    total: int


class TimeSeriesPoint(BaseModel):
    ts: datetime
    vessel_count: int
    avg_sog: float


class TimeSeriesResponse(BaseModel):
    period: str
    points: list[TimeSeriesPoint]

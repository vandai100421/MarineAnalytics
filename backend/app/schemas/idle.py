from datetime import datetime

from pydantic import BaseModel, ConfigDict


class IdleEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    mmsi: int
    start_ts: datetime
    end_ts: datetime | None = None
    duration_minutes: float | None = None
    start_lat: float
    start_lon: float
    end_lat: float | None = None
    end_lon: float | None = None
    avg_sog: float | None = None
    max_sog: float | None = None


class IdleEventListResponse(BaseModel):
    total: int
    events: list[IdleEventResponse]


class IdleSummaryResponse(BaseModel):
    total_events: int
    active_idle: int
    avg_duration_minutes: float

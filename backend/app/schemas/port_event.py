from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class PortCallResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    mmsi: int
    port_id: int | None = None
    port_name: str | None = None
    arrived_at: datetime | None = None
    departed_at: datetime | None = None
    duration_minutes: float | None = None
    anchorage: bool = False
    lat: float | None = None
    lon: float | None = None


class PortCallListResponse(BaseModel):
    total: int
    port_calls: list[PortCallResponse]


class VesselEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    mmsi: int
    event_type: str
    ts: datetime
    lat: float | None = None
    lon: float | None = None
    severity: str = "info"
    details: dict[str, Any] | None = None


class VesselEventListResponse(BaseModel):
    total: int
    events: list[VesselEventResponse]

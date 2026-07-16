from datetime import datetime

from pydantic import BaseModel, ConfigDict


class GeofenceCreate(BaseModel):
    name: str
    type: str
    coordinates: list[list[float]]
    description: str | None = None


class GeofenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    type: str
    coordinates: list[list[float]]
    description: str | None = None
    created_at: datetime


class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    mmsi: int
    geofence_id: int | None
    ts: datetime
    event_type: str
    lat: float | None
    lon: float | None


class AlertsListResponse(BaseModel):
    total: int
    alerts: list[AlertResponse]

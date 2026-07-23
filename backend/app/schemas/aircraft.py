from datetime import datetime

from pydantic import BaseModel


class AircraftPositionResponse(BaseModel):
    hex: str
    ts: datetime
    lat: float
    lon: float
    alt: float | None = None
    gs: float | None = None
    track: float | None = None
    flight: str | None = None
    reg: str | None = None
    type: str | None = None
    vertical_rate: float | None = None
    origin_country: str | None = None

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PortResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    country_code: str | None = None
    unlocode: str | None = None
    lat: float
    lon: float
    radius_m: int
    type: str


class PortArrivalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    mmsi: int
    port_id: int
    arrived_at: datetime
    departed_at: datetime | None = None
    dwell_minutes: float | None = None
    anchorage: bool = False
    lat: float | None = None
    lon: float | None = None


class PortArrivalsListResponse(BaseModel):
    total: int
    arrivals: list[PortArrivalResponse]


class PortCongestionResponse(BaseModel):
    port_id: int
    name: str
    country_code: str | None = None
    vessel_count: int
    avg_dwell_minutes: float
    anchorage_count: int


class PortCongestionListResponse(BaseModel):
    ports: list[PortCongestionResponse]


class PredictedEtaResponse(BaseModel):
    mmsi: int
    destination_raw: str | None = None
    matched_port: PortResponse | None = None
    match_confidence: float
    distance_nm: float | None = None
    current_sog: float
    eta_hours: float | None = None
    eta_time: datetime | None = None
    ais_eta: datetime | None = None


class TradeFlowResponse(BaseModel):
    origin_port_id: int
    origin_name: str
    origin_lat: float
    origin_lon: float
    dest_port_id: int
    dest_name: str
    dest_lat: float
    dest_lon: float
    vessel_count: int


class TradeFlowListResponse(BaseModel):
    flows: list[TradeFlowResponse]
    total: int

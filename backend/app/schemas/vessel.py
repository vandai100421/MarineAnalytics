from datetime import datetime

from pydantic import BaseModel, ConfigDict


class VesselResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    mmsi: int
    name: str | None = None
    ship_type: int | None = None
    ship_type_name: str | None = None
    callsign: str | None = None
    imo: int | None = None
    dim_a: int | None = None
    dim_b: int | None = None
    dim_c: int | None = None
    dim_d: int | None = None
    destination: str | None = None
    eta: datetime | None = None
    photo_url: str | None = None
    gt: int | None = None
    dwt: int | None = None
    loa: float | None = None
    beam: float | None = None
    draught_max: float | None = None
    year_built: int | None = None
    flag: str | None = None
    ais_class: str | None = None
    updated_at: datetime


class VesselSearchResult(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    mmsi: int
    name: str | None = None
    ship_type: int | None = None
    ship_type_name: str | None = None
    callsign: str | None = None
    imo: int | None = None
    destination: str | None = None


class VesselListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    mmsi: int
    name: str | None = None
    ship_type: int | None = None
    ship_type_name: str | None = None
    destination: str | None = None
    updated_at: datetime


class VesselPhotoUpdate(BaseModel):
    photo_url: str

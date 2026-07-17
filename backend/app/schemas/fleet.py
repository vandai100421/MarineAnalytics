from datetime import datetime

from pydantic import BaseModel, ConfigDict


class FleetBase(BaseModel):
    name: str
    description: str | None = None
    color: str = "#3b82f6"


class FleetCreate(FleetBase):
    pass


class FleetUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    color: str | None = None


class FleetResponse(FleetBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    member_count: int = 0


class FleetMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    fleet_id: int
    mmsi: int
    added_at: datetime
    vessel_name: str | None = None
    ship_type_name: str | None = None


class FleetMemberAdd(BaseModel):
    mmsi: int


class FleetStatsResponse(BaseModel):
    fleet_id: int
    name: str
    total_members: int
    active_members: int
    avg_sog: float
    idle_count: int

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

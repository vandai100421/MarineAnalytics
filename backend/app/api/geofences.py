from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.errors import ProblemDetail
from app.repositories.geofence_repository import GeofenceRepository, _geojson_to_coords
from app.schemas.geofence import GeofenceCreate, GeofenceResponse

router = APIRouter(prefix="/api/v1/geofences", tags=["geofences"])


@router.post("", response_model=GeofenceResponse, status_code=201)
async def create_geofence(
    body: GeofenceCreate,
    session: AsyncSession = Depends(get_session),
) -> GeofenceResponse:
    if len(body.coordinates) < 4:
        raise ProblemDetail(
            status_code=422,
            title="Validation Error",
            detail="Polygon must have at least 4 coordinate points (closed ring)",
        )
    repo = GeofenceRepository(session)
    geofence = await repo.create(
        name=body.name,
        type_=body.type,
        coordinates=body.coordinates,
        description=body.description,
    )
    result = await repo.get_by_id(geofence.id)
    if result is None:
        raise ProblemDetail(status_code=500, title="Error", detail="Failed to read geofence")
    gf, geojson = result
    return _to_response(gf, geojson)


@router.get("", response_model=list[GeofenceResponse])
async def list_geofences(
    session: AsyncSession = Depends(get_session),
) -> list[GeofenceResponse]:
    repo = GeofenceRepository(session)
    items = await repo.get_all()
    return [_to_response(gf, geojson) for gf, geojson in items]


@router.get("/{geofence_id}", response_model=GeofenceResponse)
async def get_geofence(
    geofence_id: int,
    session: AsyncSession = Depends(get_session),
) -> GeofenceResponse:
    repo = GeofenceRepository(session)
    result = await repo.get_by_id(geofence_id)
    if result is None:
        raise ProblemDetail(
            status_code=404,
            title="Not Found",
            detail=f"Geofence {geofence_id} not found",
        )
    gf, geojson = result
    return _to_response(gf, geojson)


@router.delete("/{geofence_id}", status_code=204)
async def delete_geofence(
    geofence_id: int,
    session: AsyncSession = Depends(get_session),
) -> None:
    repo = GeofenceRepository(session)
    deleted = await repo.delete(geofence_id)
    if not deleted:
        raise ProblemDetail(
            status_code=404,
            title="Not Found",
            detail=f"Geofence {geofence_id} not found",
        )


def _to_response(geofence: object, geojson: str | None) -> GeofenceResponse:
    return GeofenceResponse(
        id=geofence.id,  # type: ignore[attr-defined]
        name=geofence.name,  # type: ignore[attr-defined]
        type=geofence.type,  # type: ignore[attr-defined]
        coordinates=_geojson_to_coords(geojson),
        description=geofence.description,  # type: ignore[attr-defined]
        created_at=geofence.created_at,  # type: ignore[attr-defined]
    )

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.errors import ProblemDetail
from app.repositories.geofence_repository import GeofenceRepository, _wkt_to_coords
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
    return _to_response(geofence)


@router.get("", response_model=list[GeofenceResponse])
async def list_geofences(
    session: AsyncSession = Depends(get_session),
) -> list[GeofenceResponse]:
    repo = GeofenceRepository(session)
    geofences = await repo.get_all()
    return [_to_response(g) for g in geofences]


@router.get("/{geofence_id}", response_model=GeofenceResponse)
async def get_geofence(
    geofence_id: int,
    session: AsyncSession = Depends(get_session),
) -> GeofenceResponse:
    repo = GeofenceRepository(session)
    geofence = await repo.get_by_id(geofence_id)
    if geofence is None:
        raise ProblemDetail(
            status_code=404,
            title="Not Found",
            detail=f"Geofence {geofence_id} not found",
        )
    return _to_response(geofence)


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


def _to_response(geofence: object) -> GeofenceResponse:
    return GeofenceResponse(
        id=geofence.id,  # type: ignore[attr-defined]
        name=geofence.name,  # type: ignore[attr-defined]
        type=geofence.type,  # type: ignore[attr-defined]
        coordinates=_wkt_to_coords(geofence.geom),  # type: ignore[attr-defined]
        description=geofence.description,  # type: ignore[attr-defined]
        created_at=geofence.created_at,  # type: ignore[attr-defined]
    )

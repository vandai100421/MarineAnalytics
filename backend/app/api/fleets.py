from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.errors import ProblemDetail
from app.core.redis import get_redis
from app.repositories.fleet_repository import FleetRepository
from app.schemas.fleet import (
    FleetCreate,
    FleetMemberAdd,
    FleetMemberResponse,
    FleetResponse,
    FleetStatsResponse,
    FleetUpdate,
)

router = APIRouter(prefix="/api/v1/fleets", tags=["fleets"])


@router.get("", response_model=list[FleetResponse])
async def list_fleets(
    session: AsyncSession = Depends(get_session),
) -> list[FleetResponse]:
    repo = FleetRepository(session)
    fleets = await repo.list_fleets()
    return [FleetResponse(**f) for f in fleets]


@router.post("", response_model=FleetResponse, status_code=201)
async def create_fleet(
    body: FleetCreate,
    session: AsyncSession = Depends(get_session),
) -> FleetResponse:
    repo = FleetRepository(session)
    fleet = await repo.create_fleet(body.name, body.description, body.color)
    return FleetResponse(
        id=fleet.id,
        name=fleet.name,
        description=fleet.description,
        color=fleet.color,
        created_at=fleet.created_at,
        member_count=0,
    )


@router.get("/all-members", response_model=list[dict[str, Any]])
async def get_all_members(
    session: AsyncSession = Depends(get_session),
) -> list[dict[str, Any]]:
    repo = FleetRepository(session)
    return await repo.get_all_members_with_color()


@router.get("/{fleet_id}", response_model=FleetResponse)
async def get_fleet(
    fleet_id: int,
    session: AsyncSession = Depends(get_session),
) -> FleetResponse:
    repo = FleetRepository(session)
    fleets = await repo.list_fleets()
    for f in fleets:
        if f["id"] == fleet_id:
            return FleetResponse(**f)
    raise ProblemDetail(status_code=404, title="Not Found", detail=f"Fleet {fleet_id} not found")


@router.patch("/{fleet_id}", response_model=FleetResponse)
async def update_fleet(
    fleet_id: int,
    body: FleetUpdate,
    session: AsyncSession = Depends(get_session),
) -> FleetResponse:
    repo = FleetRepository(session)
    fleet = await repo.update_fleet(fleet_id, body.name, body.description, body.color)
    if fleet is None:
        raise ProblemDetail(
            status_code=404, title="Not Found", detail=f"Fleet {fleet_id} not found"
        )
    return FleetResponse(
        id=fleet.id,
        name=fleet.name,
        description=fleet.description,
        color=fleet.color,
        created_at=fleet.created_at,
        member_count=0,
    )


@router.delete("/{fleet_id}", status_code=204)
async def delete_fleet(
    fleet_id: int,
    session: AsyncSession = Depends(get_session),
) -> None:
    repo = FleetRepository(session)
    deleted = await repo.delete_fleet(fleet_id)
    if not deleted:
        raise ProblemDetail(
            status_code=404, title="Not Found", detail=f"Fleet {fleet_id} not found"
        )


@router.get("/{fleet_id}/members", response_model=list[FleetMemberResponse])
async def list_members(
    fleet_id: int,
    session: AsyncSession = Depends(get_session),
) -> list[FleetMemberResponse]:
    repo = FleetRepository(session)
    members = await repo.get_members(fleet_id)
    return [FleetMemberResponse(**m) for m in members]


@router.post("/{fleet_id}/members", response_model=FleetMemberResponse, status_code=201)
async def add_member(
    fleet_id: int,
    body: FleetMemberAdd,
    session: AsyncSession = Depends(get_session),
) -> FleetMemberResponse:
    repo = FleetRepository(session)
    fleet = await repo.get_fleet(fleet_id)
    if fleet is None:
        raise ProblemDetail(
            status_code=404, title="Not Found", detail=f"Fleet {fleet_id} not found"
        )
    added = await repo.add_member(fleet_id, body.mmsi)
    if not added:
        raise ProblemDetail(
            status_code=409, title="Conflict", detail=f"MMSI {body.mmsi} already in fleet"
        )
    members = await repo.get_members(fleet_id)
    for m in members:
        if m["mmsi"] == body.mmsi:
            return FleetMemberResponse(**m)
    raise ProblemDetail(status_code=500, title="Internal Error", detail="Member add failed")


@router.delete("/{fleet_id}/members/{mmsi}", status_code=204)
async def remove_member(
    fleet_id: int,
    mmsi: int,
    session: AsyncSession = Depends(get_session),
) -> None:
    repo = FleetRepository(session)
    removed = await repo.remove_member(fleet_id, mmsi)
    if not removed:
        raise ProblemDetail(
            status_code=404, title="Not Found", detail=f"MMSI {mmsi} not in fleet {fleet_id}"
        )


@router.get("/{fleet_id}/stats", response_model=FleetStatsResponse)
async def get_fleet_stats(
    fleet_id: int,
    session: AsyncSession = Depends(get_session),
    redis: Redis = Depends(get_redis),  # type: ignore[type-arg]
) -> FleetStatsResponse:
    repo = FleetRepository(session)
    fleet = await repo.get_fleet(fleet_id)
    if fleet is None:
        raise ProblemDetail(
            status_code=404, title="Not Found", detail=f"Fleet {fleet_id} not found"
        )

    mmsi_list = await repo.get_fleet_mmsi_list(fleet_id)
    total = len(mmsi_list)
    active = 0
    idle = 0
    sog_sum = 0.0

    if mmsi_list:
        pipe = redis.pipeline()
        for mmsi in mmsi_list:
            pipe.hgetall(f"pos:{mmsi}")
        results = await pipe.execute()

        for data in results:
            if not data:
                continue
            active += 1
            try:
                sog = float(data.get("sog", 0))
            except (ValueError, TypeError):
                sog = 0.0
            sog_sum += sog
            if sog < 0.5:
                idle += 1

    avg_sog = round(sog_sum / active, 2) if active > 0 else 0.0

    return FleetStatsResponse(
        fleet_id=fleet_id,
        name=fleet.name,
        total_members=total,
        active_members=active,
        avg_sog=avg_sog,
        idle_count=idle,
    )

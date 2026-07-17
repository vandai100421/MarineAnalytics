from __future__ import annotations

from typing import Any

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.fleet import Fleet, FleetMember
from app.models.vessel import Vessel


class FleetRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create_fleet(
        self,
        name: str,
        description: str | None = None,
        color: str = "#3b82f6",
    ) -> Fleet:
        fleet = Fleet(name=name, description=description, color=color)
        self._session.add(fleet)
        await self._session.commit()
        await self._session.refresh(fleet)
        return fleet

    async def list_fleets(self) -> list[dict[str, Any]]:
        stmt = (
            select(
                Fleet,
                func.count(FleetMember.id).label("member_count"),
            )
            .outerjoin(FleetMember, FleetMember.fleet_id == Fleet.id)
            .group_by(Fleet.id)
            .order_by(Fleet.name)
        )
        result = await self._session.execute(stmt)
        rows = result.all()
        return [
            {
                "id": r[0].id,
                "name": r[0].name,
                "description": r[0].description,
                "color": r[0].color,
                "created_at": r[0].created_at,
                "member_count": r[1],
            }
            for r in rows
        ]

    async def get_fleet(self, fleet_id: int) -> Fleet | None:
        stmt = select(Fleet).where(Fleet.id == fleet_id)
        result = await self._session.execute(stmt)
        return result.scalar_one_or_none()

    async def update_fleet(
        self,
        fleet_id: int,
        name: str | None = None,
        description: str | None = None,
        color: str | None = None,
    ) -> Fleet | None:
        fleet = await self.get_fleet(fleet_id)
        if fleet is None:
            return None
        if name is not None:
            fleet.name = name
        if description is not None:
            fleet.description = description
        if color is not None:
            fleet.color = color
        await self._session.commit()
        await self._session.refresh(fleet)
        return fleet

    async def delete_fleet(self, fleet_id: int) -> bool:
        fleet = await self.get_fleet(fleet_id)
        if fleet is None:
            return False
        await self._session.delete(fleet)
        await self._session.commit()
        return True

    async def add_member(self, fleet_id: int, mmsi: int) -> bool:
        exists = await self._member_exists(fleet_id, mmsi)
        if exists:
            return False
        member = FleetMember(fleet_id=fleet_id, mmsi=mmsi)
        self._session.add(member)
        await self._session.commit()
        return True

    async def remove_member(self, fleet_id: int, mmsi: int) -> bool:
        stmt = (
            delete(FleetMember)
            .where(FleetMember.fleet_id == fleet_id, FleetMember.mmsi == mmsi)
            .returning(FleetMember.id)
        )
        result = await self._session.execute(stmt)
        await self._session.commit()
        return result.first() is not None

    async def _member_exists(self, fleet_id: int, mmsi: int) -> bool:
        stmt = (
            select(func.count())
            .select_from(FleetMember)
            .where(FleetMember.fleet_id == fleet_id, FleetMember.mmsi == mmsi)
        )
        result = await self._session.execute(stmt)
        return result.scalar_one() > 0

    async def get_members(self, fleet_id: int) -> list[dict[str, Any]]:
        stmt = (
            select(FleetMember, Vessel.name, Vessel.ship_type_name)
            .outerjoin(Vessel, Vessel.mmsi == FleetMember.mmsi)
            .where(FleetMember.fleet_id == fleet_id)
            .order_by(FleetMember.added_at.desc())
        )
        result = await self._session.execute(stmt)
        rows = result.all()
        return [
            {
                "id": r[0].id,
                "fleet_id": r[0].fleet_id,
                "mmsi": r[0].mmsi,
                "added_at": r[0].added_at,
                "vessel_name": r[1],
                "ship_type_name": r[2],
            }
            for r in rows
        ]

    async def get_all_member_mmsi(self) -> dict[int, list[int]]:
        stmt = select(FleetMember)
        result = await self._session.execute(stmt)
        members = result.scalars().all()
        fleets: dict[int, list[int]] = {}
        for m in members:
            fleets.setdefault(m.fleet_id, []).append(m.mmsi)
        return fleets

    async def get_fleet_mmsi_list(self, fleet_id: int) -> list[int]:
        stmt = select(FleetMember.mmsi).where(FleetMember.fleet_id == fleet_id)
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def get_all_members_with_color(self) -> list[dict[str, Any]]:
        stmt = (
            select(FleetMember.mmsi, Fleet.color, Fleet.name)
            .join(Fleet, Fleet.id == FleetMember.fleet_id)
        )
        result = await self._session.execute(stmt)
        rows = result.all()
        return [
            {"mmsi": r[0], "color": r[1], "fleet_name": r[2]}
            for r in rows
        ]

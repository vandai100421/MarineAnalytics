"""Import API - accepts data exports from Marine Crawler."""
import json
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from geoalchemy2.elements import WKTElement
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.models.aircraft import AircraftPosition
from app.models.port import Port
from app.models.position import PositionReport
from app.models.vessel import Vessel

router = APIRouter(prefix="/import", tags=["import"])


class ImportSummary(BaseModel):
    version: str = "2.0"
    imported_at: str | None = None
    crawl_run_id: int | None = None
    vessels_created: int = 0
    vessels_updated: int = 0
    positions_created: int = 0
    aircraft_created: int = 0
    ports_created: int = 0
    weather_created: int = 0
    errors: list[str] = []


@router.post("/vessels")
async def import_vessels(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
) -> ImportSummary:
    """Import vessel positions from JSON file."""
    if not file.filename or not file.filename.endswith(".json"):
        raise HTTPException(400, "Only JSON files supported")

    content = await file.read()
    data = json.loads(content)

    summary = ImportSummary(
        imported_at=datetime.utcnow().isoformat(),
        crawl_run_id=data.get("crawl_run_id"),
    )

    records = data.get("records", [])
    for rec in records:
        try:
            mmsi = rec.get("mmsi")
            if not mmsi:
                continue

            # Upsert vessel
            vessel_query = select(Vessel).where(Vessel.mmsi == mmsi)
            result = await session.execute(vessel_query)
            vessel = result.scalar_one_or_none()

            if not vessel:
                vessel = Vessel(mmsi=mmsi)
                session.add(vessel)
                summary.vessels_created += 1
            else:
                summary.vessels_updated += 1

            # Update vessel fields if available
            if rec.get("name"):
                vessel.name = rec["name"]
            if rec.get("ship_type"):
                vessel.ship_type = rec["ship_type"]
            if rec.get("callsign"):
                vessel.callsign = rec["callsign"]
            if rec.get("imo"):
                vessel.imo = rec["imo"]
            if rec.get("destination"):
                vessel.destination = rec["destination"]
            if rec.get("flag"):
                vessel.flag = rec["flag"]

            # Create position report with original timestamp
            ts_str = rec.get("ts")
            if ts_str and rec.get("lat") and rec.get("lon"):
                if isinstance(ts_str, str):
                    ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                else:
                    ts = datetime.utcnow()

                # Check for duplicate position (same mmsi + ts)
                dup_query = select(PositionReport).where(
                    PositionReport.mmsi == mmsi,
                    PositionReport.ts == ts,
                )
                existing = await session.execute(dup_query)
                if existing.scalar_one_or_none():
                    continue  # Skip duplicate

                position = PositionReport(
                    mmsi=mmsi,
                    ts=ts,
                    lat=rec["lat"],
                    lon=rec["lon"],
                    sog=rec.get("sog"),
                    cog=rec.get("cog"),
                    heading=rec.get("heading"),
                    nav_status=rec.get("nav_status"),
                    source=rec.get("source", "crawler"),
                )
                session.add(position)
                summary.positions_created += 1

        except Exception as e:
            summary.errors.append(f"Vessel {rec.get('mmsi')}: {str(e)}")

    if summary.positions_created > 0:
        await session.commit()

    return summary


@router.post("/aircraft")
async def import_aircraft(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
) -> ImportSummary:
    """Import aircraft positions from JSON file."""
    if not file.filename or not file.filename.endswith(".json"):
        raise HTTPException(400, "Only JSON files supported")

    content = await file.read()
    data = json.loads(content)

    summary = ImportSummary(
        imported_at=datetime.utcnow().isoformat(),
        crawl_run_id=data.get("crawl_run_id"),
    )

    records = data.get("records", [])
    for rec in records:
        try:
            hex_code = rec.get("hex")
            ts_str = rec.get("ts")
            lat = rec.get("lat")
            lon = rec.get("lon")

            if not all([hex_code, ts_str, lat, lon]):
                continue

            if isinstance(ts_str, str):
                ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            else:
                ts = datetime.utcnow()

            # Check for duplicate
            stmt = select(AircraftPosition).where(
                AircraftPosition.hex == hex_code,
                AircraftPosition.ts == ts,
            )
            existing = await session.execute(stmt)
            if existing.scalar_one_or_none():
                continue

            position = AircraftPosition(
                hex=hex_code,
                ts=ts,
                lat=lat,
                lon=lon,
                alt=rec.get("alt"),
                gs=rec.get("gs"),
                track=rec.get("track"),
                flight=rec.get("flight"),
                reg=rec.get("reg"),
                type=rec.get("type"),
                vertical_rate=rec.get("vertical_rate"),
                origin_country=rec.get("source", "crawler"),
            )
            session.add(position)
            summary.aircraft_created += 1

        except Exception as e:
            summary.errors.append(f"Aircraft {rec.get('hex')}: {str(e)}")

    if summary.aircraft_created > 0:
        await session.commit()

    return summary


@router.post("/ports")
async def import_ports(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
) -> ImportSummary:
    """Import port data from JSON file."""
    if not file.filename or not file.filename.endswith(".json"):
        raise HTTPException(400, "Only JSON files supported")

    content = await file.read()
    data = json.loads(content)

    summary = ImportSummary(
        imported_at=datetime.utcnow().isoformat(),
        crawl_run_id=data.get("crawl_run_id"),
    )

    records = data.get("records", [])
    for rec in records:
        try:
            name = rec.get("name")
            lat = rec.get("lat")
            lon = rec.get("lon")

            if not all([name, lat, lon]):
                continue

            # Check if port exists by name
            stmt = select(Port).where(Port.name == name)
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()

            if existing:
                # Update
                existing.lat = lat
                existing.lon = lon
                if rec.get("country_code"):
                    existing.country_code = rec["country_code"]
                if rec.get("unlocode"):
                    existing.unlocode = rec["unlocode"]
                if rec.get("type"):
                    existing.type = rec["type"]
            else:
                # Create new port
                port = Port(
                    name=name,
                    country_code=rec.get("country_code"),
                    unlocode=rec.get("unlocode"),
                    lat=lat,
                    lon=lon,
                    type=rec.get("type", "sea_port"),
                    geom=WKTElement(f"POINT({lon} {lat})", srid=4326),
                )
                session.add(port)
                summary.ports_created += 1

        except Exception as e:
            summary.errors.append(f"Port {rec.get('name')}: {str(e)}")

    await session.commit()
    return summary


@router.post("/full")
async def import_full(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
) -> ImportSummary:
    """Import full export file containing all data types."""
    if not file.filename or not file.filename.endswith(".json"):
        raise HTTPException(400, "Only JSON files supported")

    content = await file.read()
    data = json.loads(content)

    summary = ImportSummary(
        imported_at=datetime.utcnow().isoformat(),
        crawl_run_id=data.get("crawl_run_id"),
    )

    # Import vessel positions
    vp_data = data.get("vessel_positions", {})
    vp_records = vp_data.get("records", [])
    for rec in vp_records:
        try:
            mmsi = rec.get("mmsi")
            if not mmsi:
                continue

            # Upsert vessel
            vessel_query = select(Vessel).where(Vessel.mmsi == mmsi)
            result = await session.execute(vessel_query)
            vessel = result.scalar_one_or_none()

            if not vessel:
                vessel = Vessel(mmsi=mmsi)
                session.add(vessel)
                summary.vessels_created += 1
            else:
                summary.vessels_updated += 1

            # Update vessel fields from export
            if rec.get("name"):
                vessel.name = rec["name"]
            if rec.get("ship_type"):
                vessel.ship_type = rec["ship_type"]
            if rec.get("ship_type_name"):
                vessel.ship_type_name = rec["ship_type_name"]
            if rec.get("callsign"):
                vessel.callsign = rec["callsign"]
            if rec.get("imo"):
                vessel.imo = rec["imo"]
            if rec.get("flag"):
                vessel.flag = rec["flag"]
            if rec.get("destination"):
                vessel.destination = rec["destination"]

            ts_str = rec.get("ts")
            if ts_str and rec.get("lat") and rec.get("lon"):
                if isinstance(ts_str, str):
                    ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                else:
                    ts = datetime.utcnow()

                # Skip duplicates
                dup_query = select(PositionReport).where(
                    PositionReport.mmsi == mmsi,
                    PositionReport.ts == ts,
                )
                existing = await session.execute(dup_query)
                if existing.scalar_one_or_none():
                    continue

                position = PositionReport(
                    mmsi=mmsi,
                    ts=ts,
                    lat=rec["lat"],
                    lon=rec["lon"],
                    sog=rec.get("sog"),
                    cog=rec.get("cog"),
                    heading=rec.get("heading"),
                    source=rec.get("source", "crawler"),
                )
                session.add(position)
                summary.positions_created += 1
        except Exception as e:
            summary.errors.append(f"Vessel pos: {str(e)}")

    # Import aircraft positions
    ap_data = data.get("aircraft_positions", {})
    ap_records = ap_data.get("records", [])
    for rec in ap_records:
        try:
            hex_code = rec.get("hex")
            ts_str = rec.get("ts")
            lat = rec.get("lat")
            lon = rec.get("lon")

            if not all([hex_code, ts_str, lat, lon]):
                continue

            if isinstance(ts_str, str):
                ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            else:
                ts = datetime.utcnow()

            # Skip duplicates
            ac_dup_query = select(AircraftPosition).where(
                AircraftPosition.hex == hex_code,
                AircraftPosition.ts == ts,
            )
            existing = await session.execute(ac_dup_query)
            if existing.scalar_one_or_none():
                continue

            ac_position = AircraftPosition(
                hex=hex_code,
                ts=ts,
                lat=lat,
                lon=lon,
                alt=rec.get("alt"),
                gs=rec.get("gs"),
                track=rec.get("track"),
                flight=rec.get("flight"),
                origin_country=rec.get("source", "crawler"),
            )
            session.add(ac_position)
            summary.aircraft_created += 1
        except Exception as e:
            summary.errors.append(f"Aircraft pos: {str(e)}")

    # Import ports
    ports_data = data.get("ports", {})
    ports_records = ports_data.get("records", [])

    # Commit vessel + aircraft data first (so port errors don't roll back)
    try:
        await session.commit()
    except Exception:
        await session.rollback()

    for rec in ports_records:
        try:
            name = rec.get("name")
            lat = rec.get("lat")
            lon = rec.get("lon")

            if not all([name, lat, lon]):
                continue

            port_query = select(Port).where(Port.name == name)
            result = await session.execute(port_query)
            port_existing = result.scalars().first()

            if not port_existing:
                port = Port(
                    name=name,
                    country_code=rec.get("country_code"),
                    unlocode=rec.get("unlocode"),
                    lat=lat,
                    lon=lon,
                    type=rec.get("type", "sea_port"),
                    geom=WKTElement(f"POINT({lon} {lat})", srid=4326),
                )
                session.add(port)
                summary.ports_created += 1
        except Exception as e:
            summary.errors.append(f"Port: {str(e)}")
            await session.rollback()

    try:
        await session.commit()
    except Exception:
        await session.rollback()
    return summary


@router.get("/status")
async def import_status() -> dict[str, object]:
    """Get import system status."""
    return {
        "status": "ready",
        "version": "2.0",
        "supported_formats": ["json"],
        "features": [
            "historical_data",
            "timestamp_preservation",
            "duplicate_detection",
            "crawl_run_tracking",
        ],
        "endpoints": {
            "vessels": "/api/v1/import/vessels",
            "aircraft": "/api/v1/import/aircraft",
            "ports": "/api/v1/import/ports",
            "full": "/api/v1/import/full",
        },
    }

from datetime import datetime
from typing import Any

from sqlalchemy import JSON, BigInteger, Float, Index, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class VesselEvent(Base):
    __tablename__ = "vessel_events"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    mmsi: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    event_type: Mapped[str] = mapped_column(Text, nullable=False)
    ts: Mapped[datetime] = mapped_column(server_default=func.now())
    lat: Mapped[float | None] = mapped_column(Float)
    lon: Mapped[float | None] = mapped_column(Float)
    severity: Mapped[str] = mapped_column(Text, default="info")
    details: Mapped[dict[str, Any] | None] = mapped_column(JSON)


Index("idx_vessel_events_mmsi", VesselEvent.mmsi, VesselEvent.ts.desc())
Index("idx_vessel_events_type", VesselEvent.event_type, VesselEvent.ts.desc())

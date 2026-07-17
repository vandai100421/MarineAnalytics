from datetime import UTC, datetime

from geoalchemy2 import Geography
from sqlalchemy import BigInteger, Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Port(Base):
    __tablename__ = "ports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    country_code: Mapped[str | None] = mapped_column(String(2))
    unlocode: Mapped[str | None] = mapped_column(Text)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lon: Mapped[float] = mapped_column(Float, nullable=False)
    radius_m: Mapped[int] = mapped_column(Integer, server_default="5000", default=5000)
    type: Mapped[str] = mapped_column(Text, server_default="sea_port", default="sea_port")
    geom: Mapped[object | None] = mapped_column(Geography("POINT", srid=4326))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), default=lambda: datetime.now(UTC)
    )


class PortArrival(Base):
    __tablename__ = "port_arrivals"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    mmsi: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    port_id: Mapped[int] = mapped_column(
        ForeignKey("ports.id", name="fk_port_arrivals_ports", ondelete="CASCADE"),
        nullable=False,
    )
    arrived_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    departed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    dwell_minutes: Mapped[float | None] = mapped_column(Float)
    anchorage: Mapped[bool] = mapped_column(Boolean, server_default="false", default=False)
    lat: Mapped[float | None] = mapped_column(Float)
    lon: Mapped[float | None] = mapped_column(Float)

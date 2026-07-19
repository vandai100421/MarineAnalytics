from datetime import datetime

from sqlalchemy import TIMESTAMP, Float, Index, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class AircraftPosition(Base):
    __tablename__ = "aircraft_positions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    hex: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    ts: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, index=True)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lon: Mapped[float] = mapped_column(Float, nullable=False)
    alt: Mapped[float | None] = mapped_column(Float)
    gs: Mapped[float | None] = mapped_column(Float)
    track: Mapped[float | None] = mapped_column(Float)
    flight: Mapped[str | None] = mapped_column(Text)
    reg: Mapped[str | None] = mapped_column(Text)
    type: Mapped[str | None] = mapped_column(Text)

    __table_args__ = (Index("idx_aircraft_hex_ts", "hex", "ts"),)

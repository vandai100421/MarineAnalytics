from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Float
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class IdleEvent(Base):
    __tablename__ = "idle_events"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    mmsi: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    start_ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_ts: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    duration_minutes: Mapped[float | None] = mapped_column(Float)
    start_lat: Mapped[float] = mapped_column(Float, nullable=False)
    start_lon: Mapped[float] = mapped_column(Float, nullable=False)
    end_lat: Mapped[float | None] = mapped_column(Float)
    end_lon: Mapped[float | None] = mapped_column(Float)
    avg_sog: Mapped[float | None] = mapped_column(Float)
    max_sog: Mapped[float | None] = mapped_column(Float)

from datetime import datetime

from sqlalchemy import BigInteger, Float, Index, SmallInteger, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class PositionReport(Base):
    __tablename__ = "position_reports"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    mmsi: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    ts: Mapped[datetime] = mapped_column(nullable=False, index=True)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lon: Mapped[float] = mapped_column(Float, nullable=False)
    sog: Mapped[float | None] = mapped_column(Float)
    cog: Mapped[float | None] = mapped_column(Float)
    heading: Mapped[float | None] = mapped_column(Float)
    nav_status: Mapped[int | None] = mapped_column(SmallInteger)
    rot: Mapped[float | None] = mapped_column(Float)
    source: Mapped[str] = mapped_column(Text, default="aisstream", server_default="aisstream")

    __table_args__ = (Index("idx_pos_mmsi_ts", "mmsi", "ts", postgresql_using="btree"),)

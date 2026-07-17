from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Fleet(Base):
    __tablename__ = "fleets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    color: Mapped[str] = mapped_column(String(7), server_default="#3b82f6", default="#3b82f6")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class FleetMember(Base):
    __tablename__ = "fleet_members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    fleet_id: Mapped[int] = mapped_column(
        ForeignKey("fleets.id", name="fk_fleet_members_fleets", ondelete="CASCADE"),
        nullable=False,
    )
    mmsi: Mapped[int] = mapped_column(BigInteger, nullable=False)
    added_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

from datetime import datetime

from sqlalchemy import BigInteger, SmallInteger, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base


class Vessel(Base):
    __tablename__ = "vessels"

    mmsi: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str | None] = mapped_column(Text)
    ship_type: Mapped[int | None] = mapped_column(SmallInteger)
    ship_type_name: Mapped[str | None] = mapped_column(Text)
    callsign: Mapped[str | None] = mapped_column(Text)
    imo: Mapped[int | None] = mapped_column(BigInteger)
    dim_a: Mapped[int | None] = mapped_column(SmallInteger)
    dim_b: Mapped[int | None] = mapped_column(SmallInteger)
    dim_c: Mapped[int | None] = mapped_column(SmallInteger)
    dim_d: Mapped[int | None] = mapped_column(SmallInteger)
    destination: Mapped[str | None] = mapped_column(Text)
    eta: Mapped[datetime | None]
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

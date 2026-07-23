from datetime import datetime

from sqlalchemy import BigInteger, Float, Integer, SmallInteger, Text, func
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
    photo_url: Mapped[str | None] = mapped_column(Text)
    gt: Mapped[int | None] = mapped_column(Integer)
    dwt: Mapped[int | None] = mapped_column(Integer)
    loa: Mapped[float | None] = mapped_column(Float)
    beam: Mapped[float | None] = mapped_column(Float)
    draught_max: Mapped[float | None] = mapped_column(Float)
    year_built: Mapped[int | None] = mapped_column(SmallInteger)
    flag: Mapped[str | None] = mapped_column(Text)
    ais_class: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

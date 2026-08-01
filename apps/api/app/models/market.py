import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, SmallInteger, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class MarketSnapshot(Base):
    __tablename__ = "market_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False
    )
    quarter: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    oil_price: Mapped[float] = mapped_column(Numeric, nullable=False)
    interest_rate: Mapped[float] = mapped_column(Numeric, nullable=False)
    inflation: Mapped[float] = mapped_column(Numeric, nullable=False)
    commodity_index: Mapped[float] = mapped_column(Numeric, nullable=False)
    currency_index: Mapped[float] = mapped_column(Numeric, nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )
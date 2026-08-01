import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, SmallInteger, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class QuarterReport(Base):
    __tablename__ = "quarter_reports"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    quarter: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    kpi_deltas: Mapped[dict] = mapped_column(JSONB, nullable=False)
    narrative: Mapped[str] = mapped_column(Text, nullable=False)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )

    __table_args__ = (UniqueConstraint("company_id", "quarter", name="uq_quarter_reports_company_quarter"),)


class CorporateTimesIssue(Base):
    __tablename__ = "corporate_times_issues"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False
    )
    quarter: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    top_companies: Mapped[dict] = mapped_column(JSONB, nullable=False)
    biggest_failures: Mapped[dict] = mapped_column(JSONB, nullable=False)
    market_events: Mapped[dict] = mapped_column(JSONB, nullable=False)
    board_gossip: Mapped[dict] = mapped_column(JSONB, nullable=False)
    economic_outlook: Mapped[str] = mapped_column(Text, nullable=False)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )
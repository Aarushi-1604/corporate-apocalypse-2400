import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    SmallInteger,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class EventTemplate(Base):
    __tablename__ = "event_templates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    category: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    response_options: Mapped[dict] = mapped_column(JSONB, nullable=False)
    default_response: Mapped[dict] = mapped_column(JSONB, nullable=False)
    weight: Mapped[float] = mapped_column(Numeric, nullable=False, server_default="1.0")
    min_quarter: Mapped[int] = mapped_column(SmallInteger, nullable=False, server_default="1")
    applicable_sectors: Mapped[dict | None] = mapped_column(JSONB)
    is_chain_trigger: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    follow_up_template_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("event_templates.id")
    )
    late_quarter_only: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    cooldown_span: Mapped[int] = mapped_column(SmallInteger, nullable=False, server_default="2")


class EventInstance(Base):
    __tablename__ = "event_instances"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    template_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("event_templates.id"), nullable=False
    )
    quarter: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    triggered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )
    responded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    chosen_option_index: Mapped[int | None] = mapped_column(SmallInteger)
    resolved: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    response_deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("ix_event_instances_company_quarter_resolved", "company_id", "quarter", "resolved"),
    )


class PendingChainEvent(Base):
    __tablename__ = "pending_chain_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    template_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("event_templates.id"), nullable=False
    )
    due_quarter: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    consumed: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )

    __table_args__ = (
        Index(
            "ix_pending_chain_due",
            "company_id",
            "due_quarter",
            postgresql_where=text("NOT consumed"),
        ),
    )
import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    SmallInteger,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class CompanyTemplate(Base):
    __tablename__ = "company_templates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    sector: Mapped[str] = mapped_column(Text, nullable=False)
    name_pool: Mapped[dict] = mapped_column(JSONB, nullable=False)
    backstory_pool: Mapped[dict] = mapped_column(JSONB, nullable=False)
    base_stats: Mapped[dict] = mapped_column(JSONB, nullable=False)
    unique_strength: Mapped[str] = mapped_column(Text, nullable=False)
    unique_weakness: Mapped[str] = mapped_column(Text, nullable=False)
    unique_passive_ability: Mapped[str] = mapped_column(Text, nullable=False)


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False
    )
    template_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("company_templates.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    sector: Mapped[str] = mapped_column(Text, nullable=False)
    backstory: Mapped[str] = mapped_column(Text, nullable=False)
    unique_strength: Mapped[str] = mapped_column(Text, nullable=False)
    unique_weakness: Mapped[str] = mapped_column(Text, nullable=False)
    unique_passive_ability: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )


class CompanyState(Base):
    __tablename__ = "company_states"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    quarter: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    cash: Mapped[float] = mapped_column(Numeric, nullable=False)
    revenue: Mapped[float] = mapped_column(Numeric, nullable=False)
    profit: Mapped[float] = mapped_column(Numeric, nullable=False)
    debt: Mapped[float] = mapped_column(Numeric, nullable=False)
    stock_price: Mapped[float] = mapped_column(Numeric, nullable=False)
    employees: Mapped[int] = mapped_column(nullable=False)
    innovation: Mapped[float] = mapped_column(Numeric, nullable=False)
    brand: Mapped[float] = mapped_column(Numeric, nullable=False)
    client_satisfaction: Mapped[float] = mapped_column(Numeric, nullable=False)
    employee_satisfaction: Mapped[float] = mapped_column(Numeric, nullable=False)
    investor_confidence: Mapped[float] = mapped_column(Numeric, nullable=False)
    esg: Mapped[float] = mapped_column(Numeric, nullable=False)
    risk: Mapped[float] = mapped_column(Numeric, nullable=False)
    market_share: Mapped[float] = mapped_column(Numeric, nullable=False)
    board_confidence: Mapped[float] = mapped_column(Numeric, nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )

    __table_args__ = (UniqueConstraint("company_id", "quarter", name="uq_company_states_company_quarter"),)


class BudgetAllocation(Base):
    __tablename__ = "budget_allocations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    quarter: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    category: Mapped[str] = mapped_column(Text, nullable=False)
    amount: Mapped[float] = mapped_column(Numeric, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )

    __table_args__ = (
        Index("ix_budget_company_quarter_category", "company_id", "quarter", "category"),
    )


class DecisionLog(Base):
    __tablename__ = "decision_log"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    quarter: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    decision_type: Mapped[str] = mapped_column(Text, nullable=False)
    reference_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    stat_deltas: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )
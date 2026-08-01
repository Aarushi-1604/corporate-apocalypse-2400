import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, Numeric, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Leaderboard(Base):
    __tablename__ = "leaderboard"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    player_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("players.id", ondelete="CASCADE"), nullable=False
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False
    )
    company_name: Mapped[str] = mapped_column(Text, nullable=False)
    sector: Mapped[str] = mapped_column(Text, nullable=False)
    final_score: Mapped[float | None] = mapped_column(Numeric)
    revenue_score: Mapped[float | None] = mapped_column(Numeric)
    satisfaction_score: Mapped[float | None] = mapped_column(Numeric)
    innovation_score: Mapped[float | None] = mapped_column(Numeric)
    investor_score: Mapped[float | None] = mapped_column(Numeric)
    survival_score: Mapped[float | None] = mapped_column(Numeric)
    risk_penalty: Mapped[float | None] = mapped_column(Numeric)
    rank: Mapped[int | None] = mapped_column(Integer)
    excluded: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()")
    )

    __table_args__ = (
        Index(
            "ix_leaderboard_score_ranked",
            final_score.desc(),
            postgresql_where=text("NOT excluded"),
        ),
    )
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Company, CompanyState as CompanyStateModel, Leaderboard
from app.scoring.config_loader import load_scoring_config
from app.scoring.formula import calculate_final_score


async def finalize_game(db: AsyncSession, company: Company) -> None:
    """
    Called exactly once, from whichever path ends a session (natural
    Q4 completion, bankruptcy, board firing). Writes a leaderboard row.
    Does NOT commit -- caller owns the transaction boundary, same
    pattern as every other service function that gets called mid-flow
    from operations_service/board_service.
    """
    states_result = await db.execute(
        select(CompanyStateModel)
        .where(CompanyStateModel.company_id == company.id)
        .order_by(CompanyStateModel.quarter)
    )
    states = states_result.scalars().all()

    quarterly_states = [
        {
            "revenue": float(s.revenue), "profit": float(s.profit),
            "client_satisfaction": float(s.client_satisfaction),
            "employee_satisfaction": float(s.employee_satisfaction),
            "innovation": float(s.innovation), "investor_confidence": float(s.investor_confidence),
            "risk": float(s.risk),
        }
        for s in states
    ]

    scores = calculate_final_score(quarterly_states, load_scoring_config())
    profit_score = scores.pop("profit_score")
    
    existing_result = await db.execute(
        select(Leaderboard).where(Leaderboard.session_id == company.session_id)
    )
    existing = existing_result.scalar_one_or_none()

    if existing is not None:
        for key, value in scores.items():
            setattr(existing, key, value)
    else:
        session_result = await db.execute(
            select(Company.session_id).where(Company.id == company.id)
        )
        from app.models import Session as SessionModel
        session_row_result = await db.execute(
            select(SessionModel).where(SessionModel.id == company.session_id)
        )
        session_row = session_row_result.scalar_one()

        db.add(
            Leaderboard(
                player_id=session_row.player_id,
                session_id=company.session_id,
                company_name=company.name, sector=company.sector,
                **scores,
            )
        )
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.company_gen.generator import generate_company, load_templates
from app.models import Company, CompanyTemplate as CompanyTemplateModel, Player
from app.models import CompanyState as CompanyStateModel
from app.models import Session as SessionModel
from app.schemas.registration import CompanyOut, RegisterRequest, RegisterResponse


async def _build_response(
    player_id: uuid.UUID, session: SessionModel, company: Company, state: CompanyStateModel, resumed: bool
) -> RegisterResponse:
    return RegisterResponse(
        player_id=player_id,
        session_id=session.id,
        company_id=company.id,
        resumed=resumed,
        company=CompanyOut(
            name=company.name,
            sector=company.sector,
            backstory=company.backstory,
            unique_strength=company.unique_strength,
            unique_weakness=company.unique_weakness,
            unique_passive_ability=company.unique_passive_ability,
            cash=float(state.cash),
            employees=state.employees,
        ),
    )


async def register_or_resume(db: AsyncSession, payload: RegisterRequest) -> RegisterResponse:
    result = await db.execute(select(Player).where(Player.prn == payload.prn))
    player = result.scalar_one_or_none()

    if player is not None and (player.full_name != payload.full_name or player.email != payload.email):
        raise ValueError("PRN_MISMATCH")

    if player is None:
        player = Player(
            full_name=payload.full_name,
            prn=payload.prn,
            email=payload.email,
            department=payload.department,
            year_of_study=payload.year_of_study,
        )
        db.add(player)
        await db.flush()

    if player.id is not None:
        session_result = await db.execute(
            select(SessionModel)
            .where(SessionModel.player_id == player.id, SessionModel.status == "active")
            .order_by(SessionModel.started_at.desc())
        )
        existing_session = session_result.scalars().first()

        if existing_session is not None:
            company_result = await db.execute(
                select(Company).where(Company.session_id == existing_session.id)
            )
            company = company_result.scalar_one()
            state_result = await db.execute(
                select(CompanyStateModel).where(
                    CompanyStateModel.company_id == company.id,
                    CompanyStateModel.quarter == existing_session.current_quarter,
                )
            )
            state = state_result.scalar_one()
            return await _build_response(player.id, existing_session, company, state, resumed=True)

    # No active session -- create a brand new one (covers both a
    # genuinely new player, and a returning player whose prior
    # session already ended).
    new_session = SessionModel(player_id=player.id, attempt_number=1)
    db.add(new_session)
    await db.flush()

    templates = load_templates()
    generated = generate_company(
        templates, session_seed=new_session.id.int % (2**31), attempt_number=1
    )

    template_result = await db.execute(
        select(CompanyTemplateModel).where(CompanyTemplateModel.sector == generated.sector)
    )
    db_template = template_result.scalar_one()

    company = Company(
        session_id=new_session.id,
        template_id=db_template.id,
        name=generated.name,
        sector=generated.sector,
        backstory=generated.backstory,
        unique_strength=generated.unique_strength,
        unique_weakness=generated.unique_weakness,
        unique_passive_ability=generated.unique_passive_ability,
    )
    db.add(company)
    await db.flush()

    s = generated.initial_state
    company_state = CompanyStateModel(
        company_id=company.id,
        quarter=1,
        cash=s.cash, revenue=s.revenue, profit=s.profit, debt=s.debt,
        stock_price=s.stock_price, employees=s.employees,
        innovation=s.innovation, brand=s.brand,
        client_satisfaction=s.client_satisfaction,
        employee_satisfaction=s.employee_satisfaction,
        investor_confidence=s.investor_confidence, esg=s.esg,
        risk=s.risk, market_share=s.market_share,
        board_confidence=s.board_confidence,
    )
    db.add(company_state)
    await db.commit()

    return await _build_response(player.id, new_session, company, company_state, resumed=False)
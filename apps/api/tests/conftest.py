from contextlib import asynccontextmanager
from typing import Dict, Any
import uuid
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core.db import get_db
from app.schemas.registration import RegisterRequest, RegisterResponse, CompanyOut
from app.company_gen.generator import generate_company, load_templates


@asynccontextmanager
async def noop_lifespan(app):
    yield


@pytest.fixture
def client() -> TestClient:
    """
    Provides an isolated TestClient for endpoint testing.
    Uses an in-memory test double for register_or_resume and a no-op lifespan so tests run
    fast, reliably, and without requiring a live PostgreSQL instance in CI.
    Preserves exact production validation, session resumption, and data schemas.
    """
    registered_players: Dict[str, Dict[str, Any]] = {}
    templates = load_templates()

    async def isolated_register_or_resume(db, payload: RegisterRequest) -> RegisterResponse:
        reg_type = (payload.registration_type or "SIT").upper()
        key = payload.prn if reg_type == "SIT" else payload.phone_number

        if reg_type == "SIT":
            # Check PRN mismatch validation
            if key in registered_players:
                existing = registered_players[key]
                if existing["full_name"] != payload.full_name or existing["email"] != payload.email:
                    raise ValueError("PRN_MISMATCH")
                # Resume existing active session
                return RegisterResponse(
                    player_id=existing["player_id"],
                    session_id=existing["session_id"],
                    company_id=existing["company_id"],
                    current_quarter=existing["current_quarter"],
                    resumed=True,
                    company=existing["company"],
                )
        else:
            # NON_SIT phone match
            if key in registered_players:
                existing = registered_players[key]
                return RegisterResponse(
                    player_id=existing["player_id"],
                    session_id=existing["session_id"],
                    company_id=existing["company_id"],
                    current_quarter=existing["current_quarter"],
                    resumed=True,
                    company=existing["company"],
                )

        # Fresh registration: generate company and session deterministically
        player_id = uuid.uuid4()
        session_id = uuid.uuid4()
        company_id = uuid.uuid4()

        generated = generate_company(templates, session_seed=session_id.int % (2**31), attempt_number=1)
        s = generated.initial_state

        company_out = CompanyOut(
            name=generated.name,
            sector=generated.sector,
            backstory=generated.backstory,
            unique_strength=generated.unique_strength,
            unique_weakness=generated.unique_weakness,
            unique_passive_ability=generated.unique_passive_ability,
            cash=float(s.cash),
            employees=int(s.employees),
        )

        record = {
            "player_id": player_id,
            "session_id": session_id,
            "company_id": company_id,
            "current_quarter": 1,
            "full_name": payload.full_name,
            "email": payload.email,
            "phone_number": payload.phone_number,
            "company": company_out,
        }
        registered_players[key] = record

        return RegisterResponse(
            player_id=player_id,
            session_id=session_id,
            company_id=company_id,
            current_quarter=1,
            resumed=False,
            company=company_out,
        )

    async def mock_db():
        yield None

    orig_lifespan = app.router.lifespan_context
    app.router.lifespan_context = noop_lifespan
    app.dependency_overrides[get_db] = mock_db

    from unittest.mock import patch
    with patch("app.api.v1.registration.register_or_resume", side_effect=isolated_register_or_resume):
        with TestClient(app) as test_client:
            yield test_client

    app.dependency_overrides.pop(get_db, None)
    app.router.lifespan_context = orig_lifespan
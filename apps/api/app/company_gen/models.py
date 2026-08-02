from pydantic import BaseModel

from app.simulation.models import CompanyState, CompanyTraits


class CompanyTemplate(BaseModel):
    id: str
    sector: str
    name_pool: list[str]
    backstory_pool: list[str]
    base_stats: dict[str, float]
    unique_strength: str
    unique_weakness: str
    unique_passive_ability: str
    passive_multipliers: dict[str, float]


class GeneratedCompany(BaseModel):
    """
    The full output of generating one company. A later phase will be
    responsible for translating this into real companies/company_states
    database rows -- this module never touches Postgres directly.
    """

    template_id: str
    sector: str
    name: str
    backstory: str
    unique_strength: str
    unique_weakness: str
    unique_passive_ability: str
    initial_state: CompanyState
    traits: CompanyTraits
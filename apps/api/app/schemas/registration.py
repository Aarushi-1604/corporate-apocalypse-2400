import uuid

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=1)
    prn: str = Field(min_length=1)
    email: EmailStr
    department: str = Field(min_length=1)
    year_of_study: str = Field(min_length=1)


class CompanyOut(BaseModel):
    name: str
    sector: str
    backstory: str
    unique_strength: str
    unique_weakness: str
    unique_passive_ability: str
    cash: float
    employees: int


class RegisterResponse(BaseModel):
    player_id: uuid.UUID
    session_id: uuid.UUID
    company_id: uuid.UUID
    current_quarter: int
    resumed: bool
    company: CompanyOut
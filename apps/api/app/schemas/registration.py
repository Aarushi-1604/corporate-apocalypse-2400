import uuid
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, model_validator



class RegisterRequest(BaseModel):
    registration_type: Literal["SIT", "NON_SIT"] = "SIT"
    full_name: str = Field(min_length=1)

    # SIT fields
    email: Optional[EmailStr] = None
    prn: Optional[str] = None
    department: Optional[str] = None
    year_of_study: Optional[str] = None

    # NON-SIT fields
    phone_number: Optional[str] = None
    institution_name: Optional[str] = None

    @model_validator(mode="after")
    def validate_registration_fields(self):
        reg_type = (self.registration_type or "SIT").upper()
        if reg_type == "SIT":
            if not self.email:
                raise ValueError("Email is required for SIT students.")
            if not str(self.email).lower().endswith("@sitpune.edu.in"):
                raise ValueError("SIT email must end with @sitpune.edu.in")
            if not self.prn or not self.prn.strip():
                raise ValueError("PRN is required for SIT students.")
            if not self.department or not self.department.strip():
                raise ValueError("Branch is required for SIT students.")
            if not self.year_of_study or not self.year_of_study.strip():
                raise ValueError("Year is required for SIT students.")
        elif reg_type == "NON_SIT":
            if not self.phone_number or not self.phone_number.strip():
                raise ValueError("Phone number is required for Non-SIT students.")
            if not self.institution_name or not self.institution_name.strip():
                raise ValueError("Institution name is required for Non-SIT students.")
        else:
            raise ValueError("Invalid registration type.")
        return self



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
    status: str = "active"
    company: CompanyOut
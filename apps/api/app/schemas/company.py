import uuid

from pydantic import BaseModel


class CompanyStateOut(BaseModel):
    company_id: uuid.UUID
    quarter: int
    cash: float
    revenue: float
    profit: float
    debt: float
    stock_price: float
    employees: int
    innovation: float
    brand: float
    client_satisfaction: float
    employee_satisfaction: float
    investor_confidence: float
    esg: float
    risk: float
    market_share: float
    board_confidence: float
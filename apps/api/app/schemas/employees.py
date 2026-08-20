import uuid

from pydantic import BaseModel


class EmployeeResponseOptionOut(BaseModel):
    label: str


class EmployeeFeedItemOut(BaseModel):
    event_instance_id: uuid.UUID
    title: str
    body: str
    response_options: list[EmployeeResponseOptionOut]
    resolved: bool
    follow_up_text: str | None = None


class EmployeeFeedOut(BaseModel):
    items: list[EmployeeFeedItemOut]
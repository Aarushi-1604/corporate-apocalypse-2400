from pydantic import BaseModel


class ResponseOption(BaseModel):
    label: str
    stat_deltas: dict[str, float]
    follow_up_text: str


class EventTemplateConfig(BaseModel):
    category: str
    severity: str
    title: str
    body: str
    weight: float = 1.0
    min_quarter: int = 1
    response_options: list[ResponseOption]
    default_response: ResponseOption
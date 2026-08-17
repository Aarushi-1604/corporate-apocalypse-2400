from pathlib import Path

import yaml

from app.events.models import EventTemplateConfig

CONFIG_PATH = Path(__file__).parent / "config" / "event_templates.yaml"

_cache: list[EventTemplateConfig] | None = None


def load_event_templates() -> list[EventTemplateConfig]:
    global _cache
    if _cache is None:
        with open(CONFIG_PATH) as f:
            raw = yaml.safe_load(f)
        _cache = [EventTemplateConfig(**t) for t in raw["templates"]]
    return _cache
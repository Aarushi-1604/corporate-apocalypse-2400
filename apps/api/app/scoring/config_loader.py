from functools import lru_cache
from pathlib import Path

import yaml

CONFIG_PATH = Path(__file__).parent / "config" / "weights.yaml"


@lru_cache
def load_scoring_config() -> dict:
    with open(CONFIG_PATH) as f:
        return yaml.safe_load(f)
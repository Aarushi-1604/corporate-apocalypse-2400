from functools import lru_cache
from pathlib import Path

import yaml

CONFIG_PATH = Path(__file__).parent / "config" / "impact_matrix.yaml"


@lru_cache
def load_impact_config() -> dict:
    """
    Loads and caches the balance config. Same @lru_cache pattern as
    Phase 1's get_settings() -- read from disk once, reuse in memory
    after that, since the file doesn't change while the app is running.
    """
    with open(CONFIG_PATH) as f:
        return yaml.safe_load(f)
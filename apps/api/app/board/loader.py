from pathlib import Path

import yaml

CONFIG_PATH = Path(__file__).parent / "config" / "board_script.yaml"

_cache: list[dict] | None = None


def load_board_script() -> list[dict]:
    global _cache
    if _cache is None:
        with open(CONFIG_PATH) as f:
            raw = yaml.safe_load(f)
        _cache = raw["exchanges"]
    return _cache
from pathlib import Path
from typing import Dict, List, Optional

import yaml

CONFIG_PATH = Path(__file__).parent / "config" / "board_script.yaml"

_raw_cache: Optional[dict] = None
_quarter_cache: Dict[int, List[dict]] = {}


def _get_raw_config() -> dict:
    global _raw_cache
    if _raw_cache is None:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            _raw_cache = yaml.safe_load(f)
    return _raw_cache


def load_board_script(quarter: int = 1) -> List[dict]:
    """
    Loads the board script for the specified quarter (1-4).
    If quarter is omitted or invalid, defaults to Q1 script or root exchanges for backward compatibility.
    """
    global _quarter_cache
    raw = _get_raw_config()
    quarter_scripts = raw.get("quarter_scripts", {})
    
    # Clamp to valid 1-4 range
    q = max(1, min(4, quarter))
    
    if q not in _quarter_cache:
        if q in quarter_scripts:
            _quarter_cache[q] = quarter_scripts[q]
        elif str(q) in quarter_scripts:
            _quarter_cache[q] = quarter_scripts[str(q)]
        else:
            _quarter_cache[q] = raw.get("exchanges", [])
            
    return _quarter_cache[q]
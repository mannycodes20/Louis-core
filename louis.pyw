"""Starts Louis with no console window. This is what runs when Windows starts."""
import runpy
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
(ROOT / "data").mkdir(exist_ok=True)
log = open(ROOT / "data" / "louis.log", "a", buffering=1, encoding="utf-8")
sys.stdout = sys.stderr = log
sys.path.insert(0, str(ROOT))
runpy.run_path(str(ROOT / "server.py"), run_name="__main__")
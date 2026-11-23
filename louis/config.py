"""Louis's settings. Override any of these in the .env file."""

import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

BOT_NAME = os.getenv("BOT_NAME", "Louis")
USER_NAME = os.getenv("USER_NAME", "Emmanuel")

# The brain. qwen3:8b is fast on a 12 GB GPU and supports tools (web search, files...).
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen3:8b")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
TEMPERATURE = float(os.getenv("TEMPERATURE", "0.6"))

# Voice
VOICE_ENABLED = os.getenv("VOICE_ENABLED", "true").lower() == "true"
WAKE_WORDS = [w.strip().lower() for w in os.getenv("WAKE_WORDS", "louis,lewis,louie,luis,looey").split(",")]
WAKE_MODEL = os.getenv("WAKE_MODEL", "tiny.en")        # small and quick, only listens for the name
COMMAND_MODEL = os.getenv("COMMAND_MODEL", "small.en")  # more accurate, transcribes what you ask
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "auto")    # auto, cuda or cpu
PIPER_VOICE = os.getenv("PIPER_VOICE", "en_GB-alan-medium")  # a calm British voice
MIC_SENSITIVITY = float(os.getenv("MIC_SENSITIVITY", "3.0"))  # lower = picks up quieter speech

# Web dashboard
PORT = int(os.getenv("PORT", "8765"))

# Where Louis keeps memories, chat history and voice models
DATA_DIR = ROOT / "data"
DATA_DIR.mkdir(exist_ok=True)


def find_desktop() -> Path:
    """Windows often moves the Desktop into OneDrive, so check there first."""
    home = Path.home()
    for candidate in (home / "OneDrive" / "Desktop", home / "Desktop"):
        if candidate.is_dir():
            return candidate
    return home / "Desktop"


DESKTOP = Path(os.getenv("DESKTOP_PATH", "") or find_desktop())

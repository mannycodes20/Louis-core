"""Long-term memory: facts Louis keeps about you, saved to data/memories.json."""

import json
import threading
import time
import uuid

from .config import DATA_DIR

MEMORY_FILE = DATA_DIR / "memories.json"
HISTORY_FILE = DATA_DIR / "history.json"
_lock = threading.Lock()


def _read(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def _write(path, data):
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    tmp.replace(path)


def list_memories() -> list[dict]:
    with _lock:
        return _read(MEMORY_FILE, [])


def add_memory(content: str, tags: list[str] | None = None, title: str | None = None) -> dict:
    item = {
        "id": uuid.uuid4().hex[:8],
        "title": title or content[:48],
        "content": content,
        "tags": tags or [],
        "timestamp": time.time(),
    }
    with _lock:
        items = _read(MEMORY_FILE, [])
        items.append(item)
        _write(MEMORY_FILE, items)
    return item


def delete_memory(memory_id: str) -> bool:
    with _lock:
        items = _read(MEMORY_FILE, [])
        kept = [m for m in items if m["id"] != memory_id]
        _write(MEMORY_FILE, kept)
    return len(kept) != len(items)


def memories_for_prompt(limit: int = 40) -> str:
    items = list_memories()[-limit:]
    if not items:
        return "You don't have any saved memories yet."
    return "\n".join(f"- {m['content']}" for m in items)


def load_history() -> list[dict]:
    return _read(HISTORY_FILE, [])


def save_history(history: list[dict], keep: int = 200):
    with _lock:
        _write(HISTORY_FILE, history[-keep:])

"""Desktop tidy-up. Louis proposes a plan first and only moves files after you say yes.

Rules: only loose files on the Desktop are moved, into folders on the Desktop.
Shortcuts, folders and hidden/system files are never touched. Every tidy can be undone.
"""

import json
import shutil
import time
from pathlib import Path

from .config import DATA_DIR, DESKTOP

CATEGORIES = {
    "Images": {".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg", ".heic", ".ico", ".psd"},
    "Documents": {".doc", ".docx", ".txt", ".rtf", ".odt", ".md", ".pages"},
    "PDFs": {".pdf"},
    "Spreadsheets": {".xls", ".xlsx", ".csv", ".ods"},
    "Presentations": {".ppt", ".pptx", ".key", ".odp"},
    "Videos": {".mp4", ".mov", ".mkv", ".avi", ".webm", ".wmv"},
    "Audio": {".mp3", ".wav", ".flac", ".m4a", ".aac", ".ogg"},
    "Archives": {".zip", ".rar", ".7z", ".tar", ".gz"},
    "Installers": {".exe", ".msi", ".msix", ".appx"},
    "Code": {".py", ".js", ".ts", ".tsx", ".java", ".c", ".cpp", ".cs", ".html", ".css", ".json", ".ipynb", ".sql", ".sh", ".bat", ".ps1"},
    "3D and Design": {".blend", ".fbx", ".obj", ".stl", ".fig", ".sketch", ".xd"},
}
NEVER_MOVE = {".lnk", ".url", ".ini"}
UNDO_FILE = DATA_DIR / "tidy_undo.json"
_last_plan: list[dict] = []


def _category(path: Path) -> str:
    ext = path.suffix.lower()
    for name, exts in CATEGORIES.items():
        if ext in exts:
            return name
    return "Other"


def scan() -> dict:
    """Look at the Desktop and build a plan. Moves nothing."""
    global _last_plan
    plan, kept = [], 0
    if not DESKTOP.is_dir():
        return {"desktop": str(DESKTOP), "moves": [], "kept": 0, "summary": f"I couldn't find your Desktop at {DESKTOP}."}
    for item in sorted(DESKTOP.iterdir()):
        if item.is_dir() or item.name.startswith(".") or item.suffix.lower() in NEVER_MOVE:
            kept += 1
            continue
        plan.append({"file": item.name, "folder": _category(item)})
    _last_plan = plan

    counts: dict[str, int] = {}
    for m in plan:
        counts[m["folder"]] = counts.get(m["folder"], 0) + 1
    if not plan:
        summary = "Your Desktop is already tidy. There are no loose files to sort."
    else:
        parts = ", ".join(f"{n} into {f}" for f, n in sorted(counts.items(), key=lambda x: -x[1]))
        summary = (f"I found {len(plan)} loose files on your Desktop. I'd move {parts}. "
                   f"Shortcuts and existing folders stay where they are.")
    return {"desktop": str(DESKTOP), "moves": plan, "counts": counts, "kept": kept, "summary": summary}


def apply() -> dict:
    """Carry out the last plan from scan(). Records every move so it can be undone."""
    global _last_plan
    if not _last_plan:
        return {"moved": 0, "summary": "There's no tidy plan yet. Ask me to scan the Desktop first."}
    done = []
    for m in _last_plan:
        src = DESKTOP / m["file"]
        if not src.exists():
            continue
        folder = DESKTOP / m["folder"]
        folder.mkdir(exist_ok=True)
        dest = folder / src.name
        n = 1
        while dest.exists():  # never overwrite: add (1), (2)...
            dest = folder / f"{src.stem} ({n}){src.suffix}"
            n += 1
        try:
            shutil.move(str(src), str(dest))
            done.append({"from": str(src), "to": str(dest)})
        except OSError:
            pass  # file in use, skip it
    UNDO_FILE.write_text(json.dumps({"time": time.time(), "moves": done}, indent=2), encoding="utf-8")
    _last_plan = []
    return {"moved": len(done), "summary": f"Done. I moved {len(done)} files into folders on your Desktop. Say 'undo the tidy' to put them back."}


def undo() -> dict:
    try:
        record = json.loads(UNDO_FILE.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return {"restored": 0, "summary": "There's no tidy to undo."}
    restored = 0
    for m in reversed(record["moves"]):
        src, dest = Path(m["to"]), Path(m["from"])
        if src.exists() and not dest.exists():
            shutil.move(str(src), str(dest))
            restored += 1
            try:
                src.parent.rmdir()  # remove the folder if it's now empty
            except OSError:
                pass
    UNDO_FILE.unlink()
    return {"restored": restored, "summary": f"Put {restored} files back where they were."}

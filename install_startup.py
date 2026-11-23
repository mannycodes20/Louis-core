"""Make Louis start automatically when you log in to Windows.

    python install_startup.py            add Louis to startup
    python install_startup.py --remove   take him off startup
"""
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
STARTUP = Path(os.environ["APPDATA"]) / "Microsoft" / "Windows" / "Start Menu" / "Programs" / "Startup"
SCRIPT = STARTUP / "Louis.vbs"
PYTHONW = ROOT / ".venv" / "Scripts" / "pythonw.exe"

if "--remove" in sys.argv:
    SCRIPT.unlink(missing_ok=True)
    print("Louis will no longer start with Windows.")
else:
    (ROOT / "data").mkdir(exist_ok=True)
    # Wait 20 seconds after login so Ollama and the audio devices are ready, then start hidden.
    SCRIPT.write_text(
        'WScript.Sleep 20000\n'
        'Set sh = CreateObject("WScript.Shell")\n'
        f'sh.CurrentDirectory = "{ROOT}"\n'
        f'sh.Run """{PYTHONW}"" ""{ROOT / "louis.pyw"}""", 0, False\n',
        encoding="utf-8",
    )
    print(f"Done. Louis will start when you log in ({SCRIPT}).")

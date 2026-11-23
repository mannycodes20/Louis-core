"""Louis's server: runs the brain, the voice and the dashboard at http://localhost:8765.

Start it with:  python server.py          (add --open to open the dashboard)
"""

import asyncio
import sys
import threading
import webbrowser
from contextlib import asynccontextmanager
from pathlib import Path

import ollama
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from louis import config, memory, system, tidy, tools
from louis.brain import Brain

WEB_DIST = Path(__file__).parent / "web" / "dist"


class Hub:
    """Keeps track of open dashboards and sends them live events."""

    def __init__(self):
        self.clients: set[WebSocket] = set()
        self.loop: asyncio.AbstractEventLoop | None = None
        self.state = "idle"

    async def send(self, event: dict):
        for ws in list(self.clients):
            try:
                await ws.send_json(event)
            except Exception:
                self.clients.discard(ws)

    def send_threadsafe(self, event: dict):
        if self.loop:
            asyncio.run_coroutine_threadsafe(self.send(event), self.loop)

    def set_state(self, state: str):
        self.state = state
        self.send_threadsafe({"type": "state", "state": state})


hub = Hub()
brain = Brain()
voice = {"ears": None, "mouth": None, "listener": None, "speak_typed": False,
         "error": None if config.VOICE_ENABLED else "turned off in .env (VOICE_ENABLED=false)"}
tools.notify_ui = hub.send_threadsafe


async def answer(text: str, via: str):
    """Run one message through the brain, streaming to the dashboard and (if voice) the speakers."""
    mouth = voice["mouth"]
    splitter = None
    if mouth is not None and (via == "voice" or voice["speak_typed"]):
        from louis.voice import SentenceSplitter
        splitter = SentenceSplitter(mouth)

    await hub.send({"type": "user", "text": text, "via": via})
    hub.set_state("processing")
    first = True

    async def on_token(token: str):
        nonlocal first
        if first:
            hub.set_state("responding")
            first = False
        await hub.send({"type": "token", "text": token})
        if splitter:
            splitter.feed(token)

    async def on_tool(name: str, args: dict):
        await hub.send({"type": "tool", "name": name, "args": args})

    try:
        reply = await brain.respond(text, on_token, on_tool)
    except Exception as err:
        reply = f"I couldn't reach my brain: {err}. Is Ollama running?"
        await hub.send({"type": "token", "text": reply})
    if splitter:
        splitter.flush()
    await hub.send({"type": "reply_done", "text": reply})
    if via != "voice":
        hub.set_state("idle")
    return reply


def start_voice():
    """Load Whisper and Piper and start the always-on listener (runs in a background thread)."""
    try:
        from louis.voice import Ears, Mouth
        from louis.wake import WakeListener

        hub.send_threadsafe({"type": "notify", "level": "info", "title": "VOICE", "message": "Loading voice models..."})
        voice["mouth"] = Mouth()
        voice["ears"] = Ears()

        def on_command(text: str):
            asyncio.run_coroutine_threadsafe(answer(text, "voice"), hub.loop).result()

        listener = WakeListener(voice["ears"], voice["mouth"], on_command, hub.set_state)
        listener.start()
        voice["listener"] = listener
        hub.send_threadsafe({"type": "notify", "level": "success", "title": "VOICE ONLINE",
                             "message": f"Say \"{config.BOT_NAME}\" any time."})
    except Exception as err:
        voice["error"] = str(err)
        print(f"[louis] Voice disabled: {err}")
        hub.send_threadsafe({"type": "notify", "level": "warning", "title": "VOICE OFFLINE", "message": str(err)[:140]})


@asynccontextmanager
async def lifespan(app: FastAPI):
    hub.loop = asyncio.get_running_loop()
    asyncio.create_task(brain.warm_up())
    if config.VOICE_ENABLED:
        threading.Thread(target=start_voice, daemon=True).start()
    if "--open" in sys.argv:
        webbrowser.open(f"http://localhost:{config.PORT}")
    yield


app = FastAPI(lifespan=lifespan)


@app.websocket("/ws")
async def websocket(ws: WebSocket):
    await ws.accept()
    hub.clients.add(ws)
    await ws.send_json({"type": "state", "state": hub.state})
    try:
        while True:
            msg = await ws.receive_json()
            if msg.get("type") == "chat" and msg.get("text", "").strip():
                asyncio.create_task(answer(msg["text"].strip(), "text"))
            elif msg.get("type") == "listen" and voice["listener"]:
                voice["listener"].listen_now()
            elif msg.get("type") == "stop" and voice["mouth"]:
                voice["mouth"].stop()
                hub.set_state("idle")
    except WebSocketDisconnect:
        hub.clients.discard(ws)


@app.get("/api/status")
def status():
    try:
        models = sorted(m.model for m in ollama.Client(host=config.OLLAMA_BASE_URL).list().models)
    except Exception:
        models = []
    return {
        "bot_name": config.BOT_NAME, "user_name": config.USER_NAME,
        "model": brain.model_name, "temperature": brain.temperature, "models": models,
        "voice": voice["listener"] is not None, "voice_error": voice["error"],
        "speak_typed": voice["speak_typed"], "wake_words": config.WAKE_WORDS,
        "desktop": str(config.DESKTOP),
        "history": [{"role": "user" if m.type == "human" else "ai", "text": m.content} for m in brain.history[-20:]],
    }


class Settings(BaseModel):
    model: str | None = None
    temperature: float | None = None
    speak_typed: bool | None = None


@app.post("/api/settings")
def update_settings(s: Settings):
    if s.model or s.temperature is not None:
        brain.set_model(s.model, s.temperature)
    if s.speak_typed is not None:
        voice["speak_typed"] = s.speak_typed
    return status()


@app.post("/api/clear")
def clear_chat():
    brain.clear()
    return {"ok": True}


@app.get("/api/system")
def system_stats():
    return system.snapshot()


@app.get("/api/memories")
def get_memories():
    return memory.list_memories()


class NewMemory(BaseModel):
    content: str
    tags: list[str] = []


@app.post("/api/memories")
def post_memory(m: NewMemory):
    return memory.add_memory(m.content, m.tags)


@app.delete("/api/memories/{memory_id}")
def remove_memory(memory_id: str):
    return {"deleted": memory.delete_memory(memory_id)}


@app.post("/api/tidy/scan")
def tidy_scan():
    return tidy.scan()


@app.post("/api/tidy/apply")
def tidy_apply():
    return tidy.apply()


@app.post("/api/tidy/undo")
def tidy_undo():
    return tidy.undo()


@app.get("/api/search")
def search(q: str):
    try:
        return {"query": q, "results": tools.search_web(q, 8)}
    except Exception as err:
        return {"query": q, "results": [], "error": str(err)}


# The dashboard (built from the web folder with `npm run build`)
if WEB_DIST.exists():
    app.mount("/assets", StaticFiles(directory=WEB_DIST / "assets"), name="assets")

    @app.get("/{path:path}")
    def dashboard(path: str):
        return FileResponse(WEB_DIST / "index.html")


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=config.PORT, log_level="warning")

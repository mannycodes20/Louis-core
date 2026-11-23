"""Louis's ears (Whisper speech-to-text) and mouth (Piper text-to-speech). Both run locally."""

import os
import queue
import re
import sys
import threading
from pathlib import Path

import numpy as np
import sounddevice as sd

from .config import COMMAND_MODEL, DATA_DIR, PIPER_VOICE, WAKE_MODEL, WHISPER_DEVICE

SAMPLE_RATE = 16000


def _add_nvidia_dlls():
    """On Windows, let Whisper find the CUDA libraries installed by requirements-gpu.txt."""
    if sys.platform != "win32":
        return
    nvidia = Path(sys.prefix) / "Lib" / "site-packages" / "nvidia"
    for bin_dir in nvidia.glob("*/bin"):
        os.add_dll_directory(str(bin_dir))
        os.environ["PATH"] = str(bin_dir) + os.pathsep + os.environ["PATH"]


class Ears:
    def __init__(self):
        from faster_whisper import WhisperModel

        _add_nvidia_dlls()
        self.wake_model = WhisperModel(WAKE_MODEL, device="cpu", compute_type="int8",
                                       download_root=str(DATA_DIR / "whisper"))
        self.command_model = None
        if WHISPER_DEVICE in ("auto", "cuda"):
            try:
                self.command_model = WhisperModel(COMMAND_MODEL, device="cuda", compute_type="float16",
                                                  download_root=str(DATA_DIR / "whisper"))
                self.command_model.transcribe(np.zeros(SAMPLE_RATE, dtype=np.float32))  # test the GPU works
                print("[louis] Speech recognition on GPU")
            except Exception as err:
                print(f"[louis] GPU speech recognition unavailable, using CPU ({err.__class__.__name__})")
                self.command_model = None
        if self.command_model is None:
            self.command_model = WhisperModel(COMMAND_MODEL, device="cpu", compute_type="int8",
                                              download_root=str(DATA_DIR / "whisper"))

    @staticmethod
    def _run(model, audio: np.ndarray, prompt: str | None = None) -> str:
        segments, _ = model.transcribe(audio, language="en", beam_size=1, vad_filter=False,
                                       initial_prompt=prompt, condition_on_previous_text=False)
        return " ".join(s.text for s in segments).strip()

    def quick(self, audio: np.ndarray) -> str:
        """Fast, rough transcript used only to spot the wake word."""
        return self._run(self.wake_model, audio, prompt="Louis")

    def accurate(self, audio: np.ndarray) -> str:
        return self._run(self.command_model, audio, prompt="Louis")


def _clean_for_speech(text: str) -> str:
    text = re.sub(r"```.*?```", " I've put the code on screen. ", text, flags=re.S)
    text = re.sub(r"https?://\S+", "", text)
    text = re.sub(r"[*_#`>|]", "", text)
    text = re.sub(r"\[(\d+)\]", "", text)
    return re.sub(r"\s+", " ", text).strip()


class Mouth:
    """Speaks sentences one after another on a background thread, so Louis starts talking
    as soon as the first sentence is ready instead of waiting for the whole reply."""

    def __init__(self):
        from piper import PiperVoice
        from piper.download_voices import download_voice

        voice_dir = DATA_DIR / "voices"
        voice_dir.mkdir(exist_ok=True)
        model = voice_dir / f"{PIPER_VOICE}.onnx"
        if not model.exists():
            print(f"[louis] Downloading voice {PIPER_VOICE} (one time)...")
            download_voice(PIPER_VOICE, voice_dir)
        self.voice = PiperVoice.load(model)
        self.queue: queue.Queue[str | None] = queue.Queue()
        self.speaking = threading.Event()
        self._stop = threading.Event()
        threading.Thread(target=self._worker, daemon=True).start()

    def say(self, text: str):
        text = _clean_for_speech(text)
        if text:
            self.speaking.set()
            self.queue.put(text)

    def stop(self):
        """Stop talking now and drop anything queued."""
        self._stop.set()
        while not self.queue.empty():
            try:
                self.queue.get_nowait()
            except queue.Empty:
                break
        sd.stop()

    def _worker(self):
        while True:
            text = self.queue.get()
            self._stop.clear()
            for chunk in self.voice.synthesize(text):
                if self._stop.is_set():
                    break
                sd.play(chunk.audio_int16_array, chunk.sample_rate)
                sd.wait()
            if self.queue.empty():
                self.speaking.clear()

    def wait_until_done(self, timeout: float = 120):
        self.speaking.wait(0.05)
        while self.speaking.is_set() and timeout > 0:
            threading.Event().wait(0.1)
            timeout -= 0.1


class SentenceSplitter:
    """Collects streamed tokens and hands complete sentences to the mouth."""

    def __init__(self, mouth: Mouth):
        self.mouth, self.buffer = mouth, ""

    def feed(self, token: str):
        self.buffer += token
        if self.buffer.count("```") % 2 == 1:  # wait for code blocks to close
            return
        # Don't read code out loud.
        self.buffer = re.sub(r"```.*?```", " I've put the code on screen.\n", self.buffer, flags=re.S)
        while True:
            end = next((m.end() for m in re.finditer(r"[.!?](\s)|\n", self.buffer) if m.end() >= 15), None)
            if end is None:
                return
            self.mouth.say(self.buffer[:end])
            self.buffer = self.buffer[end:]

    def flush(self):
        if self.buffer.strip():
            self.mouth.say(self.buffer)
        self.buffer = ""


def chime():
    """A short rising beep so you know Louis is listening."""
    t = np.linspace(0, 0.18, int(22050 * 0.18), False)
    tone = np.concatenate([np.sin(2 * np.pi * 660 * t[: len(t) // 2]), np.sin(2 * np.pi * 990 * t[len(t) // 2:])])
    fade = np.minimum(1, np.minimum(np.arange(len(tone)), np.arange(len(tone))[::-1]) / 400)
    sd.play((tone * fade * 0.25).astype(np.float32), 22050)
    sd.wait()

"""Always-on listening. Say "Louis" (alone or with a question, e.g. "Louis, what's on my desktop?")."""

import queue
import re
import threading
import time

import numpy as np
import sounddevice as sd

from .config import MIC_SENSITIVITY, WAKE_WORDS
from .voice import SAMPLE_RATE, Ears, chime

BLOCK = 480                 # 30 ms of audio per block
END_SILENCE = 0.8           # seconds of quiet that end a sentence
MAX_UTTERANCE = 15          # seconds
FOLLOW_UP_WINDOW = 8        # seconds to keep listening after "Louis?"
_WAKE_RE = re.compile(r"\b(hey |ok |okay )?(" + "|".join(map(re.escape, WAKE_WORDS)) + r")\b[\s,.!?]*", re.I)


class WakeListener(threading.Thread):
    """Listens to the microphone, spots the wake word, and hands commands to on_command(text)."""

    def __init__(self, ears: Ears, mouth, on_command, on_state):
        super().__init__(daemon=True)
        self.ears, self.mouth = ears, mouth
        self.on_command, self.on_state = on_command, on_state
        self.audio: queue.Queue[np.ndarray] = queue.Queue()
        self.awake_until = 0.0
        self.busy = threading.Event()   # set while Louis is thinking/speaking
        self.noise_floor = 0.005

    def listen_now(self):
        """Called by the dashboard mic button: skip the wake word for the next sentence."""
        self.awake_until = time.time() + FOLLOW_UP_WINDOW
        self.on_state("listening")
        threading.Thread(target=chime, daemon=True).start()

    def _callback(self, indata, frames, t, status):
        self.audio.put(indata[:, 0].copy())

    def _utterances(self):
        """Yield one numpy array per spoken sentence, using a simple loudness detector."""
        speech, silent_for, started = [], 0.0, False
        while True:
            block = self.audio.get()
            if self.busy.is_set() or self.mouth.speaking.is_set():
                speech, started = [], False   # don't listen to ourselves
                continue
            rms = float(np.sqrt(np.mean(block ** 2)))
            loud = rms > max(self.noise_floor * MIC_SENSITIVITY, 0.004)
            if not started:
                self.noise_floor = 0.995 * self.noise_floor + 0.005 * rms   # track background noise
                if loud:
                    started, speech, silent_for = True, [block], 0.0
                continue
            speech.append(block)
            silent_for = 0.0 if loud else silent_for + BLOCK / SAMPLE_RATE
            length = len(speech) * BLOCK / SAMPLE_RATE
            if silent_for >= END_SILENCE or length >= MAX_UTTERANCE:
                if length - silent_for >= 0.3:   # ignore clicks and bumps
                    yield np.concatenate(speech)
                speech, started = [], False

    def run(self):
        with sd.InputStream(samplerate=SAMPLE_RATE, channels=1, dtype="float32",
                            blocksize=BLOCK, callback=self._callback):
            print(f"[louis] Listening for: {', '.join(WAKE_WORDS)}")
            for audio in self._utterances():
                try:
                    self._process(audio)
                except Exception as err:
                    print(f"[louis] Voice error: {err}")
                    self.on_state("idle")

    def _process(self, audio: np.ndarray):
        if time.time() < self.awake_until:
            # We're already awake (after "Louis?" or the mic button): this whole sentence is the command.
            self.awake_until = 0
            self.on_state("processing")
            text = _WAKE_RE.sub("", self.ears.accurate(audio), count=1).strip()
            self._run_command(text)
            return

        heard = self.ears.quick(audio)
        if not _WAKE_RE.search(heard):
            return
        text = self.ears.accurate(audio)
        match = _WAKE_RE.search(text)
        command = text[match.end():].strip() if match else ""
        if len(command.split()) >= 2:
            self.on_state("processing")
            self._run_command(command)
        else:
            self.listen_now()   # just "Louis": beep and wait for the question

    def _run_command(self, text: str):
        if not text:
            self.on_state("idle")
            return
        self.busy.set()
        try:
            self.on_command(text)          # blocks until the reply has been spoken
            self.mouth.wait_until_done()
        finally:
            self.busy.clear()
            self.awake_until = time.time() + 4   # brief window for a follow-up without the name
            self.on_state("idle")

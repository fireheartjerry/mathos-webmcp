"""Restrained music bed and event-locked sound design for the Mathburst film.

Reads the capture timeline and writes two 48 kHz stereo WAV files:

  video/public/film/music.wav   a slow, quiet pad that moves through the acts
  video/public/film/sfx.wav     one soft tick per real commit (graphite for the
                                learner, a softer purple-tinted one for the Tutor)
                                and a low, brief swell under each bridge

Nothing here is looped ambience: every sound is placed at a timestamp the
capture logged, and the bed reaches rest before the final lockup.

    python scripts/film/audio.py
"""
from __future__ import annotations

import json
import math
import sys
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
TIMELINE = ROOT / 'video/public/film/timeline.json'
MANIFEST = ROOT / 'video/film.manifest.json'
CUTLIST = ROOT / 'video/public/film/cutlist.json'
OUT = ROOT / 'video/public/film'
SR = 48_000


def write_wav(path: Path, stereo: np.ndarray, peak_db: float = -6.0) -> None:
    peak = float(np.max(np.abs(stereo))) or 1.0
    stereo = stereo * (10 ** (peak_db / 20)) / peak
    clipped = np.clip(stereo, -1.0, 1.0)
    data = (clipped * 32767).astype('<i2')
    with wave.open(str(path), 'wb') as handle:
        handle.setnchannels(2)
        handle.setsampwidth(2)
        handle.setframerate(SR)
        handle.writeframes(data.tobytes())


def envelope(length: int, attack: float, release: float) -> np.ndarray:
    env = np.ones(length)
    a = min(length, int(attack * SR))
    r = min(length, int(release * SR))
    if a > 0:
        env[:a] = np.linspace(0, 1, a)
    if r > 0:
        env[-r:] = np.minimum(env[-r:], np.linspace(1, 0, r))
    return env


def pad_voice(freq: float, seconds: float, rng: np.random.Generator, detune: float = 0.0015) -> np.ndarray:
    """Three slightly detuned sines with slow amplitude drift. Quiet by design."""
    t = np.arange(int(seconds * SR)) / SR
    out = np.zeros_like(t)
    for k, ratio in enumerate((1 - detune, 1.0, 1 + detune)):
        phase = rng.uniform(0, 2 * math.pi)
        drift = 1 + 0.06 * np.sin(2 * math.pi * (0.05 + 0.02 * k) * t + phase)
        out += np.sin(2 * math.pi * freq * ratio * t + phase) * drift
    # a whisper of the octave keeps it from sounding like a test tone
    out += 0.18 * np.sin(2 * math.pi * freq * 2 * t)
    return out / 3.6


CHORDS = [
    # act boundaries (seconds are read from the timeline; chord order is fixed)
    ('D', [146.83, 220.0, 293.66, 369.99]),      # D major, open
    ('B', [123.47, 185.0, 246.94, 293.66]),      # B minor 7
    ('G', [98.0, 146.83, 196.0, 246.94]),        # G major 7
    ('A', [110.0, 164.81, 220.0, 277.18]),       # A major
    ('D2', [146.83, 220.0, 293.66, 440.0]),      # D major, higher voicing
]


def film_clock(cutlist: dict | None):
    """Map a raw-take timestamp onto the finished film's clock.

    The film is cut: the camera pans between scenes are excised and over-long shot
    tails are capped. Sound design is event-locked, so placing a tick at the time the
    capture logged puts it wherever that moment USED to be -- by the end of this film
    that is about thirty-four seconds adrift, which is a tick landing on nothing.

    Returns a function raw -> film seconds, or None for a moment that was cut out.
    """
    if not cutlist:
        return lambda raw: raw
    spans = cutlist['shots']

    def to_film(raw: float):
        for span in spans:
            if span['srcStart'] <= raw <= span['srcEnd']:
                return span['filmStart'] + (raw - span['srcStart'])
        return None

    return to_film


def music(timeline: dict, seed: int, total: float, to_film) -> np.ndarray:
    rng = np.random.default_rng(seed)
    n = int(total * SR)
    left = np.zeros(n)
    right = np.zeros(n)
    shots = timeline['shots']
    # One chord per two shots, changing on shot starts, resolving on the lockup.
    boundaries = [b for b in (to_film(shots[i]['start']) for i in range(0, len(shots), 3)) if b is not None] + [total]
    boundaries = sorted(set(max(0.0, b) for b in boundaries))
    for index in range(len(boundaries) - 1):
        start, end = boundaries[index], boundaries[index + 1]
        chord = CHORDS[index % len(CHORDS)]
        seconds = end - start + 2.5  # overlap into the next chord
        voice = np.zeros(int(seconds * SR))
        for f in chord[1]:
            voice += pad_voice(f, seconds, rng)
        voice *= envelope(len(voice), attack=1.8, release=2.4)
        s = int(start * SR)
        e = min(n, s + len(voice))
        pan = 0.5 + 0.18 * math.sin(index * 1.3)
        left[s:e] += voice[: e - s] * (1 - pan) * 0.6
        right[s:e] += voice[: e - s] * pan * 0.6
    # Final rest: gentle fade in the last 1.6 s so the lockup lands on silence.
    tail = int(1.6 * SR)
    left[-tail:] *= np.linspace(1, 0, tail)
    right[-tail:] *= np.linspace(1, 0, tail)
    # Low-pass by simple moving average to keep it soft.
    kernel = np.ones(48) / 48
    left = np.convolve(left, kernel, mode='same')
    right = np.convolve(right, kernel, mode='same')
    return np.stack([left, right], axis=1)


def tick(kind: str) -> np.ndarray:
    """A short, dry tick. Learner: wooden and dark. Tutor: glassier, a fifth up."""
    seconds = 0.11 if kind == 'human' else 0.16
    t = np.arange(int(seconds * SR)) / SR
    if kind == 'human':
        body = np.sin(2 * math.pi * 620 * t) * np.exp(-t * 60) + 0.3 * np.sin(2 * math.pi * 1240 * t) * np.exp(-t * 90)
        return body * 0.32
    body = np.sin(2 * math.pi * 932 * t) * np.exp(-t * 32) + 0.35 * np.sin(2 * math.pi * 1398 * t) * np.exp(-t * 48)
    return body * 0.24


def swell(seconds: float = 1.15) -> np.ndarray:
    t = np.arange(int(seconds * SR)) / SR
    env = np.sin(np.pi * t / seconds) ** 2
    return (np.sin(2 * math.pi * 73.4 * t) + 0.5 * np.sin(2 * math.pi * 110 * t)) * env * 0.14


def sfx(timeline: dict, total: float, to_film) -> np.ndarray:
    n = int(total * SR)
    left = np.zeros(n)
    right = np.zeros(n)

    def place(sample: np.ndarray, at: float, pan: float = 0.5) -> None:
        s = int(at * SR)
        if s < 0 or s >= n:
            return
        e = min(n, s + len(sample))
        left[s:e] += sample[: e - s] * (1 - pan) * 1.4
        right[s:e] += sample[: e - s] * pan * 1.4

    for event in timeline['events']:
        at = to_film(event['t'])
        if at is None:
            continue  # this moment was cut out of the film; a tick for it would land on nothing
        if event['kind'] in ('human', 'tutor'):
            place(tick(event['kind']), at, 0.56 if event['kind'] == 'tutor' else 0.44)
        elif event['kind'] == 'bridge':
            place(swell(), at)
    return np.stack([left, right], axis=1)


def main() -> None:
    timeline = json.loads(TIMELINE.read_text(encoding='utf-8'))
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    cutlist = json.loads(CUTLIST.read_text(encoding='utf-8')) if CUTLIST.exists() else None
    to_film = film_clock(cutlist)
    # Generate for the FILM's length, not the raw take's, or the bed runs on past the end.
    total = (float(cutlist['filmSeconds']) if cutlist else float(timeline['seconds'])) + 1.8
    OUT.mkdir(parents=True, exist_ok=True)
    write_wav(OUT / 'music.wav', music(timeline, int(manifest['music'].get('seed', 7)), total, to_film))
    write_wav(OUT / 'sfx.wav', sfx(timeline, total, to_film), peak_db=-12.0)
    kept = sum(1 for e in timeline['events'] if e['kind'] in ('human', 'tutor') and to_film(e['t']) is not None)
    dropped = sum(1 for e in timeline['events'] if e['kind'] in ('human', 'tutor')) - kept
    print(f'wrote music.wav and sfx.wav for {total:.1f}s of FILM time; {kept} commit ticks placed, {dropped} dropped as cut')


if __name__ == '__main__':
    sys.exit(main())

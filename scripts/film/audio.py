"""Original music bed and event-locked sound design for the Mathburst film.

Reads the capture timeline and writes two 48 kHz stereo WAV files:

  video/public/film/music.wav   a warm generative score that moves through the acts
  video/public/film/sfx.wav     one soft tick per real commit (graphite for the
                                learner, a softer purple-tinted one for the Tutor)
                                and a low, brief swell under each bridge

The music is synthesized here from deterministic oscillators: no stock loop or
licensed recording. Commit sounds are placed at measured capture timestamps,
and the score resolves into silence after the closing line.

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
import os
# The Agent Replay take lives in its own directory so the Director film stays
# intact next to it; FILM_DIR selects which one this run scores.
FILM_DIR = os.environ.get('FILM_DIR', 'video/public/film')
TIMELINE = ROOT / FILM_DIR / 'timeline.json'
MANIFEST = ROOT / 'video/film.manifest.json'
CUTLIST = ROOT / FILM_DIR / 'cutlist.json'
OUT = ROOT / FILM_DIR
NARRATION = ROOT / FILM_DIR / 'narration.json'
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


def pad_voice(freq: float, seconds: float, rng: np.random.Generator, detune: float = 0.0018) -> np.ndarray:
    """A warm, gently moving oscillator; richer than a bare sine but still voice-safe."""
    t = np.arange(int(seconds * SR)) / SR
    out = np.zeros_like(t)
    for k, ratio in enumerate((1 - detune, 1.0, 1 + detune)):
        phase = rng.uniform(0, 2 * math.pi)
        drift = 1 + 0.06 * np.sin(2 * math.pi * (0.05 + 0.02 * k) * t + phase)
        fundamental = np.sin(2 * math.pi * freq * ratio * t + phase)
        octave = 0.20 * np.sin(2 * math.pi * freq * 2 * ratio * t + phase * 0.7)
        air = 0.06 * np.sin(2 * math.pi * freq * 3 * ratio * t + phase * 1.3)
        out += (fundamental + octave + air) * drift
    return out / 4.0


CHORDS = [
    # root, open pad voicing, and a small upper-register arpeggio. The progression
    # is intentionally consonant but avoids repeating the exact same inversion.
    ('Dmaj9', 73.42, [110.00, 146.83, 185.00, 220.00, 329.63], [293.66, 369.99, 440.00, 659.25]),
    ('Bm7',   61.74, [92.50, 123.47, 146.83, 185.00, 220.00], [246.94, 293.66, 369.99, 493.88]),
    ('Gmaj9', 49.00, [73.42, 98.00, 123.47, 146.83, 220.00], [196.00, 246.94, 293.66, 440.00]),
    ('Asus4', 55.00, [82.41, 110.00, 146.83, 164.81, 220.00], [220.00, 293.66, 329.63, 440.00]),
    ('Em7',   41.20, [61.74, 82.41, 98.00, 123.47, 146.83], [164.81, 196.00, 246.94, 329.63]),
]

# A long-form harmonic path, not a tiny loop. The last three entries form an audible
# IV–V–I cadence; music() switches to them as it approaches the lockup.
PROGRESSION = [0, 1, 2, 3, 0, 4, 2, 3, 1, 2, 0, 3]


def pluck(freq: float, seconds: float, phase: float) -> np.ndarray:
    t = np.arange(int(seconds * SR)) / SR
    attack = np.minimum(1.0, t / 0.012)
    decay = np.exp(-5.2 * t)
    body = np.sin(2 * math.pi * freq * t + phase)
    body += 0.28 * np.sin(2 * math.pi * freq * 2 * t + phase * 0.6)
    body += 0.08 * np.sin(2 * math.pi * freq * 3 * t + phase * 1.4)
    return body * attack * decay / 1.36


def bass_note(freq: float, seconds: float) -> np.ndarray:
    t = np.arange(int(seconds * SR)) / SR
    attack = np.minimum(1.0, t / 0.045)
    release = np.exp(-2.0 * t)
    return (np.sin(2 * math.pi * freq * t) + 0.14 * np.sin(2 * math.pi * freq * 2 * t)) * attack * release


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


def music(timeline: dict, seed: int, total: float, to_film, cutlist: dict | None = None) -> np.ndarray:
    rng = np.random.default_rng(seed)
    n = int(total * SR)
    pad_l = np.zeros(n)
    pad_r = np.zeros(n)
    detail_l = np.zeros(n)
    detail_r = np.zeros(n)

    def place(target_l: np.ndarray, target_r: np.ndarray, sample: np.ndarray, at: float, gain: float, pan: float) -> None:
        start = max(0, int(at * SR))
        if start >= n:
            return
        end = min(n, start + len(sample))
        width = end - start
        target_l[start:end] += sample[:width] * gain * math.sqrt(1 - pan)
        target_r[start:end] += sample[:width] * gain * math.sqrt(pan)

    # 84 BPM keeps motion under the narration. Two bars per harmony yields roughly
    # thirty genuinely changing chords in a three-minute one-shot film—the old score
    # accidentally produced one chord because it counted edit-list shots.
    beat = 60.0 / 84.0
    chord_seconds = beat * 8
    chord_count = max(1, int(math.ceil(total / chord_seconds)))
    cadence = [2, 3, 0]

    for index in range(chord_count):
        start = index * chord_seconds
        chord_id = cadence[index - (chord_count - len(cadence))] if index >= chord_count - len(cadence) else PROGRESSION[index % len(PROGRESSION)]
        _, root, voicing, arp = CHORDS[chord_id]

        # Cross-faded pad. Lower notes stay centred; upper notes gently widen.
        seconds = min(chord_seconds + 2.3, total - start)
        for voice_index, freq in enumerate(voicing):
            tone = pad_voice(freq, seconds, rng) * envelope(int(seconds * SR), 1.25, 2.15)
            pan = 0.40 + 0.20 * (voice_index / max(1, len(voicing) - 1))
            place(pad_l, pad_r, tone, start, 0.14 / len(voicing), pan)

        # A low downbeat every half-bar gives the picture direction without becoming
        # trailer percussion. It recedes during the opening and closing lockup.
        for local_beat in (0, 4):
            at = start + local_beat * beat
            if at >= total - 5.0:
                continue
            bass = bass_note(root, min(1.65, total - at))
            place(detail_l, detail_r, bass, at, 0.055, 0.5)

        # Sparse eight-note figure: gaps are deliberate so dialogue still owns the
        # midrange. The contour evolves rather than restarting identically each bar.
        contour = (0, 2, 1, 3, 1, 2, 0, 3)
        for pulse in range(16):
            at = start + pulse * beat / 2
            if at < 7.0 or at >= total - 6.0 or pulse % 3 == 2:
                continue
            note = arp[contour[(pulse + index) % len(contour)]]
            sample = pluck(note, min(0.72, total - at), rng.uniform(0, 2 * math.pi))
            pan = 0.34 if (pulse + index) % 2 == 0 else 0.66
            place(detail_l, detail_r, sample, at, 0.032, pan)

    # Smooth only the pad; retaining the pluck transients is what keeps the cue from
    # turning back into featureless ambience.
    kernel = np.ones(36) / 36
    pad_l = np.convolve(pad_l, kernel, mode='same')
    pad_r = np.convolve(pad_r, kernel, mode='same')
    left = pad_l + detail_l
    right = pad_r + detail_r

    # A restrained long-form arc and a full two-and-a-half seconds of resolved air.
    seconds_axis = np.arange(n) / SR
    arc = np.interp(seconds_axis, [0, 7, total * 0.42, total * 0.76, total - 6, total - 2.5, total], [0, 0.72, 0.9, 1.0, 0.82, 0.0, 0.0])
    left *= arc
    right *= arc
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
    # The film ends at the later of the last shot and the last word: the closing line
    # runs past the shot it plays over, and a bed cut to the last shot leaves the final
    # sentence playing dry.
    shots_end = float(cutlist['filmSeconds']) if cutlist else float(timeline['seconds'])
    words_end = 0.0
    if NARRATION.exists():
        clips = json.loads(NARRATION.read_text(encoding='utf-8')).get('clips', [])
        words_end = max((float(c['offset']) + float(c['duration']) for c in clips), default=0.0)
    total = max(shots_end, words_end) + 1.8
    OUT.mkdir(parents=True, exist_ok=True)
    write_wav(OUT / 'music.wav', music(timeline, int(manifest['music'].get('seed', 7)), total, to_film, cutlist))
    write_wav(OUT / 'sfx.wav', sfx(timeline, total, to_film), peak_db=-12.0)
    kept = sum(1 for e in timeline['events'] if e['kind'] in ('human', 'tutor') and to_film(e['t']) is not None)
    dropped = sum(1 for e in timeline['events'] if e['kind'] in ('human', 'tutor')) - kept
    print(f'wrote music.wav and sfx.wav for {total:.1f}s of FILM time; {kept} commit ticks placed, {dropped} dropped as cut')


if __name__ == '__main__':
    sys.exit(main())

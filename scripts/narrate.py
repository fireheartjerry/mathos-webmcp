"""
Builds the narration track from docs/narration.json.

Uses Kokoro-82M, an open-weights model that runs locally on CPU. No API key, no account,
and nothing leaves the machine. The first track used Windows SAPI ("Microsoft Zira
Desktop"), a concatenative voice that sounded like one; the second used Microsoft Edge's
neural voices, which are better but still read as a screen reader.

Each segment is synthesised at its natural rate and then padded to the length its beat
occupies in the picture. Padding rather than time-stretching keeps the speech unhurried,
and the silence lands at the end of a beat, where a viewer is reading the held line.

    python scripts/narrate.py --measure   # spoken vs beat length, writes nothing
    python scripts/narrate.py             # writes video/public/seg00.wav ... seg06.wav
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")

SPEC_PATH = Path("docs/narration.json")
SAMPLE_RATE = 24_000
OUTPUT_RATE = 48_000


def build(measure_only: bool, out_dir: Path) -> int:
    import numpy as np
    import soundfile as sf
    from kokoro import KPipeline

    spec = json.loads(SPEC_PATH.read_text(encoding="utf-8"))
    voice = spec["voice"]
    speed = float(spec.get("speed", 1.0))

    pipeline = KPipeline(lang_code=spec.get("langCode", "a"), repo_id="hexgrad/Kokoro-82M")
    out_dir.mkdir(parents=True, exist_ok=True)
    tmp = Path(".narration-tmp")
    tmp.mkdir(exist_ok=True)

    overruns = 0
    for i, segment in enumerate(spec["segments"]):
        chunks = [audio for _, _, audio in pipeline(segment["text"], voice=voice, speed=speed)]
        audio = np.concatenate(chunks)
        spoken = len(audio) / SAMPLE_RATE
        beat = float(segment["durationSeconds"])
        slack = beat - spoken
        if slack < 0:
            overruns += 1
        print(
            f"{segment['beat']:<12} spoken {spoken:5.1f}s / beat {beat:5.1f}s  "
            + (f"OVER by {-slack:.1f}s" if slack < 0 else f"{slack:.1f}s of room")
        )
        if measure_only:
            continue

        raw = tmp / f"seg{i:02d}.wav"
        sf.write(str(raw), audio, SAMPLE_RATE)
        # Pad to exactly the beat length. `apad` then `atrim` is exact where `-t` is not.
        subprocess.run(
            [
                "ffmpeg", "-v", "error", "-y", "-i", str(raw),
                "-af", f"apad,atrim=0:{beat},aresample={OUTPUT_RATE}",
                "-ac", "1", "-ar", str(OUTPUT_RATE),
                str(out_dir / f"seg{i:02d}.wav"),
            ],
            check=True,
        )

    if overruns:
        print(f"\n{overruns} segment(s) longer than their beat. Shorten the text.", file=sys.stderr)
        return 1
    print("\nmeasured only" if measure_only else f"\nwrote {len(spec['segments'])} files to {out_dir}")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--measure", action="store_true", help="print lengths, write nothing")
    parser.add_argument("--out", default="video/public", help="where the seg*.wav files go")
    args = parser.parse_args()
    sys.exit(build(args.measure, Path(args.out)))

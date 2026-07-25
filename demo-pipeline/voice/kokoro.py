#!/usr/bin/env python3
"""Thin Kokoro-82M synthesis adapter, invoked as a subprocess by demo-pipeline/src/narration.ts's
KokoroVoiceProvider (design doc, "Dependencies": "A project-local Python virtual environment for pinned
Kokoro and audio dependencies. The PoC uses an English preset voice and does not clone a person's voice").

One synthesis call per invocation (see narration.ts's Code Organization note: "kokoro.py is a thin,
single-purpose synthesis script — no unrelated Python logic"). Reads narration text and a preset voice id
from CLI arguments, synthesizes with the pinned local Kokoro-82M model, writes a mono WAV file, and reports
the outcome as exactly one JSON line on stdout:

    success: {"ok": true, "wavPath": "...", "sampleRate": 24000, "voice": "af_heart", "langCode": "a"}
    failure: {"ok": false, "error": "..."}                                    (exit code 1; traceback on stderr)

narration.ts never trusts a duration this script might report (it doesn't report one) — it independently
measures the written WAV's duration and sample rate via ffprobe after this process exits 0. That keeps
"measured duration" meaning what it says: measured by ffprobe, not claimed by the synthesis step.

Arguments are read from argv (spawned via an argument array — see process.ts), never a shell string, so
narration text containing quotes, semicolons, or other shell metacharacters needs no escaping and is never
at risk of being interpreted.
"""
from __future__ import annotations

import argparse
import json
import sys
import traceback
from pathlib import Path

# Guard against a Python self-import-shadowing trap: when this script is invoked as `python3 kokoro.py`,
# CPython inserts the script's OWN directory (demo-pipeline/voice/) as sys.path[0] before running it — a
# long-standing interpreter behavior, not something under this repo's control. That directory contains a
# file also named "kokoro.py" (this one), so `from kokoro import KPipeline` a few lines below would otherwise
# resolve "kokoro" to THIS SCRIPT instead of the real installed `kokoro` PyPI package (site-packages is only
# consulted after sys.path[0]), failing with "cannot import name 'KPipeline' from 'kokoro'" — reproduced and
# confirmed during Task 4's runtime gate. Stripping this script's own directory from sys.path, once, at
# import time, forces "kokoro" to resolve to the real package. The task brief fixes this script's filename
# (it must match what narration.ts's KokoroVoiceProvider invokes), so the fix belongs here, not in a rename.
_SCRIPT_DIR = str(Path(__file__).resolve().parent)
sys.path = [p for p in sys.path if p and str(Path(p).resolve()) != _SCRIPT_DIR]

# Kokoro-82M's model output is a fixed 24 kHz mono waveform (empirically verified against the pinned
# kokoro==0.9.4 / misaki==0.9.4 versions in requirements.txt — see task-4-report.md's runtime gate evidence).
# This is not configurable; it is what sf.write() below is told to write, and what a caller should expect
# ffprobe to independently confirm afterward.
SAMPLE_RATE = 24000

# An English preset voice — no voice cloning, per the design doc's explicit non-goal. "af_heart" is one of
# Kokoro-82M's built-in American-English voice packs, downloaded automatically (once, then cached under
# ~/.cache/huggingface) from the pinned hexgrad/Kokoro-82M model repo the `kokoro` package itself references.
DEFAULT_VOICE = "af_heart"

# misaki's lang_code convention: "a" selects American English g2p/phonemization.
DEFAULT_LANG_CODE = "a"


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Synthesize one narration clip with Kokoro-82M.")
    parser.add_argument("--text", required=True, help="Narration script text to synthesize.")
    parser.add_argument("--voice", default=DEFAULT_VOICE, help="Kokoro preset voice id (default: %(default)s).")
    parser.add_argument(
        "--lang-code",
        default=DEFAULT_LANG_CODE,
        help="Kokoro pipeline language code, e.g. 'a' for American English (default: %(default)s).",
    )
    parser.add_argument("--out", required=True, help="Output WAV path. Parent directories are created if missing.")
    return parser.parse_args(argv)


def synthesize(args: argparse.Namespace) -> dict:
    # Imported lazily, inside the function, so `--help`/argument-parsing errors return instantly without
    # paying Kokoro's ~15-20s import + model-load cost first.
    import numpy as np
    import soundfile as sf
    from kokoro import KPipeline

    if not args.text.strip():
        raise ValueError("--text must not be empty or whitespace-only")

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    pipeline = KPipeline(lang_code=args.lang_code)

    # Kokoro's pipeline call returns a generator that may yield more than one chunk for longer/multi-sentence
    # text (it splits on sentence boundaries internally) — every chunk must be concatenated into one
    # contiguous waveform, not just the first one, or a multi-sentence narration line would be silently
    # truncated to its first sentence.
    chunks = [result.output.audio.numpy() for result in pipeline(args.text, voice=args.voice)]
    if not chunks:
        raise RuntimeError("Kokoro produced no audio chunks for the given text")
    audio = np.concatenate(chunks) if len(chunks) > 1 else chunks[0]

    sf.write(str(out_path), audio, SAMPLE_RATE)

    return {
        "wavPath": str(out_path.resolve()),
        "sampleRate": SAMPLE_RATE,
        "voice": args.voice,
        "langCode": args.lang_code,
    }


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    try:
        result = synthesize(args)
    except Exception as exc:  # noqa: BLE001 - top-level subprocess boundary: every failure must still emit
        # one parseable JSON line on stdout (see module docstring) so narration.ts's KokoroVoiceProvider can
        # report a structured NarrationError instead of just a bare non-zero exit code.
        print(json.dumps({"ok": False, "error": str(exc)}))
        traceback.print_exc(file=sys.stderr)
        return 1

    print(json.dumps({"ok": True, **result}))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))

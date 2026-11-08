"""Tạo tệp âm thanh cho bài học bằng Kokoro (mã nguồn mở, chạy trên máy).

Cách dùng:
    python tools/build_audio.py --models /đường/dẫn/tới/thư-mục-model [--force]

Thư mục model cần hai tệp: kokoro-v1.0.onnx và voices-v1.0.bin, tải từ
https://github.com/thewh1teagle/kokoro-onnx/releases (bản model-files-v1.0).

Mỗi bài học (content/**/*.json) có mục "audio": { id: {text, voice, speed?, ipa?} }.
- "speed" nhỏ hơn 1 (ví dụ 0.85) làm câu chậm lại sau khi tạo, không đổi cao độ.
- Có "ipa" thì công cụ đọc đúng theo phiên âm ấy. Mọi từ dùng để dạy phát âm
  nên có "ipa", vì bộ đoán phiên âm tự động có lúc đọc sai (ví dụ "live" thành /laɪv/).
- Tệp ra: audio/<id bài>/<id âm>.mp3, kèm manifest.json ghi dấu của từng câu.
  Câu nào không đổi chữ, giọng, tốc độ thì lần sau bỏ qua, trừ khi dùng --force.
"""
import argparse
import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
# Đổi số này khi đổi cách tạo âm thanh, để mọi tệp được tạo lại.
PIPELINE = 2


def fingerprint(spec):
    key = json.dumps(
        {"pipeline": PIPELINE, **{k: spec.get(k) for k in ("text", "voice", "speed", "ipa")}},
        sort_keys=True,
    )
    return hashlib.sha1(key.encode("utf-8")).hexdigest()[:12]


def trim(audio, sr, threshold=0.008):
    idx = np.where(np.abs(audio) > threshold)[0]
    if len(idx) == 0:
        return audio
    start = max(idx[0] - int(sr * 0.03), 0)
    end = min(idx[-1] + int(sr * 0.12), len(audio))
    return audio[start:end]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--models", required=True, type=Path)
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    from kokoro_onnx import Kokoro

    kokoro = Kokoro(
        str(args.models / "kokoro-v1.0.onnx"), str(args.models / "voices-v1.0.bin")
    )

    lesson_files = sorted((ROOT / "content").glob("*/*.json"))
    made = skipped = 0
    for path in lesson_files:
        lesson = json.loads(path.read_text(encoding="utf-8"))
        specs = lesson.get("audio", {})
        if not specs:
            continue
        out_dir = ROOT / "audio" / lesson["id"]
        out_dir.mkdir(parents=True, exist_ok=True)
        manifest_path = out_dir / "manifest.json"
        manifest = (
            json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
        )

        for audio_id, spec in specs.items():
            fp = fingerprint(spec)
            target = out_dir / f"{audio_id}.mp3"
            if not args.force and manifest.get(audio_id) == fp and target.exists():
                skipped += 1
                continue
            # Kokoro luôn đọc ở tốc độ thường. Ép nó đọc chậm thì nó chèn một
            # âm hữu thanh trước phụ âm đầu ("seat" thành "a-seat"), nhất là ở từ
            # đứng một mình. Câu nào cần chậm thì kéo chậm sau bằng rubberband,
            # cách này giữ nguyên cao độ và độ sắc của phụ âm.
            source = spec.get("ipa") or spec["text"]
            samples, sr = kokoro.create(
                source, voice=spec["voice"], speed=1.0,
                lang="en-us", is_phonemes=bool(spec.get("ipa")),
            )
            samples = trim(samples, sr)
            tempo = spec.get("speed", 1.0)
            filters = []
            if tempo < 1.0:
                filters = ["-af", f"rubberband=tempo={tempo}:transients=crisp:"
                           "detector=compound:formant=preserved:pitchq=quality"]
            with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
                sf.write(tmp.name, samples, sr)
                subprocess.run(
                    ["ffmpeg", "-loglevel", "error", "-y", "-i", tmp.name, *filters,
                     "-ac", "1", "-b:a", "64k", str(target)],
                    check=True,
                )
            manifest[audio_id] = fp
            made += 1

        # Xóa tệp của những câu không còn trong bài.
        for stale in set(manifest) - set(specs):
            (out_dir / f"{stale}.mp3").unlink(missing_ok=True)
            del manifest[stale]
        manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")

    print(f"Đã tạo {made} tệp, bỏ qua {skipped} tệp không đổi.")


if __name__ == "__main__":
    sys.exit(main())

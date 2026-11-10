"""Kiểm tệp âm thanh của bài học: đo tín hiệu và cho máy nhận dạng Whisper nghe lại.

Cách dùng:
    python tools/check_audio.py --model /đường/dẫn/sherpa-onnx-whisper-small.en [--out báo-cáo.json] [tệp bài...]

Thư mục model tải từ https://github.com/k2-fsa/sherpa-onnx/releases (mục asr-models,
tệp sherpa-onnx-whisper-small.en.tar.bz2). Cần thêm: pip install sherpa-onnx.

Với mỗi tệp, công cụ in: câu trong bài, câu máy nghe ra, thời lượng, đỉnh, độ to,
khoảng lặng đầu và cuối. Dòng mở bằng "!!" là tệp máy nghe ra khác câu trong bài.
Máy nhận dạng hay nghe sai từ đứng riêng, nên dòng "!!" là danh sách tệp cần
người nghe lại, không phải danh sách tệp chắc chắn hỏng.
"""
import argparse, glob, json, re, subprocess, os
from pathlib import Path
import numpy as np, soundfile as sf, sherpa_onnx

ap = argparse.ArgumentParser()
ap.add_argument("--model", required=True)
ap.add_argument("--out")
ap.add_argument("files", nargs="*")
args = ap.parse_args()
ROOT = str(Path(__file__).resolve().parent.parent)
M = args.model
rec = sherpa_onnx.OfflineRecognizer.from_whisper(
    encoder=f"{M}/small.en-encoder.int8.onnx", decoder=f"{M}/small.en-decoder.int8.onnx",
    tokens=f"{M}/small.en-tokens.txt", language="en", num_threads=4)

NUM = {"0": "zero", "1": "one", "2": "two", "3": "three", "4": "four", "5": "five", "6": "six", "7": "seven", "8": "eight", "9": "nine", "10": "ten"}

def norm(s):
    s = s.lower().replace("’", "'")
    s = re.sub(r"\d+", lambda m: " ".join(NUM.get(c, c) for c in m.group()) if len(m.group()) > 2 else NUM.get(m.group(), m.group()), s)
    s = re.sub(r"[^a-z' ]", " ", s)
    s = s.replace("okay", "ok").replace("oh", "o")
    return " ".join(s.split())

def load(path):
    wav = path + ".chk.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", path, "-ac", "1", "-ar", "16000", wav], check=True)
    x, sr = sf.read(wav, dtype="float32"); os.remove(wav)
    return x, sr

def measure(x, sr):
    n = int(0.01 * sr)
    fr = x[: len(x) // n * n].reshape(-1, n)
    rms = np.sqrt((fr ** 2).mean(1) + 1e-12)
    db = 20 * np.log10(rms)
    peak = float(np.abs(x).max())
    loud = db > (db.max() - 35)
    idx = np.where(loud)[0]
    lead = float(idx[0] * 0.01); trail = float((len(db) - 1 - idx[-1]) * 0.01)
    speech = db[idx[0]: idx[-1] + 1]
    # khoảng lặng dài nhất bên trong
    quiet = ~loud[idx[0]: idx[-1] + 1]; best = cur = 0
    for q in quiet:
        cur = cur + 1 if q else 0; best = max(best, cur)
    return dict(dur=round(len(x) / sr, 2), peak=round(peak, 3), rms_db=round(float(np.median(speech)), 1),
                lead=round(lead, 2), trail=round(trail, 2), gap=round(best * 0.01, 2),
                start_db=round(float(db[0] - db.max()), 1), end_db=round(float(db[-1] - db.max()), 1))

def asr(x, sr):
    # đệm lặng hai đầu để Whisper không nuốt âm đầu, âm cuối
    pad = np.zeros(int(0.4 * sr), dtype="float32")
    s = rec.create_stream(); s.accept_waveform(sr, np.concatenate([pad, x, pad])); rec.decode_stream(s)
    return s.result.text.strip()

out = []
files = args.files or sorted(glob.glob(f"{ROOT}/content/**/*.json", recursive=True))
for p in files:
    d = json.load(open(p))
    if not isinstance(d.get("audio"), dict): continue
    lid = d.get("id") or "ipa"
    for aid, spec in d["audio"].items():
        f = f"{ROOT}/audio/{lid}/{aid}.mp3"
        r = dict(lesson=lid, id=aid, text=spec["text"], voice=spec.get("voice"), ipa=spec.get("ipa"), spell=bool(spec.get("spell")), cut=bool(spec.get("cut")), speed=spec.get("speed"))
        if not os.path.exists(f):
            r["missing"] = True; out.append(r); print("MISSING", f); continue
        x, sr = load(f)
        r.update(measure(x, sr)); r["heard"] = asr(x, sr)
        r["ok"] = norm(r["heard"]) == norm(r["text"])
        out.append(r)
        print(("  " if r["ok"] else "!!"), lid, aid, "|", spec["text"], "|", r["heard"], "|", r["dur"], r["peak"], r["rms_db"], r["lead"], r["trail"], r["gap"], r["start_db"], r["end_db"], flush=True)
if args.out:
    json.dump(out, open(args.out, "w"), ensure_ascii=False, indent=1)
print(f"{sum(1 for r in out if r.get('ok'))}/{len(out)} tệp máy nghe ra đúng câu trong bài.")

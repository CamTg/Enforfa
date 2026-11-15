"""Chọn giọng đọc cho từng từ đứng riêng, rồi ghi kết quả vào soan/giong.json.

Giọng máy có lúc đọc sai một từ đứng riêng. Công cụ này tạo thử từ ấy bằng nhiều
giọng và nhiều cách, cho máy nhận dạng Whisper nghe lại, và giữ những bản máy nghe
ra đúng từ. Từ nào không giọng nào đạt thì in ra với dấu "!!" để người nghe lại.

    python soan/chon_giong.py --model /đường/dẫn/sherpa-onnx-whisper-small.en [--models ~/tts/models]

Công cụ đọc các từ đứng riêng trong content/*/*.json, nên chạy sau soan/soan.py.
Cần: kokoro-onnx, sherpa-onnx, pocketsphinx, ffmpeg.
"""
import argparse, glob, json, os, re, subprocess, sys
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("--model", required=True)
ap.add_argument("--models", default=os.path.expanduser("~/tts/models"))
args = ap.parse_args()
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "tools"))
import build_audio as B
from kokoro_onnx import Kokoro
import sherpa_onnx
M = args.model
rec = sherpa_onnx.OfflineRecognizer.from_whisper(encoder=f"{M}/small.en-encoder.int8.onnx", decoder=f"{M}/small.en-decoder.int8.onnx", tokens=f"{M}/small.en-tokens.txt", language="en", num_threads=4)
k = Kokoro(os.path.join(args.models, "kokoro-v1.0.onnx"), os.path.join(args.models, "voices-v1.0.bin"))
def asr(x,sr):
    pcm=subprocess.run(["ffmpeg","-loglevel","error","-f","f32le","-ar",str(sr),"-ac","1","-i","-","-ar","16000","-f","f32le","-"],input=x.astype("float32").tobytes(),capture_output=True,check=True).stdout
    y=np.frombuffer(pcm,dtype="float32"); pad=np.zeros(6400,dtype="float32")
    s=rec.create_stream(); s.accept_waveform(16000,np.concatenate([pad,y,pad])); rec.decode_stream(s); return s.result.text.strip()
HOMO={"e":["e","ee"],"b":["b","be","bee"],"c":["c","see","sea"],"d":["d","dee"],"g":["g","gee","ji"],"p":["p","pee","pea"],"t":["t","tea","tee"],"v":["v","vee"],"z":["z","zee"],"a":["a","eh","ay"],
"f":["f","ef"],"h":["h","age","aitch"],"i":["i","eye","aye"],"j":["j","jay"],"k":["k","kay","okay"],"l":["l","el","elle"],"m":["m","em"],"n":["n","en","and","an"],"o":["o","oh"],"q":["q","queue","cue"],"r":["r","are"],"s":["s","es","as"],"u":["u","you"],"w":["w","doubleu"],"x":["x","ex"],"y":["y","why"],
"six":["six","6"],"fill":["fill","phil"],"no":["no","know"],"we":["we","wee"],"two":["two","to","too","2"],"zero":["zero","0"],"one":["one","1","won"],"three":["three","3"],"four":["four","4","for"],"five":["five","5"],"seven":["seven","7"],"eight":["eight","8","ate"],"nine":["nine","9"],"ten":["ten","10"],"oh":["oh","o"],
"see":["see","sea","c"],"your":["your","you're","yore"],"bye":["bye","by","buy"],"hi":["hi","high"],"too":["too","to","two","2"],"june":["june"],"check":["check","cheque"],"feel":["feel"],"seat":["seat"],"meet":["meet","meat"],"right":["right","write"],"son":["son","sun"],"where":["where","wear"],"there":["there","their"],"day":["day"],"call":["call"],"boy":["boy"],"father":["father"],"ok":["ok","okay"]}
def ok(w,h):
    h=re.sub(r"[^a-z0-9]","",h.lower()); w=re.sub(r"[^a-z0-9]","",w.lower()); return h in HOMO.get(w,[w])

cache={}
def attempt(word,ipa,voice,mode):
    key=(word,ipa,voice,mode)
    if key in cache: return cache[key]
    try:
        if mode=='word': x,sr=B.say_word(k,ipa,voice)
        else: x,sr=B.cut_from_carrier(k,ipa,re.sub(r"[^a-z]","",word.lower()),voice,mode)
        h=asr(x,sr); good=ok(word,h) and 0.15<len(x)/sr<1.3
    except Exception as e:
        h='ERR '+str(e)[:40]; good=False
    cache[key]=(good,h); return cache[key]
MAIN=[('af_bella','word'),('af_sarah','word'),('af_heart','word'),('af_bella','please'),('af_bella','okay'),('af_heart','please'),('am_michael','word'),('am_adam','word'),('am_fenrir','word'),('am_michael','please')]
EXTRA=[('am_michael','word'),('af_sarah','word'),('am_adam','word'),('af_heart','word'),('am_fenrir','word'),('am_michael','please'),('af_heart','please')]
def choose(word,ipa,first=None,vary=False):
    order=([first] if first else [])+[m for m in MAIN if m!=first]
    tried=[]; main=None
    for v,m in order:
        good,h=attempt(word,ipa,v,m); tried.append(f"{v}/{m}:{h}")
        if good: main=(v,m); break
    res={"main":main or order[0],"ok":bool(main),"tried":tried,"extra":[]}
    if vary:
        for v,m in EXTRA:
            if (v,m)==res["main"] or v==res["main"][0]: continue
            if any(v==e[0] for e in res["extra"]): continue
            good,h=attempt(word,ipa,v,m); 
            if good: res["extra"].append((v,m))
            else: res["tried"].append(f"x {v}/{m}:{h}")
            if len(res["extra"])==3: break
    return res
words={}  # (text,ipa) -> {first, vary}
pieces={} # ipa -> name
LET={"ˈeɪ":"A","bˈiː":"B","sˈiː":"C","dˈiː":"D","ˈiː":"E","ˈɛf":"F","dʒˈiː":"G","ˈeɪtʃ":"H","ˈaɪ":"I","dʒˈeɪ":"J","kˈeɪ":"K","ˈɛl":"L","ˈɛm":"M","ˈɛn":"N","ˈoʊ":"O","pˈiː":"P","kjˈuː":"Q","ˈɑːɹ":"R","ˈɛs":"S","tˈiː":"T","jˈuː":"U","vˈiː":"V","dˈʌbəljuː":"W","ˈɛks":"X","wˈaɪ":"Y","zˈiː":"Z"}
seqs=[]
for p in sorted(glob.glob(f'{ROOT}/content/*/*.json')):
    d=json.load(open(p))
    for id,spec in (d.get('audio') or {}).items():
        mode=B.word_mode(spec)
        if mode:
            key=(spec['text'].strip().rstrip('.'),spec['ipa'].strip().rstrip('.,!?'))
            w=words.setdefault(key,{"first":None,"vary":False,"uses":[]})
            if spec.get('cut') and spec['voice']=='af_heart': w["first"]=('af_heart','please')
            if '__' in id or any(k.startswith(id+'__') for k in d['audio']): w["vary"]=True
            w["uses"].append(f"{d.get('id','ipa')}/{id}")
        elif spec.get('spell'):
            seqs.append((d.get('id','ipa'),id,spec))
out={"words":{}, "pieces":{}}
for (text,ipa),w in words.items():
    r=choose(text,ipa,w["first"],w["vary"]); out["words"][f"{text}|{ipa}"]={**r,"uses":w["uses"]}
    print(('  ' if r["ok"] else '!!'),text,ipa,r["main"],r["extra"],'' if r["ok"] else r["tried"],flush=True)
path = os.path.join(HERE, "giong.json")
old = json.load(open(path)) if os.path.exists(path) else {}
old.update({key: {"main": r["main"], "extra": r["extra"]} for key, r in out["words"].items()})
with open(path, "w") as f:
    json.dump(dict(sorted(old.items())), f, ensure_ascii=False, indent=1); f.write("\n")
print(f"Đã ghi {len(out['words'])} từ vào soan/giong.json.")

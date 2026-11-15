"""Khung soạn bài: mỗi tệp soan/<tuần>/l<n>.py dựng một bài rồi ghi ra content/<tuần>/l<n>.json.

Chạy cả tuần: python soan/soan.py w2
"""
import json, os, re
LAN, MINH, STAFF, BOSS = "af_heart", "am_michael", "af_jessica", "am_adam"
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
SPEAKERS = {
    "doc": {"name": "", "voice": LAN},
    "lan": {"name": "Lan", "voice": LAN},
    "minh": {"name": "Minh", "voice": MINH},
    "staff": {"name": "Nhân viên", "voice": STAFF},
    "boss": {"name": "Quản lý", "voice": BOSS},
}
VOICE_OF = {k: v["voice"] for k, v in SPEAKERS.items()}

# Phiên âm (theo bộ ký hiệu của Kokoro) của các từ đứng riêng. Điền tay, đã soát.
IPA = json.load(open(os.path.join(HERE, "ipa.json")))
# Giọng đọc từ đứng riêng: giọng chính và các giọng phụ cho câu luyện nghe nhiều giọng.
# Tệp này do soan/chon_giong.py tạo: đó là những bản mà máy nhận dạng nghe ra đúng từ.
SELECT = json.load(open(os.path.join(HERE, "giong.json")))
# Phiên âm của những câu có tên Lan, Minh, Nguyen, để máy đọc tên theo cách đã chọn ở tuần 1.
TEN_PATH = os.path.join(HERE, "ten.json")
TEN = json.load(open(TEN_PATH))
NAME = re.compile(r"\b(Lan|Nguyen|Minh)\b")


def name_ipa(text):
    """Phiên âm một câu có tên riêng. Câu mới thì cần Kokoro để tạo, rồi được ghi vào ten.json."""
    if text not in TEN:
        try:
            from kokoro_onnx import Kokoro
        except ImportError:
            raise SystemExit(f"Câu {text!r} có tên riêng mà chưa có trong soan/ten.json. Cài kokoro-onnx rồi chạy lại.")
        models = os.environ.get("ENFORFA_MODELS", os.path.expanduser("~/tts/models"))
        k = Kokoro(os.path.join(models, "kokoro-v1.0.onnx"), os.path.join(models, "voices-v1.0.bin"))
        spoken = NAME.sub(lambda m: {"Lan": "Lahn", "Nguyen": "Win", "Minh": "Min"}[m.group()], text)
        TEN[text] = k.tokenizer.phonemize(spoken, "en-us").replace("wˈɪn", "ŋwˈɪn")
        with open(TEN_PATH, "w") as f:
            json.dump(TEN, f, ensure_ascii=False, indent=1); f.write("\n")
    return TEN[text]


class Lesson:
    def __init__(self, id, title, goal, speakers, realTask, canDo, listenNote=None):
        self.d = {"id": id, "title": title, "goal": goal,
                  "speakers": {k: SPEAKERS[k] for k in speakers}}
        if listenNote: self.d["listenNote"] = listenNote
        self.audio = {}
        self.parts = []
        self.cards = []
        self.canDo = canDo
        self.realTask = realTask

    # ---- âm thanh ----
    def say(self, id, text, who="lan", **kw):
        """Một câu hay cụm từ."""
        self.audio[id] = {"text": text, "voice": VOICE_OF.get(who, who), **kw}
        return id

    def word(self, id, text=None, vary=False):
        """Một từ đứng riêng, đọc theo phiên âm. vary=True thì tạo thêm bản của các giọng khác.

        Giọng và cách tạo của từng từ lấy từ select.json: đó là những bản mà máy
        nhận dạng nghe ra đúng từ.
        """
        text = text or id
        ipa = IPA[text.lower()]
        r = SELECT.get(f"{text}|{ipa}") or {"main": ["af_bella", "word"], "extra": [["am_michael", "word"]]}
        def spec(v, m):
            d = {"text": text, "voice": v, "ipa": ipa + "."}
            if m != "word": d["cut"] = True if m == "please" else m
            return d
        self.audio[id] = spec(*r["main"])
        if vary:
            for n, (v, m) in enumerate(r["extra"], start=2):
                self.audio[f"{id}__{n}"] = spec(v, m)
        return id

    def pair(self, id, a, b, voice=None):
        """Hai từ đọc xen kẽ A, B, A, B, bằng giọng đọc rõ từ thứ nhất."""
        def rec(w):
            ipa = IPA[w.lower()]
            return ipa, (SELECT.get(f"{w}|{ipa}") or {"main": ["af_bella", "word"]})["main"]
        (ia, (va, ma)), (ib, (vb, mb)) = rec(a), rec(b)
        pa = ia + "." if ma == "word" else {"ipa": ia, "word": a.lower(), "cut": ma}
        pb = ib + "." if (mb == "word" or vb != va) else {"ipa": ib, "word": b.lower(), "cut": mb}
        self.audio[id] = {"text": f"{a}, {b}, {a}, {b}.", "voice": va, "spell": [pa, pb, pa, pb], "gap": 0.45}
        if voice:  # một giọng đọc rõ cả hai từ ở dạng đứng riêng
            self.audio[id].update(voice=voice, spell=[ia + ".", ib + ".", ia + ".", ib + "."])
        return id

    # ---- phần và bước ----
    def part(self, id, title, steps):
        self.parts.append({"id": id, "title": title, "steps": [s for s in steps if s]})

    def card(self, id, en, vi, audio):
        self.cards.append({"id": id, "en": en, "vi": vi, "audio": audio})

    def dialogue(self, prefix, lines):
        """lines: (speaker, audio_id, text, [(en, vi)...], vi_full). Tạo âm thanh và ba lượt nghe."""
        for s, a, text, _, _ in lines:
            self.say(a, text, s)
        p1 = {"type": "listen", "pass": 1, "title": f"{prefix}, lượt 1: nghĩa từng cụm",
              "lines": [{"speaker": s, "audio": a, "chunks": [{"en": en, "vi": vi} for en, vi in ch]} for s, a, _, ch, _ in lines]}
        p2 = {"type": "listen", "pass": 2, "title": f"{prefix}, lượt 2: cả câu",
              "lines": [{"speaker": s, "audio": a, "vi": full} for s, a, _, _, full in lines]}
        p3 = {"type": "listen", "pass": 3, "title": f"{prefix}, lượt 3: chỉ nghe",
              "lines": [{"speaker": s, "audio": a} for s, a, _, _, _ in lines]}
        for s, a, text, ch, _ in lines:
            joined = " ".join(en for en, _ in ch)
            assert joined == text, (joined, text)
        return [p1, p2, p3]

    def save(self):
        d = self.d
        d["audio"] = self.audio; d["parts"] = self.parts; d["cards"] = self.cards
        d["canDo"] = self.canDo; d["realTask"] = self.realTask
        w, l = d["id"].split("-")
        os.makedirs(os.path.join(REPO, "content", w), exist_ok=True)
        path = os.path.join(REPO, "content", w, f"{l}.json")
        used = set()
        def walk(x):
            if isinstance(x, dict):
                for k, v in x.items():
                    if k in ("audio", "model", "ask") and isinstance(v, str): used.add(v)
                    elif k == "audio" and isinstance(v, list): used.update(v)
                    else: walk(v)
            elif isinstance(x, list):
                for v in x: walk(v)
            elif isinstance(x, str):
                used.update(re.findall(r"\{\{(\w+)", x))
        walk({k: v for k, v in d.items() if k != "audio"})
        missing = used - set(self.audio)
        assert not missing, (d["id"], missing)
        unused = sorted(a for a in set(self.audio) - used if "__" not in a)
        for a in unused:  # bỏ tệp không dùng, kể cả các bản giọng khác của nó
            for k in [k for k in self.audio if k == a or k.startswith(a + "__")]:
                del self.audio[k]
        # thẻ từ: mã không trùng, review trỏ tới thẻ có thật thì kiểm ở check.py
        ids = [c["id"] for c in self.cards]; assert len(ids) == len(set(ids)), ids
        for spec in self.audio.values():
            if "ipa" not in spec and "spell" not in spec and NAME.search(spec["text"]):
                spec["ipa"] = name_ipa(spec["text"])
        with open(path, "w") as f:
            json.dump(d, f, ensure_ascii=False, indent=2); f.write("\n")
        print(d["id"], "bước", sum(len(p["steps"]) for p in self.parts), "âm", len(self.audio), "thẻ", len(self.cards), "không dùng", unused)


def text(title, *body):
    d = {"type": "text", "body": list(body)}
    if title: d = {"type": "text", "title": title, "body": list(body)}
    return d

def choose(prompt, options, correct, audio=None, explain=None, review=None, row=False, vary=False):
    d = {"type": "choose", "prompt": prompt}
    if audio: d["audio"] = audio
    if row: d["layout"] = "row"
    d["options"] = [({"text": o, "correct": True} if i == correct else {"text": o}) for i, o in enumerate(options)]
    if explain: d["explain"] = explain
    if review: d["review"] = review
    if vary: d["vary"] = True
    return d

def choose_audio(prompt, options, correct, explain=None, review=None):
    """Mỗi lựa chọn là một bản đọc để nghe."""
    d = {"type": "choose", "prompt": prompt,
         "options": [({"label": lab, "audio": a, "correct": True} if i == correct else {"label": lab, "audio": a}) for i, (lab, a) in enumerate(options)]}
    if explain: d["explain"] = explain
    if review: d["review"] = review
    return d

def order(prompt, words, answer, audio, gloss, review=None):
    d = {"type": "order", "prompt": prompt, "words": words, "answer": answer, "audio": audio, "gloss": gloss}
    if review: d["review"] = review
    return d

def speak(id, prompt, model, say, ask=None, focus=None, check=None):
    d = {"type": "speak", "id": id, "prompt": prompt}
    if ask: d["ask"] = ask
    d["model"] = model; d["say"] = say
    if focus: d["focus"] = focus
    if check is not None: d["check"] = check
    return d

def dictation(audio, answer, prompt="Nghe câu dưới đây rồi gõ lại.", review=None, vary=False):
    d = {"type": "write", "mode": "dictation", "prompt": prompt, "audio": audio, "answer": answer}
    if review: d["review"] = review
    if vary: d["vary"] = True
    return d

def quick(id, context, items, seconds=4):
    """Đáp nhanh. items: (câu hỏi, câu trả lời mẫu, chữ của câu trả lời, [thẻ ôn], [ghi chú về câu hỏi])."""
    out = []
    for it in items:
        ask, model, say = it[:3]
        d = {"ask": ask, "model": model, "say": say}
        if len(it) > 3 and it[3]: d["review"] = it[3]
        if len(it) > 4 and it[4]: d["askVi"] = it[4]
        out.append(d)
    return {"type": "quick", "id": id, "prompt": "Đáp nhanh", "context": context, "seconds": seconds, "items": out}

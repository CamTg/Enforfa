import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from common import *

L = Lesson(
    "w2-l2", "Âm cuối của từ",
    "Hết bài này, bạn đọc đủ những âm cuối tiếng Việt không có, như /s/, /z/, /l/, /v/, /d/, /ɡ/, và nghe ra bed với bet, bag với back.",
    ["doc", "lan", "minh"],
    listenNote="Một đoạn hội thoại ngắn nghe ba lượt, và mười tám từ xếp theo âm cuối",
    realTask="Hôm nay, mỗi lần nói yes, thanks hay please với ai, bạn để ý đọc đủ âm cuối: tiếng xì của yes và thanks, tiếng xì có rung của please.",
    canDo=["Đọc đủ âm cuối của những từ như bus, please, call, five.", "Nghe ra bed với bet, bag với back.", "Hỏi một vật có phải của người kia không bằng Is this your…?"],
)

dlg = L.dialogue("Của ai đây", [
    ("minh", "d1", "Is this your bag?", [("Is this", "đây có phải là"), ("your bag?", "túi của bạn không?")], "Đây có phải túi của bạn không?"),
    ("lan", "d2", "Yes, it is. Thanks!", [("Yes,", "phải,"), ("it is.", "đúng vậy."), ("Thanks!", "cảm ơn!")], "Phải rồi. Cảm ơn!"),
    ("minh", "d3", "And this card?", [("And", "còn"), ("this card?", "cái thẻ này?")], "Còn cái thẻ này?"),
    ("lan", "d4", "Yes. Thank you!", [("Yes.", "phải."), ("Thank you!", "cảm ơn bạn!")], "Phải. Cảm ơn bạn!"),
])

GROUPS = [
    ("/s/", [("bus", "/bʌs/ · xe buýt"), ("yes", "/jɛs/ · vâng, có"), ("nice", "/naɪs/ · tốt, đẹp"), ("this", "/ðɪs/ · cái này")]),
    ("/z/", [("is", "/ɪz/ · là"), ("please", "/pliːz/ · làm ơn"), ("keys", "/kiːz/ · những chiếc chìa khóa")]),
    ("/l/", [("call", "/kɔːl/ · gọi điện"), ("school", "/skuːl/ · trường học"), ("feel", "/fiːl/ · cảm thấy")]),
    ("/v/", [("five", "/faɪv/ · số năm"), ("live", "/lɪv/ · sống"), ("give", "/ɡɪv/ · đưa, cho")]),
    ("/d/", [("bed", "/bɛd/ · giường"), ("card", "/kɑːrd/ · thẻ"), ("good", "/ɡʊd/ · tốt")]),
    ("/ɡ/", [("bag", "/bæɡ/ · túi"), ("big", "/bɪɡ/ · to")]),
]
PAIRS = [("bed", "bet"), ("bag", "back"), ("card", "cart")]
for _, ws in GROUPS:
    for w, _ in ws:
        L.word(w, vary=w in ("bed", "bag", "card"))
for a, b in PAIRS:
    L.word(b, vary=True)
    L.pair(f"p_{a}", a, b)

def wordlist(title, groups):
    return {"type": "listen", "pass": 1, "title": title, "layout": "list",
            "lines": [{"speaker": "doc", "audio": w, "chunks": [{"en": w, "vi": f"{vi}", "audio": w}]} for _, ws in groups for w, vi in ws]}

L.part("nghe", "Nghe", [
    text("Âm cuối", "Bạn nghe một đoạn hội thoại ngắn giữa Minh và Lan ba lượt, rồi nghe các từ của bài xếp theo âm cuối. Khi nghe, bạn để ý âm đứng cuối mỗi từ."),
    *dlg,
    wordlist("Âm cuối /s/, /z/ và /l/", GROUPS[:3]),
    wordlist("Âm cuối /v/, /d/ và /ɡ/", GROUPS[3:]),
])

L.say("is_it_a_bag", "Is it a bag?", "lan", contour="rise")
L.say("is_this_your_bag", "Is this your bag?", "minh", contour="rise")
L.say("is_this_your", "Is this your card?", "minh", contour="rise")
L.word("your")
L.part("hoc", "Học", [
    text("Vì sao người Việt hay bỏ âm cuối",
         "Âm tiết tiếng Việt chỉ kết thúc bằng một số ít âm, như m, n, ng, p, t, c, hay i, o, u. Tiếng Anh có nhiều âm cuối hơn, nên người Việt hay bỏ mất âm cuối hoặc đọc nó thành âm gần nhất trong tiếng Việt.",
         "Người nói tiếng Anh dựa vào âm cuối để nhận ra từ. Thiếu âm cuối thì họ dễ nghe nhầm sang từ khác."),
    text("/s/ và /z/",
         "Với /s/, bạn giữ tiếng xì ở cuối từ cho đến khi nghe rõ: {{bus}}, {{yes}}, {{nice}}.",
         "/z/ giống /s/ nhưng có rung ở cổ họng: {{please}}, {{is}}, {{keys}}. Bạn đặt tay lên cổ khi đọc để thấy chỗ rung."),
    text("/l/",
         "Với /l/ cuối từ, đầu lưỡi chạm lợi trên và giữ ở đó một chút: {{call}}, {{school}}, {{feel}}.",
         "Tiếng Việt không có âm l ở cuối, nên người Việt hay đọc call gần như \"co\". Bạn nhớ đưa lưỡi lên."),
    text("/v/",
         "Với /v/, răng trên chạm môi dưới, và bạn giữ cho âm rung: {{five}}, {{live}}, {{give}}. Bạn đã gặp âm này ở số five trong tuần 1."),
    text("/d/ và /ɡ/",
         "Người Mỹ thường không bật mạnh âm cuối, nên bed và bet, bag và back khác nhau chủ yếu ở độ dài của nguyên âm: nguyên âm trước /d/, /ɡ/ đọc dài hơn.",
         "Bạn nghe liền từng cặp: {{p_bed}} {{p_bag}} {{p_card}}"),
    text("Nối âm giúp giữ âm cuối",
         "Khi từ sau bắt đầu bằng một nguyên âm, âm cuối nối sang từ ấy và nghe rõ hơn: {{is_it_a_bag|Có phải cái túi không?}}",
         "Nối âm là cách dễ nhất để khỏi nuốt âm cuối."),
    text("Is this your…?",
         "{{is_this_your_bag|Đây có phải túi của bạn không?}} hỏi một vật có phải của người kia không. {{your}} nghĩa là \"của bạn\".",
         "Người kia đáp Yes, it is hoặc No, it isn't như ở bài 1."),
])

L.say("its_a_bag", "It's a bag.", "lan")
L.say("its_a_bag__2", "It's a bag.", "minh")
L.say("its_a_bag__3", "It's a bag.", "staff")
L.part("luyen", "Luyện", [
    text("Nhiều giọng đọc", "Ở các câu dưới đây, mỗi lần bạn sẽ nghe một giọng đọc khác nhau, giọng nam hoặc giọng nữ. Ngoài đời bạn cũng nghe nhiều người nói, nên luyện với nhiều giọng giúp tai quen nhanh hơn."),
    choose("Nghe một từ rồi chọn từ bạn vừa nghe.", ["bed", "bet"], 0, audio="bed", row=True, vary=True, explain="bed có nguyên âm dài hơn, vì đứng trước /d/.", review=["w2-l2/bed"]),
    choose("Nghe một từ rồi chọn từ bạn vừa nghe.", ["bag", "back"], 1, audio="back", row=True, vary=True, explain="back có nguyên âm ngắn hơn và kết thúc bằng /k/.", review=["w2-l2/bag"]),
    choose("Nghe một từ rồi chọn từ bạn vừa nghe.", ["card", "cart"], 0, audio="card", row=True, vary=True, explain="card có nguyên âm dài hơn, vì đứng trước /d/.", review=["w2-l2/card"]),
    choose("Nghe một từ rồi chọn từ bạn vừa nghe.", ["bed", "bet"], 1, audio="bet", row=True, vary=True, explain="bet có nguyên âm ngắn hơn và kết thúc bằng /t/.", review=["w2-l2/bed"]),
    choose("Nghe hai từ. Hai từ giống nhau hay khác nhau?", ["Giống", "Khác"], 1, audio=["bag", "back"], row=True, vary=True, explain="Từ đầu là bag, từ sau là back."),
    choose("Nghe hai từ. Hai từ giống nhau hay khác nhau?", ["Giống", "Khác"], 0, audio=["card", "card"], row=True, vary=True, explain="Cả hai lần đều là card."),
    choose("Nghe hai từ. Hai từ giống nhau hay khác nhau?", ["Giống", "Khác"], 1, audio=["bet", "bed"], row=True, vary=True, explain="Từ đầu là bet, từ sau là bed."),
    choose("Nghe câu dưới đây. Trong câu có từ bag hay back?", ["bag", "back"], 0, audio="its_a_bag", row=True, vary=True, explain="Câu ấy là It's a bag.", review=["w2-l2/bag"]),
])

L.say("m_s", "bus, yes, nice, this.", "lan")
L.say("m_z", "is, please, keys.", "lan")
L.say("m_l", "call, school, feel.", "lan")
L.say("m_v", "five, live, give.", "lan")
L.say("m_dg", "bed, card, good, bag, big.", "lan")
L.say("m_q", "Is this your bag?", "lan", contour="rise")
L.say("m_a", "Yes, it is. Thanks!", "lan")
L.part("noi", "Nói", [
    text(None, "Bạn đọc từng nhóm từ theo mẫu, thu âm lại, rồi nghe bản thu. Mỗi nhóm có một điểm cần chú ý khi nghe lại."),
    speak("s", "Đọc nhóm từ có âm cuối /s/.", "m_s", "bus, yes, nice, this", focus="Nghe xem cuối mỗi từ có tiếng xì không.", check=False),
    speak("z", "Đọc nhóm từ có âm cuối /z/.", "m_z", "is, please, keys", focus="Nghe xem tiếng xì ở cuối có rung không.", check=False),
    speak("l", "Đọc nhóm từ có âm cuối /l/.", "m_l", "call, school, feel", focus="Nghe xem cuối mỗi từ có âm l không, hay từ kết thúc bằng nguyên âm.", check=False),
    speak("v", "Đọc nhóm từ có âm cuối /v/.", "m_v", "five, live, give", focus="Nghe xem cuối mỗi từ có âm /v/ rung không.", check=False),
    speak("dg", "Đọc nhóm từ có âm cuối /d/ và /ɡ/.", "m_dg", "bed, card, good, bag, big", focus="Nghe xem nguyên âm của bed và bag có dài hơn bet và back không.", check=False),
    speak("q", "Hỏi xem cái túi có phải của người kia không.", "m_q", "Is this your bag?", focus="Nghe xem âm s của Is và this có rõ không."),
    speak("a", "Đáp rằng đúng, và cảm ơn.", "m_a", "Yes, it is. Thanks!", focus="Nghe xem cuối Thanks có tiếng xì không."),
])

L.say("w3", "Is this your bag?", "minh", contour="rise")
L.part("viet", "Viết", [
    dictation("bed", "bed", prompt="Nghe một từ rồi gõ lại.", review=["w2-l2/bed"], vary=True),
    dictation("back", "back", prompt="Nghe một từ rồi gõ lại.", review=["w2-l2/bag"], vary=True),
    dictation("w3", "Is this your bag?", review=["w2-l2/is-this-your"]),
])

for id, en, vi, a in [
    ("bag", "bag", "túi /bæɡ/", "bag"), ("bed", "bed", "giường /bɛd/", "bed"), ("card", "card", "thẻ /kɑːrd/", "card"),
    ("call", "call", "gọi điện /kɔːl/", "call"), ("school", "school", "trường học /skuːl/", "school"), ("please", "please", "làm ơn /pliːz/", "please"),
    ("your", "your", "của bạn", "your"), ("is-this-your", "Is this your card?", "Đây có phải thẻ của bạn không?", "is_this_your"), ("thanks", "Yes, it is. Thanks!", "Phải rồi. Cảm ơn!", "d2"),
]:
    L.card(id, en, vi, a)
L.save()

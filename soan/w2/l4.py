import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from common import *

L = Lesson(
    "w2-l4", "Ba âm /ʃ/, /tʃ/, /dʒ/",
    "Hết bài này, bạn nghe ra và đọc được ba âm /ʃ/, /tʃ/, /dʒ/ trong những từ thường gặp như she, lunch, job, phân biệt được ship với chip, she với see, và nhận ra âm /ʒ/ khi gặp.",
    ["doc", "lan", "minh"],
    listenNote="Một đoạn hội thoại giờ nghỉ trưa nghe ba lượt, và mười hai từ có các âm mới",
    realTask="Hôm nay, vào giờ nghỉ trưa, bạn hỏi một đồng nghiệp Is it lunchtime? và để ý âm /tʃ/ ở giữa chữ lunchtime.",
    canDo=["Nghe ra và đọc được /ʃ/, /tʃ/, /dʒ/ trong she, lunch, job.", "Phân biệt được ship với chip, she với see.", "Nhận ra âm /ʒ/ trong usually."],
)

dlg = L.dialogue("Giờ nghỉ trưa", [
    ("minh", "d1", "Is it lunchtime?", [("Is it", "đã đến"), ("lunchtime?", "giờ ăn trưa chưa?")], "Đến giờ ăn trưa chưa?"),
    ("lan", "d2", "Yes, it is. Do you have a cheese sandwich?", [("Yes,", "rồi,"), ("it is.", "đến rồi."), ("Do you have", "bạn có"), ("a cheese sandwich?", "bánh mì kẹp phô mai không?")], "Đến rồi. Bạn có bánh mì kẹp phô mai không?"),
    ("minh", "d3", "No, I don't. I have orange juice.", [("No,", "không,"), ("I don't.", "tôi không có."), ("I have", "tôi có"), ("orange juice.", "nước cam.")], "Không. Tôi có nước cam."),
    ("lan", "d4", "Nice shoes, Minh!", [("Nice shoes,", "giày đẹp đấy,"), ("Minh!", "Minh!")], "Giày đẹp đấy, Minh!"),
    ("minh", "d5", "Thanks!", [("Thanks!", "cảm ơn!")], "Cảm ơn!"),
])
L.audio["d1"]["contour"] = "rise"

GROUPS = [
    ("/ʃ/", [("she", "/ʃiː/ · cô ấy"), ("shoes", "/ʃuːz/ · giày"), ("wash", "/wɑːʃ/ · rửa, giặt")]),
    ("/tʃ/", [("chair", "/tʃɛr/ · ghế"), ("check", "/tʃɛk/ · kiểm tra; tấm séc"), ("lunch", "/lʌntʃ/ · bữa trưa"), ("cheese", "/tʃiːz/ · phô mai")]),
    ("/dʒ/", [("job", "/dʒɑːb/ · việc làm"), ("June", "/dʒuːn/ · tháng Sáu"), ("juice", "/dʒuːs/ · nước ép")]),
    ("/ʒ/", [("usually", "/ˈjuːʒuəli/ · thường"), ("television", "/ˈtɛləvɪʒən/ · ti vi")]),
]
for _, ws in GROUPS:
    for w, _ in ws:
        L.word(w.lower(), w, vary=w in ("she",))
PAIRS = [("see", "she"), ("ship", "chip"), ("shoes", "choose")]
for a, b in PAIRS:
    for w in (a, b):
        L.word(w, vary=True)
    L.pair(f"p_{a}", a, b, voice="am_adam" if a == "ship" else None)
# Ôn tai: các cặp đã học ở tuần 1 và bài 2.
for w in ("seat", "sit", "leave", "live", "bed", "bet", "bag", "back"):
    L.word(w, vary=True)
L.say("orange_juice", "orange juice", "lan")

def wordlist(title, groups):
    return {"type": "listen", "pass": 1, "title": title, "layout": "list",
            "lines": [{"speaker": "doc", "audio": w.lower(), "chunks": [{"en": w, "vi": vi, "audio": w.lower()}]} for _, ws in groups for w, vi in ws]}

L.part("nghe", "Nghe", [
    text("Giờ nghỉ trưa", "Giờ nghỉ trưa ở chỗ làm, Minh và Lan nói chuyện về đồ ăn. Bạn nghe đoạn hội thoại ba lượt, rồi nghe các từ có âm mới của bài."),
    *dlg,
    wordlist("Các từ có /ʃ/ và /tʃ/", GROUPS[:2]),
    wordlist("Các từ có /dʒ/ và /ʒ/", GROUPS[2:]),
])

L.part("hoc", "Học", [
    text("Ba âm cần luyện, một âm cần nhận ra",
         "Bài này luyện ba âm hay gặp: /ʃ/ như trong {{she}}, /tʃ/ như trong {{chair}}, và /dʒ/ như trong {{job}}.",
         "/ʃ/ là một tiếng xì kéo dài được. /tʃ/ và /dʒ/ bắt đầu bằng một cú chặn rồi bật ra thành tiếng xì; /dʒ/ có thêm rung ở cổ họng.",
         "Âm thứ tư, /ʒ/, ít gặp. Bạn chỉ cần nhận ra nó khi nghe."),
    text("/ʃ/",
         "Để đọc /ʃ/, bạn tròn môi và đưa môi ra trước, lưỡi lùi về sau hơn khi đọc /s/. Tiếng xì nghe dày hơn: {{she}}, {{shoes}}, {{wash}}.",
         "Bạn nghe liền cặp này để thấy hai tiếng xì khác nhau: {{p_see}}"),
    text("/tʃ/",
         "Để đọc /tʃ/, đầu lưỡi chạm lợi trên như khi đọc t, rồi bật ra thành /ʃ/: {{chair}}, {{check}}, {{lunch}}, {{cheese}}.",
         "Âm này có tiếng xì đi kèm, nên nghe khác chữ \"ch\" tiếng Việt. Bạn nghe liền cặp: {{p_ship}}"),
    text("/dʒ/",
         "/dʒ/ đọc như /tʃ/ nhưng có rung: {{job}}, {{june}}, {{orange_juice|nước cam}}.",
         "Bạn đã gặp âm này ở đầu tên chữ G và chữ J trong tuần 1."),
    text("/ʒ/: chỉ cần nhận ra",
         "/ʒ/ đọc như /ʃ/ nhưng có rung. Âm này thường nằm giữa từ: {{usually|thường}}, {{television|ti vi}}.",
         "Tiếng Anh có rất ít từ cần âm này để phân biệt nghĩa, nên bạn chưa cần luyện kỹ."),
    text("Người Việt hay đọc thế nào",
         "Người Việt hay đọc /ʃ/ thành /s/, đọc /tʃ/ thành \"ch\" tiếng Việt, và đọc /dʒ/ thành \"gi\" hay \"d\" theo giọng vùng miền của mình.",
         "Trang Bảng IPA trong app có hai từ ví dụ cho mỗi âm để bạn nghe lại bất cứ lúc nào."),
])

L.part("luyen", "Luyện", [
    text("Ôn tai", "Trước khi luyện âm mới, bạn nghe lại bốn cặp từ đã học ở tuần 1 và ở bài 2. Mỗi lần bạn sẽ nghe một giọng đọc khác nhau. Câu nào chọn sai, thẻ từ liên quan được đưa lên đầu lịch ôn."),
    choose("Ôn tai: nghe một từ rồi chọn từ bạn vừa nghe.", ["seat", "sit"], 1, audio="sit", row=True, vary=True, explain="sit có âm /ɪ/ ngắn.", review=["w1-l4/sit", "w1-l4/seat"]),
    choose("Ôn tai: nghe một từ rồi chọn từ bạn vừa nghe.", ["leave", "live"], 0, audio="leave", row=True, vary=True, explain="leave có âm /iː/ dài.", review=["w1-l4/leave", "w1-l4/live"]),
    choose("Ôn tai: nghe một từ rồi chọn từ bạn vừa nghe.", ["bed", "bet"], 1, audio="bet", row=True, vary=True, explain="bet có nguyên âm ngắn hơn và kết thúc bằng /t/.", review=["w2-l2/bed"]),
    choose("Ôn tai: nghe một từ rồi chọn từ bạn vừa nghe.", ["bag", "back"], 0, audio="bag", row=True, vary=True, explain="bag có nguyên âm dài hơn, vì đứng trước /ɡ/.", review=["w2-l2/bag"]),
    text("Âm mới", "Bây giờ bạn luyện nghe các âm của bài này."),
    choose("Nghe một từ rồi chọn từ bạn vừa nghe.", ["see", "she"], 1, audio="she", row=True, vary=True, explain="she bắt đầu bằng /ʃ/, tiếng xì dày hơn /s/.", review=["w2-l4/she"]),
    choose("Nghe một từ rồi chọn từ bạn vừa nghe.", ["ship", "chip"], 1, audio="chip", row=True, vary=True, explain="chip bắt đầu bằng /tʃ/, có một cú chặn trước tiếng xì."),
    choose("Nghe một từ rồi chọn từ bạn vừa nghe.", ["shoes", "choose"], 0, audio="shoes", row=True, vary=True, explain="shoes bắt đầu bằng /ʃ/.", review=["w2-l4/shoes"]),
    choose("Nghe một từ rồi chọn từ bạn vừa nghe.", ["see", "she"], 0, audio="see", row=True, vary=True, explain="see bắt đầu bằng /s/."),
    choose("Nghe hai từ. Hai từ giống nhau hay khác nhau?", ["Giống", "Khác"], 1, audio=["ship", "chip"], row=True, vary=True, explain="Từ đầu là ship, từ sau là chip."),
    choose("Nghe hai từ. Hai từ giống nhau hay khác nhau?", ["Giống", "Khác"], 0, audio=["she", "she"], row=True, vary=True, explain="Cả hai lần đều là she."),
    choose("Nghe một từ rồi chọn âm đầu của từ ấy.", ["/tʃ/", "/dʒ/"], 1, audio="job", row=True, explain="job bắt đầu bằng /dʒ/, có rung.", review=["w2-l4/job"]),
    choose("Nghe một từ rồi chọn âm đầu của từ ấy.", ["/tʃ/", "/dʒ/"], 0, audio="cheese", row=True, explain="cheese bắt đầu bằng /tʃ/, không rung.", review=["w2-l4/cheese"]),
    choose("Nghe một từ rồi chọn âm đầu của từ ấy.", ["/tʃ/", "/dʒ/"], 1, audio="june", row=True, explain="June bắt đầu bằng /dʒ/."),
])

L.say("m_lunch", "Is it lunchtime?", "lan", contour="rise")
L.say("m_juice", "I have orange juice.", "lan")
L.say("nice_shoes", "Nice shoes!", "lan")
L.part("noi", "Nói", [
    text(None, "Bạn đọc từng cặp từ theo mẫu, thu âm lại, rồi nghe xem hai từ trong bản của bạn có khác nhau không. Sau đó bạn nói hai câu của đoạn hội thoại."),
    speak("see", "Đọc cặp see và she.", "p_see", "see, she, see, she", focus="Nghe xem hai tiếng xì có khác nhau không: she phải dày hơn see.", check=False),
    speak("ship", "Đọc cặp ship và chip.", "p_ship", "ship, chip, ship, chip", focus="Nghe xem chip có cú chặn ở đầu không.", check=False),
    speak("lunch", "Hỏi xem đã đến giờ ăn trưa chưa.", "m_lunch", "Is it lunchtime?", focus="Nghe xem giữa lunchtime có âm /tʃ/ không."),
    speak("juice", "Nói bạn có nước cam.", "m_juice", "I have orange juice.", focus="Nghe xem orange và juice có âm /dʒ/ rung không."),
])

L.say("w3", "Is it lunchtime?", "minh", contour="rise")
L.part("viet", "Viết", [
    dictation("ship", "ship", prompt="Nghe một từ rồi gõ lại.", vary=True),
    dictation("she", "she", prompt="Nghe một từ rồi gõ lại.", review=["w2-l4/she"], vary=True),
    dictation("w3", "Is it lunchtime?", review=["w2-l4/lunchtime"]),
])

for id, en, vi, a in [
    ("she", "she", "cô ấy /ʃiː/", "she"), ("shoes", "shoes", "giày /ʃuːz/", "shoes"), ("chair", "chair", "ghế /tʃɛr/", "chair"),
    ("lunch", "lunch", "bữa trưa /lʌntʃ/", "lunch"), ("cheese", "cheese", "phô mai /tʃiːz/", "cheese"), ("job", "job", "việc làm /dʒɑːb/", "job"),
    ("orange-juice", "orange juice", "nước cam", "orange_juice"), ("usually", "usually", "thường /ˈjuːʒuəli/", "usually"),
    ("lunchtime", "Is it lunchtime?", "Đến giờ ăn trưa chưa?", "d1"), ("nice-shoes", "Nice shoes!", "Giày đẹp đấy!", "nice_shoes"),
]:
    L.card(id, en, vi, a)
L.save()

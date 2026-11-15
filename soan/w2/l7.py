import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from common import *

L = Lesson(
    "w2-l7", "Ôn tuần và thử ngoài đời",
    "Bài này chỉ thêm một cụm mới, It's in my bag. Bạn ôn các khuôn câu của tuần qua một cuộc gọi điện, làm một bài kiểm tra nhỏ, rồi tự đánh giá và đặt mục tiêu cho tuần sau.",
    ["doc", "lan", "minh", "staff"],
    listenNote="Một cuộc gọi điện nghe ba lượt, và một bài kiểm tra nhỏ mười câu",
    realTask="Tuần này, bạn chọn một trong hai việc. Một là hỏi tên tiếng Anh của ba vật ở chỗ làm bằng How do you say this in English?, rồi nói lại từng từ. Hai là khi có người nói tiếng Anh gọi cho bạn, bạn trả lời họ rằng bạn đang ở đâu, và nói Can you say that again? khi chưa nghe kịp.",
    canDo=["Trả lời một cuộc gọi ngắn: nói mình đang ở đâu và mình có gì.", "Biết những phần nào của tuần 2 còn cần ôn.", "Chọn một giờ học cố định cho tuần sau."],
)

dlg = L.dialogue("Trời sắp mưa", [
    ("minh", "r1", "Hi, Lan. Where are you?", [("Hi, Lan.", "chào Lan."), ("Where", "ở đâu"), ("are you?", "bạn đang?")], "Chào Lan. Bạn đang ở đâu?"),
    ("lan", "r2", "I'm at work.", [("I'm", "tôi đang"), ("at work.", "ở chỗ làm.")], "Tôi đang ở chỗ làm."),
    ("minh", "r3", "Do you have an umbrella?", [("Do you have", "bạn có"), ("an umbrella?", "ô không?")], "Bạn có ô không?"),
    ("lan", "r4", "Sorry? Can you say that again?", [("Sorry?", "bạn nói gì cơ?"), ("Can you", "bạn có thể"), ("say that", "nói câu đó"), ("again?", "lần nữa không?")], "Bạn nói gì cơ? Bạn nói lại được không?"),
    ("minh", "r5", "Do you have an umbrella?", [("Do you have", "bạn có"), ("an umbrella?", "ô không?")], "Bạn có ô không?"),
    ("lan", "r6", "Yes, I do. It's in my bag.", [("Yes,", "có,"), ("I do.", "tôi có."), ("It's", "nó ở"), ("in my bag.", "trong túi tôi.")], "Có. Nó ở trong túi tôi."),
    ("minh", "r7", "Good. See you at home!", [("Good.", "tốt rồi."), ("See you", "hẹn gặp bạn"), ("at home!", "ở nhà!")], "Tốt rồi. Hẹn gặp bạn ở nhà!"),
])
for k in ("r3", "r4", "r5"):
    L.audio[k]["contour"] = "rise"
L.audio["r1"]["contour"] = "fall"

L.say("in_my_bag", "It's in my bag.", "lan")
L.word("my")
L.say("see_you", "See you at home!", "minh")
L.part("nghe", "Nghe", [
    text("Một cuộc gọi", "Bài này ôn lại cả tuần qua một cuộc gọi điện: trời sắp mưa, Minh gọi cho Lan. Bạn nghe đoạn hội thoại ba lượt như mọi bài."),
    *dlg,
    text("Một cụm mới", "Lan nói {{in_my_bag|Nó ở trong túi tôi.}} {{my}} nghĩa là \"của tôi\", đi cùng cặp với your (của bạn) đã học ở bài 2.",
         "Cuối cuộc gọi, Minh chào {{see_you|Hẹn gặp bạn ở nhà!}}"),
])

L.say("q_is_it", "Is it a phone?", "minh", contour="rise")
L.say("q_passport", "Do you have a passport?", "staff", contour="rise")
L.say("q_home", "Are you at home?", "minh", contour="rise")
L.say("q_where", "Where are you?", "minh", contour="fall")
for w in ("bed", "bet", "ship", "chip", "see", "she"):
    L.word(w, vary=True)
L.part("onlai", "Ôn lại", [
    text("Kiểm tra nhỏ", "Phần này có mười câu, ôn lại bài 1 đến bài 6. App không chấm điểm. Câu nào bạn chọn sai, thẻ từ liên quan được đưa lên đầu lịch ôn để bạn gặp lại sớm."),
    choose("Chọn a hay an trước từ umbrella.", ["a", "an"], 1, row=True, explain="umbrella bắt đầu bằng một nguyên âm: an umbrella.", review=["w2-l1/umbrella"]),
    choose("Nghe câu hỏi rồi chọn câu đáp hợp với câu ấy.", ["Yes, it is.", "Yes, I do."], 0, audio="q_is_it", row=True, explain="Câu hỏi mở bằng Is, nên câu đáp dùng is.", review=["w2-l1/yes-it-is", "w2-l1/is-it-a"]),
    choose("Nghe câu hỏi rồi chọn câu đáp hợp với câu ấy.", ["No, I don't.", "No, it isn't."], 0, audio="q_passport", row=True, explain="Câu hỏi mở bằng Do, nên câu đáp dùng do.", review=["w2-l3/no-i-dont", "w2-l3/do-you-have"]),
    choose("Nghe câu hỏi rồi chọn câu đáp đúng.", ["Yes, I am.", "Yes, I'm."], 0, audio="q_home", row=True, explain="Câu đáp ngắn không dùng dạng gọn ở cuối: Yes, I am.", review=["w2-l5/yes-i-am", "w2-l5/are-you"]),
    choose("Nghe một từ rồi chọn từ bạn vừa nghe.", ["bed", "bet"], 0, audio="bed", row=True, vary=True, explain="bed có nguyên âm dài hơn, vì đứng trước /d/.", review=["w2-l2/bed"]),
    choose("Nghe một từ rồi chọn từ bạn vừa nghe.", ["ship", "chip"], 0, audio="ship", row=True, vary=True, explain="ship bắt đầu bằng /ʃ/, không có cú chặn ở đầu.", review=["w2-l4/she"]),
    choose("Nghe một từ rồi chọn từ bạn vừa nghe.", ["see", "she"], 1, audio="she", row=True, vary=True, explain="she bắt đầu bằng /ʃ/.", review=["w2-l4/she"]),
    choose("Chọn in hay at: ___ the kitchen.", ["in", "at"], 0, row=True, explain="Ở bên trong một phòng thì dùng in.", review=["w2-l5/kitchen"]),
    choose("Đồng nghiệp nói \"box\" mà bạn không biết nghĩa. Bạn hỏi câu nào?", ["What does box mean?", "How do you say this in English?", "Can you say that again?"], 0,
           explain="What does … mean? hỏi nghĩa của một từ bạn vừa nghe.", review=["w2-l6/what-does-mean"]),
    dictation("q_where", "Where are you?", review=["w2-l5/where-are-you"]),
])

L.say("m_where", "I'm at work.", "lan")
L.say("yes_i_do", "Yes, I do.", "lan")
L.say("no_i_dont", "No, I don't.", "lan")
L.say("q_pen", "Do you have a pen?", "minh", contour="rise")
L.say("no_at_work", "No, I'm not. I'm at work.", "lan")
L.say("q_rain", "Is it raining over there?", "minh", contour="rise")
L.say("m_again", "Sorry? Can you say that again?", "lan", contour="rise")
L.say("m_umbrella", "Yes, I do. It's in my bag.", "lan")
L.part("noi", "Nói", [
    text(None, "Bạn đóng vai Lan trong cuộc gọi. Bạn nói nơi bạn đang ở thật, và vật bạn có trong túi."),
    speak("where", "Minh hỏi bạn đang ở đâu. Bạn trả lời với nơi bạn đang ở.", "m_where", "I'm [in hoặc at] [nơi bạn đang ở].", ask="r1", focus="Nghe xem bạn chọn in hay at có đúng với nơi ấy không.", check=False),
    speak("umbrella", "Minh hỏi bạn có ô không. Bạn đáp có, và nói nó ở trong túi.", "m_umbrella", "Yes, I do. It's in my bag.", ask="r3", focus="Nghe xem bạn có đọc đủ âm /ɡ/ ở cuối bag không."),
    quick("call", ["Bây giờ bạn tập đáp ngay. Giả sử bạn đang ở chỗ làm; trong túi bạn có một cái ô, và bạn không có bút. Minh gọi điện và hỏi theo thứ tự bất kỳ.",
                   "Có một câu bạn chưa học. Gặp câu không hiểu, bạn nói Sorry? Can you say that again?"], [
        ("q_where", "m_where", "I'm at work.", ["w2-l5/at-work"]),
        ("r3", "yes_i_do", "Yes, I do.", ["w2-l3/yes-i-do"]),
        ("q_pen", "no_i_dont", "No, I don't.", ["w2-l3/no-i-dont"]),
        ("q_home", "no_at_work", "No, I'm not. I'm at work.", ["w2-l5/no-im-not"]),
        ("q_rain", "m_again", "Sorry? Can you say that again?", ["w2-l6/say-again"], "Câu này nghĩa là \"Bên đó có đang mưa không?\" Bạn chưa học câu này, nên hỏi lại là cách đáp đúng."),
    ]),
    {"type": "compare", "prompt": "So với đầu tuần", "first": "w2-l1/key", "latest": "w2-l7/umbrella", "firstLabel": "Bản thu ở bài 1: It's a key.", "latestLabel": "Bản thu hôm nay",
     "body": ["Bạn nghe bản thu câu It's a key ở bài 1, rồi nghe bản vừa thu. Để ý xem âm cuối của các từ trong bản hôm nay có rõ hơn không."]},
])

L.part("viet", "Viết", [
    {"type": "cloze", "id": "call", "prompt": "Nghe lại cuộc gọi rồi gõ những chữ còn trống.", "review": ["w2-l5/where-are-you", "w2-l3/do-you-have"], "lines": [
        {"speaker": "minh", "audio": "r1", "text": "Hi, Lan. [[1:Where]] are you?"},
        {"speaker": "lan", "audio": "r2", "text": "I'm [[2:at]] [[1:work]]."},
        {"speaker": "minh", "audio": "r3", "text": "Do you [[1:have]] an umbrella?"},
        {"speaker": "lan", "audio": "r4", "text": "Sorry? Can you [[2:say]] that [[2:again]]?"},
        {"speaker": "minh", "audio": "r5", "text": "[[2:Do]] you have [[2:an]] umbrella?"},
        {"speaker": "lan", "audio": "r6", "text": "Yes, I [[1:do]]. It's in my [[1:bag]]."},
        {"speaker": "minh", "audio": "r7", "text": "Good. See you at [[2:home]]!"},
    ]},
])

L.part("tongket", "Tổng kết", [
    {"type": "checklist", "id": "week2", "prompt": "Bạn đánh dấu những việc đã làm được",
     "note": "Không ai chấm phần này. Việc nào chưa đánh dấu được, bạn ôn lại bài có việc ấy.",
     "items": ["Tôi nói được tên một vật với It's a… hay It's an…", "Tôi trả lời được câu hỏi Do you have…? bằng Yes, I do hay No, I don't.",
               "Tôi nói được mình đang ở đâu.", "Tôi hỏi lại được khi chưa hiểu.", "Tôi đọc đủ âm cuối của những từ như bus, five, call."]},
    {"type": "goal", "key": "w2", "week": 2, "showGoal": "w1", "prompt": "Mục tiêu tuần sau",
     "body": ["Bạn chọn một việc muốn làm được bằng tiếng Anh trong tuần tới, rồi gõ vào ô dưới đây.",
              "Bạn cũng chọn một chỗ học và một giờ học cố định mỗi ngày, như sau bữa tối ở bàn ăn hay trên xe buýt đi làm, và ghi luôn vào ô. Học cùng một giờ mỗi ngày thì dễ giữ đều hơn."],
     "label": "Mục tiêu và giờ học của bạn cho tuần sau", "placeholder": "Ví dụ: hỏi giá một món đồ bằng tiếng Anh; học lúc 8 giờ tối ở bàn ăn"},
])

for id, en, vi, a in [("my", "my", "của tôi", "my"), ("in-my-bag", "It's in my bag.", "Nó ở trong túi tôi.", "in_my_bag"), ("see-you", "See you at home!", "Hẹn gặp bạn ở nhà!", "see_you")]:
    L.card(id, en, vi, a)
L.save()

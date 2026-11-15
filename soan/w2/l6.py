import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from common import *

L = Lesson(
    "w2-l6", "Hỏi khi chưa hiểu",
    "Hết bài này, bạn biết nói gì khi không nghe kịp, khi không biết nghĩa một từ, và khi muốn biết tên tiếng Anh của một vật. Bạn cũng đọc được bốn biển tên phòng thường gặp ở chỗ làm.",
    ["lan", "boss"],
    realTask="Hôm nay, bạn chỉ vào một vật ở chỗ làm và hỏi một đồng nghiệp How do you say this in English? rồi nói lại từ họ vừa dạy.",
    canDo=["Nhờ người khác nói lại bằng Can you say that again?", "Hỏi nghĩa một từ bằng What does … mean?", "Hỏi tên tiếng Anh của một vật bằng How do you say this in English?", "Đọc được biển Restroom, Break room, Office, Exit."],
)

dlg = L.dialogue("Ngày đầu đi làm", [
    ("boss", "d1", "Lan, can you bring the cart, please?", [("Lan,", "Lan,"), ("can you", "chị có thể"), ("bring", "mang"), ("the cart,", "cái xe đẩy lại,"), ("please?", "được không?")], "Lan, chị mang cái xe đẩy lại giúp tôi được không?"),
    ("lan", "d2", "Sorry? Can you say that again?", [("Sorry?", "anh nói gì cơ?"), ("Can you", "anh có thể"), ("say that", "nói câu đó"), ("again?", "lần nữa không?")], "Anh nói gì cơ? Anh nói lại được không?"),
    ("boss", "d3", "Can you bring the cart?", [("Can you", "chị có thể"), ("bring", "mang"), ("the cart?", "cái xe đẩy lại không?")], "Chị mang cái xe đẩy lại được không?"),
    ("lan", "d4", "What does cart mean?", [("What does", "là gì"), ("cart", "\"cart\""), ("mean?", "nghĩa?")], "\"Cart\" nghĩa là gì?"),
    ("boss", "d5", "This is a cart.", [("This is", "đây là"), ("a cart.", "cái xe đẩy.")], "Đây là cái xe đẩy."),
    ("lan", "d6", "Oh, OK. How do you say this in English?", [("Oh, OK.", "à, tôi hiểu rồi."), ("How do you say", "nói thế nào"), ("this", "cái này"), ("in English?", "bằng tiếng Anh?")], "À, tôi hiểu rồi. Cái này tiếng Anh nói thế nào?"),
    ("boss", "d7", "It's a ladder.", [("It's", "đó là"), ("a ladder.", "cái thang.")], "Đó là cái thang."),
    ("lan", "d8", "Ladder. Thank you!", [("Ladder.", "cái thang."), ("Thank you!", "cảm ơn anh!")], "Cái thang. Cảm ơn anh!"),
])
for k in ("d1", "d2", "d3"):
    L.audio[k]["contour"] = "rise"

L.say("say_again", "Can you say that again?", "lan", contour="rise")
L.say("write_down", "Can you write it down?", "lan", contour="rise")
L.say("bring_cart", "Can you bring the cart, please?", "boss", contour="rise")
for id, t in [("dont_understand", "I don't understand."), ("what_does_mean", "What does cart mean?"), ("how_do_you_say", "How do you say this in English?"),
              ("a_cart", "a cart"), ("a_ladder", "a ladder"), ("break_room", "Break room")]:
    L.say(id, t, "lan")
for w in ("Restroom", "Office", "Exit"):
    L.word(w.lower(), w)

L.part("nghe", "Nghe", [
    text("Một việc được nhờ", "Ngày đầu ở chỗ làm mới, người quản lý nhờ Lan một việc. Lan chưa nghe kịp, rồi gặp một từ chưa biết. Hiểu rồi, Lan chỉ vào một cái thang cạnh xe đẩy để hỏi tên. Bạn nghe đoạn hội thoại ba lượt."),
    *dlg,
])

L.part("hoc", "Học", [
    text("Khi không nghe kịp",
         "Ngoài Sorry? ở tuần 1, bạn có thể nói đủ câu {{say_again|Bạn nói lại được không?}}",
         "Vẫn chưa hiểu thì bạn nói {{dont_understand|Tôi không hiểu.}}"),
    text("Khi không biết nghĩa một từ",
         "Khi nghe được một từ mà không biết nghĩa, bạn hỏi {{what_does_mean|\"Cart\" nghĩa là gì?}}",
         "Bạn đặt từ ấy vào giữa câu và đọc nó rõ hơn các chữ còn lại, để người nghe biết bạn hỏi từ nào."),
    text("Khi muốn biết tên một vật",
         "Muốn biết tên tiếng Anh của một vật, bạn chỉ vào nó và hỏi {{how_do_you_say|Cái này tiếng Anh nói thế nào?}}"),
    text("Nói lại từ mới",
         "Nghe xong từ mới, bạn nói lại từ ấy một lần, như Lan nói \"Ladder.\" Người kia sẽ sửa nếu bạn đọc sai, và bạn nhớ từ lâu hơn.",
         "Hai từ trong bài: {{a_cart|xe đẩy}}, {{a_ladder|cái thang}}."),
    text("Nhờ viết ra",
         "Khi cần ghi lại một từ hay một con số, bạn nhờ {{write_down|Bạn viết ra giúp tôi được không?}}"),
    text("Can you…?",
         "Can you…? ở đầu câu là cách nhờ ai làm gì một cách lịch sự, như người quản lý nói {{bring_cart|Chị mang cái xe đẩy lại giúp tôi được không?}}",
         "Thêm please ở cuối thì câu lịch sự hơn."),
    text("Biển tên phòng ở chỗ làm",
         "Ở chỗ làm, cửa phòng thường có biển. Bốn biển hay gặp: {{restroom|nhà vệ sinh}}, {{break_room|phòng nghỉ giữa giờ}}, {{office|văn phòng}}, {{exit|lối ra}}.",
         "Gặp một biển chưa biết, bạn chỉ vào và hỏi What does … mean?"),
])

THREE = ["Can you say that again?", "What does cart mean?", "How do you say this in English?"]
L.part("luyen", "Luyện", [
    choose("Đồng nghiệp nói nhanh, bạn không nghe kịp. Bạn nói câu nào?", THREE, 0, explain="Can you say that again? nhờ người kia nói lại.", review=["w2-l6/say-again"]),
    choose("Bạn nghe rõ từ \"cart\" mà không biết nghĩa. Bạn nói câu nào?", THREE, 1, explain="What does … mean? hỏi nghĩa của một từ.", review=["w2-l6/what-does-mean"]),
    choose("Bạn cầm một vật và muốn biết tên tiếng Anh của nó. Bạn nói câu nào?", THREE, 2, explain="How do you say this in English? hỏi tên tiếng Anh của một vật.", review=["w2-l6/how-do-you-say"]),
    order("Bấm lần lượt các chữ để xếp thành câu \"Cái này tiếng Anh nói thế nào?\".", ["say", "How", "this", "do", "in English", "you"], ["How", "do", "you", "say", "this", "in English"],
          "how_do_you_say", "Cái này tiếng Anh nói thế nào?", review=["w2-l6/how-do-you-say"]),
    choose("Bạn cần tìm nhà vệ sinh. Bạn đi theo biển nào?", ["RESTROOM", "BREAK ROOM", "OFFICE"], 0, explain="Restroom là nhà vệ sinh.", review=["w2-l6/restroom"]),
    choose("Đến giờ nghỉ, đồng nghiệp rủ bạn vào phòng nghỉ. Cửa phòng ấy ghi gì?", ["EXIT", "BREAK ROOM", "RESTROOM"], 1, explain="Break room là phòng nghỉ giữa giờ, nơi mọi người ăn trưa.", review=["w2-l6/break-room"]),
    choose("Hết giờ làm, bạn tìm lối ra. Bạn đi theo biển nào?", ["OFFICE", "RESTROOM", "EXIT"], 2, explain="Exit là lối ra.", review=["w2-l6/exit"]),
])

L.part("noi", "Nói", [
    text(None, "Bạn nghe câu mẫu, thu âm câu của mình, rồi nghe lại và so với mẫu."),
    speak("again", "Nhờ người kia nói lại.", "say_again", "Can you say that again?", focus="Nghe xem giọng bạn có lên ở cuối câu không."),
    speak("mean", "Hỏi nghĩa của từ cart.", "what_does_mean", "What does cart mean?", focus="Nghe xem bạn có đọc cart rõ hơn các chữ khác, và có âm /t/ ở cuối không."),
    speak("how", "Hỏi tên tiếng Anh của một vật.", "how_do_you_say", "How do you say this in English?", focus="Nghe xem cuối English có âm /ʃ/ không."),
    speak("write", "Nhờ người kia viết ra.", "write_down", "Can you write it down?", focus="Nghe xem write it down có nối liền nhau không."),
])

L.say("w1", "Can you say that again?", "lan", contour="rise")
L.say("w2", "How do you say this in English?", "lan")
L.part("viet", "Viết", [
    dictation("w1", "Can you say that again?", review=["w2-l6/say-again"]),
    dictation("w2", "How do you say this in English?", review=["w2-l6/how-do-you-say"]),
])

for id, en, vi, a in [
    ("say-again", "Can you say that again?", "Bạn nói lại được không?", "say_again"), ("dont-understand", "I don't understand.", "Tôi không hiểu.", "dont_understand"),
    ("what-does-mean", "What does cart mean?", "\"Cart\" nghĩa là gì?", "what_does_mean"), ("how-do-you-say", "How do you say this in English?", "Cái này tiếng Anh nói thế nào?", "how_do_you_say"),
    ("write-down", "Can you write it down?", "Bạn viết ra giúp tôi được không?", "write_down"), ("can-you", "Can you bring the cart, please?", "Bạn mang cái xe đẩy lại giúp tôi được không?", "bring_cart"),
    ("cart", "a cart", "xe đẩy", "a_cart"), ("ladder", "a ladder", "cái thang", "a_ladder"),
    ("restroom", "Restroom", "nhà vệ sinh", "restroom"), ("break-room", "Break room", "phòng nghỉ giữa giờ", "break_room"),
    ("office", "Office", "văn phòng", "office"), ("exit", "Exit", "lối ra", "exit"),
]:
    L.card(id, en, vi, a)
L.save()

import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from common import *

L = Lesson(
    "w2-l5", "Bạn đang ở đâu?",
    "Hết bài này, bạn hỏi được Where are you?, nói được mình đang ở phòng nào trong nhà hay ở nơi nào, đáp được Yes, I am hoặc No, I'm not, và biết câu hỏi nào lên giọng, câu hỏi nào xuống giọng.",
    ["lan", "minh"],
    realTask="Hôm nay, mỗi lần bước vào một phòng trong nhà, bạn nói thầm I'm in the… với tên phòng. Nếu có người nói tiếng Anh gọi cho bạn, bạn thử trả lời họ rằng bạn đang ở đâu.",
    canDo=["Hỏi Where are you? và nói mình đang ở đâu.", "Dùng in với phòng trong nhà, at với home, work, the store.", "Đáp Yes, I am hoặc No, I'm not.", "Lên giọng ở câu hỏi có hoặc không."],
)

dlg = L.dialogue("Cuộc gọi", [
    ("minh", "d1", "Hi, Lan. Where are you?", [("Hi, Lan.", "chào Lan."), ("Where", "ở đâu"), ("are you?", "bạn đang?")], "Chào Lan. Bạn đang ở đâu?"),
    ("lan", "d2", "I'm at the store. Are you at home?", [("I'm", "tôi đang"), ("at the store.", "ở cửa hàng."), ("Are you", "bạn có đang"), ("at home?", "ở nhà không?")], "Tôi đang ở cửa hàng. Bạn có ở nhà không?"),
    ("minh", "d3", "Yes, I am. I'm in the kitchen.", [("Yes,", "có,"), ("I am.", "tôi có."), ("I'm", "tôi đang"), ("in the kitchen.", "ở trong bếp.")], "Có. Tôi đang ở trong bếp."),
    ("lan", "d4", "OK. See you at home!", [("OK.", "được rồi."), ("See you", "hẹn gặp bạn"), ("at home!", "ở nhà!")], "Được rồi. Hẹn gặp bạn ở nhà!"),
])

L.say("where_are_you", "Where are you?", "minh", contour="fall")
L.say("are_you_at_home", "Are you at home?", "lan", contour="rise")
L.say("are_you_at_work", "Are you at work?", "minh", contour="rise")
L.say("youre_at_home_q", "You're at home?", "lan", contour="rise")
L.say("youre_at_home_s", "You're at home.", "lan", contour="fall")
for id, t in [("im_in_the_kitchen", "I'm in the kitchen."), ("im_at_work", "I'm at work."), ("in_the_kitchen", "in the kitchen"),
              ("in_the_living_room", "in the living room"), ("in_the_bedroom", "in the bedroom"), ("in_the_bathroom", "in the bathroom"),
              ("at_work", "at work"), ("at_the_store", "at the store"), ("at_home", "at home"),
              ("yes_i_am", "Yes, I am."), ("no_im_not", "No, I'm not."), ("im_in_the_living_room", "I'm in the living room."),
              ("no_at_home", "No, I'm not. I'm at home."), ("see_you_at_home", "See you at home!")]:
    L.say(id, t, "lan")

L.part("nghe", "Nghe", [
    text("Minh gọi cho Lan", "Minh gọi điện cho Lan để hỏi Lan đang ở đâu. Bạn nghe đoạn hội thoại ba lượt."),
    *dlg,
])

L.part("hoc", "Học", [
    text("Where are you?",
         "{{where_are_you|Bạn đang ở đâu?}} Bạn đáp I'm in… hoặc I'm at… rồi nói nơi mình đang ở, như {{im_in_the_kitchen|Tôi đang ở trong bếp.}} hay {{im_at_work|Tôi đang ở chỗ làm.}}"),
    text("in: bên trong một phòng",
         "In dùng khi bạn ở bên trong một phòng: {{in_the_kitchen|trong bếp}}, {{in_the_living_room|ở phòng khách}}, {{in_the_bedroom|ở phòng ngủ}}, {{in_the_bathroom|ở phòng tắm}}."),
    text("at: nơi bạn đến để làm một việc",
         "At đi với nơi bạn đến để làm một việc: {{at_work|ở chỗ làm}}, {{at_the_store|ở cửa hàng}}. {{at_home|ở nhà}} là một cụm cố định.",
         "Home và work không có the đi kèm. Tuần này bạn học thuộc ba cụm ấy; các tuần sau sẽ nói kỹ hơn về in và at."),
    text("Chữ the",
         "Chữ the trong the kitchen, the store cho biết cả hai người đều biết đang nói tới cái bếp nào, cửa hàng nào. Tuần này bạn học nguyên cả cụm, chưa cần phân tích."),
    text("Hỏi ai có đang ở một nơi không",
         "Muốn hỏi ai có đang ở một nơi không, bạn đảo you và are: {{are_you_at_home|Bạn có ở nhà không?}}",
         "Người kia đáp {{yes_i_am|Có.}} hoặc {{no_im_not|Không.}}",
         "Cũng như Yes, it is ở bài 1, câu đáp ngắn không dùng dạng gọn ở cuối: bạn nói Yes, I am, không nói Yes, I'm. Dạng gọn chỉ dùng khi sau nó còn chữ khác, như No, I'm not."),
    text("Lên giọng và xuống giọng",
         "Câu hỏi có hoặc không thường lên giọng ở cuối: {{are_you_at_home}}",
         "Câu hỏi bắt đầu bằng Where thường xuống giọng ở cuối: {{where_are_you}} Khi gọi tìm một người, như Minh gọi Lan, người ta cũng hay lên giọng ở câu này.",
         "Người ta cũng biến một câu kể thành câu hỏi chỉ bằng cách lên giọng: {{youre_at_home_q|Bạn ở nhà à?}}"),
])

IN = "Ở bên trong một phòng thì dùng in."
L.part("luyen", "Luyện", [
    choose("Chọn in hay at: ___ the kitchen.", ["in", "at"], 0, row=True, explain=f"{IN} in the kitchen.", review=["w2-l5/kitchen"]),
    choose("Chọn in hay at: ___ work.", ["in", "at"], 1, row=True, explain="at work là cụm học thuộc: ở chỗ làm.", review=["w2-l5/at-work"]),
    choose("Chọn in hay at: ___ the bedroom.", ["in", "at"], 0, row=True, explain=f"{IN} in the bedroom.", review=["w2-l5/bedroom"]),
    choose("Chọn in hay at: ___ home.", ["in", "at"], 1, row=True, explain="at home là cụm cố định: ở nhà.", review=["w2-l5/at-home"]),
    choose("Minh hỏi bạn. Bạn đang ở phòng khách. Nghe câu hỏi rồi chọn câu đáp đúng.", ["I'm in the living room.", "I'm at the living room.", "Yes, I am."], 0, audio="where_are_you",
           explain="Phòng khách là một phòng, nên dùng in. Câu hỏi với Where không đáp bằng Yes.", review=["w2-l5/where-are-you", "w2-l5/living-room"]),
    choose("Bạn đang ở nhà. Nghe câu hỏi rồi chọn câu đáp đúng.", ["No, I'm not. I'm at home.", "Yes, I'm.", "No, I don't."], 0, audio="are_you_at_work",
           explain="Câu hỏi mở bằng Are you, nên câu đáp là No, I'm not.", review=["w2-l5/no-im-not", "w2-l5/are-you"]),
    choose_audio("Nghe hai cách nói câu You're at home. Cách nào là câu hỏi?", [("Cách 1", "youre_at_home_s"), ("Cách 2", "youre_at_home_q")], 1,
                 explain="Cách 2 lên giọng ở cuối, nên là câu hỏi."),
])

L.say("m_where", "I'm in the kitchen.", "lan")
L.say("q_bedroom", "Are you in the bedroom?", "minh", contour="rise")
L.say("no_kitchen", "No, I'm not. I'm in the kitchen.", "lan")
L.say("m_are", "Are you at home?", "lan", contour="rise")
L.part("noi", "Nói", [
    text(None, "Minh gọi cho bạn. Bạn nghe câu hỏi, thu âm câu trả lời với nơi bạn đang ở thật, rồi hỏi lại Minh."),
    speak("where", "Minh hỏi bạn đang ở đâu. Bạn trả lời với nơi bạn đang ở.", "m_where", "I'm in [nơi bạn đang ở].", ask="where_are_you", focus="Nghe xem bạn có đọc I'm thành một tiếng, có âm /m/ ở cuối không.", check=False),
    speak("are", "Hỏi Minh có đang ở nhà không.", "m_are", "Are you at home?", focus="Nghe xem giọng bạn có lên ở cuối câu không."),
    quick("call", ["Bây giờ bạn tập đáp ngay. Giả sử bạn đang ở nhà, trong bếp. Minh gọi điện và hỏi theo thứ tự bất kỳ."], [
        ("where_are_you", "m_where", "I'm in the kitchen.", ["w2-l5/kitchen"]),
        ("are_you_at_home", "yes_i_am", "Yes, I am.", ["w2-l5/yes-i-am"]),
        ("are_you_at_work", "no_at_home", "No, I'm not. I'm at home.", ["w2-l5/no-im-not"]),
        ("q_bedroom", "no_kitchen", "No, I'm not. I'm in the kitchen.", ["w2-l5/no-im-not", "w2-l5/kitchen"]),
    ]),
])

L.say("w1", "Where are you?", "minh", contour="fall")
L.say("w2", "I'm in the kitchen.", "lan")
L.part("viet", "Viết", [
    dictation("w1", "Where are you?", review=["w2-l5/where-are-you"]),
    dictation("w2", "I'm in the kitchen.", review=["w2-l5/kitchen"]),
    {"type": "write", "mode": "intro", "prompt": "Gõ câu nói bạn đang ở đâu, theo mẫu I'm in… hoặc I'm at…", "example": "I'm at home.",
     "pattern": "\\bi'?m (in|at) [a-z]", "patternOk": "Đúng rồi. Câu của bạn đúng mẫu. App không kiểm tên nơi chốn.",
     "patternHelp": "Câu này cần bắt đầu bằng I'm in hoặc I'm at, rồi đến nơi bạn đang ở. Ví dụ:"},
])

for id, en, vi, a in [
    ("where-are-you", "Where are you?", "Bạn đang ở đâu?", "where_are_you"), ("im-in", "I'm in the kitchen.", "Tôi đang ở trong bếp.", "im_in_the_kitchen"),
    ("im-at", "I'm at work.", "Tôi đang ở chỗ làm.", "im_at_work"), ("kitchen", "in the kitchen", "trong bếp", "in_the_kitchen"),
    ("living-room", "in the living room", "ở phòng khách", "in_the_living_room"), ("bedroom", "in the bedroom", "ở phòng ngủ", "in_the_bedroom"),
    ("bathroom", "in the bathroom", "ở phòng tắm", "in_the_bathroom"), ("at-home", "at home", "ở nhà", "at_home"),
    ("at-work", "at work", "ở chỗ làm", "at_work"), ("at-the-store", "at the store", "ở cửa hàng", "at_the_store"),
    ("are-you", "Are you at home?", "Bạn có ở nhà không?", "are_you_at_home"), ("yes-i-am", "Yes, I am.", "Có.", "yes_i_am"),
    ("no-im-not", "No, I'm not.", "Không.", "no_im_not"),
]:
    L.card(id, en, vi, a)
L.save()

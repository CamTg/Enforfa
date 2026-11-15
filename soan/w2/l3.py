import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from common import *

L = Lesson(
    "w2-l3", "Bạn có… không?",
    "Hết bài này, bạn trả lời được những câu hỏi Do you have…? ở quầy tiếp tân phòng khám, nói được mình có gì bằng I have…, và biết nói Here you go khi đưa giấy tờ.",
    ["lan", "staff"],
    realTask="Hôm nay, khi đưa một vật cho ai, bạn nói Here you go. Nếu cần mượn bút, bạn hỏi một đồng nghiệp Do you have a pen?",
    canDo=["Trả lời câu hỏi Do you have…? bằng Yes, I do hoặc No, I don't.", "Nói mình có gì bằng I have a…", "Nói Here you go khi đưa một vật cho người khác."],
)

dlg = L.dialogue("Ở phòng khám", [
    ("staff", "d1", "Hi. Do you have an appointment?", [("Hi.", "chào chị."), ("Do you have", "chị có"), ("an appointment?", "hẹn trước không?")], "Chào chị. Chị có hẹn trước không?"),
    ("lan", "d2", "Yes, I do. My name is Lan Nguyen.", [("Yes,", "có,"), ("I do.", "tôi có."), ("My name is", "tên tôi là"), ("Lan Nguyen.", "Lan Nguyễn.")], "Có. Tên tôi là Lan Nguyễn."),
    ("staff", "d3", "Do you have your insurance card?", [("Do you have", "chị có mang"), ("your", "của chị"), ("insurance card?", "thẻ bảo hiểm không?")], "Chị có mang thẻ bảo hiểm không?"),
    ("lan", "d4", "Yes, I do. Here you go.", [("Yes,", "có,"), ("I do.", "tôi có."), ("Here you go.", "đây ạ.")], "Có. Đây ạ."),
    ("staff", "d5", "Thank you. Do you have a driver's license?", [("Thank you.", "cảm ơn chị."), ("Do you have", "chị có"), ("a driver's license?", "bằng lái xe không?")], "Cảm ơn chị. Chị có bằng lái xe không?"),
    ("lan", "d6", "No, I don't. Sorry. I have a passport.", [("No,", "không,"), ("I don't.", "tôi không có."), ("Sorry.", "xin lỗi."), ("I have", "tôi có"), ("a passport.", "hộ chiếu.")], "Không. Xin lỗi chị. Tôi có hộ chiếu."),
])

L.say("do_you_have_appt", "Do you have an appointment?", "staff", contour="rise")
L.say("do_you_have_card", "Do you have your insurance card?", "staff", contour="rise")
L.say("do_you_have_license", "Do you have a driver's license?", "staff", contour="rise")
L.say("do_you_have_key", "Do you have a key?", "staff", contour="rise")
L.say("is_it_a_key", "Is it a key?", "staff")  # nắn cao độ làm "it" nghe thành "that"
for id, t in [("yes_i_do", "Yes, I do."), ("no_i_dont", "No, I don't."), ("i_have_a_passport", "I have a passport."),
              ("an_appointment", "an appointment"), ("an_insurance_card", "an insurance card"), ("a_passport", "a passport"),
              ("a_drivers_license", "a driver's license"), ("here_you_go", "Here you go."),
              ("yes_here", "Yes, I do. Here you go."), ("no_passport", "No, I don't. I have a passport.")]:
    L.say(id, t, "lan")

L.word("your")
L.part("nghe", "Nghe", [
    text("Ở quầy tiếp tân", "Lan đến phòng khám. Nhân viên quầy tiếp tân hỏi Lan có hẹn trước không và hỏi vài loại giấy tờ. Bạn nghe đoạn hội thoại ba lượt."),
    *dlg,
])

L.part("hoc", "Học", [
    text("Do you have…?",
         "{{do_you_have_appt|Bạn có hẹn trước không?}} hỏi người kia có một vật hay một giấy tờ không.",
         "Ở câu này, Do chỉ báo cho người nghe biết đây là câu hỏi, nên không dịch ra tiếng Việt."),
    text("Đáp ngắn",
         "Bạn đáp ngắn {{yes_i_do|Có.}} hoặc {{no_i_dont|Không.}}",
         "Câu hỏi mở bằng Do thì câu đáp ngắn cũng dùng do. Câu hỏi mở bằng Is như ở bài 1 thì câu đáp dùng is: Is it a phone? Yes, it is."),
    text("I have a…",
         "Muốn nói mình có gì, bạn nói I have a… (Tôi có một…), như {{i_have_a_passport|Tôi có hộ chiếu.}}",
         "Giống bài 1, tiếng Anh cần a hay an trước tên vật."),
    text("Giấy tờ ở phòng khám",
         "Mấy từ hay gặp ở phòng khám: {{an_appointment|cuộc hẹn}}, {{an_insurance_card|thẻ bảo hiểm}}, {{a_passport|hộ chiếu}}, {{a_drivers_license|bằng lái xe}}.",
         "{{your}} nghĩa là \"của bạn\": your insurance card là thẻ bảo hiểm của bạn."),
    text("Here you go",
         "Khi đưa một vật cho ai, bạn nói {{here_you_go|Đây ạ.}}"),
    text("Lên giọng khi hỏi",
         "Câu hỏi có hoặc không, như Do you have…? hay Is it…?, thường lên giọng ở cuối, giống Sorry? ở tuần 1.",
         "Bạn nghe lại và để ý chỗ lên giọng: {{do_you_have_appt}}"),
])

L.part("luyen", "Luyện", [
    choose("Nghe câu hỏi của nhân viên rồi chọn câu đáp đúng.", ["Yes, I do.", "Yes, it is.", "Yes, I have."], 0, audio="do_you_have_appt",
           explain="Câu hỏi mở bằng Do, nên câu đáp ngắn là Yes, I do.", review=["w2-l3/yes-i-do", "w2-l3/do-you-have"]),
    choose("Nghe câu hỏi rồi chọn câu đáp hợp với câu ấy.", ["Yes, it is.", "Yes, I do."], 0, audio="is_it_a_key", row=True,
           explain="Câu hỏi mở bằng Is, nên câu đáp dùng is: Yes, it is.", review=["w2-l1/yes-it-is"]),
    choose("Nghe câu hỏi rồi chọn câu đáp hợp với câu ấy.", ["Yes, it is.", "Yes, I do."], 1, audio="do_you_have_key", row=True,
           explain="Câu hỏi mở bằng Do, nên câu đáp dùng do: Yes, I do.", review=["w2-l3/yes-i-do"]),
    choose("Chọn a hay an trước từ appointment.", ["a", "an"], 1, row=True, explain="appointment bắt đầu bằng một nguyên âm: an appointment.", review=["w2-l3/appointment"]),
    choose("Chọn a hay an trước từ passport.", ["a", "an"], 0, row=True, explain="passport bắt đầu bằng phụ âm /p/: a passport.", review=["w2-l3/passport"]),
    choose("Chọn a hay an trước cụm insurance card.", ["a", "an"], 1, row=True, explain="insurance bắt đầu bằng một nguyên âm: an insurance card.", review=["w2-l3/insurance-card"]),
    order("Bấm lần lượt các chữ để xếp thành câu hỏi \"Bạn có bằng lái xe không?\".", ["have", "Do", "a", "you", "driver's license"], ["Do", "you", "have", "a", "driver's license"],
          "do_you_have_license", "Bạn có bằng lái xe không?", review=["w2-l3/drivers-license"]),
])

L.say("q_passport", "Do you have a passport?", "staff", contour="rise")
L.say("q_card_please", "Your insurance card, please.", "staff")
L.part("noi", "Nói", [
    text(None, "Bạn đóng vai Lan ở quầy tiếp tân. Với mỗi câu, bạn nghe câu hỏi của nhân viên, thu âm câu trả lời, rồi so với câu trả lời mẫu."),
    speak("appt", "Nhân viên hỏi bạn có hẹn trước không. Bạn đáp có.", "yes_i_do", "Yes, I do.", ask="do_you_have_appt", focus="Nghe xem bạn có đọc đủ âm /s/ ở cuối Yes không."),
    speak("card", "Nhân viên hỏi thẻ bảo hiểm. Bạn đáp có và đưa thẻ.", "yes_here", "Yes, I do. Here you go.", ask="do_you_have_card", focus="Nghe xem Here you go có liền một hơi không."),
    speak("license", "Nhân viên hỏi bằng lái xe. Bạn đáp không, và nói mình có hộ chiếu.", "no_passport", "No, I don't. I have a passport.", ask="do_you_have_license", focus="Nghe xem bạn có đọc âm /v/ ở cuối have không."),
    quick("desk", ["Bây giờ bạn tập đáp ngay. Bạn vẫn ở quầy tiếp tân: bạn có hẹn trước, có thẻ bảo hiểm và hộ chiếu, nhưng không có bằng lái xe. Có một câu nhân viên nói hơi khác bài học."], [
        ("do_you_have_appt", "yes_i_do", "Yes, I do.", ["w2-l3/yes-i-do"]),
        ("do_you_have_license", "no_i_dont", "No, I don't.", ["w2-l3/no-i-dont"]),
        ("q_passport", "yes_here", "Yes, I do. Here you go.", ["w2-l3/passport"]),
        ("q_card_please", "here_you_go", "Here you go.", ["w2-l3/here-you-go"], "Câu này không có Do you have, nhưng cũng là xin bạn đưa thẻ."),
    ]),
])

L.say("w1", "Do you have an appointment?", "staff", contour="rise")
L.say("w2", "Yes, I do. Here you go.", "lan")
L.part("viet", "Viết", [
    dictation("w1", "Do you have an appointment?", review=["w2-l3/do-you-have", "w2-l3/appointment"]),
    dictation("w2", "Yes, I do. Here you go.", review=["w2-l3/here-you-go"]),
])

for id, en, vi, a in [
    ("do-you-have", "Do you have an appointment?", "Bạn có hẹn trước không?", "do_you_have_appt"), ("yes-i-do", "Yes, I do.", "Có.", "yes_i_do"),
    ("no-i-dont", "No, I don't.", "Không.", "no_i_dont"), ("i-have-a", "I have a passport.", "Tôi có hộ chiếu.", "i_have_a_passport"),
    ("here-you-go", "Here you go.", "Đây ạ. (khi đưa một vật)", "here_you_go"), ("appointment", "an appointment", "cuộc hẹn", "an_appointment"),
    ("insurance-card", "an insurance card", "thẻ bảo hiểm", "an_insurance_card"), ("passport", "a passport", "hộ chiếu", "a_passport"),
    ("drivers-license", "a driver's license", "bằng lái xe", "a_drivers_license"),
]:
    L.card(id, en, vi, a)
L.save()

import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from common import *

L = Lesson(
    "w2-l1", "Cái này là gì?",
    "Hết bài này, bạn hỏi được một vật là gì, nói được tên vật ấy với a hoặc an, và đáp được có hoặc không khi người khác hỏi Is it a…?",
    ["lan", "minh"],
    realTask="Hôm nay, bạn cầm lần lượt năm đồ vật trong túi hay trong nhà và nói to tên chúng theo mẫu It's a… Vật nào chưa biết tên tiếng Anh thì bạn để dành, bài 6 sẽ dạy cách hỏi.",
    canDo=["Hỏi một vật là gì bằng What's this? và What's that?", "Nói tên một vật với It's a… hoặc It's an…", "Đáp Yes, it is hoặc No, it isn't khi được hỏi Is it a…?"],
)

dlg = L.dialogue("Dọn túi xách", [
    ("minh", "d1", "What's this?", [("What's", "là gì"), ("this?", "cái này?")], "Cái này là gì?"),
    ("lan", "d2", "It's a key.", [("It's", "đó là"), ("a key.", "một chiếc chìa khóa.")], "Đó là chìa khóa."),
    ("minh", "d3", "And this? Is it a phone?", [("And this?", "còn cái này?"), ("Is it", "có phải nó là"), ("a phone?", "một cái điện thoại không?")], "Còn cái này? Có phải điện thoại không?"),
    ("lan", "d4", "No, it isn't. It's a map.", [("No,", "không,"), ("it isn't.", "không phải."), ("It's", "đó là"), ("a map.", "một tấm bản đồ.")], "Không phải. Đó là bản đồ."),
    ("minh", "d5", "What's that?", [("What's", "là gì"), ("that?", "cái kia?")], "Cái kia là gì?"),
    ("lan", "d6", "It's an umbrella.", [("It's", "đó là"), ("an umbrella.", "một cái ô.")], "Đó là cái ô."),
])

for id, t in [("whats_this", "What's this?"), ("whats_that", "What's that?")]:
    L.say(id, t, "minh")
for id, t in [("its_a_key", "It's a key."), ("a_key", "a key"), ("a_phone", "a phone"), ("a_bag", "a bag"), ("a_map", "a map"),
              ("a_pen", "a pen"), ("a_wallet", "a wallet"), ("an_umbrella", "an umbrella"), ("an_apple", "an apple"), ("an_id", "an ID"),
              ("yes_it_is", "Yes, it is."), ("no_it_isnt", "No, it isn't."), ("its_not_a_phone", "It's not a phone."),
              ("key_and_phone", "a key and a phone"), ("its_an_umbrella", "It's an umbrella."), ("no_map", "No, it isn't. It's a map.")]:
    L.say(id, t, "lan")
L.audio["a_key"]["voice"] = "af_bella"  # giọng af_heart đọc key thành "ki-a"
L.audio["an_id"]["voice"] = "af_bella"  # giọng af_heart đọc ID gần thành "idea"
L.say("is_it_a_phone", "Is it a phone?", "minh", contour="rise")
L.say("m_is_it", "Is it a phone?", "lan", contour="rise")

L.part("nghe", "Nghe", [
    text("Trong túi xách", "Minh giúp Lan dọn túi xách và hỏi tên từng món. Bạn nghe đoạn hội thoại ba lượt như ở tuần 1: lượt đầu có nghĩa tiếng Việt của từng cụm, lượt hai có bản dịch cả câu, lượt ba chỉ có tiếng."),
    *dlg,
])

L.part("hoc", "Học", [
    text("Hỏi một vật là gì",
         "{{whats_this|Cái này là gì?}} hỏi về vật ở gần, trong tay hay ngay trước mặt. {{whats_that|Cái kia là gì?}} hỏi về vật ở xa hơn.",
         "Bạn đáp It's a… (Đó là một…) rồi nói tên vật, như {{its_a_key|Đó là chìa khóa.}}"),
    text("It's nối liền vào a",
         "It's là cách nói gọn của It is, giống I'm là cách nói gọn của I am ở tuần 1.",
         "Khi nói, âm s của It's nối liền vào a, nghe như một chữ: {{its_a_key}}"),
    text("a đứng trước tên một vật",
         "Tiếng Anh đặt a trước tên một vật: {{a_key|chìa khóa}}, {{a_phone|điện thoại}}, {{a_bag|túi}}, {{a_map|bản đồ}}, {{a_pen|bút}}, {{a_wallet|ví}}.",
         "Tiếng Việt nói \"đó là chìa khóa\" được, còn tiếng Anh không bỏ a được. Bạn nói It's a key, không nói It's key."),
    text("Khi nào dùng an",
         "Từ nào bắt đầu bằng một nguyên âm thì dùng an: {{an_umbrella|ô, dù}}, {{an_apple|quả táo}}. Âm n của an nối sang từ sau.",
         "Quy tắc này theo âm, không theo chữ viết. {{an_id|giấy tờ tùy thân}} dùng an vì chữ I đọc là /aɪ/, bắt đầu bằng một nguyên âm."),
    text("Hỏi có phải hay không",
         "Muốn hỏi có phải một vật nào đó không, bạn đảo It và is: {{is_it_a_phone|Có phải điện thoại không?}}",
         "Người kia đáp {{yes_it_is|Đúng vậy.}} hoặc {{no_it_isnt|Không phải.}} Câu đáp ngắn không dùng It's ở cuối: bạn nói Yes, it is, không nói Yes, it's."),
    text("Nói một vật không phải là gì",
         "Muốn nói một vật không phải là gì, bạn thêm not: {{its_not_a_phone|Đó không phải điện thoại.}}"),
    text("and đọc lướt",
         "Khi nói nhanh, and đọc lướt rất nhẹ, gần như chỉ còn âm n: {{key_and_phone|một chiếc chìa khóa và một cái điện thoại}}."),
])

AN = "Từ bắt đầu bằng một nguyên âm thì dùng an."
L.part("luyen", "Luyện", [
    choose("Minh cầm một chiếc chìa khóa và hỏi bạn. Nghe câu hỏi rồi chọn câu đáp đúng.",
           ["It's a key.", "It's key.", "It's a phone."], 0, audio="whats_this",
           explain="Tên một vật cần có a đứng trước: It's a key.", review=["w2-l1/its-a", "w2-l1/key"]),
    choose("Chọn a hay an trước từ phone.", ["a", "an"], 0, row=True, explain="phone bắt đầu bằng phụ âm /f/, nên dùng a: a phone.", review=["w2-l1/phone"]),
    choose("Chọn a hay an trước từ umbrella.", ["a", "an"], 1, row=True, explain=f"{AN} an umbrella.", review=["w2-l1/umbrella"]),
    choose("Chọn a hay an trước từ map.", ["a", "an"], 0, row=True, explain="map bắt đầu bằng phụ âm /m/, nên dùng a: a map.", review=["w2-l1/map"]),
    choose("Chọn a hay an trước từ apple.", ["a", "an"], 1, row=True, explain=f"{AN} an apple."),
    choose("Chọn a hay an trước từ ID.", ["a", "an"], 1, row=True, explain="Chữ I đọc là /aɪ/, bắt đầu bằng một nguyên âm: an ID.", review=["w2-l1/id"]),
    choose("Minh chỉ vào tấm bản đồ và hỏi bạn. Nghe câu hỏi rồi chọn câu đáp đúng.",
           ["No, it isn't. It's a map.", "Yes, it is.", "No, it's."], 0, audio="is_it_a_phone",
           explain="Vật ấy là bản đồ, nên bạn đáp No, it isn't. Câu đáp ngắn không kết thúc bằng it's.", review=["w2-l1/no-it-isnt", "w2-l1/is-it-a"]),
    order("Bấm lần lượt các chữ để xếp thành câu \"Đó không phải điện thoại\".", ["not", "It's", "phone", "a"], ["It's", "not", "a", "phone"], "its_not_a_phone", "Đó không phải điện thoại."),
])

L.part("noi", "Nói", [
    text(None, "Ở phần này, bạn nghe câu mẫu, thu âm câu của mình, rồi nghe lại và so với mẫu. Mỗi câu có một điểm cần chú ý khi nghe lại bản thu."),
    speak("key", "Nói tên chiếc chìa khóa.", "its_a_key", "It's a key.", focus="Nghe xem âm s của It's có nối liền vào a không."),
    speak("umbrella", "Nói tên cái ô.", "its_an_umbrella", "It's an umbrella.", focus="Nghe xem âm n của an có nối sang umbrella không."),
    speak("isit", "Hỏi xem đó có phải điện thoại không.", "m_is_it", "Is it a phone?", focus="Nghe xem giọng bạn có lên ở cuối câu không."),
    speak("nomap", "Đáp rằng đó là tấm bản đồ.", "no_map", "No, it isn't. It's a map.", focus="Nghe xem bạn có đọc đủ âm /p/ ở cuối map không."),
])

L.say("w1", "It's an umbrella.", "lan")
L.say("w2", "Is it a phone?", "minh", contour="rise")
L.part("viet", "Viết", [
    dictation("w1", "It's an umbrella.", review=["w2-l1/umbrella"]),
    dictation("w2", "Is it a phone?", review=["w2-l1/is-it-a"]),
    {"type": "write", "mode": "intro", "prompt": "Gõ tên một vật bạn đang cầm hay đang ở gần bạn, theo mẫu It's a… hoặc It's an…", "example": "It's a pen.",
     "pattern": "\\bit'?s an? [a-z]", "patternOk": "Đúng rồi. Câu của bạn đúng mẫu. App không kiểm tên vật.",
     "patternHelp": "Câu này cần bắt đầu bằng It's a hoặc It's an, rồi đến tên vật. Ví dụ:"},
])

for id, en, vi, a in [
    ("whats-this", "What's this?", "Cái này là gì?", "whats_this"), ("whats-that", "What's that?", "Cái kia là gì?", "whats_that"),
    ("its-a", "It's a key.", "Đó là chìa khóa.", "its_a_key"), ("is-it-a", "Is it a phone?", "Có phải điện thoại không?", "is_it_a_phone"),
    ("yes-it-is", "Yes, it is.", "Đúng vậy.", "yes_it_is"), ("no-it-isnt", "No, it isn't.", "Không phải.", "no_it_isnt"),
    ("key", "a key", "chìa khóa", "a_key"), ("phone", "a phone", "điện thoại", "a_phone"), ("bag", "a bag", "túi", "a_bag"),
    ("map", "a map", "bản đồ", "a_map"), ("pen", "a pen", "bút", "a_pen"), ("wallet", "a wallet", "ví", "a_wallet"),
    ("umbrella", "an umbrella", "ô, dù", "an_umbrella"), ("id", "an ID", "giấy tờ tùy thân", "an_id"),
]:
    L.card(id, en, vi, a)
L.save()

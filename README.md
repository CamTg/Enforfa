# Enforfa

Enforfa là app tự học tiếng Anh miễn phí, phi lợi nhuận, dành cho người lớn nói tiếng Việt. Mỗi ngày một bài, giảng bằng tiếng Việt, xoay quanh những việc người học sẽ gặp trong thực tế, và luyện có chủ đích những chỗ người Việt hay vướng: âm cuối, trọng âm, nguyên âm dài và ngắn, các âm tiếng Việt không có.

## Mỗi bài gồm gì

Một bài chia năm phần, người học dừng được sau bất kỳ bước nào và hôm sau học tiếp.

| Phần | Người học làm gì |
| --- | --- |
| Nghe | Nghe một đoạn hội thoại ba lượt: có nghĩa từng cụm, có bản dịch cả câu, rồi chỉ còn tiếng |
| Học | Đọc lời giảng bằng tiếng Việt; mọi cụm tiếng Anh đều bấm vào nghe được |
| Luyện | Nghe rồi chọn câu đáp, xếp chữ thành câu, phân biệt hai cách nói |
| Nói | Thu âm giọng mình, nghe lại cạnh câu mẫu, tự đánh giá |
| Viết | Nghe một câu rồi gõ lại, tự gõ câu của mình; app chỉ ra chữ nào sai |

Học xong một bài, thẻ từ của bài vào kho ôn: ôn được ngay, rồi gặp lại theo lịch cách quãng. Cuối bài có một việc nhỏ để thử ngoài đời; người học làm rồi thì đóng một con dấu, hiện trên bản đồ lộ trình.

## Chạy thử trên máy

App là trang tĩnh, không cần cài đặt hay biên dịch. Chạy một máy chủ tĩnh bất kỳ ở thư mục gốc:

```sh
python3 -m http.server 8000
```

rồi mở http://localhost:8000. Muốn thử thu âm trên điện thoại thì trang phải chạy qua HTTPS (GitHub Pages đã có sẵn).

## Cấu trúc

```
index.html          trang duy nhất của app
css/app.css         giao diện
js/main.js          trang chính, ôn từ, chuyển trang
js/lesson.js        trình chạy một bài học
js/store.js         dữ liệu của người học: lưu trên máy trước, đồng bộ sau
js/srs.js           lịch ôn thẻ từ
js/fun.js           tiếng báo, giấy màu, chuỗi ngày học, con dấu
js/map.js           bản đồ lộ trình
js/recorder.js      thu âm, lưu bản thu ngay trên máy
js/audio.js         phát âm thanh mẫu
content/course.json danh sách tuần và bài
content/w1/l1.json  nội dung một bài
audio/<id bài>/     âm thanh mẫu đã tạo sẵn
tools/build_audio.py tạo âm thanh từ nội dung bài
```

## Thêm hoặc sửa một bài

1. Viết hoặc sửa tệp `content/<tuần>/<bài>.json`, theo mẫu `content/w1/l1.json`. Trong lời giảng, `{{mã}}` sẽ thành một cụm tiếng Anh bấm nghe được, với `mã` là một mục trong phần `audio` của bài.
2. Khai báo bài trong `content/course.json` (thêm trường `file`).
3. Tạo âm thanh:

   ```sh
   pip install -r tools/requirements.txt
   python tools/build_audio.py --models /đường/dẫn/thư-mục-model
   ```

   Thư mục model cần `kokoro-v1.0.onnx` và `voices-v1.0.bin`, tải từ [kokoro-onnx releases](https://github.com/thewh1teagle/kokoro-onnx/releases). Công cụ cũng cần `ffmpeg` có bộ lọc `rubberband` (bản ffmpeg đầy đủ trên hầu hết hệ điều hành đều có).

Với từ dùng để dạy phát âm, luôn ghi thêm trường `ipa` trong phần `audio`. Bộ đoán phiên âm tự động có lúc đọc sai, ví dụ đọc "live" thành /laɪv/.

## Dữ liệu và quyền riêng tư

Tiến độ, thẻ từ và ghi chú lưu trong trình duyệt của người học. Bản thu âm cũng chỉ nằm trên máy người học và không được gửi đi đâu. Mọi việc đọc và ghi dữ liệu đi qua `js/store.js`; khi có tài khoản và đồng bộ, chỉ cần nối thêm ở đó.

## Giấy phép

- Mã nguồn: MIT (xem `LICENSE`).
- Nội dung bài học trong `content/` và âm thanh trong `audio/`: CC BY 4.0 (xem `CONTENT_LICENSE.md`).
- Nguồn tham khảo và công cụ bên thứ ba: xem `CREDITS.md`.

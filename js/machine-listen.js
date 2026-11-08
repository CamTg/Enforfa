// "Cho máy nghe thử": dùng bộ nhận dạng giọng nói có sẵn trong trình duyệt để
// đổi câu người học nói thành chữ, rồi tô những từ khớp với câu mẫu.
//
// Đây là một gợi ý, không phải điểm số: máy có lúc tự sửa giùm người học, có lúc
// nghe sai cả người bản ngữ. Kết quả không được lưu và không ảnh hưởng tiến độ.
//
// Âm thanh được gửi tới dịch vụ nhận dạng của trình duyệt (Google hay Apple) để đổi
// thành chữ; app báo trước và chỉ dùng khi người học đồng ý. Đường nhận dạng ngay
// trên máy đã viết sẵn nhưng đang tắt (xem ENABLE_ON_DEVICE).

import { store } from "./store.js";

const Recognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
const LANG = "en-US";

export function canMachineListen() {
  return Boolean(Recognition);
}

// Chế độ nhận dạng ngay trên máy (processLocally) đang tắt: khi thử trên Chromium 153,
// gọi SpeechRecognition.available() hay bật processLocally làm trang bị sập. Bật lại
// sau khi thử được trên điện thoại thật.
const ENABLE_ON_DEVICE = false;

/** "local" khi nhận dạng được ngay trên máy, "cloud" khi phải gửi âm thanh đi. */
export async function listenMode() {
  if (!Recognition) return null;
  if (!ENABLE_ON_DEVICE) return "cloud";
  try {
    if (typeof Recognition.available === "function") {
      const state = await Recognition.available({ langs: [LANG], processLocally: true });
      if (state === "available") return "local";
    }
  } catch (_) {}
  return "cloud";
}

export function hasConsent(mode) {
  const rec = store.get("settings", "machine-listen");
  if (!rec) return false;
  return mode === "local" ? rec.seen === true : rec.cloudOk === true;
}

export function saveConsent(mode) {
  store.put("settings", "machine-listen", mode === "local" ? { seen: true } : { seen: true, cloudOk: true });
}

/**
 * Nghe một lượt. Trả về các cách máy nghe ra (tốt nhất trước), hoặc ném lỗi có
 * mã: "no-speech", "not-allowed", "network", "aborted"...
 */
export function listenOnce(mode) {
  return new Promise((resolve, reject) => {
    const rec = new Recognition();
    rec.lang = LANG;
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    rec.continuous = false;
    if (mode === "local" && "processLocally" in rec) rec.processLocally = true;
    let done = false;
    rec.onresult = (e) => {
      done = true;
      const alts = Array.from(e.results[0] || []).map((a) => a.transcript);
      resolve(alts);
    };
    rec.onerror = (e) => {
      done = true;
      reject(e.error || "error");
    };
    rec.onend = () => {
      if (!done) reject("no-speech");
    };
    rec.start();
  });
}

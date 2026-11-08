// Những thứ làm việc học vui hơn một chút: tiếng báo và hiệu ứng khi làm đúng,
// chuỗi ngày học, và con dấu "Thử ngoài đời".
//
// Không có bảng xếp hạng hay so sánh với người khác. Mọi thứ chỉ nằm trên máy
// người học.

import { store } from "./store.js";
import { h } from "./ui.js";

const reduceMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// ---- Tiếng báo ----

export function soundOn() {
  return store.get("settings", "sound")?.on !== false;
}

export function setSoundOn(on) {
  store.put("settings", "sound", { on });
}

let ctx = null;

/** Hai nốt ngắn, nhẹ, khi người học làm đúng. Tạo bằng Web Audio, không cần tệp. */
export function chime() {
  if (!soundOn()) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const t = ctx.currentTime;
    [880, 1318.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = t + i * 0.11;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  } catch (_) {}
}

/** Hiệu ứng "đúng rồi" ngắn trên một phần tử. */
export function pop(el) {
  if (!el || reduceMotion()) return;
  el.classList.remove("pop");
  void el.offsetWidth;
  el.classList.add("pop");
}

/** Một trận "giấy màu" nhỏ khi học xong bài. */
export function celebrate(container) {
  if (reduceMotion()) return;
  const layer = h("div", { class: "confetti", "aria-hidden": "true" });
  const colors = ["var(--marker)", "var(--action)", "var(--right)"];
  for (let i = 0; i < 28; i++) {
    const piece = h("span", {});
    piece.style.left = `${Math.round((i / 28) * 100 + (i % 3) * 2)}%`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = `${(i % 7) * 60}ms`;
    piece.style.setProperty("--drift", `${((i % 5) - 2) * 18}px`);
    layer.append(piece);
  }
  container.append(layer);
  const done = () => layer.remove();
  setTimeout(done, 2200);
  // Rời trang thì dọn giấy màu luôn, khỏi rơi đè lên trang mới.
  window.addEventListener("hashchange", done, { once: true });
}

// ---- Chuỗi ngày học ----

function dayKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Ghi nhận hôm nay người học có học (đi một bước bài, hay ôn một thẻ). */
export function markActive() {
  const key = dayKey();
  if (!store.get("activity", key)) store.put("activity", key, { day: key });
}

/**
 * Số ngày học liên tiếp tính tới hôm nay (hoặc hôm qua, nếu hôm nay chưa học).
 * Mỗi bảy ngày được nghỉ một ngày mà chuỗi không đứt.
 */
export function streak() {
  const days = new Set(store.list("activity").map((r) => r.day));
  if (!days.size) return 0;
  const cursor = new Date();
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  let restUsedAt = -Infinity;
  for (let i = 0; i < 3650; i++) {
    if (days.has(dayKey(cursor))) {
      count += 1;
    } else if (count > 0 && i - restUsedAt >= 7) {
      // Ngày nghỉ được phép: chuỗi giữ nguyên nhưng ngày này không được đếm.
      restUsedAt = i;
    } else {
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

// ---- Con dấu "Thử ngoài đời" ----

export function hasStamp(lessonId) {
  return Boolean(store.get("stamps", lessonId));
}

export function addStamp(lessonId) {
  store.put("stamps", lessonId, { lessonId, at: Date.now() });
}

export function stampCount(lessonIds) {
  return lessonIds.filter((id) => hasStamp(id)).length;
}

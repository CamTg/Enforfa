// Ghi thời gian người học ở mỗi bước, để người soạn bài biết bước nào dài
// hay làm người học bị kẹt. Số liệu chỉ nằm trên máy người học, không hiện
// cho họ, và chỉ rời máy khi chính họ bấm "Xuất số liệu" ở trang giới thiệu.
//
// Chỉ tính lúc trang đang mở trên màn hình. Mỗi lượt ở một bước tính tối đa
// 10 phút, để một bài để quên trên máy không làm sai số liệu.

import { store } from "./store.js";

const MAX_VISIT_MS = 10 * 60 * 1000;
let active = null;

function onVisibility() {
  if (!active) return;
  if (document.hidden) pause(active);
  else active.since = Date.now();
}

function pause(t) {
  if (t.since != null) {
    t.ms += Date.now() - t.since;
    t.since = null;
  }
}

function flush() {
  if (!active) return;
  pause(active);
  const t = active;
  active = null;
  const id = `${t.lessonId}#${t.step}`;
  const prev = store.get("timing", id);
  store.put("timing", id, {
    lessonId: t.lessonId,
    step: t.step,
    type: t.type,
    ms: (prev?.ms || 0) + Math.min(t.ms, MAX_VISIT_MS),
    visits: (prev?.visits || 0) + 1,
    wrong: (prev?.wrong || 0) + t.wrong,
  });
}

document.addEventListener("visibilitychange", onVisibility);
window.addEventListener("pagehide", flush);

/** Bắt đầu tính giờ cho một bước; bước trước (nếu có) được lưu lại. */
export function startStep(lessonId, step, type) {
  flush();
  active = { lessonId, step, type, ms: 0, wrong: 0, since: document.hidden ? null : Date.now() };
}

/** Ghi thêm một lần chọn sai ở bước đang mở. */
export function markWrong() {
  if (active) active.wrong += 1;
}

/** Dừng tính giờ, ví dụ khi người học rời bài. */
export function stopStep() {
  flush();
}

/** Gói số liệu học thử để người học tự gửi đi. Không gồm ghi chú và bản thu. */
export function exportData() {
  const pick = (name) => store.list(name).map(({ syncedAt, deleted, ...rest }) => rest);
  return {
    app: "Enforfa",
    exportedAt: new Date().toISOString(),
    device: store.deviceId,
    progress: pick("progress"),
    timing: pick("timing"),
    marks: pick("marks"),
    cards: pick("cards").map(({ id, box, due }) => ({ id, box, due })),
  };
}

// Ôn thẻ từ theo lịch cách quãng, kiểu hộp Leitner.
// Nhớ thì thẻ lên hộp sau và lâu ngày mới gặp lại; quên thì về hộp đầu.

import { store } from "./store.js";

const DAY = 24 * 60 * 60 * 1000;
// Số ngày chờ tương ứng với từng hộp (hộp 0 là thẻ mới hoặc vừa quên).
const INTERVALS = [0, 1, 3, 7, 16, 35, 90];

/** Đưa các thẻ của một bài vào kho ôn, nếu chưa có. */
export function addCards(lessonId, cards) {
  for (const card of cards) {
    const id = `${lessonId}/${card.id}`;
    if (!store.get("cards", id)) {
      // Thẻ mới ôn được ngay sau khi học xong bài. Nhớ rồi thì lần sau là ngày mai.
      store.put("cards", id, { lessonId, cardId: card.id, box: 0, due: Date.now() });
    }
  }
}

/**
 * Đưa các thẻ lên đầu lịch ôn (đến hạn ngay), khi người học làm sai một câu có
 * dùng chúng. ids có dạng "<id bài>/<id thẻ>". Thẻ chưa có trong kho thì bỏ qua.
 */
export function bumpCards(ids) {
  for (const id of ids) {
    const card = store.get("cards", id);
    if (card) store.put("cards", id, { box: 0, due: Date.now() });
  }
}

export function dueCards(now = Date.now()) {
  return store
    .list("cards")
    .filter((c) => c.due <= now)
    .sort((a, b) => a.due - b.due);
}

export function grade(id, remembered) {
  const card = store.get("cards", id);
  if (!card) return;
  if (remembered) {
    const box = Math.min(card.box + 1, INTERVALS.length - 1);
    store.put("cards", id, { box, due: startOfDay(Date.now() + INTERVALS[box] * DAY) });
  } else {
    // Quên thì gặp lại sau mười phút, ngay trong lượt ôn này.
    store.put("cards", id, { box: 0, due: Date.now() + 10 * 60 * 1000 });
  }
}

function startOfDay(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

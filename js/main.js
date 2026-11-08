// Điểm vào của app: trang chính, ôn thẻ từ, trang giới thiệu, và chuyển trang.

import { h, icon, sayChip } from "./ui.js";
import { store } from "./store.js";
import { dueCards, grade } from "./srs.js";
import { play, audioUrl } from "./audio.js";
import { renderLesson } from "./lesson.js";
import { stopStep, exportData } from "./timing.js";

const root = document.getElementById("app");
let course = null;
const lessonCache = new Map();

async function loadJSON(url) {
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

async function getLesson(meta) {
  if (!lessonCache.has(meta.id)) lessonCache.set(meta.id, await loadJSON(meta.file));
  return lessonCache.get(meta.id);
}

function allLessons() {
  return course.weeks.flatMap((w) => w.lessons);
}

function lessonState(meta) {
  if (!meta.file) return "coming";
  const p = store.get("progress", meta.id);
  if (p?.done) return "done";
  if (p && p.step > 0) return "started";
  return "new";
}

// ---- Trang chính ----

function renderHome() {
  document.title = "Enforfa";
  const lessons = allLessons();
  const today = lessons.find((l) => l.file && lessonState(l) !== "done");
  const due = dueCards().length;

  const todayBlock = today
    ? (() => {
        const p = store.get("progress", today.id);
        const started = lessonState(today) === "started";
        const pct = started && p.total ? Math.round((p.step / p.total) * 100) : 0;
        return h(
          "section",
          { class: "today" },
          h("p", { class: "today-label" }, started ? "Học tiếp bài hôm nay" : "Bài hôm nay"),
          h("h2", {}, today.title),
          started && h("div", { class: "meter", role: "img", "aria-label": `Đã học ${pct}% bài` }, h("span", { style: `width:${pct}%` })),
          h("a", { class: "btn btn-primary btn-wide", href: `#/bai/${today.id}` }, started ? "Học tiếp" : "Bắt đầu học")
        );
      })()
    : h(
        "section",
        { class: "today" },
        h("h2", {}, "Bạn đã học hết các bài đang có"),
        h("p", {}, "Bài mới đang được soạn. Trong lúc chờ, bạn ôn thẻ từ mỗi ngày để không quên.")
      );

  const reviewBlock = h(
    "section",
    { class: "review-row" },
    due > 0
      ? h("a", { class: "btn btn-secondary btn-wide", href: "#/on-tu" }, `Ôn từ: ${due} thẻ đến hạn`)
      : h("p", { class: "hint" }, "Hôm nay chưa có thẻ từ nào đến hạn ôn.")
  );

  const weeks = course.weeks.map((week) =>
    h(
      "section",
      { class: "week" },
      h("h2", {}, week.title),
      h(
        "ol",
        { class: "lesson-list" },
        ...week.lessons.map((l, i) => {
          const state = lessonState(l);
          const label = { done: "Đã học", started: "Đang học", new: "Chưa học", coming: "Đang soạn" }[state];
          const inner = [h("span", { class: "lesson-num" }, String(i + 1)), h("span", { class: "lesson-name" }, l.title), h("span", { class: `badge badge-${state}` }, label)];
          return h("li", {}, l.file ? h("a", { class: `lesson-item is-${state}`, href: `#/bai/${l.id}` }, ...inner) : h("div", { class: "lesson-item is-coming" }, ...inner));
        })
      )
    )
  );

  root.replaceChildren(
    h(
      "header",
      { class: "home-head" },
      h("p", { class: "brand" }, "Enforfa"),
      h("p", { class: "tagline" }, "Mỗi ngày học một bài tiếng Anh.")
    ),
    h(
      "main",
      { class: "home", id: "main" },
      !store.persistent &&
        h("p", { class: "warn" }, "Trình duyệt này đang không cho lưu dữ liệu, nên tiến độ sẽ mất khi đóng trang. Bạn mở app bằng cửa sổ thường, không dùng chế độ ẩn danh."),
      todayBlock,
      reviewBlock,
      ...weeks
    ),
    h("footer", { class: "home-foot" }, h("a", { href: "#/gioi-thieu" }, "Về Enforfa và quyền riêng tư"))
  );
}

// ---- Ôn thẻ từ ----

async function renderReview() {
  document.title = "Ôn từ · Enforfa";
  const queue = dueCards();
  const metas = new Map(allLessons().map((l) => [l.id, l]));
  const lessons = new Map();
  for (const c of queue) {
    if (!lessons.has(c.lessonId) && metas.get(c.lessonId)?.file) lessons.set(c.lessonId, await getLesson(metas.get(c.lessonId)));
  }
  const items = queue
    .map((c) => {
      const lesson = lessons.get(c.lessonId);
      const card = lesson?.cards.find((x) => x.id === c.cardId);
      return card && { id: c.id, lesson, card };
    })
    .filter(Boolean);

  const body = h("main", { class: "review", id: "main", tabindex: "-1" });
  const counter = h("p", { class: "review-count" });
  root.replaceChildren(
    h(
      "header",
      { class: "lesson-head" },
      h(
        "div",
        { class: "lesson-head-row" },
        h("a", { class: "btn-back", href: "#/", "aria-label": "Về trang chính" }, icon("back")),
        h("p", { class: "lesson-title" }, "Ôn từ"),
        counter
      )
    ),
    body
  );

  let done = 0;
  const total = items.length;

  function nextCard() {
    counter.textContent = `${done}/${total}`;
    const item = items.shift();
    if (!item) {
      body.replaceChildren(
        h(
          "section",
          { class: "finish" },
          h("div", { class: "finish-mark" }, icon("check")),
          h("h1", {}, "Xong lượt ôn hôm nay"),
          h("a", { class: "btn btn-primary btn-wide", href: "#/" }, "Về trang chính")
        )
      );
      return;
    }
    const speak = (btn) => play(audioUrl(item.lesson.id, item.card.audio), btn);
    const meaning = h("p", { class: "card-meaning", hidden: true }, item.card.vi);
    const answer = h(
      "div",
      { class: "card-grade", hidden: true },
      h("button", { class: "btn btn-secondary", type: "button", onclick: () => {
        grade(item.id, false);
        items.push(item); // Gặp lại ở cuối lượt.
        nextCard();
      } }, "Chưa nhớ"),
      h("button", { class: "btn btn-primary", type: "button", onclick: () => {
        grade(item.id, true);
        done += 1;
        nextCard();
      } }, "Nhớ rồi")
    );
    const reveal = h("button", { class: "btn btn-primary btn-wide", type: "button", onclick: () => {
      meaning.hidden = false;
      answer.hidden = false;
      reveal.hidden = true;
    } }, "Xem nghĩa");
    body.replaceChildren(
      h(
        "section",
        { class: "flashcard" },
        h("p", { class: "hint" }, "Nghe từ, đọc to theo, rồi nhớ lại nghĩa trước khi bấm Xem nghĩa."),
        sayChip(item.card.en, speak, "say-big"),
        meaning,
        reveal,
        answer
      )
    );
    speak();
  }
  nextCard();
}

// ---- Giới thiệu và quyền riêng tư ----

function renderAbout() {
  document.title = "Về Enforfa";
  root.replaceChildren(
    h(
      "header",
      { class: "lesson-head" },
      h("div", { class: "lesson-head-row" }, h("a", { class: "btn-back", href: "#/", "aria-label": "Về trang chính" }, icon("back")), h("p", { class: "lesson-title" }, "Về Enforfa"))
    ),
    h(
      "main",
      { class: "about", id: "main" },
      h("h1", {}, "Enforfa là gì"),
      h("p", {}, "Enforfa là chương trình tự học tiếng Anh miễn phí, phi lợi nhuận, dành cho người lớn nói tiếng Việt mới sang Mỹ. Mỗi ngày một bài, giảng bằng tiếng Việt, xoay quanh những việc bạn sẽ gặp ngay: chào hỏi, đánh vần tên, đi khám, làm giấy tờ, đi làm."),
      h("h2", {}, "Dữ liệu của bạn"),
      h("p", {}, "Tiến độ, thẻ từ và ghi chú được lưu ngay trên điện thoại hay máy tính bạn đang dùng. App chưa có tài khoản, nên đổi máy hoặc xóa dữ liệu trình duyệt thì những thứ này sẽ mất."),
      h("p", {}, "Bản thu giọng của bạn chỉ nằm trên máy này. App không gửi bản thu đi đâu."),
      h("h2", {}, "Số liệu học thử"),
      h("p", {}, "Trong giai đoạn thử, app ghi lại bạn ở mỗi bước bao lâu, chọn sai bao nhiêu lần và tự đánh giá phần Nói ra sao, để người soạn bài biết chỗ nào cần sửa. Số liệu này cũng chỉ nằm trên máy, không gồm ghi chú hay bản thu của bạn, và chỉ được gửi đi khi bạn bấm nút dưới đây."),
      exportBlock(),
      h("h2", {}, "Giọng đọc và nguồn"),
      h("p", {}, "Giọng đọc mẫu được tạo bằng Kokoro, một công cụ chuyển văn bản thành giọng nói mã nguồn mở. Nội dung bài học phát hành theo giấy phép CC BY 4.0, mã nguồn theo giấy phép MIT."),
      h("p", {}, h("a", { href: "https://github.com/CamTg/Enforfa" }, "Mã nguồn của Enforfa trên GitHub"))
    )
  );
}

function exportBlock() {
  const status = h("p", { class: "hint", role: "status" });
  const button = h("button", { class: "btn btn-secondary btn-wide", type: "button" }, "Xuất số liệu học thử");
  button.addEventListener("click", async () => {
    const date = new Date().toISOString().slice(0, 10);
    const name = `enforfa-so-lieu-${date}.json`;
    const file = new File([JSON.stringify(exportData(), null, 2)], name, { type: "application/json" });
    // Trên điện thoại, mở bảng chia sẻ để gửi thẳng qua tin nhắn hay email.
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Số liệu học thử Enforfa" });
        status.textContent = "Đã mở bảng chia sẻ. Bạn chọn cách gửi tệp cho người phụ trách đợt thử.";
        return;
      } catch (err) {
        if (err?.name === "AbortError") return;
      }
    }
    const url = URL.createObjectURL(file);
    const a = h("a", { href: url, download: name });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = `Đã tải tệp ${name} về máy. Bạn gửi tệp này cho người phụ trách đợt thử.`;
  });
  return h("div", { class: "export" }, button, status);
}

// ---- Chuyển trang ----

async function route() {
  // Rời bài bằng nút quay lại của trình duyệt cũng phải dừng tính giờ.
  stopStep();
  const hash = location.hash || "#/";
  try {
    if (hash.startsWith("#/bai/")) {
      const meta = allLessons().find((l) => l.id === hash.slice(6));
      if (!meta?.file) return renderHome();
      const lesson = await getLesson(meta);
      document.title = `${lesson.title} · Enforfa`;
      renderLesson(root, lesson, { onExit: () => (location.hash = "#/") });
    } else if (hash === "#/on-tu") {
      await renderReview();
    } else if (hash === "#/gioi-thieu") {
      renderAbout();
    } else {
      renderHome();
    }
  } catch (err) {
    console.error(err);
    root.replaceChildren(
      h("main", { class: "home", id: "main" }, h("p", { class: "warn" }, "Không tải được bài. Bạn kiểm tra kết nối mạng rồi mở lại trang."), h("a", { class: "btn btn-secondary", href: "#/" }, "Về trang chính"))
    );
  }
}

window.addEventListener("hashchange", route);

loadJSON("content/course.json")
  .then((data) => {
    course = data;
    route();
  })
  .catch(() => {
    root.replaceChildren(h("main", { class: "home" }, h("p", { class: "warn" }, "Không tải được app. Bạn kiểm tra kết nối mạng rồi mở lại trang.")));
  });

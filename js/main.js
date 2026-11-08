// Điểm vào của app: trang chính, ôn thẻ từ, trang giới thiệu, và chuyển trang.

import { h, icon, sayChip } from "./ui.js";
import { store } from "./store.js";
import { dueCards, grade } from "./srs.js";
import { play, audioUrl } from "./audio.js";
import { renderLesson } from "./lesson.js";
import { stopStep, exportData } from "./timing.js";
import { renderMap } from "./map.js";

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

// Tuần đang học: tuần đầu tiên còn bài chưa học xong.
function progressPosition() {
  const current = course.weeks.find((w) => w.lessons.some((l) => lessonState(l) !== "done")) || course.weeks.at(-1);
  const number = current?.number || 1;
  const stage = course.stages.find((st) => number >= st.from && number <= st.to) || course.stages[0];
  return { number, stage };
}

function weekState(n) {
  const { number } = progressPosition();
  if (n < number) return "done";
  if (n === number) return "current";
  return "future";
}

function renderMapPage() {
  document.title = "Lộ trình · Enforfa";
  const { number } = progressPosition();
  root.replaceChildren(
    h(
      "header",
      { class: "lesson-head" },
      h("div", { class: "lesson-head-row" }, h("a", { class: "btn-back", href: "#/", "aria-label": "Về trang chính" }, icon("back")), h("p", { class: "lesson-title" }, "Lộ trình"))
    ),
    h("main", { class: "map-page", id: "main" }, renderMap(course, number, weekState))
  );
  const here = root.querySelector(".map-week.is-current");
  if (here) here.scrollIntoView({ block: "center" });
}

// ---- Chào người mới ----

function isInstalled() {
  return window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;
}

function renderWelcome() {
  document.title = "Chào bạn · Enforfa";
  const first = allLessons().find((l) => l.file);
  const screens = [
    () => [
      h("h1", {}, "Chào bạn đến với Enforfa"),
      h("p", {}, "Enforfa giúp bạn học tiếng Anh từ con số không, mỗi ngày một bài khoảng 30 phút, giảng bằng tiếng Việt."),
      h("p", {}, `Chương trình dài ${course.totalWeeks} tuần, đưa bạn tới trình độ đủ để giao tiếp và làm việc với người nói tiếng Anh. App miễn phí và không cần tài khoản.`),
    ],
    () => [
      h("h1", {}, "Cách học"),
      h("p", {}, "Mỗi bài có năm phần nối nhau: Nghe, Học, Luyện, Nói và Viết."),
      h("p", {}, "Cụm tiếng Anh nào được tô màu vàng thì bấm vào là nghe. Bạn thử bấm vào cụm dưới đây:"),
      sayChip("Hello", (btn) => play(audioUrl(first.id, "hello"), btn), "say-big", "Xin chào"),
      h("p", {}, "Mỗi ngày, trước khi học bài mới, bạn ôn các thẻ từ đến hạn ở trang chính. Bạn dừng được ở bất cứ bước nào, và lần sau mở app, bài tiếp tục từ chỗ đó."),
    ],
    () => {
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const parts = [h("h1", {}, "Đưa Enforfa ra màn hình chính")];
      parts.push(h("p", {}, "Khi Enforfa nằm trên màn hình chính, bạn mở app như mọi ứng dụng khác, không phải gõ địa chỉ. Những bài đã mở trước đó vẫn học được khi không có mạng."));
      if (installPrompt) {
        const btn = h("button", { class: "btn btn-secondary btn-wide", type: "button" }, "Thêm vào màn hình chính");
        btn.addEventListener("click", async () => {
          installPrompt.prompt();
          await installPrompt.userChoice.catch(() => {});
          installPrompt = null;
          btn.replaceWith(h("p", { class: "hint" }, "Xong. Từ nay bạn mở Enforfa từ màn hình chính."));
        });
        parts.push(btn);
      } else if (ios) {
        parts.push(h("p", {}, "Trên iPhone, bạn mở trang này bằng Safari, bấm nút Chia sẻ (hình vuông có mũi tên chỉ lên) ở thanh dưới, rồi chọn Thêm vào màn hình chính."));
      } else {
        parts.push(h("p", {}, "Bạn mở menu của trình duyệt (thường là nút ba chấm ở góc trên), rồi chọn Thêm vào màn hình chính hoặc Cài đặt ứng dụng."));
      }
      return parts;
    },
  ];
  const order = isInstalled() ? screens.slice(0, 2) : screens;
  let i = 0;
  const body = h("main", { class: "welcome", id: "main", tabindex: "-1" });
  const dots = h("p", { class: "welcome-dots", "aria-hidden": "true" });
  const nextBtn = h("button", { class: "btn btn-primary", type: "button" });
  const skip = h("button", { class: "btn btn-quiet", type: "button" }, "Bỏ qua");
  const finish = () => {
    store.put("settings", "onboarded", { at: Date.now() });
    location.hash = first ? `#/bai/${first.id}` : "#/";
  };
  skip.addEventListener("click", () => {
    store.put("settings", "onboarded", { at: Date.now() });
    // Khi mở lại từ trang giới thiệu, địa chỉ đang là #/chao-mung; đổi về trang chính.
    if (location.hash === "#/" || location.hash === "") route();
    else location.hash = "#/";
  });
  nextBtn.addEventListener("click", () => {
    if (i < order.length - 1) {
      i += 1;
      draw();
    } else finish();
  });
  function draw() {
    body.replaceChildren(...order[i](), dots);
    dots.textContent = order.map((_, k) => (k === i ? "●" : "○")).join(" ");
    nextBtn.textContent = i < order.length - 1 ? "Tiếp tục" : "Bắt đầu bài 1";
    body.focus({ preventScroll: true });
  }
  root.replaceChildren(
    h("header", { class: "home-head" }, h("p", { class: "brand" }, "Enforfa")),
    body,
    h("footer", { class: "lesson-foot" }, skip, nextBtn)
  );
  draw();
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

  const weeks = course.weeks.map((week) => {
    const ready = week.lessons.filter((l) => l.file).length;
    return h(
      "section",
      { class: "week" },
      h("h2", {}, week.title),
      week.goal && h("p", { class: "week-goal" }, week.goal),
      h(
        "ol",
        { class: "lesson-list" },
        ...week.lessons.map((l, i) => {
          const state = lessonState(l);
          const num = h("span", { class: "lesson-num" }, String(i + 1));
          const name = h("span", { class: "lesson-name" }, l.title);
          if (!l.file) return h("li", {}, h("div", { class: "lesson-item is-coming" }, num, name));
          const label = { done: "Đã học", started: "Đang học", new: "Chưa học" }[state];
          return h("li", {}, h("a", { class: `lesson-item is-${state}`, href: `#/bai/${l.id}` }, num, name, h("span", { class: `badge badge-${state}` }, label)));
        })
      ),
      ready < week.lessons.length &&
        h("p", { class: "hint week-note" }, `Đã có ${ready} trên ${week.lessons.length} bài của tuần. Các bài còn lại đang được soạn.`)
    );
  });

  // Thẻ lộ trình: tuần đang học, chặng đang ở, và lối vào bản đồ.
  const { number: weekNo, stage } = progressPosition();
  const roadmap =
    course.stages &&
    h(
      "a",
      { class: "roadmap-card", href: "#/lo-trinh" },
      h("span", { class: "roadmap-label" }, "Lộ trình"),
      h("span", { class: "roadmap-main" }, `Tuần ${weekNo} trên ${course.totalWeeks} · Chặng ${stage.id}: ${stage.title}`),
      h("span", { class: "meter" }, h("span", { style: `width:${Math.round(((weekNo - 1) / course.totalWeeks) * 100)}%` })),
      h("span", { class: "roadmap-cta" }, "Xem bản đồ lộ trình")
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
      roadmap,
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
      h("p", {}, "Enforfa là chương trình tự học tiếng Anh miễn phí, phi lợi nhuận, dành cho người lớn nói tiếng Việt. Chương trình giúp bạn nghe, nói, đọc, viết đủ để giao tiếp và làm việc với người nói tiếng Anh: từ chào hỏi, đánh vần tên, tới đi khám, làm giấy tờ và đi làm."),
      h("h2", {}, "Dữ liệu của bạn"),
      h("p", {}, "Tiến độ, thẻ từ và ghi chú được lưu ngay trên điện thoại hay máy tính bạn đang dùng. App chưa có tài khoản, nên đổi máy hoặc xóa dữ liệu trình duyệt thì những thứ này sẽ mất."),
      h("p", {}, "Bản thu giọng của bạn chỉ nằm trên máy này. App không gửi bản thu đi đâu."),
      h("p", {}, "Ở phần Nói, nút Cho máy nghe thử dùng bộ nhận dạng giọng nói của trình duyệt để đổi câu bạn nói thành chữ. Để làm việc này, câu bạn nói được gửi tới dịch vụ nhận dạng của Google hoặc Apple, nên app hỏi ý bạn trước lần dùng đầu tiên. Nút này không bắt buộc, và app không lưu câu ấy."),
      h("h2", {}, "Số liệu học thử"),
      h("p", {}, "Trong giai đoạn thử, app ghi lại bạn ở mỗi bước bao lâu, chọn sai bao nhiêu lần và tự đánh giá phần Nói ra sao, để người soạn bài biết chỗ nào cần sửa. Số liệu này cũng chỉ nằm trên máy, không gồm ghi chú hay bản thu của bạn, và chỉ được gửi đi khi bạn bấm nút dưới đây."),
      exportBlock(),
      h("h2", {}, "Nguồn và ghi công"),
      h("p", {}, "Giọng đọc mẫu được tạo bằng Kokoro, một công cụ chuyển văn bản thành giọng nói mã nguồn mở. Nội dung bài học phát hành theo giấy phép CC BY 4.0, mã nguồn theo giấy phép MIT."),
      h("p", {}, "Một số hội thoại và ý tưởng bài học được phỏng theo các tài liệu sau:"),
      h(
        "ul",
        { class: "credits" },
        h("li", {}, "Let's Learn English, Level 1, của Voice of America (VOA) Learning English. Nội dung do VOA sản xuất thuộc phạm vi công cộng."),
        h("li", {}, "English Language Proficiency Standards for Adult Education (2016), của Bộ Giáo dục Hoa Kỳ."),
        h("li", {}, "Teaching English as a Foreign Language to Large, Multilevel Classes (1992), của Peace Corps.")
      ),
      h("p", {}, h("a", { href: "#/chao-mung" }, "Xem lại hướng dẫn cách học")),
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
    } else if (hash === "#/chao-mung") {
      renderWelcome();
    } else if (hash === "#/lo-trinh") {
      renderMapPage();
    } else if (hash === "#/gioi-thieu") {
      renderAbout();
    } else if (!store.get("settings", "onboarded") && store.list("progress").length === 0) {
      renderWelcome();
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

// ---- Cài app và chạy khi không có mạng ----

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}

// Android và Chrome cho phép hiện hộp cài app; giữ sự kiện lại để nút "Thêm vào
// màn hình chính" dùng khi người học bấm.
let installPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installPrompt = e;
});

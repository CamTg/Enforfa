// Trình chạy một bài học: đi qua từng bước của các phần Nghe, Học, Luyện, Nói.

import { h, icon, sayChip } from "./ui.js";
import { play, stop, audioUrl, isSlow, setSlow } from "./audio.js";
import { store } from "./store.js";
import { addCards } from "./srs.js";
import { canRecord, startRecording, saveClip, getClip } from "./recorder.js";
import { startStep, stopStep, markWrong } from "./timing.js";

export function renderLesson(root, lesson, { onExit: exitLesson }) {
  const onExit = () => {
    stopStep();
    exitLesson();
  };
  const steps = [];
  lesson.parts.forEach((part, partIndex) => {
    part.steps.forEach((step) => steps.push({ part, partIndex, step }));
  });

  const saved = store.get("progress", lesson.id);
  let index = saved && !saved.done ? Math.min(saved.step || 0, steps.length - 1) : 0;
  let finished = false;

  const sound = (audioId) => (button) => play(audioUrl(lesson.id, audioId), button);
  const text = (audioId) => lesson.audio[audioId]?.text ?? audioId;

  // Đổi chuỗi có {{mã}} thành câu có cụm tiếng Anh bấm nghe được.
  function richText(str) {
    const out = [];
    let last = 0;
    for (const m of str.matchAll(/\{\{(\w+)\}\}/g)) {
      out.push(str.slice(last, m.index));
      out.push(sayChip(text(m[1]), sound(m[1])));
      last = m.index + m[0].length;
    }
    out.push(str.slice(last));
    return out;
  }

  const main = h("main", { class: "lesson-body", id: "main", tabindex: "-1" });
  const nextBtn = h("button", { class: "btn btn-primary", type: "button", onclick: next }, "Tiếp tục");
  const prevBtn = h("button", { class: "btn btn-quiet", type: "button", onclick: prev }, "Quay lại");
  const partNav = h("ol", { class: "parts", "aria-label": "Các phần của bài" });
  const slowToggle = h(
    "button",
    {
      class: "btn-slow",
      type: "button",
      "aria-pressed": String(isSlow()),
      onclick: () => {
        setSlow(!isSlow());
        slowToggle.setAttribute("aria-pressed", String(isSlow()));
      },
    },
    "Nghe chậm"
  );

  root.replaceChildren(
    h(
      "header",
      { class: "lesson-head" },
      h(
        "div",
        { class: "lesson-head-row" },
        h("button", { class: "btn-back", type: "button", onclick: onExit, "aria-label": "Về trang chính" }, icon("back")),
        h("p", { class: "lesson-title" }, lesson.title),
        slowToggle
      ),
      partNav
    ),
    main,
    h("footer", { class: "lesson-foot" }, prevBtn, nextBtn)
  );

  function setReady(ready) {
    nextBtn.disabled = !ready;
  }

  // Mỗi phần có một thanh chạy theo số bước đã đi trong phần đó.
  function drawParts() {
    const here = finished ? null : steps[index];
    partNav.replaceChildren(
      ...lesson.parts.map((part, i) => {
        const total = part.steps.length;
        let filled;
        if (finished || (here && here.partIndex > i)) filled = total;
        else if (here && here.partIndex === i) filled = steps.slice(0, index + 1).filter((s) => s.partIndex === i).length;
        else filled = 0;
        const current = here?.partIndex === i;
        const pct = Math.round((filled / total) * 100);
        return h(
          "li",
          {
            class: `part${current ? " is-current" : ""}${filled === total ? " is-done" : ""}`,
            "aria-current": current ? "step" : false,
          },
          h("span", { class: "part-name" }, part.title),
          h("span", { class: "part-track", "aria-hidden": "true" }, h("span", { class: "part-fill", style: `width:${pct}%` })),
          h("span", { class: "visually-hidden" }, `, đã đi ${filled} trên ${total} bước`)
        );
      })
    );
  }

  function show() {
    const { step } = steps[index];
    store.put("progress", lesson.id, { step: index, total: steps.length, done: saved?.done || false });
    drawParts();
    startStep(lesson.id, index, step.type);
    prevBtn.hidden = index === 0;
    nextBtn.textContent = index === steps.length - 1 ? "Xong bài" : "Tiếp tục";
    setReady(true);
    const view = STEP_VIEWS[step.type](step);
    main.replaceChildren(view);
    main.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function next() {
    if (index < steps.length - 1) {
      index += 1;
      show();
    } else {
      finish();
    }
  }

  function prev() {
    if (index > 0) {
      index -= 1;
      show();
    }
  }

  function finish() {
    finished = true;
    stopStep();
    addCards(lesson.id, lesson.cards || []);
    store.put("progress", lesson.id, { step: steps.length, total: steps.length, done: true, doneAt: Date.now() });
    drawParts();
    prevBtn.hidden = true;
    nextBtn.textContent = "Về trang chính";
    nextBtn.onclick = onExit;
    nextBtn.disabled = false;
    // Gỡ hàm next cũ để nút không chạy hai việc.
    nextBtn.removeEventListener("click", next);

    const note = store.get("notes", lesson.id);
    const area = h("textarea", { id: "note", rows: "4", placeholder: "Ví dụ: câu nào còn khó, từ nào muốn hỏi lại" });
    area.value = note?.text || "";
    let timer;
    area.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(() => store.put("notes", lesson.id, { text: area.value }), 400);
    });

    main.replaceChildren(
      h(
        "section",
        { class: "finish" },
        h("div", { class: "finish-mark" }, icon("check")),
        h("h1", {}, "Bạn đã học xong bài này"),
        h("p", {}, `${(lesson.cards || []).length} thẻ từ của bài này đã được thêm vào phần ôn. Từ ngày mai, khi có thẻ đến hạn, trang chính sẽ hiện nút Ôn từ.`),
        h("label", { for: "note", class: "field-label" }, "Ghi chú của bạn cho bài này"),
        area,
        h("p", { class: "hint" }, "Ghi chú tự lưu trên máy này.")
      )
    );
    main.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  // ---- Các kiểu bước ----

  const STEP_VIEWS = {
    text(step) {
      return h(
        "section",
        { class: "step step-text" },
        step.title && h("h1", {}, step.title),
        ...step.body.map((p) => h("p", {}, ...richText(p)))
      );
    },

    listen(step) {
      let playingAll = false;
      const playAll = async (button) => {
        if (playingAll) {
          playingAll = false;
          stop();
          return;
        }
        playingAll = true;
        for (const line of step.lines) {
          const ended = await play(audioUrl(lesson.id, line.audio), button);
          // Dừng cả đoạn khi người học bấm dừng hoặc bấm nghe một câu khác.
          if (!ended || !playingAll) break;
          button.classList.add("is-playing");
          await new Promise((r) => setTimeout(r, 450));
        }
        playingAll = false;
        button.classList.remove("is-playing");
      };
      const lines = step.lines.map((line) => {
        const who = lesson.speakers[line.speaker]?.name ?? line.speaker;
        let content;
        if (step.pass === 1) {
          content = h(
            "div",
            { class: "chunks" },
            ...line.chunks.map((c) =>
              h("div", { class: "chunk" }, sayChip(c.en, sound(c.audio)), h("span", { class: "gloss" }, c.vi))
            )
          );
        } else if (step.pass === 2) {
          content = h("div", {}, sayChip(text(line.audio), sound(line.audio), "say-line"), h("p", { class: "gloss" }, line.vi));
        } else {
          content = h(
            "button",
            { class: "btn-listen", type: "button", onclick: (e) => sound(line.audio)(e.currentTarget), "aria-label": `Nghe câu của ${who}` },
            icon("play"),
            h("span", {}, "Nghe")
          );
        }
        return h("li", { class: `line line-${line.speaker}` }, h("span", { class: "who" }, who), content);
      });
      return h(
        "section",
        { class: "step step-listen" },
        h("h1", {}, step.title),
        h(
          "button",
          { class: "btn btn-secondary btn-playall", type: "button", onclick: (e) => playAll(e.currentTarget) },
          icon("play"),
          "Nghe cả đoạn"
        ),
        h("ol", { class: "dialogue" }, ...lines)
      );
    },

    choose(step) {
      setReady(false);
      const feedback = h("p", { class: "feedback", role: "status" });
      const options = step.options.map((opt) => {
        const choose = () => {
          if (opt.correct) {
            optionEls.forEach((el) => (el.disabled = true));
            chooseEl.classList.add("is-right");
            feedback.className = "feedback is-right";
            feedback.textContent = `Đúng rồi. ${step.explain || ""}`.trim();
            setReady(true);
          } else {
            markWrong();
            chooseEl.classList.add("is-wrong");
            chooseEl.disabled = true;
            feedback.className = "feedback is-wrong";
            feedback.textContent = "Chưa đúng. Bạn nghe lại rồi chọn lần nữa.";
          }
        };
        let chooseEl;
        if (opt.audio) {
          chooseEl = h("button", { class: "option-pick", type: "button", onclick: choose }, "Chọn");
          return {
            node: h(
              "div",
              { class: "option option-audio" },
              sayChip(opt.label, sound(opt.audio), "say-label"),
              chooseEl
            ),
            chooseEl,
          };
        }
        chooseEl = h("button", { class: "option", type: "button", lang: "en", onclick: choose }, opt.text);
        return { node: chooseEl, chooseEl };
      });
      const optionEls = options.map((o) => o.chooseEl);
      return h(
        "section",
        { class: "step step-choose" },
        h("h1", {}, step.prompt),
        step.audio &&
          h(
            "button",
            { class: "btn-listen btn-listen-big", type: "button", onclick: (e) => sound(step.audio)(e.currentTarget) },
            icon("play"),
            h("span", {}, "Nghe")
          ),
        h("div", { class: "options" }, ...options.map((o) => o.node)),
        feedback
      );
    },

    order(step) {
      setReady(false);
      const picked = [];
      const answerLine = h("div", { class: "order-answer", "aria-live": "polite" });
      const bank = h("div", { class: "order-bank" });
      const feedback = h("p", { class: "feedback", role: "status" });
      const tiles = step.words.map((w) => h("button", { class: "tile", type: "button", lang: "en" }, w));

      function draw() {
        answerLine.replaceChildren(
          ...(picked.length ? picked.map((t) => t) : [h("span", { class: "order-empty" }, "Bấm chữ ở dưới để xếp câu")])
        );
        bank.replaceChildren(...tiles.filter((t) => !picked.includes(t)));
        if (picked.length === tiles.length) {
          const ok = picked.map((t) => t.textContent).join(" ") === step.answer.join(" ");
          if (ok) {
            tiles.forEach((t) => (t.disabled = true));
            answerLine.classList.add("is-right");
            feedback.className = "feedback is-right";
            feedback.textContent = "Đúng rồi.";
            if (step.audio) sound(step.audio)();
            setReady(true);
          } else {
            markWrong();
            feedback.className = "feedback is-wrong";
            feedback.textContent = "Chưa đúng. Bấm vào một chữ trong câu để đưa nó về chỗ cũ, rồi xếp lại.";
          }
        } else {
          feedback.textContent = "";
          feedback.className = "feedback";
        }
      }
      tiles.forEach((t) =>
        t.addEventListener("click", () => {
          const at = picked.indexOf(t);
          if (at >= 0) picked.splice(at, 1);
          else picked.push(t);
          draw();
        })
      );
      draw();
      return h("section", { class: "step step-order" }, h("h1", {}, step.prompt), answerLine, bank, feedback);
    },

    speak(step) {
      const key = `${lesson.id}/${step.id}`;
      const status = h("p", { class: "hint", role: "status" });
      const mine = h("button", { class: "btn btn-secondary", type: "button", disabled: true }, icon("play"), "Nghe bản của bạn");
      const marks = h("div", { class: "marks", hidden: true });
      let clipUrl = null;

      async function loadExisting() {
        try {
          const clip = await getClip(`${key}:latest`);
          if (clip) useClip(clip.blob);
        } catch (_) {}
      }
      function useClip(blob) {
        if (clipUrl) URL.revokeObjectURL(clipUrl);
        clipUrl = URL.createObjectURL(blob);
        mine.disabled = false;
        mine.onclick = (e) => play(clipUrl, e.currentTarget);
        marks.hidden = false;
      }

      const recBtn = h("button", { class: "btn btn-record", type: "button" }, icon("mic"), "Thu âm");
      let stopFn = null;
      recBtn.addEventListener("click", async () => {
        if (stopFn) {
          const blob = await stopFn();
          stopFn = null;
          recBtn.classList.remove("is-recording");
          recBtn.replaceChildren(icon("mic"), "Thu lại");
          useClip(blob);
          status.textContent = "Đã lưu bản thu. Nghe câu mẫu rồi nghe bản của bạn.";
          saveClip(key, blob).catch(() => {
            status.textContent = "Nghe lại được ngay bây giờ, nhưng máy này không cho lưu bản thu.";
          });
          return;
        }
        try {
          stopFn = await startRecording();
          recBtn.classList.add("is-recording");
          recBtn.replaceChildren(icon("stop"), "Dừng");
          status.textContent = "Đang thu. Nói xong thì bấm Dừng.";
        } catch (_) {
          status.textContent = "Chưa thu được. Bạn cho phép app dùng micro trong cài đặt trình duyệt, rồi bấm Thu âm lần nữa.";
        }
      });

      const mark = store.get("marks", key);
      const markBtn = (value, label) =>
        h(
          "button",
          {
            class: `btn-mark${mark?.value === value ? " is-on" : ""}`,
            type: "button",
            "aria-pressed": String(mark?.value === value),
            onclick: (e) => {
              store.put("marks", key, { value });
              marks.querySelectorAll(".btn-mark").forEach((b) => {
                b.classList.remove("is-on");
                b.setAttribute("aria-pressed", "false");
              });
              e.currentTarget.classList.add("is-on");
              e.currentTarget.setAttribute("aria-pressed", "true");
            },
          },
          label
        );
      marks.append(h("p", {}, "Bản của bạn nghe có giống câu mẫu không?"), markBtn("same", "Giống"), markBtn("not-yet", "Chưa giống"));

      if (canRecord()) loadExisting();

      return h(
        "section",
        { class: "step step-speak" },
        h("h1", {}, step.prompt),
        h("p", { class: "say-target", lang: "en" }, step.say),
        h(
          "div",
          { class: "speak-actions" },
          h("button", { class: "btn btn-secondary", type: "button", onclick: (e) => sound(step.model)(e.currentTarget) }, icon("play"), "Nghe câu mẫu"),
          canRecord() ? recBtn : null,
          canRecord() ? mine : null
        ),
        canRecord() ? status : h("p", { class: "hint" }, "Trình duyệt này chưa cho thu âm. Bạn nói to theo câu mẫu vài lần rồi bấm Tiếp tục."),
        marks
      );
    },
  };

  show();
}

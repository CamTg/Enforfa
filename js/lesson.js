// Trình chạy một bài học: đi qua từng bước của các phần Nghe, Học, Luyện, Nói.

import { h, icon, sayChip } from "./ui.js";
import { play, stop, audioUrl, isSlow, setSlow } from "./audio.js";
import { store } from "./store.js";
import { addCards, bumpCards } from "./srs.js";
import { canRecord, startRecording, saveClip, getClip } from "./recorder.js";
import { startStep, stopStep, markWrong } from "./timing.js";
import { chime, pop, celebrate, markActive, streak, hasStamp, addStamp } from "./fun.js";
import { canMachineListen, listenMode, hasConsent, saveConsent, listenOnce } from "./machine-listen.js";

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
  // Phát một hay nhiều câu nối nhau, như hai từ cần so "giống hay khác".
  const soundAll = (ids) => async (button) => {
    const list = Array.isArray(ids) ? ids : [ids];
    for (let i = 0; i < list.length; i++) {
      const ended = await play(audioUrl(lesson.id, list[i]), button);
      if (!ended) return;
      if (i < list.length - 1) {
        button.classList.add("is-playing");
        await new Promise((r) => setTimeout(r, 600));
      }
    }
    button.classList.remove("is-playing");
  };
  // Làm sai một câu có gắn thẻ từ thì thẻ ấy lên đầu lịch ôn.
  const wrong = (step) => {
    markWrong();
    if (step?.review) bumpCards(step.review);
  };

  // Đổi chuỗi có {{mã}} thành câu có cụm tiếng Anh bấm nghe được.
  // {{mã|nghĩa}} thêm một dòng nghĩa tiếng Việt nhỏ ngay dưới cụm ấy.
  function richText(str) {
    const out = [];
    let last = 0;
    for (const m of str.matchAll(/\{\{(\w+)(?:\|([^}]+))?\}\}/g)) {
      out.push(str.slice(last, m.index));
      out.push(sayChip(text(m[1]), sound(m[1]), "", m[2] || ""));
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
    const here = finished || onIntro ? null : steps[index];
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

  // Tải sẵn toàn bộ âm thanh của bài một lần, sau âm thanh của bước đang mở,
  // để bài vẫn học được nếu mạng chập chờn hay mất hẳn giữa chừng.
  let prefetchedAll = false;
  function prefetchAll() {
    prefetchedAll = true;
    setTimeout(() => Object.keys(lesson.audio || {}).forEach((id) => fetch(audioUrl(lesson.id, id)).catch(() => {})), 1500);
  }

  // Tải sẵn âm thanh của bước, để khi người học bấm nghe (hay app tự phát)
  // thì tiếng ra ngay, không phải chờ tải qua mạng.
  function prefetch(step) {
    const ids = new Set();
    const add = (id) => id && lesson.audio[id] && ids.add(id);
    [].concat(step.audio || []).forEach(add);
    add(step.model);
    add(step.ask);
    (step.options || []).forEach((o) => add(o.audio));
    (step.lines || []).forEach((l) => {
      add(l.audio);
      (l.chunks || []).forEach((c) => add(c.audio));
    });
    (step.body || []).forEach((b) => [...b.matchAll(/\{\{(\w+)/g)].forEach((m) => add(m[1])));
    ids.forEach((id) => fetch(audioUrl(lesson.id, id)).catch(() => {}));
  }

  function show() {
    const { step } = steps[index];
    markActive();
    prefetch(step);
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
    if (onIntro) {
      onIntro = false;
      show();
      return;
    }
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

    const days = streak();
    function stampBox() {
      const box = h("div", { class: "stamp-box" });
      const draw = () => {
        if (hasStamp(lesson.id)) {
          box.replaceChildren(
            h("span", { class: "stamp", "aria-hidden": "true" }, "✓"),
            h("p", {}, "Bạn đã thử ngoài đời và nhận một con dấu. Con dấu hiện trên bản đồ lộ trình.")
          );
        } else {
          const btn = h("button", { class: "btn btn-outline", type: "button" }, "Tôi đã thử rồi");
          btn.addEventListener("click", () => {
            addStamp(lesson.id);
            chime();
            draw();
            pop(box.querySelector(".stamp"));
          });
          box.replaceChildren(h("p", { class: "hint" }, "Thử xong thì bấm nút này để nhận con dấu. Nếu bạn rời bài trước, trang chính sẽ nhắc lại."), btn);
        }
      };
      draw();
      return box;
    }

    main.replaceChildren(
      h(
        "section",
        { class: "finish" },
        h("div", { class: "finish-mark" }, icon("check")),
        h("h1", {}, "Bạn đã học xong bài này"),
        days > 1 && h("p", { class: "streak-line" }, `Bạn đã học ${days} ngày liên tiếp.`),
        h("p", {}, `${(lesson.cards || []).length} thẻ từ của bài này đã được thêm vào phần ôn. Bạn ôn ngay bây giờ được, và app sẽ nhắc ôn lại vào những ngày sau.`),
        lesson.cards?.length && h("a", { class: "btn btn-secondary btn-wide", href: "#/on-tu" }, "Ôn ngay các thẻ vừa học"),
        lesson.cards?.length && h("h2", {}, "Những gì bạn vừa học"),
        lesson.cards?.length &&
          h("div", { class: "learned" }, ...lesson.cards.map((c) => sayChip(c.en, sound(c.audio), "", c.vi))),
        lesson.realTask && h("h2", {}, "Thử ngoài đời hôm nay"),
        lesson.realTask && h("p", { class: "real-task" }, lesson.realTask),
        lesson.realTask && stampBox(),
        h("label", { for: "note", class: "field-label" }, "Ghi chú của bạn cho bài này"),
        area,
        h("p", { class: "hint" }, "Ghi chú tự lưu trên máy này.")
      )
    );
    main.focus({ preventScroll: true });
    window.scrollTo(0, 0);
    chime();
    celebrate(document.body);
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
        return h("li", { class: `line line-${line.speaker}` }, who && h("span", { class: "who" }, who), content);
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
        h("ol", { class: `dialogue${step.layout ? ` is-${step.layout}` : ""}` }, ...lines)
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
            chime();
            pop(chooseEl.closest(".option") || chooseEl);
            feedback.className = "feedback is-right";
            feedback.textContent = `Đúng rồi. ${step.explain || ""}`.trim();
            setReady(true);
          } else {
            wrong(step);
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
            { class: "btn-listen btn-listen-big", type: "button", onclick: (e) => soundAll(step.audio)(e.currentTarget) },
            icon("play"),
            h("span", {}, "Nghe")
          ),
        h("div", { class: `options${step.layout === "row" ? " is-row" : ""}` }, ...options.map((o) => o.node)),
        feedback
      );
    },

    order(step) {
      setReady(false);
      const picked = [];
      const answerLine = h("div", { class: "order-answer", "aria-live": "polite" });
      const bank = h("div", { class: "order-bank" });
      const feedback = h("p", { class: "feedback", role: "status" });
      const replay = h("div", { class: "order-replay" });
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
            chime();
            pop(answerLine);
            feedback.className = "feedback is-right";
            feedback.textContent = step.audio ? "Đúng rồi. Bấm vào câu dưới đây để nghe lại." : "Đúng rồi.";
            if (step.audio) {
              const chip = sayChip(text(step.audio), sound(step.audio), "say-line", step.gloss || "");
              replay.replaceChildren(chip);
              sound(step.audio)(chip);
            }
            setReady(true);
          } else {
            wrong(step);
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
      return h("section", { class: "step step-order" }, h("h1", {}, step.prompt), answerLine, bank, feedback, replay);
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
      const machine = step.check === false || !canMachineListen() ? null : machineCheck(step);

      return h(
        "section",
        { class: "step step-speak" },
        h("h1", {}, step.prompt),
        h("p", { class: "say-target", lang: "en" }, step.say),
        h(
          "div",
          { class: "speak-actions" },
          step.ask && h("button", { class: "btn btn-secondary", type: "button", onclick: (e) => sound(step.ask)(e.currentTarget) }, icon("play"), "Nghe câu hỏi"),
          h("button", { class: "btn btn-secondary", type: "button", onclick: (e) => sound(step.model)(e.currentTarget) }, icon("play"), step.ask ? "Nghe câu trả lời mẫu" : "Nghe câu mẫu"),
          canRecord() ? recBtn : null,
          canRecord() ? mine : null
        ),
        canRecord() ? status : h("p", { class: "hint" }, "Trình duyệt này chưa cho thu âm. Bạn nói to theo câu mẫu vài lần rồi bấm Tiếp tục."),
        machine,
        marks
      );
    },

    write(step) {
      setReady(false);
      const input = h("input", {
        class: "write-input",
        type: "text",
        lang: "en",
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: step.mode === "letters" ? "characters" : step.mode === "field" ? "words" : "sentences",
        spellcheck: "false",
        enterkeyhint: "done",
        "aria-label": step.label || "Câu bạn gõ",
      });
      const feedback = h("div", { class: "feedback", role: "status" });
      const check = h("button", { class: "btn btn-secondary btn-wide", type: "button" }, "Kiểm tra");

      function run() {
        const typed = input.value.trim();
        if (!typed) {
          feedback.className = "feedback";
          feedback.replaceChildren(h("p", {}, "Bạn gõ câu vào ô trên rồi bấm Kiểm tra."));
          return;
        }
        if (VIETNAMESE_MARKS.test(typed)) {
          wrong(step);
          feedback.className = "feedback is-wrong";
          feedback.replaceChildren(
            h(
              "p",
              {},
              step.mode === "intro"
                ? "Câu bạn gõ có dấu tiếng Việt. Khi viết bằng tiếng Anh, tên của bạn cũng viết không dấu, như Nguyễn viết là Nguyen. Nếu bàn phím tự thêm dấu, bạn đổi sang bàn phím tiếng Anh rồi gõ lại."
                : "Câu bạn gõ có dấu tiếng Việt, có lẽ bàn phím đang ở chế độ tiếng Việt. Bạn đổi sang bàn phím tiếng Anh rồi gõ lại."
            )
          );
          return;
        }
        setReady(true);
        if (step.mode === "intro") {
          const ok = (step.pattern ? new RegExp(step.pattern) : /\b(my name is|i'?m|i am)\s+[a-z]/).test(normalize(typed));
          if (ok) {
            feedback.className = "feedback is-right";
            feedback.replaceChildren(h("p", {}, step.patternOk || "Đúng rồi. Câu của bạn đúng mẫu giới thiệu."));
            chime();
            pop(input);
          } else {
            wrong(step);
            feedback.className = "feedback is-wrong";
            feedback.replaceChildren(
              h("p", {}, step.patternHelp || "Câu giới thiệu cần có My name is hoặc I'm, rồi đến tên bạn. Ví dụ:"),
              h("p", { class: "write-answer", lang: "en" }, step.example)
            );
          }
          return;
        }
        const right = (msg = "Đúng rồi.") => {
          feedback.className = "feedback is-right";
          feedback.replaceChildren(h("p", {}, msg));
          chime();
          pop(input);
        };
        if (step.mode === "letters") {
          // Đánh vần: chỉ so các chữ cái, gõ liền hay cách, hoa hay thường đều được.
          const only = (t) => t.toUpperCase().replace(/[^A-Z0-9]/g, "");
          if (only(typed) === only(step.answer)) return right();
          wrong(step);
          feedback.className = "feedback is-wrong";
          feedback.replaceChildren(
            h("p", {}, "Chưa đúng. Các chữ đúng là:"),
            h("p", { class: "write-answer", lang: "en" }, step.answer),
            h("p", {}, "Bạn nghe lại rồi gõ thêm lần nữa nếu muốn.")
          );
          return;
        }
        if (step.mode === "field") {
          // Ô trên mẫu đơn. Có đáp án thì so đáp án; không có thì người học ghi thông tin của mình.
          if (!step.answer) return right(step.done || "Đã điền.");
          if (normalize(typed) === normalize(step.answer)) return right();
          wrong(step);
          feedback.className = "feedback is-wrong";
          feedback.replaceChildren(h("p", {}, step.hint || "Chưa đúng. Ô này cần ghi:"), h("p", { class: "write-answer", lang: "en" }, step.answer));
          return;
        }
        const expected = words(step.answer);
        const got = words(typed);
        const missed = missedWords(expected, got);
        if (missed.size === 0 && got.length === expected.length) {
          feedback.className = "feedback is-right";
          feedback.replaceChildren(h("p", {}, "Đúng rồi."));
          chime();
          pop(input);
          return;
        }
        wrong(step);
        feedback.className = "feedback is-wrong";
        const shown = step.answer.split(/\s+/).map((w, i) =>
          h("span", { class: missed.has(i) ? "diff-miss" : null }, w)
        );
        feedback.replaceChildren(
          h("p", {}, "Chưa đúng hết. Câu đúng ở dưới, những chữ bạn gõ sai hoặc thiếu được gạch chân. Bạn nghe lại rồi gõ thêm lần nữa nếu muốn."),
          h("p", { class: "write-answer", lang: "en" }, ...shown.flatMap((el, i) => (i ? [" ", el] : [el])))
        );
      }

      check.addEventListener("click", run);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          run();
        }
      });

      return h(
        "section",
        { class: "step step-write" },
        h("h1", {}, step.prompt),
        step.audio &&
          h(
            "button",
            { class: "btn-listen btn-listen-big", type: "button", onclick: (e) => sound(step.audio)(e.currentTarget) },
            icon("play"),
            h("span", {}, "Nghe")
          ),
        step.mode === "intro" && h("p", { class: "hint" }, "Ví dụ: ", h("span", { lang: "en" }, step.example)),
        step.note && h("p", { class: "hint" }, step.note),
        step.mode === "field" ? h("label", { class: "form-field" }, h("span", { class: "form-label", lang: "en" }, step.label), input) : input,
        check,
        feedback
      );
    },

    // Nghe lại một đoạn rồi điền chữ còn trống. Chỗ trống ghi trong lời thoại là
    // [[1:chữ]] (có ở cả hai mức) hoặc [[2:chữ]] (chỉ có ở mức 2).
    cloze(step) {
      setReady(false);
      const key = `${lesson.id}/${step.id || "cloze"}`;
      let level = store.get("settings", "cloze-level")?.level || 1;
      const body = h("div", { class: "cloze" });
      const feedback = h("div", { class: "feedback", role: "status" });
      const check = h("button", { class: "btn btn-secondary btn-wide", type: "button" }, "Kiểm tra");
      let inputs = [];
      const levelBtns = [1, 2].map((n) =>
        h("button", { class: "btn-mark", type: "button", onclick: () => { level = n; store.put("settings", "cloze-level", { level: n }); draw(); } },
          n === 1 ? "Mức 1: ít chỗ trống" : "Mức 2: nhiều chỗ trống")
      );
      function draw() {
        levelBtns.forEach((b, i) => {
          b.classList.toggle("is-on", i + 1 === level);
          b.setAttribute("aria-pressed", String(i + 1 === level));
        });
        inputs = [];
        feedback.className = "feedback";
        feedback.replaceChildren();
        setReady(false);
        body.replaceChildren(
          ...step.lines.map((line) => {
            const who = lesson.speakers[line.speaker]?.name ?? "";
            const parts = [];
            let last = 0;
            for (const m of line.text.matchAll(/\[\[(\d):([^\]]+)\]\]/g)) {
              parts.push(line.text.slice(last, m.index));
              const [, lv, word] = m;
              if (Number(lv) <= level) {
                const input = h("input", {
                  class: "cloze-input", type: "text", lang: "en", autocomplete: "off", autocorrect: "off",
                  autocapitalize: "off", spellcheck: "false", "data-answer": word, "aria-label": "Chữ còn trống",
                  size: String(Math.max(3, word.length + 1)),
                });
                inputs.push(input);
                parts.push(input);
              } else parts.push(word);
              last = m.index + m[0].length;
            }
            parts.push(line.text.slice(last));
            return h("p", { class: "cloze-line" }, who && h("span", { class: "who" }, who), h("span", { lang: "en" }, ...parts));
          })
        );
      }
      check.addEventListener("click", () => {
        let wrongCount = 0;
        inputs.forEach((input) => {
          const ok = normalize(input.value) === normalize(input.dataset.answer);
          input.classList.toggle("is-right", ok);
          input.classList.toggle("is-wrong", !ok);
          if (!ok) wrongCount += 1;
        });
        setReady(true);
        store.put("cloze", key, { level, wrong: wrongCount, total: inputs.length });
        if (!wrongCount) {
          feedback.className = "feedback is-right";
          feedback.replaceChildren(h("p", {}, "Đúng hết rồi."));
          chime();
          pop(body);
        } else {
          wrong(step);
          feedback.className = "feedback is-wrong";
          feedback.replaceChildren(
            h("p", {}, `Còn ${wrongCount} chỗ chưa đúng, được tô đỏ. Chữ đúng là:`),
            h("p", { class: "write-answer", lang: "en" }, inputs.filter((i) => i.classList.contains("is-wrong")).map((i) => i.dataset.answer).join(", ")),
            h("p", {}, "Bạn nghe lại rồi sửa nếu muốn, hoặc bấm Tiếp tục.")
          );
        }
      });
      draw();
      const playAll = async (button) => {
        for (const line of step.lines) {
          const ended = await play(audioUrl(lesson.id, line.audio), button);
          if (!ended) break;
          button.classList.add("is-playing");
          await new Promise((r) => setTimeout(r, 450));
        }
        button.classList.remove("is-playing");
      };
      return h(
        "section",
        { class: "step step-cloze" },
        h("h1", {}, step.prompt),
        h("div", { class: "cloze-levels" }, ...levelBtns),
        h("button", { class: "btn btn-secondary btn-playall", type: "button", onclick: (e) => playAll(e.currentTarget) }, icon("play"), "Nghe cả đoạn"),
        body,
        check,
        feedback
      );
    },

    // Tự đánh giá: người học đánh dấu những việc đã làm được. Lưu trên máy.
    checklist(step) {
      const key = `${lesson.id}/${step.id || "check"}`;
      const saved = store.get("selfcheck", key)?.done || [];
      const items = step.items.map((text, i) => {
        const box = h("input", { type: "checkbox", id: `chk-${i}` });
        box.checked = saved.includes(i);
        box.addEventListener("change", () => {
          const done = items.map((it, k) => (it.box.checked ? k : -1)).filter((k) => k >= 0);
          store.put("selfcheck", key, { done, total: step.items.length });
        });
        return { box, node: h("li", { class: "check-item" }, box, h("label", { for: `chk-${i}` }, text)) };
      });
      return h(
        "section",
        { class: "step step-checklist" },
        h("h1", {}, step.prompt),
        step.note && h("p", { class: "hint" }, step.note),
        h("ul", { class: "check-list" }, ...items.map((it) => it.node))
      );
    },

    // Mục tiêu cho tuần sau. Lưu trên máy; bài ôn của tuần sau hiện lại.
    goal(step) {
      const key = step.key || lesson.id;
      const area = h("textarea", { id: "goal", rows: "3", placeholder: step.placeholder || "" });
      area.value = store.get("goals", key)?.text || "";
      let timer;
      area.addEventListener("input", () => {
        clearTimeout(timer);
        timer = setTimeout(() => store.put("goals", key, { text: area.value, week: step.week }), 300);
      });
      const before = step.showGoal && store.get("goals", step.showGoal)?.text;
      return h(
        "section",
        { class: "step step-goal" },
        before && h("div", { class: "goal-before" }, h("p", { class: "hint" }, "Mục tiêu bạn đặt tuần trước:"), h("p", {}, before)),
        h("h1", {}, step.prompt),
        ...(step.body || []).map((p) => h("p", {}, ...richText(p))),
        h("label", { for: "goal", class: "field-label" }, step.label || "Mục tiêu của bạn"),
        area,
        h("p", { class: "hint" }, "Mục tiêu tự lưu trên máy này.")
      );
    },

    // Nghe lại bản thu đầu tiên của một câu, cạnh bản thu gần nhất.
    compare(step) {
      const status = h("p", { class: "hint", role: "status" });
      const btn = (clipKey, label) => {
        const b = h("button", { class: "btn btn-secondary", type: "button", disabled: true }, icon("play"), label);
        getClip(clipKey)
          .then((clip) => {
            if (!clip) return;
            const url = URL.createObjectURL(clip.blob);
            b.disabled = false;
            b.onclick = (e) => play(url, e.currentTarget);
          })
          .catch(() => {});
        return b;
      };
      const first = btn(`${step.first}:first`, step.firstLabel || "Bản thu đầu tiên");
      const latest = btn(`${step.latest}:latest`, step.latestLabel || "Bản thu hôm nay");
      setTimeout(() => {
        if (first.disabled && latest.disabled) status.textContent = "Máy này chưa có bản thu nào của câu này, nên chưa có gì để so. Bạn bấm Tiếp tục.";
        else if (first.disabled) status.textContent = "Máy này chưa có bản thu ở bài trước, nên chỉ nghe được bản hôm nay.";
      }, 600);
      return h(
        "section",
        { class: "step step-compare" },
        h("h1", {}, step.prompt),
        ...(step.body || []).map((p) => h("p", {}, ...richText(p))),
        h("div", { class: "speak-actions" }, first, latest),
        status
      );
    },
  };

  // Màn hình giới thiệu, hiện khi người học mở bài từ đầu: sau bài làm được gì,
  // và bài có những gì.
  // Hiện khi người học chưa từng mở bài này, hoặc mở lại một bài đã học xong.
  let onIntro = !saved || Boolean(saved.done);
  function showIntro() {
    const dialogues = steps.filter(({ step }) => step.type === "listen" && step.pass === 1).length;
    const cards = (lesson.cards || []).length;
    const contents = [
      lesson.listenNote || (dialogues && `${dialogues} đoạn hội thoại ngắn, mỗi đoạn nghe ba lượt`),
      cards && `${cards} từ và cụm từ, được đưa vào phần ôn sau khi học xong`,
      `${lesson.parts.length} phần: ${lesson.parts.map((p) => p.title).join(", ")}`,
    ].filter(Boolean);
    drawParts();
    prevBtn.hidden = true;
    nextBtn.textContent = "Bắt đầu học";
    setReady(true);
    main.replaceChildren(
      h(
        "section",
        { class: "step intro" },
        h("h1", {}, lesson.title),
        lesson.canDo && h("h2", {}, "Sau bài này, bạn"),
        lesson.canDo && h("ul", { class: "intro-list" }, ...lesson.canDo.map((c) => h("li", {}, c))),
        h("h2", {}, "Bài có"),
        h("ul", { class: "intro-list" }, ...contents.map((c) => h("li", {}, c))),
        h("p", { class: "hint" }, "Bạn dừng được ở bất cứ bước nào, và lần sau mở app, bài sẽ tiếp tục từ chỗ đó.")
      )
    );
  }

  prefetchAll();
  if (onIntro) showIntro();
  else show();
}

// ---- Cho máy nghe thử ----

const LISTEN_ERRORS = {
  "no-speech": "Máy không nghe thấy gì. Bạn bấm Cho máy nghe thử rồi nói câu mẫu ngay.",
  "not-allowed": "Máy chưa được phép dùng micro. Bạn cho phép app dùng micro trong cài đặt trình duyệt rồi thử lại.",
  "service-not-allowed": "Trình duyệt này không cho dùng nhận dạng giọng nói.",
  network: "Không kết nối được dịch vụ nhận dạng giọng nói. Bạn kiểm tra mạng rồi thử lại.",
  "language-not-supported": "Điện thoại này chưa nhận dạng được tiếng Anh.",
};

const LIMIT_NOTE =
  "Máy đôi khi nghe sai cả người bản ngữ, nhất là khi phòng ồn hay câu quá ngắn. Từ máy không nghe ra có thể do bạn đọc chưa rõ, cũng có thể do máy nghe sai; bạn nghe lại câu mẫu rồi thử lần nữa.";

function machineCheck(step) {
  // Tách câu mẫu thành từng chữ; phần trong ngoặc vuông như [tên bạn] không đem so.
  const tokens = step.say.match(/\[[^\]]*\][.,!?]?|\S+/g) || [];
  const targets = tokens.map((t, i) => ({ text: t, i, skip: t.startsWith("["), norm: normalize(t) })).filter((t) => t.norm || t.skip);
  const compared = targets.filter((t) => !t.skip);

  const box = h("div", { class: "machine" });
  const button = h("button", { class: "btn btn-outline btn-wide", type: "button" }, icon("mic"), "Nói lại cho máy nghe");
  const panel = h("div", { class: "machine-panel", role: "status" });
  box.append(
    h("p", { class: "machine-title" }, "Cho máy nghe thử"),
    h("p", { class: "hint" }, "Máy không nghe bản thu ở trên. Muốn biết máy nghe ra những từ nào, bạn bấm nút dưới đây rồi nói lại câu mẫu một lần nữa."),
    button,
    panel
  );

  function bestMatch(alternatives) {
    let best = null;
    for (const alt of alternatives) {
      const missed = missedWords(compared.map((t) => t.norm), words(alt));
      if (!best || missed.size < best.missed.size) best = { alt, missed };
    }
    return best;
  }

  async function run(mode) {
    button.disabled = true;
    button.classList.add("is-listening");
    button.replaceChildren(icon("mic"), "Máy đang nghe. Bạn nói câu mẫu ngay bây giờ");
    panel.replaceChildren();
    try {
      const alts = await listenOnce(mode);
      if (!alts.length) throw "no-speech";
      const { alt, missed } = bestMatch(alts);
      const heardIdx = new Set(compared.filter((_, k) => !missed.has(k)).map((t) => t.i));
      const line = tokens.map((t, i) =>
        h("span", { class: t.startsWith("[") ? "machine-skip" : heardIdx.has(i) ? "machine-heard" : null }, t)
      );
      panel.replaceChildren(
        h("p", { class: "machine-label" }, "Máy nghe ra:"),
        h("p", { class: "machine-transcript", lang: "en" }, alt || "(không rõ)"),
        h("p", { class: "machine-label" }, "Những từ trong câu mẫu được tô màu là những từ máy nghe ra:"),
        h("p", { class: "machine-target", lang: "en" }, ...line.flatMap((el, i) => (i ? [" ", el] : [el]))),
        missed.size ? h("p", { class: "hint" }, LIMIT_NOTE) : null
      );
    } catch (err) {
      panel.replaceChildren(h("p", { class: "hint" }, LISTEN_ERRORS[err] || "Máy chưa nghe được lần này. Bạn thử lại."));
    } finally {
      button.disabled = false;
      button.classList.remove("is-listening");
      button.replaceChildren(icon("mic"), "Nói lại cho máy nghe lần nữa");
    }
  }

  button.addEventListener("click", async () => {
    const mode = await listenMode();
    if (hasConsent(mode)) return run(mode);
    const agree = h("button", { class: "btn btn-primary", type: "button" }, mode === "local" ? "Bắt đầu" : "Đồng ý");
    const cancel = h("button", { class: "btn btn-quiet", type: "button" }, "Thôi");
    agree.addEventListener("click", () => {
      saveConsent(mode);
      run(mode);
    });
    cancel.addEventListener("click", () => panel.replaceChildren());
    panel.replaceChildren(
      h("p", {}, "Sau khi bạn đồng ý, máy bắt đầu nghe ngay, và bạn nói lại câu mẫu một lần. Máy đổi câu bạn nói thành chữ, rồi tô những từ khớp với câu mẫu. Đây chỉ là gợi ý, không phải điểm, và không được lưu lại."),
      h("p", {}, LIMIT_NOTE),
      mode === "cloud"
        ? h("p", {}, "Để đổi câu bạn nói thành chữ, app gửi câu ấy tới dịch vụ nhận dạng giọng nói của trình duyệt, của Google hoặc Apple. Nếu bạn đồng ý, bấm Đồng ý; nếu không, bạn vẫn học bình thường bằng cách so với câu mẫu.")
        : h("p", {}, "Điện thoại này nhận dạng được giọng nói ngay trên máy, nên câu bạn nói không bị gửi đi đâu."),
      h("div", { class: "machine-actions" }, agree, cancel)
    );
  });

  return box;
}

// ---- So câu gõ với câu đúng ----

const VIETNAMESE_MARKS = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

// Bỏ qua chữ hoa, dấu câu và khoảng trắng thừa.
function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function words(text) {
  return normalize(text).split(" ").filter(Boolean);
}

// Vị trí những chữ của câu đúng không có trong câu gõ, theo dãy con chung dài nhất,
// để một chữ thiếu không làm cả phần sau bị tính sai.
function missedWords(expected, got) {
  const n = expected.length, m = got.length;
  const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      L[i][j] = expected[i] === got[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const missed = new Set();
  let i = 0, j = 0;
  while (i < n) {
    if (j < m && expected[i] === got[j]) { i++; j++; }
    else if (j < m && L[i][j + 1] >= L[i + 1][j]) j++;
    else { missed.add(i); i++; }
  }
  return missed;
}

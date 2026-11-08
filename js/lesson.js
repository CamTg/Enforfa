// Trình chạy một bài học: đi qua từng bước của các phần Nghe, Học, Luyện, Nói.

import { h, icon, sayChip } from "./ui.js";
import { play, stop, audioUrl, isSlow, setSlow } from "./audio.js";
import { store } from "./store.js";
import { addCards } from "./srs.js";
import { canRecord, startRecording, saveClip, getClip } from "./recorder.js";
import { startStep, stopStep, markWrong } from "./timing.js";
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

  // Tải sẵn âm thanh của bước, để khi người học bấm nghe (hay app tự phát)
  // thì tiếng ra ngay, không phải chờ tải qua mạng.
  function prefetch(step) {
    const ids = new Set();
    const add = (id) => id && lesson.audio[id] && ids.add(id);
    add(step.audio);
    add(step.model);
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

    main.replaceChildren(
      h(
        "section",
        { class: "finish" },
        h("div", { class: "finish-mark" }, icon("check")),
        h("h1", {}, "Bạn đã học xong bài này"),
        h("p", {}, `${(lesson.cards || []).length} thẻ từ của bài này đã được thêm vào phần ôn. Từ ngày mai, khi có thẻ đến hạn, trang chính sẽ hiện nút Ôn từ.`),
        lesson.cards?.length && h("h2", {}, "Những gì bạn vừa học"),
        lesson.cards?.length &&
          h("div", { class: "learned" }, ...lesson.cards.map((c) => sayChip(c.en, sound(c.audio), "", c.vi))),
        lesson.realTask && h("h2", {}, "Việc làm thật hôm nay"),
        lesson.realTask && h("p", { class: "real-task" }, lesson.realTask),
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
            feedback.className = "feedback is-right";
            feedback.textContent = step.audio ? "Đúng rồi. Bấm vào câu dưới đây để nghe lại." : "Đúng rồi.";
            if (step.audio) {
              const chip = sayChip(text(step.audio), sound(step.audio), "say-line", step.gloss || "");
              replay.replaceChildren(chip);
              sound(step.audio)(chip);
            }
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
          h("button", { class: "btn btn-secondary", type: "button", onclick: (e) => sound(step.model)(e.currentTarget) }, icon("play"), "Nghe câu mẫu"),
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
        autocapitalize: "sentences",
        spellcheck: "false",
        enterkeyhint: "done",
        "aria-label": "Câu bạn gõ",
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
          markWrong();
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
          const ok = /\b(my name is|i'?m|i am)\s+[a-z]/.test(normalize(typed));
          if (ok) {
            feedback.className = "feedback is-right";
            feedback.replaceChildren(h("p", {}, "Đúng rồi. Câu của bạn đúng mẫu giới thiệu."));
          } else {
            markWrong();
            feedback.className = "feedback is-wrong";
            feedback.replaceChildren(
              h("p", {}, "Câu giới thiệu cần có My name is hoặc I'm, rồi đến tên bạn. Ví dụ:"),
              h("p", { class: "write-answer", lang: "en" }, step.example)
            );
          }
          return;
        }
        const expected = words(step.answer);
        const got = words(typed);
        const missed = missedWords(expected, got);
        if (missed.size === 0 && got.length === expected.length) {
          feedback.className = "feedback is-right";
          feedback.replaceChildren(h("p", {}, "Đúng rồi."));
          return;
        }
        markWrong();
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
        input,
        check,
        feedback
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
      dialogues && `${dialogues} đoạn hội thoại ngắn, mỗi đoạn nghe ba lượt`,
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
  const button = h("button", { class: "btn btn-outline btn-wide", type: "button" }, icon("mic"), "Cho máy nghe thử");
  const panel = h("div", { class: "machine-panel", role: "status" });
  box.append(button, panel);

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
    button.replaceChildren(icon("mic"), "Máy đang nghe, bạn nói câu mẫu");
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
      button.replaceChildren(icon("mic"), "Cho máy nghe thử lần nữa");
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
      h("p", {}, "Máy sẽ nghe câu bạn nói, đổi thành chữ, rồi tô những từ khớp với câu mẫu. Đây chỉ là gợi ý, không phải điểm, và không được lưu lại."),
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

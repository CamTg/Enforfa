// Bản đồ lộ trình: 50 tuần vẽ thành một con đường uốn khúc, chia ba chặng.
// Tuần đã học xong tô xanh, tuần đang học có vòng vàng, tuần sau để trống.

import { h } from "./ui.js";

const COLS = 5;
const GAP_X = 64;
const GAP_Y = 68;
const PAD_X = 34;
const PAD_Y = 30;
const R = 18;

// Vị trí của tuần thứ i (tính từ 0) trong một chặng: đi trái sang phải,
// xuống hàng rồi đi phải sang trái, như con rắn.
function place(i) {
  const row = Math.floor(i / COLS);
  const k = i % COLS;
  const col = row % 2 === 0 ? k : COLS - 1 - k;
  return { x: PAD_X + col * GAP_X, y: PAD_Y + row * GAP_Y };
}

function stageSvg(stage, weekState, currentWeek, stamped) {
  const weeks = [];
  for (let w = stage.from; w <= stage.to; w++) weeks.push(w);
  const pts = weeks.map((w, i) => ({ w, ...place(i) }));
  const rows = Math.ceil(weeks.length / COLS);
  const width = PAD_X * 2 + (COLS - 1) * GAP_X;
  const height = PAD_Y * 2 + (rows - 1) * GAP_Y;

  const line = (list) => list.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
  const reached = pts.filter((p) => p.w <= currentWeek);
  let svg = `<svg viewBox="0 0 ${width} ${height}" class="map-svg" role="group" aria-label="Các tuần của chặng ${stage.id}">`;
  svg += `<path d="${line(pts)}" class="map-road"/>`;
  if (reached.length > 1) svg += `<path d="${line(reached)}" class="map-road is-done"/>`;
  for (const p of pts) {
    const state = weekState(p.w);
    const label = { done: "đã học xong", current: "đang học", future: "sắp tới" }[state];
    svg += `<g class="map-week is-${state}" data-week="${p.w}" role="button" tabindex="0" aria-label="Tuần ${p.w}, ${label}. Xem các bài của tuần.">`;
    svg += `<circle cx="${p.x}" cy="${p.y}" r="${R + 10}" class="map-hit"/>`;
    if (state === "current") svg += `<circle cx="${p.x}" cy="${p.y}" r="${R + 7}" class="map-halo"/>`;
    svg += `<circle cx="${p.x}" cy="${p.y}" r="${R}" class="map-dot"/>`;
    svg += `<text x="${p.x}" y="${p.y + 5}" text-anchor="middle" class="map-num">${p.w}</text>`;
    svg += "</g>";
  }
  svg += "</svg>";
  const holder = h("div", { class: "map-stage-svg" });
  holder.innerHTML = svg;
  return holder;
}

/**
 * weekState(n) trả về "done", "current" hoặc "future".
 */
export function renderMap(course, currentWeek, weekState, stamped = new Set(), renderWeek = null) {
  const panels = [];
  function pick(week, focusPanel) {
    if (!renderWeek) return;
    document.querySelectorAll(".map-week.is-picked").forEach((g) => g.classList.remove("is-picked"));
    document.querySelector(`.map-week[data-week="${week}"]`)?.classList.add("is-picked");
    for (const { stage, panel } of panels) {
      if (week >= stage.from && week <= stage.to) {
        panel.replaceChildren(renderWeek(week));
        panel.hidden = false;
        if (focusPanel) panel.scrollIntoView({ block: "nearest", behavior: "smooth" });
      } else {
        panel.hidden = true;
        panel.replaceChildren();
      }
    }
  }
  const stages = course.stages.map((st) => {
    const panel = h("div", { class: "map-panel", hidden: true, "aria-live": "polite" });
    panels.push({ stage: st, panel });
    const svgBox = stageSvg(st, weekState, currentWeek, stamped);
    const onPick = (e) => {
      const g = e.target.closest?.("[data-week]");
      if (!g) return;
      if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      pick(Number(g.dataset.week), true);
    };
    svgBox.addEventListener("click", onPick);
    svgBox.addEventListener("keydown", onPick);
    const isCurrent = currentWeek >= st.from && currentWeek <= st.to;
    const doneWeeks = Math.max(0, Math.min(st.to, currentWeek - 1) - st.from + 1);
    return h(
      "section",
      { class: `map-stage${isCurrent ? " is-current" : ""}` },
      h("p", { class: "map-stage-meta" }, `${st.weeks} · Trình độ ${st.level}`),
      h("h2", {}, `Chặng ${st.id}: ${st.title}`),
      h("p", { class: "map-stage-goal" }, `Hết chặng này, bạn ${st.goal.charAt(0).toLowerCase()}${st.goal.slice(1)}`),
      svgBox,
      panel,
      h(
        "p",
        { class: "visually-hidden" },
        isCurrent
          ? `Bạn đang ở tuần ${currentWeek}, đã học xong ${doneWeeks} trên ${st.to - st.from + 1} tuần của chặng này.`
          : currentWeek > st.to
            ? "Bạn đã học xong chặng này."
            : "Bạn chưa tới chặng này."
      )
    );
  });
  // Mở sẵn tuần đang học, sau khi bản đồ đã nằm trong trang.
  setTimeout(() => pick(currentWeek, false), 0);
  return h(
    "div",
    { class: "map" },
    h(
      "p",
      { class: "map-intro" },
      `Phần 1 của chương trình có ${course.totalWeeks} tuần, mỗi tuần bảy bài, đi từ con số không và nhắm tới trình độ A2 (sơ cấp) theo khung trình độ ngoại ngữ châu Âu (CEFR). Bấm vào một tuần để xem các bài của tuần ấy.`
    ),
    h(
      "ul",
      { class: "map-legend" },
      h("li", {}, h("span", { class: "legend-dot is-done" }), "Đã học xong"),
      h("li", {}, h("span", { class: "legend-dot is-current" }), "Tuần đang học"),
      h("li", {}, h("span", { class: "legend-dot is-future" }), "Sắp tới")
    ),
    ...stages,
    course.next && h("p", { class: "map-next" }, course.next)
  );
}

// Hàm dựng phần tử nhỏ gọn, để mã giao diện dễ đọc.

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === false || value == null) continue;
    if (key === "class") el.className = value;
    else if (key.startsWith("on")) el.addEventListener(key.slice(2), value);
    else if (key === "html") el.innerHTML = value;
    else el.setAttribute(key, value === true ? "" : value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

const ICONS = {
  play: '<path d="M8 5.5v13l11-6.5z"/>',
  mic: '<path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11h-2z"/>',
  stop: '<rect x="7" y="7" width="10" height="10" rx="2"/>',
  back: '<path d="M15.5 5 8.5 12l7 7-1.4 1.4L5.7 12l8.4-8.4z"/>',
  check: '<path d="M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6L20.1 8.4 18.7 7z"/>',
  home: '<path d="M12 3 2.5 11h2.7v9.5h5.3v-6h3v6h5.3V11h2.7z"/>',
  cards: '<path d="M4 6h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zm0 2v10h12V8zm16-4a2 2 0 0 1 2 2v10h-2V6H7V4z"/>',
  map: '<path d="m15 4.5-6-2-6 2.3v16.7l6-2.3 6 2 6-2.3V2.2zM9 4.7l6 2v12.6l-6-2z"/>',
  person: '<path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zm0 2c-4.4 0-8 2.2-8 5v2h16v-2c0-2.8-3.6-5-8-5z"/>',
};

export function icon(name) {
  const span = h("span", { class: "icon", "aria-hidden": "true" });
  span.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">${ICONS[name]}</svg>`;
  return span;
}

/** Một cụm tiếng Anh bấm được để nghe: phần nhận diện của app. */
export function sayChip(text, onPlay, extraClass = "", gloss = "") {
  return h(
    "button",
    { class: `say ${gloss ? "has-gloss " : ""}${extraClass}`.trim(), type: "button", lang: "en", onclick: (e) => onPlay(e.currentTarget) },
    icon("play"),
    gloss
      ? h("span", { class: "say-stack" }, h("span", { class: "say-text" }, text), h("span", { class: "say-gloss", lang: "vi" }, gloss))
      : h("span", { class: "say-text" }, text)
  );
}

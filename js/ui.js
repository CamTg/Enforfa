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
};

export function icon(name) {
  const span = h("span", { class: "icon", "aria-hidden": "true" });
  span.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">${ICONS[name]}</svg>`;
  return span;
}

/** Một cụm tiếng Anh bấm được để nghe: phần nhận diện của app. */
export function sayChip(text, onPlay, extraClass = "") {
  return h(
    "button",
    { class: `say ${extraClass}`.trim(), type: "button", lang: "en", onclick: (e) => onPlay(e.currentTarget) },
    icon("play"),
    h("span", { class: "say-text" }, text)
  );
}

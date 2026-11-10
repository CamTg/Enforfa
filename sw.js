// Service worker của Enforfa: cho app chạy được khi không có mạng.
//
// - Mã, giao diện và nội dung bài: lấy từ mạng trước để luôn có bản mới nhất;
//   khi không có mạng thì dùng bản đã lưu.
// - Âm thanh và phông chữ: dùng bản đã lưu nếu có, vì chúng không đổi.
//
// Mỗi lần đổi danh sách tệp dưới đây, tăng số phiên bản để máy người học
// xóa bộ nhớ cũ.

const VERSION = "enforfa-v12";
const SHELL = [
  "./",
  "index.html",
  "css/app.css",
  "content/course.json",
  "content/ipa/ipa.json",
  "manifest.webmanifest",
  "icon.svg",
  "icons/icon-192.png",
  "icons/apple-touch-icon.png",
  "js/audio.js",
  "js/fun.js",
  "js/lesson.js",
  "js/machine-listen.js",
  "js/main.js",
  "js/map.js",
  "js/recorder.js",
  "js/srs.js",
  "js/store.js",
  "js/timing.js",
  "js/ui.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => {}))))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === "opaque") {
    const cache = await caches.open(VERSION);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    // Bỏ qua bộ nhớ đệm của trình duyệt để người học có ngay bản mới khi có mạng.
    const response = await fetch(request, { cache: "no-cache" });
    if (response.ok) {
      const cache = await caches.open(VERSION);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (request.mode === "navigate") {
      const shell = await caches.match("index.html");
      if (shell) return shell;
    }
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (url.origin !== self.location.origin && !isFont) return;
  if (isFont || url.pathname.endsWith(".mp3") || url.pathname.endsWith(".png")) {
    event.respondWith(cacheFirst(request));
  } else {
    event.respondWith(networkFirst(request));
  }
});

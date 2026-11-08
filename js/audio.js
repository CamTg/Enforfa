// Phát âm thanh mẫu. Chỉ một tệp phát tại một thời điểm.

const player = new Audio();
player.preload = "auto";
let current = null; // { button, resolve }
let slow = false;

try {
  slow = localStorage.getItem("enforfa:slow") === "1";
} catch (_) {}

// ended = true khi tệp phát hết; false khi bị dừng hoặc bị tệp khác chen vào.
function clear(ended = false) {
  if (current) {
    current.button?.classList.remove("is-playing");
    current.resolve?.(ended);
    current = null;
  }
}

// Khi chuyển sang tệp khác, sự kiện pause của tệp cũ đến muộn; bỏ qua nó.
let switching = false;

player.addEventListener("ended", () => clear(true));
player.addEventListener("pause", () => {
  if (switching) {
    switching = false;
    return;
  }
  clear(false);
});
player.addEventListener("error", () => clear(false));

export function audioUrl(lessonId, audioId) {
  return `audio/${lessonId}/${audioId}.mp3`;
}

/** Phát một tệp. Promise trả về true nếu phát hết, false nếu bị dừng giữa chừng. */
export function play(url, button) {
  if (current && current.url === url && !player.paused) {
    player.pause();
    return Promise.resolve(false);
  }
  if (!player.paused) {
    switching = true;
    player.pause();
  }
  clear(false);
  return new Promise((resolve) => {
    current = { url, button, resolve };
    button?.classList.add("is-playing");
    player.src = url;
    player.preservesPitch = true;
    player.playbackRate = slow ? 0.75 : 1;
    player.play().catch(() => clear());
  });
}

export function stop() {
  player.pause();
}

export function isSlow() {
  return slow;
}

export function setSlow(value) {
  slow = value;
  try {
    localStorage.setItem("enforfa:slow", value ? "1" : "0");
  } catch (_) {}
}

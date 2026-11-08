// Thu âm giọng người học và lưu ngay trên máy (IndexedDB).
//
// Bản thu không bao giờ được gửi đi. Với mỗi câu, app giữ bản thu đầu tiên
// và bản thu gần nhất, để cuối tuần người học nghe lại xem mình tiến bộ ra sao.
// Xóa dữ liệu trình duyệt thì bản thu cũng mất.

const DB = "enforfa-recordings";
const STORE = "clips";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const result = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(result.result ?? result);
    t.onerror = () => reject(t.error);
  });
}

export async function saveClip(key, blob) {
  const entry = { blob, type: blob.type, at: Date.now() };
  const first = await getClip(`${key}:first`).catch(() => null);
  await tx("readwrite", (s) => {
    if (!first) s.put(entry, `${key}:first`);
    return s.put(entry, `${key}:latest`);
  });
}

export async function getClip(key) {
  return tx("readonly", (s) => s.get(key));
}

export function canRecord() {
  return Boolean(navigator.mediaDevices?.getUserMedia && globalThis.MediaRecorder);
}

/** Bắt đầu thu; trả về hàm dừng, hàm này trả về Blob của bản thu. */
export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const types = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg"];
  const mimeType = types.find((t) => MediaRecorder.isTypeSupported?.(t));
  const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.start();
  return () =>
    new Promise((resolve) => {
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        resolve(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
      };
      rec.stop();
    });
}

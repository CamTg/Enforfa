// Kho dữ liệu của người học: lưu trên máy trước, đồng bộ sau.
//
// Mọi việc đọc và ghi dữ liệu của app đi qua mô-đun này, nên khi nối tài khoản
// (Supabase hay dịch vụ khác) chỉ cần sửa ở đây.
//
// Dữ liệu chia theo bộ sưu tập (collection): progress, cards, notes, marks.
// Mỗi bản ghi có:
//   id        mã riêng trong bộ sưu tập
//   updatedAt thời điểm sửa cuối (ms), dùng để gộp khi đồng bộ giữa hai máy
//   syncedAt  thời điểm đã gửi lên máy chủ; null nghĩa là còn chờ gửi
//   deleted   true khi đã xóa (giữ lại để máy khác cũng biết mà xóa)
//
// Bản thu âm không nằm ở đây; xem recorder.js.

const KEY = "enforfa:v1";
const listeners = new Set();

function emptyState() {
  return { schema: 1, deviceId: makeId(), collections: {} };
}

function makeId() {
  if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.schema === 1) return parsed;
    }
  } catch (_) {
    /* trình duyệt chặn bộ nhớ: dùng tạm trong phiên */
  }
  return emptyState();
}

let state = load();
let persistent = true;

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    persistent = true;
  } catch (_) {
    persistent = false;
  }
  listeners.forEach((fn) => fn());
}

function coll(name) {
  if (!state.collections[name]) state.collections[name] = {};
  return state.collections[name];
}

export const store = {
  /** Trả về bản ghi, hoặc undefined nếu chưa có hay đã xóa. */
  get(collection, id) {
    const rec = coll(collection)[id];
    return rec && !rec.deleted ? rec : undefined;
  },

  list(collection) {
    return Object.values(coll(collection)).filter((r) => !r.deleted);
  },

  /** Ghi đè các trường được truyền vào, giữ nguyên các trường khác. */
  put(collection, id, fields) {
    const prev = coll(collection)[id] || { id };
    coll(collection)[id] = {
      ...prev,
      ...fields,
      id,
      updatedAt: Date.now(),
      syncedAt: null,
      deleted: false,
    };
    save();
    return coll(collection)[id];
  },

  remove(collection, id) {
    const prev = coll(collection)[id];
    if (!prev) return;
    coll(collection)[id] = { ...prev, deleted: true, updatedAt: Date.now(), syncedAt: null };
    save();
  },

  /** Những bản ghi còn chờ gửi lên máy chủ (dùng khi có đồng bộ). */
  pending() {
    const out = [];
    for (const [name, records] of Object.entries(state.collections)) {
      for (const rec of Object.values(records)) {
        if (!rec.syncedAt) out.push({ collection: name, record: rec });
      }
    }
    return out;
  },

  /**
   * Gộp bản ghi từ máy chủ. Quy tắc mặc định: bản sửa sau cùng thắng.
   * Riêng tiến độ bài học thì lấy chỗ học xa nhất.
   */
  merge(collection, remote) {
    const local = coll(collection)[remote.id];
    let winner = remote;
    if (local) {
      if (collection === "progress") {
        winner = { ...remote, ...local };
        winner.done = Boolean(local.done || remote.done);
        winner.step = Math.max(local.step || 0, remote.step || 0);
        winner.updatedAt = Math.max(local.updatedAt, remote.updatedAt);
      } else if (local.updatedAt > remote.updatedAt) {
        winner = local;
      }
    }
    coll(collection)[remote.id] = { ...winner, syncedAt: Date.now() };
    save();
  },

  get deviceId() {
    return state.deviceId;
  },

  /** false khi trình duyệt không cho lưu (chế độ ẩn danh, bộ nhớ bị chặn). */
  get persistent() {
    return persistent;
  },

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /** Xuất toàn bộ dữ liệu ra một chuỗi JSON để người học tự giữ. */
  exportJSON() {
    return JSON.stringify(state, null, 2);
  },
};

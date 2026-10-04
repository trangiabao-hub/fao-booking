import { normalizeDate } from "./bookingHelpers";

const STORAGE_KEY = "fao_booking_draft_v1";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function toIsoOrNull(d) {
  return d instanceof Date && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
}

function toDateOrNull(s) {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Đơn đặt dở của khách (1 đơn gần nhất) — lưu khi modal đặt máy đang mở.
 * Không lưu các ô cam kết: khách phải tick lại khi đặt tiếp.
 */
export function saveBookingDraft(draft) {
  if (typeof window === "undefined" || !draft?.modelKeys?.length) return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...draft,
        date: toIsoOrNull(draft.date),
        endDate: toIsoOrNull(draft.endDate),
        savedAt: Date.now(),
      }),
    );
  } catch {
    // localStorage đầy / bị chặn — nháp chỉ là tiện ích, bỏ qua.
  }
}

/** null khi không có nháp, nháp quá 7 ngày hoặc ngày nhận đã qua. */
export function loadBookingDraft() {
  if (typeof window === "undefined") return null;
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!raw?.modelKeys?.length) return null;
    const date = toDateOrNull(raw.date);
    const endDate = toDateOrNull(raw.endDate);
    const expired =
      !raw.savedAt ||
      Date.now() - raw.savedAt > MAX_AGE_MS ||
      !date ||
      normalizeDate(date) < normalizeDate(new Date());
    if (expired) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return { ...raw, date, endDate };
  } catch {
    return null;
  }
}

export function clearBookingDraft() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

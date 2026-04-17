/** Chuỗi yyyy-MM-dd → Date 00:00 theo giờ máy (tránh lệch so với `new Date("yyyy-MM-dd")` = UTC). */
function parseLocalYyyyMmDd(str) {
  if (typeof str !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str.trim());
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const day = parseInt(m[3], 10);
  const d = new Date(y, mo, day);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Gửi lên object / API: cùng format Spring LocalDate thường trả. */
export function formatDateOnlyLocal(date) {
  if (!date || Number.isNaN(date.getTime())) return null;
  const y = date.getFullYear();
  const mo = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

/**
 * Ngày máy mở cho đặt lịch (release date) — API có thể gửi một trong các key sau.
 * Trả về Date đã chuẩn hoá 00:00 local, hoặc null nếu không có / không parse được.
 */
export function parseDeviceReleaseDate(device) {
  if (!device || typeof device !== "object") return null;
  const raw =
    device.releaseDate ??
    device.release_date ??
    device.bookingAvailableFrom ??
    device.bookableFrom;
  if (raw == null || raw === "") return null;
  if (raw instanceof Date) {
    const d = new Date(raw.getTime());
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (typeof raw === "string") {
    const local = parseLocalYyyyMmDd(raw);
    if (local) return local;
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Nhiều máy: lấy release muộn nhất (đặt chung phải thỏa tất cả). */
export function getStrictestReleaseDate(devices) {
  if (!Array.isArray(devices) || devices.length === 0) return null;
  let maxR = null;
  for (const dev of devices) {
    const r = parseDeviceReleaseDate(dev);
    if (!r) continue;
    if (!maxR || r.getTime() > maxR.getTime()) maxR = r;
  }
  return maxR;
}

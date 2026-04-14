/** Hiển thị giờ kiểu VN: 9h, 19h30 */
export function formatTimeVi(date) {
  if (!date || !(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }
  const h = date.getHours();
  const m = date.getMinutes();
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

/** Từ chuỗi "HH:mm" (vd. từ state / URL), cùng quy tắc hiển thị */
export function formatTimeViFromString(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return "";
  const [hStr, mStr] = timeStr.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10) || 0;
  if (Number.isNaN(h)) return timeStr;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

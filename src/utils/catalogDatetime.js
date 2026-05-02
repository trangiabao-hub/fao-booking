import { format, isValid } from "date-fns";
import { formatTimeVi } from "./formatTimeVi";

export function combineDateWithTimeString(dateOnly, timeStr) {
  if (!dateOnly || !timeStr) return null;
  const [hStr, mStr] = timeStr.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10) || 0;
  if (isNaN(h) || isNaN(m)) return null;
  const d = new Date(dateOnly);
  if (!isValid(d)) return null;
  d.setHours(h, m, 0, 0);
  return isValid(d) ? d : null;
}

export function formatDateTimeLocalForAPI(date) {
  if (!date || !isValid(date)) return null;
  return format(date, "yyyy-MM-dd'T'HH:mm:ss");
}

export function parseLocalDateParam(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsedDate = new Date(year, month - 1, day);
  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return null;
  }
  return parsedDate;
}

export function isValidTimeParam(value) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value || ""));
}

export function getDayPartLabel(date) {
  if (!date) return "";
  const hour = date.getHours();
  if (hour < 12) return "Sáng";
  if (hour < 18) return "Chiều";
  return "Tối";
}

export function formatWeekdayLabel(date) {
  if (!date) return "";
  const dow = date.getDay();
  if (dow === 0) return "CN";
  return `Thứ ${dow + 1}`;
}

export function formatTimeShort(date) {
  return formatTimeVi(date);
}

export function formatPickupReturnSummary(date) {
  if (!date || !isValid(date)) return "";
  return `${formatTimeShort(date)} • ${getDayPartLabel(date)} • ${formatWeekdayLabel(
    date,
  )} (${format(date, "dd/MM")})`;
}

export function countWeekdaysInRange(startDateTime, endDateTime) {
  if (!startDateTime || !endDateTime || endDateTime <= startDateTime) {
    return { totalDays: 0, weekdayDays: 0 };
  }
  const start = new Date(startDateTime);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDateTime);
  end.setHours(0, 0, 0, 0);

  let totalDays = 0;
  let weekdayDays = 0;
  const cur = new Date(start);
  while (cur < end) {
    totalDays += 1;
    const dow = cur.getDay();
    if (dow >= 1 && dow <= 5) weekdayDays += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return { totalDays, weekdayDays };
}

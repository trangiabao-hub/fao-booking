import { addDays, isValid } from "date-fns";

/** PayOS từ chối đơn 0đ; mức tối thiểu thực tế là 2.000đ. */
export const PAYOS_MIN_AMOUNT_VND = 2000;

function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return NaN;
  const [hStr, mStr] = timeStr.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (Number.isNaN(h) || Number.isNaN(m)) return NaN;
  return h * 60 + m;
}

export function getSixHourAutoReturnTime(timeFrom) {
  if (!timeFrom) return "15:00";
  const fromMin = timeToMinutes(timeFrom);
  if (Number.isNaN(fromMin)) return "15:00";
  const normalizedMinutes = (fromMin + 6 * 60) % (24 * 60);
  const outH = Math.floor(normalizedMinutes / 60);
  const outM = normalizedMinutes % 60;
  return `${String(outH).padStart(2, "0")}:${String(outM).padStart(2, "0")}`;
}

function startOfDay(date) {
  if (!date) return null;
  const d = new Date(date);
  if (!isValid(d)) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Sửa prefs lệch gói ↔ giờ (link cũ thiếu timeTo, localStorage 1 ngày
 * dính sang 6 tiếng, skip step 1). Không bịa giờ nhận nếu chưa có.
 */
export function normalizeBookingTimePrefs(prefs = {}) {
  const durationType = prefs.durationType;
  const timeFrom = prefs.timeFrom;
  if (!durationType || !timeFrom) return prefs;

  if (durationType === "SIX_HOURS") {
    const autoTo = getSixHourAutoReturnTime(timeFrom);
    const toMin = timeToMinutes(prefs.timeTo);
    const fromMin = timeToMinutes(timeFrom);
    const timeTo =
      Number.isNaN(toMin) || Number.isNaN(fromMin) || toMin <= fromMin
        ? autoTo
        : prefs.timeTo;
    return {
      ...prefs,
      timeFrom,
      timeTo,
      endDate: prefs.date || prefs.endDate,
    };
  }

  if (durationType === "ONE_DAY") {
    const date = startOfDay(prefs.date);
    const end = startOfDay(prefs.endDate);
    const endDate =
      date && (!end || end.getTime() <= date.getTime())
        ? addDays(date, 1)
        : prefs.endDate;
    return {
      ...prefs,
      timeFrom,
      timeTo: timeFrom,
      endDate: endDate || prefs.endDate,
    };
  }

  return prefs;
}

export function bookingTimePrefsDiffer(a = {}, b = {}) {
  return (
    a.timeFrom !== b.timeFrom ||
    a.timeTo !== b.timeTo ||
    a.durationType !== b.durationType ||
    startOfDay(a.date)?.getTime() !== startOfDay(b.date)?.getTime() ||
    startOfDay(a.endDate)?.getTime() !== startOfDay(b.endDate)?.getTime()
  );
}

import { format, addDays, isWeekend } from "date-fns";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import {
  BRANCHES,
  DURATION_OPTIONS,
  MORNING_PICKUP_TIME,
  DEFAULT_EVENING_SLOT,
  SIX_HOUR_RETURN_TIME,
} from "../data/bookingConstants";
import {
  computeDiscountBreakdown as computeDiscountBreakdownFromPricing,
} from "./pricing";

dayjs.extend(utc);
dayjs.extend(timezone);

export function normalizeDate(date) {
  if (!date) return null;
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function normalizePhone(p) {
  if (!p) return "";
  let s = p.replace(/[^\d]/g, "");
  if (s.startsWith("84")) s = "0" + s.slice(2);
  return s;
}

export function combineDateWithTime(dateOnly, timeStr) {
  if (!dateOnly || !timeStr) return null;
  const [hStr, mStr] = timeStr.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10) || 0;
  if (isNaN(h) || isNaN(m)) return null;
  const d = new Date(dateOnly);
  d.setHours(h, m, 0, 0);
  return d;
}

export function formatPriceK(price) {
  if (!price || price <= 0) return "0k";
  return `${Math.round(price / 1000)}k`;
}

/**
 * Format datetime cho API payload - đồng bộ manage (Asia/Ho_Chi_Minh).
 * Output có offset +07:00 để backend parse đúng múi giờ.
 */
export function formatDateForAPIPayload(date) {
  if (!date) return null;
  const d = dayjs(date);
  if (!d.isValid()) return null;
  return d.tz("Asia/Ho_Chi_Minh").format();
}

/** Công thức tính giá: 3 ngày 300k + ngày tiếp theo 100k */
export function formatPriceFormula(device) {
  if (!device) return "";
  const p1 = device.priceOneDay || 0;
  const p2 = device.priceTwoDay ?? p1 * 2;
  const p3 = device.priceThreeDay ?? p2 + (device.priceNextDay || p1);
  const pNext = device.priceNextDay || p1;

  if (p3 > 0) return `3 ngày ${formatPriceK(p3)} + ngày tiếp ${formatPriceK(pNext)}`;
  if (p2 > 0 && p2 !== p1 * 2) return `2 ngày ${formatPriceK(p2)} + ngày tiếp ${formatPriceK(pNext)}`;
  if (p1 > 0) return `1 ngày ${formatPriceK(p1)}`;
  if (device.priceSixHours > 0) return `6h ${formatPriceK(device.priceSixHours)}`;
  return "";
}

export function getDurationDays(durationId) {
  switch (durationId) {
    case "ONE_DAY":
      return 1;
    case "TWO_DAYS":
      return 2;
    case "THREE_DAYS":
      return 3;
    default:
      return 1;
  }
}

export function getDefaultBranchId() {
  return BRANCHES.find((b) => !b.disabled)?.id || BRANCHES[0]?.id;
}

export function getTimeRange(
  selectedDate,
  durationId,
  {
    pickupType = "MORNING",
    pickupSlot = DEFAULT_EVENING_SLOT,
    sixHourTimeFrom = MORNING_PICKUP_TIME,
    sixHourTimeTo = SIX_HOUR_RETURN_TIME,
  } = {}
) {
  if (!selectedDate) {
    return { startDate: null, endDate: null, timeFrom: null, timeTo: null };
  }

  if (durationId === "SIX_HOURS") {
    const startDate = normalizeDate(selectedDate);
    const endDate = normalizeDate(selectedDate);
    return {
      startDate,
      endDate,
      timeFrom: sixHourTimeFrom,
      timeTo: sixHourTimeTo,
    };
  }

  const days = getDurationDays(durationId);
  const baseDate =
    pickupType === "EVENING" ? addDays(selectedDate, -1) : selectedDate;
  const timeFrom = pickupType === "EVENING" ? pickupSlot : MORNING_PICKUP_TIME;
  const t1 = combineDateWithTime(baseDate, timeFrom);
  if (!t1) {
    return { startDate: null, endDate: null, timeFrom: null, timeTo: null };
  }
  const t2 = new Date(t1.getTime() + days * 24 * 60 * 60 * 1000);

  return {
    startDate: normalizeDate(baseDate),
    endDate: normalizeDate(t2),
    timeFrom,
    timeTo: format(t2, "HH:mm"),
  };
}

export function countWeekdaysBetweenAligned(t1, t2) {
  let days = 0,
    weekdays = 0;
  let cur = new Date(t1.getTime());
  cur.setHours(0, 0, 0, 0);
  const end = new Date(t2.getTime());
  end.setHours(0, 0, 0, 0);
  while (cur < end) {
    days += 1;
    if (!isWeekend(cur)) weekdays += 1;
    cur = addDays(cur, 1);
  }
  return { days, weekdays };
}

export function computeDiscountedPrice(price, startDateTime, endDateTime) {
  const b = computeDiscountBreakdownFromPricing(price, startDateTime, endDateTime);
  return b ? b.discounted : price || 0;
}

/**
 * Trả về chi tiết công thức tính giá - đồng bộ với manage (ngày lễ, getAdjustedRange, roundDownToThousand)
 * @param {number} price - Giá gốc
 * @param {Date} startDateTime - Thời điểm nhận (có giờ)
 * @param {Date} endDateTime - Thời điểm trả (có giờ)
 */
export function computeDiscountBreakdown(price, startDateTime, endDateTime) {
  return computeDiscountBreakdownFromPricing(price, startDateTime, endDateTime);
}

export function getSlotButtonClasses(count, active) {
  if (active) {
    return "border-[#222] bg-[#222] text-[#FF9FCA] shadow-lg";
  }
  if (count >= 10) {
    return "border-red-500 bg-red-500 text-white";
  }
  if (count >= 5) {
    return "border-amber-400 bg-amber-400 text-white";
  }
  return "border-green-200 bg-green-50 text-green-600";
}

export function getDurationIdFromDays(days) {
  if (days <= 1) return "ONE_DAY";
  if (days <= 2) return "TWO_DAYS";
  return "THREE_DAYS";
}

export function getPriceForDuration(device, durationId) {
  if (!device) return 0;
  switch (durationId) {
    case "SIX_HOURS":
      return (
        device.priceSixHours ||
        (device.priceOneDay ? Math.round(device.priceOneDay / 2) : 0)
      );
    case "ONE_DAY":
      return device.priceOneDay || 0;
    case "TWO_DAYS":
      return device.priceTwoDay || 0;
    case "THREE_DAYS":
      return device.priceThreeDay || 0;
    default:
      return 0;
  }
}

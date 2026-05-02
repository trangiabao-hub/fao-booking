import { format, addDays, isWeekend, isValid } from "date-fns";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import {
  BRANCHES,
  DURATION_OPTIONS,
  MORNING_PICKUP_TIME,
  DEFAULT_EVENING_SLOT,
  SIX_HOUR_RETURN_TIME,
  isBranchBookable,
} from "../data/bookingConstants";
import {
  computeDiscountBreakdown as computeDiscountBreakdownFromPricing,
} from "./pricing";

dayjs.extend(utc);
dayjs.extend(timezone);

export function normalizeDate(date) {
  if (!date) return null;
  const d = new Date(date);
  if (!isValid(d)) return null;
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
  if (!isValid(d)) return null;
  d.setHours(h, m, 0, 0);
  return isValid(d) ? d : null;
}

export function formatPriceK(price) {
  if (!price || price <= 0) return "0k";
  const rounded = Math.round(price);
  if (rounded >= 1_000_000) {
    const trieu = Math.floor(rounded / 1_000_000);
    const remainder = Math.round((rounded % 1_000_000) / 1000);
    return remainder > 0 ? `${trieu}tr${remainder}` : `${trieu}tr`;
  }
  return `${Math.round(rounded / 1000)}k`;
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

/**
 * Công thức hiển thị khi > 3 ngày: 3 ngày 120k + n ngày × 30k
 */
export function formatPriceBreakdown(device, fullDays) {
  if (!device || fullDays <= 3) return null;
  const p3 = device.priceThreeDay ?? (device.priceTwoDay || (device.priceOneDay || 0) * 2) + (device.priceNextDay || device.priceOneDay || 0);
  const pNext = device.priceNextDay || device.priceOneDay || 0;
  if (p3 <= 0 || pNext <= 0) return null;
  const n = fullDays - 3;
  return `3 ngày đầu ${formatPriceK(p3)} + ${n} ngày sau × ${formatPriceK(pNext)}`;
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
  return BRANCHES.find((b) => isBranchBookable(b))?.id || BRANCHES[0]?.id;
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
  const timeFrom =
    pickupType === "EVENING"
      ? pickupSlot
      : pickupType === "AFTERNOON"
        ? pickupSlot || "15:00"
        : MORNING_PICKUP_TIME;
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

/** Voucher chi nhánh Q9 — noteVoucher backend / UI đặt lịch */
export const Q9_BRANCH_VOUCHER_ID = "Q9_30_MAX200K";
export const Q9_BRANCH_VOUCHER_MAX_VND = 200_000;

/** Giảm 30% giá thuê gói, tối đa 200.000đ (một đơn). */
export function computeQ9BranchFlatDiscountVnd(subTotalVnd) {
  const n = Number(subTotalVnd);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(Math.floor(n * 0.3), Q9_BRANCH_VOUCHER_MAX_VND);
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

function toValidDate(value) {
  if (!value) return null;
  const parsed = value instanceof Date ? new Date(value) : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

/**
 * Tìm khung giờ gần nhất có thể dời cả giờ nhận và giờ trả cho cùng một model.
 * Dùng cho case user chọn 20:00 nhưng máy chỉ trống từ 20:30.
 */
export function findShiftedAvailabilitySuggestion(
  devices,
  fromDateTime,
  toDateTime,
  options = {}
) {
  const { keepSameReturnDate = false } = options;
  if (
    !Array.isArray(devices) ||
    devices.length === 0 ||
    !fromDateTime ||
    !toDateTime ||
    toDateTime <= fromDateTime
  ) {
    return null;
  }

  const schedules = devices.map((device) => ({
    ...device,
    bookings: Array.isArray(device?.bookingDtos)
      ? device.bookingDtos
          .map((booking) => {
            const bookingFrom = toValidDate(booking?.bookingFrom);
            const bookingTo = toValidDate(booking?.bookingTo);
            if (!bookingFrom || !bookingTo || bookingTo <= bookingFrom) {
              return null;
            }
            return { bookingFrom, bookingTo };
          })
          .filter(Boolean)
      : [],
  }));

  const candidateStarts = Array.from(
    new Set(
      schedules.flatMap((device) =>
        device.bookings
          .map((booking) => booking.bookingTo)
          .filter((bookingTo) => bookingTo > fromDateTime)
          .map((bookingTo) => bookingTo.getTime())
      )
    )
  )
    .sort((a, b) => a - b)
    .map((ts) => new Date(ts));

  for (const candidateStart of candidateStarts) {
    const shiftMs = candidateStart.getTime() - fromDateTime.getTime();
    if (shiftMs <= 0) continue;

    const candidateEnd = new Date(toDateTime.getTime() + shiftMs);
    if (
      keepSameReturnDate &&
      normalizeDate(candidateEnd)?.getTime() !== normalizeDate(toDateTime)?.getTime()
    ) {
      continue;
    }

    const hasFreeDevice = schedules.some((device) =>
      device.bookings.every(
        (booking) =>
          !rangesOverlap(
            booking.bookingFrom,
            booking.bookingTo,
            candidateStart,
            candidateEnd
          )
      )
    );

    if (hasFreeDevice) {
      return {
        fromDateTime: candidateStart,
        toDateTime: candidateEnd,
        timeFrom: format(candidateStart, "HH:mm"),
        timeTo: format(candidateEnd, "HH:mm"),
        shiftMinutes: Math.round(shiftMs / (1000 * 60)),
      };
    }
  }

  return null;
}

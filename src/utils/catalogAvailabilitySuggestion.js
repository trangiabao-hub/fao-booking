import { addDays, format, isValid } from "date-fns";
import {
  computeAvailabilityRange,
  getAvailabilityRangeError,
  getSixHourAutoReturnTime,
  normalizeDate,
} from "../components/BookingPrefsForm";
import { EVENING_SLOTS } from "../data/bookingConstants";
import { deviceHasSlotConflict } from "./bookingOverlap";

function timeStrToMinutes(t) {
  if (!t || typeof t !== "string") return NaN;
  const [h, m] = t.split(":").map((x) => parseInt(x, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return NaN;
  return h * 60 + m;
}

/** Slot tối sớm hơn: chỉ xét lệch 1–3 giờ (tránh gợi ý quá xa so với giờ khách chọn). */
const EVENING_SHIFT_MIN_MIN = 60;
const EVENING_SHIFT_MAX_MIN = 180;

function eveningSlotMinutes(currentSlot) {
  let cur = timeStrToMinutes(currentSlot || "20:00");
  if (Number.isNaN(cur)) cur = timeStrToMinutes("20:00");
  return cur;
}

/**
 * Ưu tiên dời sang slot tối *sau* giờ khách chọn (kể cả 15–45 phút),
 * rồi mới thử slot sớm hơn trong khoảng 1–3 giờ.
 *
 * Case: đơn cũ trả 20:45, khách check 20:30 → gợi ý 21:00 (không rơi xuống 6 tiếng).
 */
function orderedEveningSuggestionSlots(currentSlot) {
  const cur = eveningSlotMinutes(currentSlot);
  const slots = [...new Set(EVENING_SLOTS)];

  const later = slots
    .filter((s) => timeStrToMinutes(s) > cur)
    .sort((a, b) => timeStrToMinutes(a) - timeStrToMinutes(b));

  const earlierNear = slots
    .filter((s) => {
      const d = cur - timeStrToMinutes(s);
      return d >= EVENING_SHIFT_MIN_MIN && d <= EVENING_SHIFT_MAX_MIN;
    })
    .sort((a, b) => timeStrToMinutes(b) - timeStrToMinutes(a));

  return [...later, ...earlierNear];
}

function bookingEndsExactlyAt(bookings, fromDateTime) {
  if (!fromDateTime || !isValid(fromDateTime)) return false;
  const startMs = fromDateTime.getTime();
  const list = Array.isArray(bookings) ? bookings : [];
  return list.some((b) => {
    if (b?.bookingTo == null) return false;
    const bt = new Date(b.bookingTo).getTime();
    return !Number.isNaN(bt) && bt === startMs;
  });
}

function firstDeviceFreeForSlot(devices, fromDateTime, toDateTime) {
  return devices.find(
    (d) => !deviceHasSlotConflict(d.bookingDtos || [], fromDateTime, toDateTime),
  );
}

/** Trống khung thuê và không nhận máy đúng lúc khách trước trả (shop cần bàn giao). */
function firstDeviceFreeForEveningSuggestion(devices, fromDateTime, toDateTime) {
  return devices.find((d) => {
    const bookings = d.bookingDtos || [];
    if (deviceHasSlotConflict(bookings, fromDateTime, toDateTime)) return false;
    if (bookingEndsExactlyAt(bookings, fromDateTime)) return false;
    return true;
  });
}

function buildSuggestionFromRange(freeDevice, fromDateTime, toDateTime, extra = {}) {
  const tf =
    fromDateTime && isValid(fromDateTime)
      ? format(fromDateTime, "HH:mm")
      : "09:00";
  const tt =
    toDateTime && isValid(toDateTime) ? format(toDateTime, "HH:mm") : "09:00";
  return {
    fromDateTime,
    toDateTime,
    timeFrom: tf,
    timeTo: tt,
    suggestedDeviceId: freeDevice.id,
    switchToSixHours: false,
    ...extra,
  };
}

/** Độ dài (ms) đoạn thuê nằm trong một ngày lịch [00:00, +1day) — “ngày dài hơn” = overlap lớn hơn. */
function rentalOverlapMsOnCalendarDay(rentFrom, rentTo, calendarDay) {
  const dayStart = new Date(calendarDay);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = addDays(dayStart, 1);
  const rf = rentFrom.getTime();
  const rt = rentTo.getTime();
  const ds = dayStart.getTime();
  const de = dayEnd.getTime();
  const a = Math.max(rf, ds);
  const b = Math.min(rt, de);
  return Math.max(0, b - a);
}

/** Các ngày lịch giao với khung thuê, sắp xếp overlap giảm dần (ưu tiên ngày “dài” trong đơn). */
function daysSortedByRentalOverlapDesc(rentFrom, rentTo) {
  if (!rentFrom || !rentTo || rentTo <= rentFrom) return [];
  const days = [];
  let d = normalizeDate(rentFrom);
  const endD = normalizeDate(rentTo);
  const endMs = endD.getTime();
  while (d.getTime() <= endMs) {
    days.push(new Date(d));
    d = addDays(d, 1);
  }
  // Bỏ ngày không thực sự nằm trong khung thuê (tránh gợi ý 6h “ngoài” lịch).
  const withOverlap = days.filter(
    (day) => rentalOverlapMsOnCalendarDay(rentFrom, rentTo, day) > 0,
  );
  return withOverlap.sort((dayA, dayB) => {
    const ma = rentalOverlapMsOnCalendarDay(rentFrom, rentTo, dayA);
    const mb = rentalOverlapMsOnCalendarDay(rentFrom, rentTo, dayB);
    if (mb !== ma) return mb - ma;
    return dayA.getTime() - dayB.getTime();
  });
}

function buildSixHourChoicesForDay(devices, prefs, day) {
  const pairs = [
    { key: "morning", tf: "09:00", tt: getSixHourAutoReturnTime("09:00") },
    { key: "evening", tf: "15:00", tt: getSixHourAutoReturnTime("15:00") },
  ];
  const choices = [];
  for (const { key, tf, tt } of pairs) {
    const sixPrefs = {
      ...prefs,
      durationType: "SIX_HOURS",
      date: day,
      endDate: day,
      timeFrom: tf,
      timeTo: tt,
    };
    const { fromDateTime, toDateTime } = computeAvailabilityRange(sixPrefs);
    const err = getAvailabilityRangeError(sixPrefs, fromDateTime, toDateTime);
    if (err) continue;
    const free = firstDeviceFreeForSlot(devices, fromDateTime, toDateTime);
    if (free) {
      choices.push({
        key,
        timeFrom: tf,
        timeTo: tt,
        fromDateTime,
        toDateTime,
        suggestedDeviceId: free.id,
      });
    }
  }
  return choices;
}

function findEveningShiftSuggestion(devices, prefs) {
  if (prefs.pickupType !== "EVENING") return null;
  const currentSlot = prefs.pickupSlot || prefs.timeFrom;
  for (const slot of orderedEveningSuggestionSlots(currentSlot)) {
    const candidatePrefs = {
      ...prefs,
      pickupType: "EVENING",
      timeFrom: slot,
      timeTo: slot,
      pickupSlot: slot,
    };
    const { fromDateTime, toDateTime } =
      computeAvailabilityRange(candidatePrefs);
    const err = getAvailabilityRangeError(
      candidatePrefs,
      fromDateTime,
      toDateTime,
    );
    if (err) continue;
    const free = firstDeviceFreeForEveningSuggestion(
      devices,
      fromDateTime,
      toDateTime,
    );
    if (free) {
      const shiftMinutes =
        timeStrToMinutes(slot) - eveningSlotMinutes(currentSlot);
      return buildSuggestionFromRange(free, fromDateTime, toDateTime, {
        shiftMinutes,
      });
    }
  }
  return null;
}

function findSixHourSuggestion(devices, prefs, rentFrom, rentTo) {
  const rentDurationMs = rentTo.getTime() - rentFrom.getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;
  if (rentDurationMs > oneDayMs) return null;

  const pickupDay = normalizeDate(prefs.date || rentFrom);
  const sortedDays = daysSortedByRentalOverlapDesc(rentFrom, rentTo);
  const pickupMs = pickupDay?.getTime();
  const days = [
    pickupDay,
    ...sortedDays.filter((day) => day.getTime() !== pickupMs),
  ].filter(Boolean);

  for (const day of days) {
    const choices = buildSixHourChoicesForDay(devices, prefs, day);
    if (choices.length > 0) {
      return { sixHourChoices: choices, sixHourLabelDay: day };
    }
  }
  return null;
}

/**
 * Gói 1 ngày (tối): trả cả gợi ý dời nhận–trả (vd. 21h) và khung 6 tiếng còn trống.
 * UI hiện các nút cùng lúc, không collapse.
 */
export function findClientCatalogAvailabilitySuggestion(devices, prefs) {
  if (!Array.isArray(devices) || devices.length === 0 || !prefs) return null;
  if (prefs.durationType !== "ONE_DAY") return null;

  const eveningShift = findEveningShiftSuggestion(devices, prefs);

  const { fromDateTime: rentFrom, toDateTime: rentTo } =
    computeAvailabilityRange(prefs);
  const sixHour =
    rentFrom && rentTo ? findSixHourSuggestion(devices, prefs, rentFrom, rentTo) : null;

  if (!eveningShift && !sixHour) return null;

  if (eveningShift) {
    return {
      ...eveningShift,
      switchToSixHours: false,
      sixHourChoices: sixHour?.sixHourChoices || [],
      sixHourLabelDay: sixHour?.sixHourLabelDay || null,
    };
  }

  return {
    switchToSixHours: true,
    sixHourChoices: sixHour.sixHourChoices,
    sixHourLabelDay: sixHour.sixHourLabelDay,
  };
}

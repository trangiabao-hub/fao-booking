import { addDays, format } from "date-fns";
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

/** Xê dịch nhận/trả gói 1 ngày (tối): chỉ slot lệch 1–3 giờ so với giờ khách chọn, trong EVENING_SLOTS. */
const EVENING_SHIFT_MIN_MIN = 60;
const EVENING_SHIFT_MAX_MIN = 180;

function orderedEveningSlotsShiftOneToThreeHours(currentSlot) {
  let cur = timeStrToMinutes(currentSlot || "20:00");
  if (Number.isNaN(cur)) cur = timeStrToMinutes("20:00");
  const slots = [...new Set(EVENING_SLOTS)];
  return slots
    .filter((s) => {
      if (s === currentSlot) return false;
      const d = Math.abs(timeStrToMinutes(s) - cur);
      return d >= EVENING_SHIFT_MIN_MIN && d <= EVENING_SHIFT_MAX_MIN;
    })
    .sort((a, b) => {
      const da = Math.abs(timeStrToMinutes(a) - cur);
      const db = Math.abs(timeStrToMinutes(b) - cur);
      if (da !== db) return da - db;
      return timeStrToMinutes(a) - timeStrToMinutes(b);
    });
}

function firstDeviceFreeForSlot(devices, fromDateTime, toDateTime) {
  return devices.find(
    (d) => !deviceHasSlotConflict(d.bookingDtos || [], fromDateTime, toDateTime),
  );
}

function buildSuggestionFromRange(freeDevice, fromDateTime, toDateTime, extra = {}) {
  return {
    fromDateTime,
    toDateTime,
    timeFrom: format(fromDateTime, "HH:mm"),
    timeTo: format(toDateTime, "HH:mm"),
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

/**
 * 1) Gói 1 ngày (tối): gợi ý xê dịch nhận–trả **1–3 giờ** so với giờ khách chọn (slot trong EVENING_SLOTS).
 * 2) Không còn khung 1 ngày hợp lệ → gợi ý 6h: ngày overlap thuê dài nhất, nút sáng/tối.
 */
export function findClientCatalogAvailabilitySuggestion(devices, prefs) {
  if (!Array.isArray(devices) || devices.length === 0 || !prefs) return null;
  if (prefs.durationType !== "ONE_DAY") return null;

  if (prefs.pickupType === "EVENING") {
    const currentSlot = prefs.pickupSlot || prefs.timeFrom;
    for (const slot of orderedEveningSlotsShiftOneToThreeHours(currentSlot)) {
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
      const free = firstDeviceFreeForSlot(devices, fromDateTime, toDateTime);
      if (free) {
        return buildSuggestionFromRange(free, fromDateTime, toDateTime);
      }
    }
  }

  const { fromDateTime: rentFrom, toDateTime: rentTo } =
    computeAvailabilityRange(prefs);
  const rangeErr = getAvailabilityRangeError(prefs, rentFrom, rentTo);
  if (!rangeErr && rentFrom && rentTo) {
    const rentDurationMs = rentTo.getTime() - rentFrom.getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    if (rentDurationMs > oneDayMs) return null;

    const sortedDays = daysSortedByRentalOverlapDesc(rentFrom, rentTo);
    for (const day of sortedDays) {
      const choices = buildSixHourChoicesForDay(devices, prefs, day);
      if (choices.length > 0) {
        return {
          switchToSixHours: true,
          sixHourChoices: choices,
          sixHourLabelDay: day,
        };
      }
    }
  }

  return null;
}

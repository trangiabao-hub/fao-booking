import { loadBookingPrefs } from "./storage";

export function parseLocalDateParam(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function isValidTimeParam(value) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value || ""));
}

/** Đọc prefs đặt lịch từ URL catalog (query `from` trên /feedback). */
export function parseCatalogBookingPrefs(fromPath = "") {
  const raw = String(fromPath || "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw.startsWith("/") ? raw : `/${raw}`, "https://fao.local");
    const p = url.searchParams;
    const availabilityConfirmed = p.get("availability") === "1";
    const durationType = ["SIX_HOURS", "ONE_DAY"].includes(p.get("durationType"))
      ? p.get("durationType")
      : null;
    const branchId = p.get("branchId") || null;
    const date = parseLocalDateParam(p.get("date"));
    const endDate = parseLocalDateParam(p.get("endDate"));
    const timeFrom = isValidTimeParam(p.get("timeFrom")) ? p.get("timeFrom") : null;
    const timeTo = isValidTimeParam(p.get("timeTo")) ? p.get("timeTo") : null;
    const pickupType = ["MORNING", "EVENING", "AFTERNOON"].includes(
      p.get("pickupType"),
    )
      ? p.get("pickupType")
      : null;
    const pickupSlot = isValidTimeParam(p.get("pickupSlot"))
      ? p.get("pickupSlot")
      : null;

    if (
      !availabilityConfirmed ||
      !durationType ||
      !branchId ||
      !date ||
      !timeFrom
    ) {
      return null;
    }

    return {
      availabilityConfirmed,
      branchId,
      durationType,
      date,
      endDate: endDate || date,
      timeFrom,
      timeTo: timeTo || timeFrom,
      pickupType,
      pickupSlot,
    };
  } catch {
    return null;
  }
}

function buildStoredBookingPrefs(stored) {
  if (!stored) return null;
  const durationType = ["SIX_HOURS", "ONE_DAY"].includes(stored.durationType)
    ? stored.durationType
    : null;
  const date = stored?.date ? new Date(stored.date) : null;
  const endDate = stored?.endDate ? new Date(stored.endDate) : null;
  if (
    !durationType ||
    !stored.branchId ||
    !date ||
    Number.isNaN(date.getTime()) ||
    !stored.timeFrom
  ) {
    return null;
  }
  return {
    availabilityConfirmed: true,
    branchId: stored.branchId,
    durationType,
    date,
    endDate: endDate && !Number.isNaN(endDate.getTime()) ? endDate : date,
    timeFrom: stored.timeFrom,
    timeTo: stored.timeTo || stored.timeFrom,
    pickupType: stored.pickupType || null,
    pickupSlot: stored.pickupSlot || null,
  };
}

/** Prefs cho QuickBookModal — ưu tiên context catalog, fallback localStorage. */
export function buildQuickBookInitialPrefs(fromCatalogPath = "") {
  const fromCatalog = parseCatalogBookingPrefs(fromCatalogPath);
  if (fromCatalog) {
    return {
      step: 2,
      branchId: fromCatalog.branchId,
      durationType: fromCatalog.durationType,
      date: fromCatalog.date,
      endDate: fromCatalog.endDate,
      timeFrom: fromCatalog.timeFrom,
      timeTo: fromCatalog.timeTo,
      pickupType: fromCatalog.pickupType,
      pickupSlot: fromCatalog.pickupSlot,
    };
  }

  const stored = loadBookingPrefs();
  const fromStored = buildStoredBookingPrefs(stored);
  if (!fromStored) return null;
  return {
    step: 2,
    branchId: fromStored.branchId,
    durationType: fromStored.durationType,
    date: fromStored.date,
    endDate: fromStored.endDate,
    timeFrom: fromStored.timeFrom,
    timeTo: fromStored.timeTo,
    pickupType: fromStored.pickupType,
    pickupSlot: fromStored.pickupSlot,
  };
}

/**
 * Công thức tính giá - đồng bộ với fao manage (pages/manage/utils/pricing.js)
 */
import dayjs from "dayjs";
import holidaysData from "../data/holidays.json";

const holidayMap = new Map(
  (holidaysData.holidays || []).map((h) => [h.date, h.name])
);

export function isHoliday(date) {
  const dateStr = dayjs(date).format("YYYY-MM-DD");
  return holidayMap.has(dateStr);
}

export function isNonDiscountDay(date) {
  const d = dayjs(date);
  const dayOfWeek = d.day();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  return isWeekend || isHoliday(d);
}

export function roundDownToThousand(num) {
  if (typeof num !== "number" || isNaN(num)) return 0;
  return Math.floor(num / 1000) * 1000;
}

/**
 * Tính basePrice và chargeableDays từ khoảng thời gian - đồng bộ manage calculateRentalInfo
 */
export function calculateRentalInfo(rentalPeriod, device) {
  const defaultReturn = { price: 0, chargeableDays: 0 };
  if (
    !rentalPeriod ||
    !rentalPeriod[0] ||
    !rentalPeriod[1] ||
    !device ||
    !device.priceOneDay
  ) {
    return defaultReturn;
  }
  const [startRaw, endRaw] = rentalPeriod;
  const start = startRaw?.isValid ? startRaw : dayjs(startRaw);
  const end = endRaw?.isValid ? endRaw : dayjs(endRaw);

  if (!start?.isValid() || !end?.isValid() || !end.isAfter(start)) {
    return defaultReturn;
  }

  let effectiveStart = start.clone();
  if (start.hour() >= 19) {
    effectiveStart = start.clone().add(1, "day").startOf("day");
  }

  let effectiveEnd = end.clone();
  if (end.hour() < 10) {
    effectiveEnd = end.clone().startOf("day");
  }

  if (!effectiveEnd.isAfter(effectiveStart)) {
    const totalDurationHours = end.diff(start, "hour", true);
    if (totalDurationHours > 1 && totalDurationHours < 14) {
      return { price: device.priceSixHours || 0, chargeableDays: 0.5 };
    }
    return defaultReturn;
  }

  const effectiveDurationHours = effectiveEnd.diff(
    effectiveStart,
    "hour",
    true
  );
  const rentalDaysRaw = effectiveDurationHours / 24.0;
  const chargeableDays = Math.ceil(rentalDaysRaw * 2) / 2;

  if (!chargeableDays || chargeableDays <= 0) return defaultReturn;

  const fullDays = Math.floor(chargeableDays);
  const hasHalfDay = chargeableDays - fullDays >= 0.5;

  let basePrice = 0;
  switch (fullDays) {
    case 0:
      basePrice = 0;
      break;
    case 1:
      basePrice = device.priceOneDay;
      break;
    case 2:
      basePrice = device.priceTwoDay || device.priceOneDay * 2;
      break;
    case 3:
      basePrice =
        device.priceThreeDay || device.priceTwoDay + device.priceNextDay;
      break;
    default:
      basePrice =
        (device.priceThreeDay ||
          (device.priceTwoDay || device.priceOneDay * 2) + device.priceNextDay) +
        (fullDays - 3) * (device.priceNextDay || device.priceOneDay);
      break;
  }

  if (hasHalfDay) {
    if (fullDays === 0) {
      basePrice = device.priceSixHours || 0;
    } else if (fullDays === 1) {
      const priceOfDay2 =
        (device.priceTwoDay || device.priceOneDay * 2) - device.priceOneDay;
      basePrice += 0.5 * (priceOfDay2 || 0);
    } else if (fullDays === 2) {
      const priceOfDay3 =
        (device.priceThreeDay ||
          (device.priceTwoDay || device.priceOneDay * 2) + device.priceNextDay) -
        (device.priceTwoDay || device.priceOneDay * 2);
      basePrice += 0.5 * (priceOfDay3 || 0);
    } else if (fullDays >= 3) {
      basePrice += 0.5 * (device.priceNextDay || device.priceOneDay);
    }
  }

  return { price: roundDownToThousand(basePrice), chargeableDays };
}

function getAdjustedRange(start, end) {
  const startD = start?.isValid ? start : dayjs(start);
  const endD = end?.isValid ? end : dayjs(end);
  if (!startD?.isValid() || !endD?.isValid()) return null;

  let adjustedStart = startD.clone();
  if (startD.hour() >= 19) {
    adjustedStart = adjustedStart.add(1, "day").startOf("day");
  } else {
    adjustedStart = adjustedStart.startOf("day");
  }

  let adjustedEnd = endD.clone();
  if (endD.hour() < 10) {
    adjustedEnd = adjustedEnd.subtract(1, "day").startOf("day");
  } else {
    adjustedEnd = adjustedEnd.startOf("day");
  }

  return [adjustedStart, adjustedEnd];
}

/**
 * Tính giá sau khuyến mãi 20% weekday - giống manage calculateFinalPrice
 * @param {number} basePrice - Giá gốc
 * @param {Date|dayjs} startDateTime - Thời điểm nhận
 * @param {Date|dayjs} endDateTime - Thời điểm trả
 * @returns {{ original: number, discount: number, discounted: number, discountLabel: string | null, discountableDays: number, totalDays: number }}
 */
export function computeDiscountBreakdown(basePrice, startDateTime, endDateTime) {
  if (!basePrice || basePrice <= 0) return null;

  const start = startDateTime ? dayjs(startDateTime) : null;
  const end = endDateTime ? dayjs(endDateTime) : null;

  if (!start?.isValid() || !end?.isValid() || !end.isAfter(start)) {
    return {
      original: basePrice,
      discount: 0,
      discounted: roundDownToThousand(basePrice),
      discountLabel: null,
      discountableDays: 0,
      totalDays: 0,
    };
  }

  const durationHours = end.diff(start, "hour");

  if (durationHours < 23) {
    if (isNonDiscountDay(start)) {
      return {
        original: basePrice,
        discount: 0,
        discounted: roundDownToThousand(basePrice),
        discountLabel: null,
        discountableDays: 0,
        totalDays: 1,
      };
    }
    const discount = Math.round(basePrice * 0.2);
    const discounted = roundDownToThousand(basePrice * 0.8);
    return {
      original: basePrice,
      discount,
      discounted,
      discountLabel: "Giảm 20% ngày trong tuần (T2–T6)",
      discountableDays: 1,
      totalDays: 1,
    };
  }

  const range = getAdjustedRange(start, end);
  if (!range) {
    return {
      original: basePrice,
      discount: 0,
      discounted: roundDownToThousand(basePrice),
      discountLabel: null,
      discountableDays: 0,
      totalDays: 0,
    };
  }

  const [adjustedStart, adjustedEnd] = range;
  if (adjustedEnd.isBefore(adjustedStart)) {
    return {
      original: basePrice,
      discount: 0,
      discounted: roundDownToThousand(basePrice),
      discountLabel: null,
      discountableDays: 0,
      totalDays: 0,
    };
  }

  let discountableDays = 0;
  let nonDiscountDays = 0;
  let currentDay = adjustedStart.clone();
  let safety = 0;

  while (!currentDay.isAfter(adjustedEnd)) {
    if (isNonDiscountDay(currentDay)) {
      nonDiscountDays++;
    } else {
      discountableDays++;
    }
    currentDay = currentDay.add(1, "day");
    if (++safety > 10000) break;
  }

  const totalDays = discountableDays + nonDiscountDays;
  if (totalDays <= 0) {
    return {
      original: basePrice,
      discount: 0,
      discounted: roundDownToThousand(basePrice),
      discountLabel: null,
      discountableDays: 0,
      totalDays: 0,
    };
  }

  const pricePerDay = basePrice / totalDays;
  const totalDiscountableCost = discountableDays * pricePerDay;
  const totalNonDiscountCost = nonDiscountDays * pricePerDay;
  const discountedCost = totalDiscountableCost * 0.8;
  const finalPrice = discountedCost + totalNonDiscountCost;
  const discount = Math.round(basePrice - finalPrice);
  const discounted = roundDownToThousand(finalPrice);

  const pct =
    discountableDays > 0 ? Math.round(20 * (discountableDays / totalDays)) : 0;
  const discountLabel =
    discountableDays > 0
      ? `Giảm ${pct}% (${discountableDays}/${totalDays} ngày trong tuần)`
      : null;

  return {
    original: basePrice,
    discount,
    discounted,
    discountLabel,
    discountableDays,
    totalDays,
  };
}

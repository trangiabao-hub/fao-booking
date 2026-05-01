/**
 * Bản sao logic fao manage: src/pages/manage/utils/pricing.js
 * Giữ đồng bộ 100% — sửa song song cả hai nơi khi đổi công thức.
 */
import dayjs from "dayjs";
import holidaysData from "../data/holidays.json";

const holidayMap = new Map(
  holidaysData.holidays.map((h) => [h.date, h.name]),
);

export function roundDownToThousand(num) {
  if (typeof num !== "number" || isNaN(num)) return 0;
  return Math.floor(num / 1000) * 1000;
}

export function isHoliday(date) {
  const dateStr = dayjs(date).format("YYYY-MM-DD");
  return holidayMap.has(dateStr);
}

export function getHolidayName(date) {
  const dateStr = dayjs(date).format("YYYY-MM-DD");
  return holidayMap.get(dateStr) || null;
}

export function isNonDiscountDay(date) {
  const d = dayjs(date);
  const dayOfWeek = d.day();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  return isWeekend || isHoliday(d);
}

const TET_DAYS = ["2026-02-16", "2026-02-17", "2026-02-18", "2026-02-19"];

export function getAdjustedRange(start, end) {
  const s = dayjs(start);
  const e = dayjs(end);
  if (!s.isValid() || !e.isValid()) return null;

  let adjustedStart = s.clone();
  if (s.hour() >= 19) {
    adjustedStart = adjustedStart.add(1, "day").startOf("day");
  } else {
    adjustedStart = adjustedStart.startOf("day");
  }

  let adjustedEnd = e.clone();
  if (e.hour() < 10) {
    adjustedEnd = adjustedEnd.subtract(1, "day").startOf("day");
  } else {
    adjustedEnd = adjustedEnd.startOf("day");
  }
  return [adjustedStart, adjustedEnd];
}

function hasTetDays(start, end) {
  const range = getAdjustedRange(start, end);
  if (!range) return false;
  const [adjStart, adjEnd] = range;
  if (adjEnd.isBefore(adjStart)) return false;
  let cur = adjStart.clone();
  let safety = 0;
  while (!cur.isAfter(adjEnd)) {
    if (TET_DAYS.includes(cur.format("YYYY-MM-DD"))) return true;
    cur = cur.add(1, "day");
    if (++safety > 400) break;
  }
  return false;
}

export function getDiscountBreakdown(rentalPeriod) {
  if (!rentalPeriod || !rentalPeriod[0] || !rentalPeriod[1]) {
    return { discountableDates: [], holidayDates: [], weekendDates: [] };
  }

  const [start, end] = rentalPeriod;
  const startDay = start ? dayjs(start) : null;
  const endDay = end ? dayjs(end) : null;

  if (!startDay?.isValid() || !endDay?.isValid() || !endDay.isAfter(startDay)) {
    return { discountableDates: [], holidayDates: [], weekendDates: [] };
  }

  let adjustedStart = startDay.clone();
  if (startDay.hour() >= 19) {
    adjustedStart = adjustedStart.add(1, "day").startOf("day");
  } else {
    adjustedStart = adjustedStart.startOf("day");
  }

  let adjustedEnd = endDay.clone();
  if (endDay.hour() < 10) {
    adjustedEnd = adjustedEnd.subtract(1, "day").startOf("day");
  } else {
    adjustedEnd = adjustedEnd.startOf("day");
  }

  const discountableDates = [];
  const holidayDates = [];
  const weekendDates = [];

  let currentDay = adjustedStart.clone();
  let safetyCounter = 0;

  while (!currentDay.isAfter(adjustedEnd)) {
    const dateStr = currentDay.format("DD/MM");
    const fullDateStr = currentDay.format("YYYY-MM-DD");
    const holidayName = getHolidayName(currentDay);
    const dayOfWeek = currentDay.day();
    const weekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isTet = TET_DAYS.includes(fullDateStr);

    if (isTet) {
      discountableDates.push(`${dateStr} (Tết -30%)`);
    } else if (holidayName) {
      holidayDates.push({ date: dateStr, name: holidayName });
    } else if (weekend) {
      const dayName = dayOfWeek === 0 ? "Chủ Nhật" : "Thứ 7";
      weekendDates.push({ date: dateStr, dayName });
    } else {
      discountableDates.push(dateStr);
    }

    currentDay = currentDay.clone().add(1, "day");
    if (++safetyCounter > 10000) break;
  }

  return { discountableDates, holidayDates, weekendDates };
}

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
  const [start, end] = rentalPeriod;
  const startDayjs = start?.isValid ? start : dayjs(start);
  const endDayjs = end?.isValid ? end : dayjs(end);

  if (!startDayjs?.isValid() || !endDayjs?.isValid() || !endDayjs.isAfter(startDayjs)) {
    return defaultReturn;
  }

  let effectiveStart = startDayjs.clone();
  if (startDayjs.hour() >= 19) {
    effectiveStart = startDayjs.clone().add(1, "day").startOf("day");
  }

  let effectiveEnd = endDayjs.clone();
  if (endDayjs.hour() < 10) {
    effectiveEnd = endDayjs.clone().startOf("day");
  }

  if (!effectiveEnd.isAfter(effectiveStart)) {
    const totalDurationHours = endDayjs.diff(startDayjs, "hour", true);
    if (totalDurationHours > 1 && totalDurationHours < 14) {
      return { price: device.priceSixHours || 0, chargeableDays: 0.5 };
    }
    return defaultReturn;
  }

  const effectiveDurationHours = effectiveEnd.diff(
    effectiveStart,
    "hour",
    true,
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
      basePrice = device.priceThreeDay + (fullDays - 3) * device.priceNextDay;
      break;
  }

  if (hasHalfDay) {
    if (fullDays === 0) {
      basePrice = device.priceSixHours || 0;
    } else if (fullDays === 1) {
      const priceOfDay2 =
        (device.priceTwoDay || device.priceOneDay * 2) - device.priceOneDay;
      basePrice += 0.5 * priceOfDay2;
    } else if (fullDays === 2) {
      const priceOfDay3 =
        (device.priceThreeDay || device.priceTwoDay + device.priceNextDay) -
        device.priceTwoDay;
      basePrice += 0.5 * priceOfDay3;
    } else if (fullDays >= 3) {
      basePrice += 0.5 * device.priceNextDay;
    }
  }

  return { price: basePrice, chargeableDays };
}

function calculateProratedWeekdayDiscount(basePrice, start, end, discountMultiplier) {
  const range = getAdjustedRange(start, end);
  if (!range) return basePrice;
  const [adjustedStart, adjustedEnd] = range;
  if (adjustedEnd.isBefore(adjustedStart)) return basePrice;

  let discountableDays = 0;
  let nonDiscountDays = 0;
  let currentDay = adjustedStart.clone();
  let safetyCounter = 0;

  while (!currentDay.isAfter(adjustedEnd)) {
    if (isNonDiscountDay(currentDay)) {
      nonDiscountDays++;
    } else {
      discountableDays++;
    }
    currentDay = currentDay.clone().add(1, "day");
    if (++safetyCounter > 10000) break;
  }

  const totalDays = discountableDays + nonDiscountDays;
  if (totalDays === 0) return basePrice;

  const pricePerDay = basePrice / totalDays;
  const totalDiscountableCost = discountableDays * pricePerDay;
  const totalNonDiscountCost = nonDiscountDays * pricePerDay;
  const discountedCost = totalDiscountableCost * discountMultiplier;
  return discountedCost + totalNonDiscountCost;
}

function calculateTetComboPrice(basePrice, start, end, userVoucher) {
  const range = getAdjustedRange(start, end);
  if (!range) return basePrice;
  const [adjStart, adjEnd] = range;
  if (adjEnd.isBefore(adjStart)) return basePrice;

  const diffDays = adjEnd.diff(adjStart, "day") + 1;
  if (diffDays <= 0) return basePrice;

  const pricePerDay = basePrice / diffDays;
  let totalCost = 0;
  let current = adjStart.clone();
  let safety = 0;

  while (!current.isAfter(adjEnd)) {
    const dateStr = current.format("YYYY-MM-DD");
    const isTetDay = TET_DAYS.includes(dateStr);

    if (isTetDay) {
      totalCost += pricePerDay * 0.7;
    } else if (isNonDiscountDay(current)) {
      totalCost += pricePerDay;
    } else {
      let multiplier = 1;
      if (userVoucher === "20_PERCENT_WEEKDAY") multiplier = 0.8;
      if (userVoucher === "50_PERCENT_WEEKDAY") multiplier = 0.5;
      if (userVoucher === "50_PERCENT") multiplier = 0.5;
      totalCost += pricePerDay * multiplier;
    }

    current = current.add(1, "day");
    if (++safety > 1000) break;
  }

  return totalCost;
}

/**
 * Giống fao calculateFinalPrice — basePrice đã round nghìn (như original sau computePricing).
 */
export function calculateFinalPrice(basePrice, rentalPeriod, voucher) {
  if (basePrice <= 0) return 0;
  if (!rentalPeriod || !rentalPeriod[0] || !rentalPeriod[1]) {
    return roundDownToThousand(basePrice);
  }
  const [startRaw, endRaw] = rentalPeriod;
  const start = startRaw?.isValid ? startRaw : dayjs(startRaw);
  const end = endRaw?.isValid ? endRaw : dayjs(endRaw);

  if (!start?.isValid() || !end?.isValid() || !end.isAfter(start)) {
    return roundDownToThousand(basePrice);
  }

  let finalPrice;
  const durationHours = end.diff(start, "hour");

  if (hasTetDays(start, end)) {
    finalPrice = calculateTetComboPrice(basePrice, start, end, voucher);
  } else {
    switch (voucher) {
      case "50_PERCENT":
        finalPrice = basePrice * 0.5;
        break;
      case "20_PERCENT_WEEKDAY":
      case "50_PERCENT_WEEKDAY": {
        if (durationHours < 23) {
          if (!isNonDiscountDay(start)) {
            const mult = voucher === "20_PERCENT_WEEKDAY" ? 0.8 : 0.5;
            finalPrice = basePrice * mult;
          } else {
            finalPrice = basePrice;
          }
        } else {
          const mult = voucher === "20_PERCENT_WEEKDAY" ? 0.8 : 0.5;
          finalPrice = calculateProratedWeekdayDiscount(
            basePrice,
            start,
            end,
            mult,
          );
        }
        break;
      }
      default:
        finalPrice = basePrice;
    }
  }

  return roundDownToThousand(finalPrice);
}

export function priceFromDays(device, chargeableDays) {
  if (!device || !chargeableDays || chargeableDays <= 0) return 0;
  const fullDays = Math.floor(chargeableDays);
  const hasHalfDay = chargeableDays - fullDays >= 0.5;
  let basePrice = 0;

  switch (fullDays) {
    case 0:
      basePrice = 0;
      break;
    case 1:
      basePrice = device.priceOneDay || 0;
      break;
    case 2:
      basePrice = (device.priceTwoDay ?? (device.priceOneDay || 0) * 2) || 0;
      break;
    case 3:
      basePrice =
        device.priceThreeDay ??
        (device.priceTwoDay ?? (device.priceOneDay || 0) * 2) +
          (device.priceNextDay || 0);
      break;
    default:
      basePrice =
        (device.priceThreeDay ??
          (device.priceTwoDay ?? (device.priceOneDay || 0) * 2) +
            (device.priceNextDay || 0)) +
        (fullDays - 3) * (device.priceNextDay || 0);
      break;
  }

  if (hasHalfDay) {
    if (fullDays === 0) {
      basePrice = device.priceSixHours || 0;
    } else if (fullDays === 1) {
      const priceOfDay2 =
        (device.priceTwoDay ?? (device.priceOneDay || 0) * 2) -
        (device.priceOneDay || 0);
      basePrice += 0.5 * (priceOfDay2 || 0);
    } else if (fullDays === 2) {
      const priceOfDay3 =
        (device.priceThreeDay ??
          (device.priceTwoDay ?? (device.priceOneDay || 0) * 2) +
            (device.priceNextDay || 0)) -
        (device.priceTwoDay ?? (device.priceOneDay || 0) * 2);
      basePrice += 0.5 * (priceOfDay3 || 0);
    } else if (fullDays >= 3) {
      basePrice += 0.5 * (device.priceNextDay || 0);
    }
  }

  return roundDownToThousand(basePrice || 0);
}

/** Engine giống fao computePricing (daily / six_hour / manualDays). */
export function computePricing({
  start,
  end,
  device,
  voucher = "NONE",
  rentalType = "daily",
  manualDays,
}) {
  if (!device) return { chargeableDays: 0, original: 0, final: 0 };

  let chargeableDays = 0;
  let original = 0;

  if (rentalType === "six_hour") {
    chargeableDays = 0.5;
    original = roundDownToThousand(device.priceSixHours || 0);
  } else if (manualDays != null && manualDays >= 0) {
    chargeableDays = manualDays;
    original = roundDownToThousand(priceFromDays(device, chargeableDays));
  } else {
    const startDayjs = start ? dayjs(start) : null;
    const endDayjs = end ? dayjs(end) : null;

    if (startDayjs?.isValid() && endDayjs?.isValid()) {
      const { price, chargeableDays: d } = calculateRentalInfo(
        [startDayjs, endDayjs],
        device,
      );
      chargeableDays = d || 0;
      original = roundDownToThousand(price || 0);
    }
  }

  const startDayjsForFinal = start ? dayjs(start) : null;
  const endDayjsForFinal = end ? dayjs(end) : null;
  const validPeriod =
    startDayjsForFinal?.isValid() && endDayjsForFinal?.isValid()
      ? [startDayjsForFinal, endDayjsForFinal]
      : null;

  const final = calculateFinalPrice(original, validPeriod, voucher);
  return { chargeableDays, original, final };
}

/**
 * Chi tiết hiển thị fao-booking — giá cuối = calculateFinalPrice(..., "20_PERCENT_WEEKDAY").
 */
export function computeDiscountBreakdown(basePrice, startDateTime, endDateTime) {
  if (basePrice == null || isNaN(basePrice) || basePrice <= 0) return null;

  const start = dayjs(startDateTime);
  const end = dayjs(endDateTime);

  if (!start.isValid() || !end.isValid() || !end.isAfter(start)) {
    return {
      original: basePrice,
      discount: 0,
      discounted: roundDownToThousand(basePrice),
      discountLabel: null,
      discountableDays: 0,
      totalDays: 0,
    };
  }

  const original = roundDownToThousand(basePrice);
  const discounted = calculateFinalPrice(original, [start, end], "20_PERCENT_WEEKDAY");
  const discount = Math.max(0, original - discounted);

  let discountLabel = null;
  let discountableDays = 0;
  let totalDays = 0;

  if (discount > 0) {
    if (hasTetDays(start, end)) {
      discountLabel = "Combo Tết (mùng 1–4) + giảm ngày trong tuần";
      const range = getAdjustedRange(start, end);
      if (range && !range[1].isBefore(range[0])) {
        totalDays = range[1].diff(range[0], "day") + 1;
      }
    } else if (end.diff(start, "hour") < 23) {
      discountLabel = "Giảm 20% ngày trong tuần (T2–T6)";
      discountableDays = 1;
      totalDays = 1;
    } else {
      const range = getAdjustedRange(start, end);
      if (range && !range[1].isBefore(range[0])) {
        const [as, ae] = range;
        let cur = as.clone();
        let safety = 0;
        while (!cur.isAfter(ae)) {
          totalDays++;
          if (!isNonDiscountDay(cur)) discountableDays++;
          cur = cur.add(1, "day");
          if (++safety > 10000) break;
        }
        const pct =
          totalDays > 0
            ? Math.round(20 * (discountableDays / totalDays))
            : 0;
        discountLabel =
          discountableDays > 0
            ? `Giảm ${pct}% (${discountableDays}/${totalDays} ngày trong tuần)`
            : null;
      }
    }
  }

  return {
    original,
    discount,
    discounted,
    discountLabel,
    discountableDays,
    totalDays,
  };
}

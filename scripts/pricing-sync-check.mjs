/**
 * Đối chiếu fao-booking vs fao manage — chạy: node scripts/pricing-sync-check.mjs
 */
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore.js";

dayjs.extend(isSameOrBefore);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bookingPricing = await import("../src/utils/pricing.js");
const managePricing = await import(
  pathToFileURL(
    path.resolve(__dirname, "../../fao/src/pages/manage/utils/pricing.js"),
  ).href
);

const DEVICE = {
  priceSixHours: 150000,
  priceOneDay: 180000,
  priceTwoDay: 340000,
  priceThreeDay: 490000,
  priceNextDay: 150000,
};

const CASES = [
  {
    name: "Nhận 19h T3 → trả 19h T7 (4 ngày, T7 không giảm)",
    start: "2026-06-16T19:00:00+07:00",
    end: "2026-06-20T19:00:00+07:00",
    voucher: "20_PERCENT_WEEKDAY",
    expect: { original: 640000, final: 544000, days: 4 },
  },
  {
    name: "Nhận 20h T3 → trả 20h T7 (cùng kết quả với 19h)",
    start: "2026-06-16T20:00:00+07:00",
    end: "2026-06-20T20:00:00+07:00",
    voucher: "20_PERCENT_WEEKDAY",
    expect: { original: 640000, final: 544000, days: 4 },
  },
  {
    name: "Nhận 18h T3 → trả 18h T7 (4 ngày tính phí, 5 ngày lịch → prorated)",
    start: "2026-06-16T18:00:00+07:00",
    end: "2026-06-20T18:00:00+07:00",
    voucher: "20_PERCENT_WEEKDAY",
    expect: { original: 640000, final: 537000, days: 4 },
  },
  {
    name: "Trả sáng 09h (trước 10h, 3 ngày tính phí)",
    start: "2026-06-16T19:00:00+07:00",
    end: "2026-06-20T09:00:00+07:00",
    voucher: "20_PERCENT_WEEKDAY",
    expect: { original: 490000, final: 416000, days: 3 },
  },
  {
    name: "Thuê ngắn qua đêm 10h–20h (<23h, giảm flat 20%)",
    start: "2026-06-17T10:00:00+07:00",
    end: "2026-06-17T20:00:00+07:00",
    voucher: "20_PERCENT_WEEKDAY",
    expect: { original: 150000, final: 120000, days: 0.5 },
  },
  {
    name: "Thuê ngắn cuối tuần (6h, không giảm)",
    start: "2026-06-20T10:00:00+07:00",
    end: "2026-06-20T20:00:00+07:00",
    voucher: "20_PERCENT_WEEKDAY",
    expect: { original: 150000, final: 150000, days: 0.5 },
  },
  {
    name: "1 ngày sáng nhận",
    start: "2026-06-17T09:00:00+07:00",
    end: "2026-06-18T09:00:00+07:00",
    voucher: "20_PERCENT_WEEKDAY",
    expect: { original: 180000, final: 144000, days: 1 },
  },
  {
    name: "3 ngày T2–T5",
    start: "2026-06-16T19:00:00+07:00",
    end: "2026-06-19T19:00:00+07:00",
    voucher: "20_PERCENT_WEEKDAY",
    expect: { original: 490000, final: 392000, days: 3 },
  },
  {
    name: "Không voucher",
    start: "2026-06-16T19:00:00+07:00",
    end: "2026-06-20T19:00:00+07:00",
    voucher: "NONE",
    expect: { original: 640000, final: 640000, days: 4 },
  },
  {
    name: "Giảm 50% weekday dài ngày",
    start: "2026-06-16T19:00:00+07:00",
    end: "2026-06-20T19:00:00+07:00",
    voucher: "50_PERCENT_WEEKDAY",
    expect: { original: 640000, final: 400000, days: 4 },
  },
];

let failed = 0;

for (const c of CASES) {
  const start = dayjs(c.start);
  const end = dayjs(c.end);
  const b = bookingPricing.computePricing({
    start,
    end,
    device: DEVICE,
    voucher: c.voucher,
  });
  const m = managePricing.computePricing({
    start,
    end,
    device: DEVICE,
    voucher: c.voucher,
  });

  const ok =
    b.original === m.original &&
    b.final === m.final &&
    b.chargeableDays === m.chargeableDays &&
    b.original === c.expect.original &&
    b.final === c.expect.final &&
    b.chargeableDays === c.expect.days;

  if (!ok) {
    failed++;
    console.error(`FAIL: ${c.name}`);
    console.error("  booking:", b);
    console.error("  manage: ", m);
    console.error("  expect:", c.expect);
  } else {
    console.log(`OK: ${c.name} → ${b.final.toLocaleString("vi-VN")}đ`);
  }
}

if (bookingPricing.EVENING_PICKUP_HOUR !== managePricing.EVENING_PICKUP_HOUR) {
  failed++;
  console.error(
    `FAIL: EVENING_PICKUP_HOUR mismatch booking=${bookingPricing.EVENING_PICKUP_HOUR} manage=${managePricing.EVENING_PICKUP_HOUR}`,
  );
} else {
  console.log(`OK: EVENING_PICKUP_HOUR = ${bookingPricing.EVENING_PICKUP_HOUR}`);
}

if (failed > 0) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}

console.log(`\nAll ${CASES.length + 1} sync checks passed.`);

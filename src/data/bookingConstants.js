// Chi nhánh
export const BRANCHES = [
  {
    id: "PHU_NHUAN",
    label: "FAO Phú Nhuận",
    address: "Lầu 1, 475 Huỳnh Văn Bánh, Q.Phú Nhuận",
    distanceText: "3.2km",
    mapUrl: "https://maps.app.goo.gl/Lg6KoXzXWrdiurWj9?g_st=ic",
  },
  {
    id: "Q9",
    label: "FAO Q9",
    address: "465 Lê Văn Việt (Elan Cafe), Q.9 (Thủ Đức)",
    distanceText: "18.4km",
    mapUrl:
      "https://www.google.com/maps/search/?api=1&query=465+L%C3%AA+V%C4%83n+Vi%E1%BB%87t+Elan+Cafe+Th%E1%BB%A7+%C4%90%E1%BB%A9c",
    disabled: true,
    comingSoon: true,
  },
];

// Gói thời gian
export const DURATION_OPTIONS = [
  { id: "SIX_HOURS", label: "6 tiếng", days: 0.5, priceKey: "priceSixHours" },
  { id: "ONE_DAY", label: "1 ngày", days: 1, priceKey: "priceOneDay" },
  { id: "TWO_DAYS", label: "2 ngày", days: 2, priceKey: "priceTwoDay" },
  { id: "THREE_DAYS", label: "3 ngày", days: 3, priceKey: "priceThreeDay" },
];

export const MORNING_PICKUP_TIME = "09:00";
export const SIX_HOUR_SECOND_PICKUP_TIME = "15:00";
export const SIX_HOUR_RETURN_TIME = "15:00";
export const DEFAULT_EVENING_SLOT = "20:30";
export const EVENING_SLOTS = [
  "18:00",
  "18:15",
  "18:30",
  "18:45",
  "19:00",
  "19:15",
  "19:30",
  "19:45",
  "20:00",
  "20:15",
  "20:30",
  "20:45",
  "21:00",
];
export const SIX_HOUR_MAX_HOURS = 12;

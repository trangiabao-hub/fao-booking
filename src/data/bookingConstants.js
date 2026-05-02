/** Ngày đầu tiên mở đặt lịch Q9 (theo lịch VN, 00:00). */
export const Q9_BOOKING_OPENS_DATE = "2026-05-05";

/**
 * Q9 chỉ book được khi ngày nhận máy (ngày trên lịch) đã tới opensAt — có thể đặt trước trước ngày mở cửa.
 * Phú Nhuận luôn mở.
 * @param {{ id: string, opensAt?: string }} branch
 * @param {Date} [pickupCalendarDay] — ngày nhận máy (0h). Mặc định hôm nay (cho getDefaultBranchId).
 */
export function isBranchBookable(branch, pickupCalendarDay = new Date()) {
  if (!branch) return false;
  if (branch.id !== "Q9") return true;
  const openStr = branch.opensAt || Q9_BOOKING_OPENS_DATE;
  if (!openStr) return true;
  const tOpen = new Date(`${openStr}T00:00:00`);
  const t = new Date(pickupCalendarDay);
  t.setHours(0, 0, 0, 0);
  tOpen.setHours(0, 0, 0, 0);
  return t.getTime() >= tOpen.getTime();
}

// Chi nhánh
export const BRANCHES = [
  {
    id: "PHU_NHUAN",
    label: "FAO Phú Nhuận",
    address: "Lầu 1, 475 Huỳnh Văn Bánh, Q.Phú Nhuận",
    /** Dòng địa chỉ trên màn hình sau thanh toán (HTML 🗺️ + link Maps). */
    pickupSpotLabel: "Lầu 1, tại 475 Huỳnh Văn Bánh, Q. Phú Nhuận",
    phone: "0901355198",
    /** Địa điểm đầy đủ cho Google Calendar. */
    calendarLocation:
      "Lầu 1, 475 Huỳnh Văn Bánh, Quận Phú Nhuận, Hồ Chí Minh, Việt Nam",
    distanceText: "3.2km",
    mapUrl: "https://maps.app.goo.gl/Lg6KoXzXWrdiurWj9?g_st=ic",
    /** Sau dòng CCCD/VNeID — màn hình payment-status. */
    pickupDirectionsTail:
      "Khi đến shop mình mang dép đen trên kệ, lên lầu 1 quẹo phải để nhận máy ạ",
  },
  {
    id: "Q9",
    label: "FAO Q9",
    address: "465 Lê Văn Việt (Elan Cafe), Q.9 (Thủ Đức)",
    pickupSpotLabel: "Tại 465 Lê Văn Việt, Q.9 (Elan Cafe)",
    phone: "0775844479",
    calendarLocation:
      "465 Lê Văn Việt (Elan Cafe), Q.9, Thủ Đức, Hồ Chí Minh, Việt Nam",
    distanceText: "18.4km",
    mapUrl:
      "https://www.google.com/maps/search/?api=1&query=465+L%C3%AA+V%C4%83n+Vi%E1%BB%87t+Elan+Cafe+Th%E1%BB%A7+%C4%90%E1%BB%A9c",
    opensAt: Q9_BOOKING_OPENS_DATE,
    pickupDirectionsTail:
      "Khi đến quán mình hỏi nhân viên shop thuê máy ảnh để đc mấy bạn hỗ trợ nhen",
  },
];

/** Giờ mở cửa hiển thị chung (sau thanh toán). */
export const BRANCH_WORKING_HOURS_LABEL = "09h00 - 22h00";

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

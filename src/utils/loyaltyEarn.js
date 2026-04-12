/** Trạng thái đơn tính vào tổng chi tiêu hạng (đồng bộ trang Tài khoản). */
export const PAID_BOOKING_STATUSES = new Set([
  "PAYMENT",
  "IN_RENT",
  "DONE",
  "REFUNDED",
]);

export const POINT_EARN_BLOCK_VND = 50_000;

const POINTS_PER_BLOCK_BY_TIER = {
  member: 3,
  silver: 4,
  vip: 5,
};

export function computeTotalSpentFromBookings(bookings) {
  if (!Array.isArray(bookings)) return 0;
  return Math.round(
    bookings
      .filter((b) => PAID_BOOKING_STATUSES.has(b?.status))
      .reduce((sum, b) => sum + (Number(b?.total) || 0), 0),
  );
}

/** Khớp ngưỡng trên trang Tài khoản (theo tổng chi tiêu). */
export function memberTierKeyFromTotalSpent(totalSpent = 0) {
  const spent = Math.max(0, Number(totalSpent) || 0);
  if (spent > 3_000_000) return "vip";
  if (spent >= 1_000_000) return "silver";
  return "member";
}

export function pointsPerEarnBlock(tierKey) {
  return POINTS_PER_BLOCK_BY_TIER[tierKey] ?? POINTS_PER_BLOCK_BY_TIER.member;
}

/** Điểm tích từ số tiền thanh toán (sau giảm) và hạng hiện tại. */
export function computeEarnedPoints(amountVnd, tierKey) {
  const amount = Math.max(0, Math.floor(Number(amountVnd) || 0));
  const perBlock = pointsPerEarnBlock(tierKey);
  return Math.floor(amount / POINT_EARN_BLOCK_VND) * perBlock;
}

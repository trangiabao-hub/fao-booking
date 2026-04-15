/**
 * Giao hai khoảng thời gian [aFrom, aTo] và [bFrom, bTo] — đồng bộ JPA overlap:
 * aFrom < bTo && aTo > bFrom
 */
export function intervalsOverlapMs(aFromMs, aToMs, bFromMs, bToMs) {
  return aFromMs < bToMs && aToMs > bFromMs;
}

/**
 * Giữ booking thật sự trùng khung khách chọn (nhận → trả).
 * @param {Array<{ bookingFrom?: string|Date, bookingTo?: string|Date }>} bookings
 * @param {Date} slotFrom
 * @param {Date} slotTo
 */
export function filterBookingsOverlappingSlot(bookings, slotFrom, slotTo) {
  const list = Array.isArray(bookings) ? bookings : [];
  if (!slotFrom || !slotTo) return [...list];
  const sf = slotFrom.getTime();
  const st = slotTo.getTime();
  // Khoảng không hợp lệ → không lọc (giữ nguyên), tránh hiển thị “trống” oan
  if (Number.isNaN(sf) || Number.isNaN(st) || !(st > sf)) return [...list];
  return list.filter((b) => {
    if (b?.bookingFrom == null || b?.bookingTo == null) return false;
    const bf = new Date(b.bookingFrom).getTime();
    const bt = new Date(b.bookingTo).getTime();
    if (Number.isNaN(bf) || Number.isNaN(bt)) return false;
    return intervalsOverlapMs(bf, bt, sf, st);
  });
}

export function deviceHasSlotConflict(bookings, slotFrom, slotTo) {
  return filterBookingsOverlappingSlot(bookings, slotFrom, slotTo).length > 0;
}

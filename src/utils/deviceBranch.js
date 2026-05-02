function normalizeBranchId(rawValue) {
  const normalized = String(rawValue || "")
    .trim()
    .toUpperCase()
    .replace(/[\s._-]/g, "");
  if (normalized === "Q9" || normalized === "QUAN9" || normalized === "THUDUC") {
    return "Q9";
  }
  return "PHU_NHUAN";
}

/** Chuẩn hoá id chi nhánh đặt lịch (PHU_NHUAN | Q9) — dùng so khớp cross-branch. */
export function normalizeBookingBranchId(rawValue) {
  return normalizeBranchId(rawValue);
}

/**
 * Suy luận chi nhánh từ một booking khi API không trả `branchId`.
 * Backend thường gửi `location` ("Thủ Đức") và/hoặc `note` ("... FAO Q9").
 */
export function inferBookingBranchId(booking) {
  if (!booking || typeof booking !== "object") return "PHU_NHUAN";

  const explicit =
    booking.branchId ??
    booking.branch_id ??
    booking.bookingBranch ??
    booking.booking_branch ??
    booking.branch;

  if (explicit != null && String(explicit).trim() !== "") {
    return normalizeBookingBranchId(explicit);
  }

  const loc = String(booking.location ?? "").trim();
  const note = String(booking.note ?? "").trim();
  const haystack = `${loc} ${note}`;

  if (
    /FAO\s+Q9/i.test(haystack) ||
    /(^|[\s,.])Q9([\s,.]|$)/i.test(haystack) ||
    /Thủ\s*Đức/i.test(haystack) ||
    /Thu\s*Duc/i.test(haystack)
  ) {
    return "Q9";
  }

  if (/Phú\s*Nhuận|Phu\s*Nhuan|FAO\s+Phú/i.test(haystack)) {
    return "PHU_NHUAN";
  }

  return "PHU_NHUAN";
}

/** Đơn nhiều booking: nếu có booking Q9 thì coi cả đơn là Q9 (đồng bộ UI thanh toán). */
export function inferOrderBookingBranchId(bookings) {
  if (!Array.isArray(bookings) || bookings.length === 0) return "PHU_NHUAN";
  for (const b of bookings) {
    if (inferBookingBranchId(b) === "Q9") return "Q9";
  }
  return inferBookingBranchId(bookings[0]);
}

/** Đồng bộ với backend enum DeviceBranch: PHU_NHUAN | Q9 */
export function normalizeDeviceBranchId(device) {
  if (!device || typeof device !== "object") return "PHU_NHUAN";
  return normalizeBranchId(
    device.branch ??
      device.deviceBranch ??
      device.device_branch ??
      device.branchId ??
      device.branch_id ??
      device?.device?.branch ??
      device?.device?.deviceBranch ??
      device?.device?.device_branch ??
      "",
  );
}

function pickFirstArray(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return null;
  return (
    pickFirstArray(value.data) ||
    pickFirstArray(value.content) ||
    pickFirstArray(value.result) ||
    pickFirstArray(value.items) ||
    pickFirstArray(value.list) ||
    null
  );
}

/** axios / gateway đôi khi bọc body nhiều lớp; luôn trả mảng máy. */
export function normalizeDevicesListResponse(data) {
  return pickFirstArray(data) || [];
}

/**
 * Lọc máy theo chi nhánh đặt lịch.
 * `selectedBranchId` null/undefined → coi như Phú Nhuận (tránh lọc ra 0 máy).
 */
export function devicesForBookingBranch(allDevices, selectedBranchId) {
  if (!Array.isArray(allDevices)) return [];
  const branchId = normalizeBranchId(selectedBranchId || "PHU_NHUAN");
  return allDevices.filter(
    (d) => normalizeDeviceBranchId(d) === branchId,
  );
}

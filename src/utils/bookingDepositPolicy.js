/** Parse “Cọc X triệu / Cọc …” trong mô tả — không mặc định tiền. */
export function parseDepositFromDescription(desc) {
  if (!desc) return null;
  const mTrieu = desc.match(/Cọc\s*([\d.,]+)\s*triệu/i);
  if (mTrieu) {
    const n = parseFloat(mTrieu[1].replace(",", "."));
    if (!Number.isNaN(n) && n > 0) return Math.round(n * 1_000_000);
  }
  const mVnd = desc.match(/Cọc\s*([\d.\s,]+)/i);
  if (mVnd) {
    const digits = mVnd[1].replace(/[^\d]/g, "");
    const n = parseInt(digits, 10);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return null;
}

/** Ưu tiên API `device.deposit`; chỉ có số > 0 mới tính. */
export function resolveDeviceLegDepositVnd(device) {
  if (!device) return null;
  const d = Number(device.deposit);
  if (Number.isFinite(d) && d > 0) return Math.round(d);
  return parseDepositFromDescription(device.description);
}

/** Nhiều máy: tổng cọc các máy có mức > 0; không có máy nào ⇒ null. */
export function resolveDevicesLegDepositTotalVnd(devices) {
  if (!devices?.length) return null;
  let sum = 0;
  for (const dev of devices) {
    const v = resolveDeviceLegDepositVnd(dev);
    if (v != null && v > 0) sum += v;
  }
  return sum > 0 ? sum : null;
}

export function formatDepositVndVi(amount) {
  return Math.round(Number(amount) || 0).toLocaleString("vi-VN");
}

/**
 * Cam kết cọc trên web — khớp copy summary đơn staff.
 * @param {Array<object>|null|undefined} devices
 */
export function buildBookingDepositCommitmentLines(devices) {
  const list = Array.isArray(devices) ? devices.filter(Boolean) : [];
  const totalVnd = list.length > 0 ? resolveDevicesLegDepositTotalVnd(list) : null;
  const amountNote =
    totalVnd != null && totalVnd > 0
      ? list.length > 1
        ? ` (tổng ${list.length} máy: ${formatDepositVndVi(totalVnd)}đ)`
        : ` (máy này: ${formatDepositVndVi(totalVnd)}đ)`
      : "";

  return [
    "*CHỌN 1 TRONG 3 HÌNH THỨC, ĐỌC KĨ LƯU Ý BÊN DƯỚI",
    "1. Hình thức 1: cọc 0đ áp dụng cho hssv còn đi học (đem theo thẻ hssv và lịch học, có thể dùng trên web) + cccd bản gốc hoặc vneid định danh mức 2.",
    `2. Hình thức 2: cọc tiền của mỗi máy (note trên bảng giá, dao động từ 2-5 triệu)${amountNote} + cccd bản gốc hoặc vneid định danh mức 2.`,
    "3. Hình thức 3: cọc bằng tài sản tương đương (laptop, ipad, điện thoại) + cccd bản gốc hoặc vneid định danh mức 2.",
    "*LƯU Ý:",
    "- Nếu là acc clone (Facebook/Zalo/Instagram), cọc 10.000.000đ.",
    "- Thuê 2 máy trở lên, cần 2 cccd và đến shop xác thực.",
    "- Khi nhận máy cần kí hợp đồng và lăn tay, thông tin của người kí hợp đồng phải chính chủ với cccd và hssv của người đến nhận.",
    "- Khách hàng dưới 16 tuổi cần có sự cho phép của phụ huynh.",
    "- Cccd VÀ VNEID chỉ chụp lại không giữ.",
    "- Đọc kĩ quy trình - quy định ghim đầu trang.",
  ];
}

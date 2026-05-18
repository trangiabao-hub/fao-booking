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
 * Copy checkbox “Cam kết trước khi thanh toán” — không có cọc ⇒ bỏ dòng 🔒.
 * @param {Array<object>|null|undefined} devices
 */
export function buildBookingDepositCommitmentLines(devices) {
  const list = Array.isArray(devices) ? devices.filter(Boolean) : [];
  const totalVnd = list.length > 0 ? resolveDevicesLegDepositTotalVnd(list) : null;

  const lines = [
    "🎁 Đặc biệt: Chương trình CỌC 0Đ — áp dụng cho HSSV đang còn lịch học tại TP.HCM.",
  ];
  if (totalVnd != null && totalVnd > 0) {
    const formatted = formatDepositVndVi(totalVnd);
    lines.push(
      list.length > 1
        ? `🔒 Hoặc cọc thế chân ${formatted}đ (tổng ${list.length} máy)`
        : `🔒 Hoặc cọc thế chân ${formatted}đ`,
    );
  }
  lines.push(
    "🪪 CCCD/VNeID mức 2 (+ chứng nhận lịch học nếu thuộc diện CỌC 0Đ).",
    "Lưu ý khách hàng dưới 16 tuổi cần có sự cho phép của phụ huynh",
  );
  return lines;
}

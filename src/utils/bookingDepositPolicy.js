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
 * Cụm HT2 — linh hoạt theo máy đã chọn.
 * VD: "cọc 3.000.000đ" | "cọc M200 3tr + XT30 2tr (tổng …)" | "[giá cọc theo mỗi máy]"
 */
export function formatHt2DepositPhrase(devices) {
  const list = Array.isArray(devices) ? devices.filter(Boolean) : [];
  const entries = list
    .map((d) => {
      const amount = resolveDeviceLegDepositVnd(d);
      if (amount == null || amount <= 0) return null;
      return { name: String(d.name || "máy").trim() || "máy", amount };
    })
    .filter(Boolean);

  if (!entries.length) return "[giá cọc theo mỗi máy]";

  if (entries.length === 1) {
    return `cọc ${formatDepositVndVi(entries[0].amount)}đ`;
  }

  const total = entries.reduce((sum, e) => sum + e.amount, 0);
  const parts = entries
    .map((e) => `${e.name} ${formatDepositVndVi(e.amount)}đ`)
    .join(" + ");
  return `cọc ${parts} (tổng ${formatDepositVndVi(total)}đ)`;
}

export const DEPOSIT_POLICY_NOTES = [
  "Nếu là acc clone (Facebook/Zalo/Instagram), cọc 10.000.000đ.",
  "Đọc kĩ quy trình - quy định ghim đầu trang.",
];

/**
 * 3 hình thức cọc tại cửa hàng — chọn 1.
 * @param {Array<object>|null|undefined} devices
 */
export function getDepositMethodOptions(devices) {
  const ht2Phrase = formatHt2DepositPhrase(devices);
  const ht2Title = ht2Phrase
    ? ht2Phrase.charAt(0).toUpperCase() + ht2Phrase.slice(1)
    : "Cọc theo máy";
  return [
    {
      id: "HT1",
      code: "HT1",
      title: "Cọc 0đ",
      audience: "Học sinh / sinh viên còn đi học",
      detail:
        "Đem thẻ HSSV và lịch học (có thể dùng trên web) + CCCD bản gốc hoặc VNeID định danh mức 2.",
    },
    {
      id: "HT2",
      code: "HT2",
      title: ht2Title,
      audience: "Cọc tiền mặt tại cửa hàng",
      detail: "CCCD bản gốc hoặc VNeID định danh mức 2.",
    },
    {
      id: "HT3",
      code: "HT3",
      title: "Cọc bằng tài sản",
      audience: "Laptop, iPad, điện thoại tương đương",
      detail: "CCCD bản gốc hoặc VNeID định danh mức 2.",
    },
  ];
}

export function getDepositMethodSummaryLabel(id, devices) {
  const option = getDepositMethodOptions(devices).find((item) => item.id === id);
  if (!option) return "";
  return `${option.code} · ${option.title}`;
}

/**
 * Cam kết cọc trên web — khớp copy summary đơn staff.
 * @param {Array<object>|null|undefined} devices
 */
export function buildBookingDepositCommitmentLines(devices) {
  return [
    "**CHỌN 1 TRONG 3 HÌNH THỨC, ĐỌC KĨ LƯU Ý BÊN DƯỚI**",
    "🪪 HT1: cọc 0đ áp dụng cho hssv còn đi học (đem theo thẻ hssv và lịch học, có thể dùng trên web) + cccd bản gốc hoặc vneid định danh mức 2.",
    `🔒 HT2: ${formatHt2DepositPhrase(devices)} + cccd bản gốc hoặc vneid định danh mức 2.`,
    "💻 HT3: cọc bằng tài sản tương đương (laptop, ipad, điện thoại) + cccd bản gốc hoặc vneid định danh mức 2.",
    "",
    "**LƯU Ý**",
    "- Nếu là acc clone (Facebook/Zalo/Instagram), cọc 10.000.000đ.",
    "- Đọc kĩ quy trình - quy định ghim đầu trang.",
  ];
}

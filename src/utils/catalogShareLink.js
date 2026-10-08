import { format, isValid } from "date-fns";
import { normalizeBookingTimePrefs } from "./bookingTimePrefs";

/** `models=R50,G7X3` — danh sách modelKey shop gửi khách (không phải full catalog). */
export function parseModelsParam(value) {
  if (!value) return [];
  return [
    ...new Set(
      String(value)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
}

export function serializeModelsParam(modelKeys = []) {
  return [
    ...new Set(
      modelKeys.map((k) => String(k || "").trim()).filter(Boolean),
    ),
  ].join(",");
}

/**
 * Query catalog chỉ gắn prefs đặt lịch — bỏ q, focusModel, book… để link gửi khách gọn và ổn định.
 * @param {{ modelKeys?: string[] }} options — khi set: khách chỉ thấy các model đó.
 */
export function buildCatalogShareSearchParams(availabilityPrefs = {}, options = {}) {
  const prefs = normalizeBookingTimePrefs(availabilityPrefs);
  const params = new URLSearchParams();

  if (prefs.branchId) {
    params.set("branchId", prefs.branchId);
  }

  if (prefs.durationType) {
    params.set("durationType", prefs.durationType);
  }

  if (prefs.date && isValid(prefs.date)) {
    params.set("date", format(prefs.date, "yyyy-MM-dd"));
  }

  if (prefs.endDate && isValid(prefs.endDate)) {
    params.set("endDate", format(prefs.endDate, "yyyy-MM-dd"));
  }

  if (prefs.timeFrom) {
    params.set("timeFrom", prefs.timeFrom);
  }

  if (prefs.timeTo) {
    params.set("timeTo", prefs.timeTo);
  }

  if (prefs.pickupType) {
    params.set("pickupType", prefs.pickupType);
  }

  if (prefs.pickupSlot) {
    params.set("pickupSlot", prefs.pickupSlot);
  }

  params.set("availability", "1");

  const modelKeys = options.modelKeys || [];
  if (modelKeys.length) {
    params.set("models", serializeModelsParam(modelKeys));
  }

  return params;
}

/**
 * Origin cho link gửi khách: ưu tiên VITE_SITE_URL (domain thật) để tránh gửi nhầm
 * localhost / preview khi staff thao tác ở môi trường không phải production.
 */
export function resolveShareOrigin(explicitOrigin) {
  if (explicitOrigin) return String(explicitOrigin).replace(/\/+$/, "");
  const configured = import.meta.env.VITE_SITE_URL;
  if (configured) return String(configured).replace(/\/+$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}

export function buildCatalogShareUrl(availabilityPrefs = {}, { modelKeys = [] } = {}) {
  const base = resolveShareOrigin();
  const params = buildCatalogShareSearchParams(availabilityPrefs, { modelKeys });
  return `${base}/catalog?${params.toString()}`;
}

export function formatBranchLabelForShare(branchLabel = "") {
  return String(branchLabel || "")
    .replace(/^FAO\s*/i, "")
    .trim();
}

/** "nhận 9h 16/6, trả 9h 17/6" → ["Nhận 9h 16/6", "Trả 9h 17/6"] */
function formatScheduleLinesForShare(pickupReturnSummary = "") {
  const s = String(pickupReturnSummary || "").trim();
  if (!s) return [];

  const match = s.match(/^nhận\s+(.+),\s*trả\s+(.+)$/i);
  if (match) {
    return [`Nhận ${match[1]}`, `Trả ${match[2]}`];
  }

  return [s.charAt(0).toUpperCase() + s.slice(1)];
}

/** 300000 → "300k", 1250000 → "1.250k" */
function formatPriceK(vnd) {
  return `${Math.round(vnd / 1000).toLocaleString("vi-VN")}k`;
}

/** "Canon EOS R50 chỉ còn 300k (giá gốc 400k)" — null khi chưa có giá. */
function formatPriceLine(name, price) {
  const discounted = price?.discounted ?? 0;
  const original = price?.original ?? 0;
  if (discounted <= 0) return null;
  if (original > discounted) {
    return `${name} chỉ còn ${formatPriceK(discounted)} (giá gốc ${formatPriceK(original)})`;
  }
  return `${name} giá ${formatPriceK(discounted)}`;
}

/** Danh sách nhiều máy: 1 dòng/máy cho dễ đọc trên điện thoại — "XS10: 280k". */
function formatCompactPriceLine(name, price) {
  const discounted = price?.discounted ?? 0;
  return discounted > 0 ? `${name}: ${formatPriceK(discounted)}` : name;
}

/** Gom phần "giá gốc" thành 1 dòng chung thay vì lặp ở từng máy. */
function formatSavingsNote(prices = []) {
  const maxSaved = Math.max(
    0,
    ...prices.map((p) => (p?.original ?? 0) - (p?.discounted ?? 0)),
  );
  return maxSaved > 0
    ? `✅ Giá đã giảm trực tiếp, tiết kiệm tới ${formatPriceK(maxSaved)}/máy`
    : null;
}

/** "FUJIFILM XS10" trong dòng "Fujifilm" → "XS10" (giữ nguyên nếu bỏ xong bị rỗng). */
function stripBrandPrefix(name = "", categoryLabel = "") {
  const words = new Set(
    String(categoryLabel).toLowerCase().split(/\s+/).filter(Boolean),
  );
  if (words.has("fujifilm")) words.add("fuji");
  if (words.has("fuji")) words.add("fujifilm");
  const tokens = String(name).trim().split(/\s+/);
  let i = 0;
  while (i < tokens.length - 1 && words.has(tokens[i].toLowerCase())) i += 1;
  return tokens.slice(i).join(" ");
}

function joinShareMessageLines(lines = []) {
  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Tin nhắn copy-paste cho Messenger / Zalo — chia dòng, lịch và link dễ quét.
 * Giá (`{ original, discounted }`) là tổng cả lịch thuê, giống giá trên thẻ catalog.
 * @param {Object<string, {original:number, discounted:number}>} modelPrices — theo modelKey
 * @param {{label:string, original:number, discounted:number}[]} hotPicks — máy nổi bật khi gửi full catalog
 */
export function buildCatalogShareMessage({
  pickupReturnSummary = "",
  branchLabel = "",
  url = "",
  modelKeys = [],
  modelLabels = [],
  modelPrices = {},
  hotPicks = [],
}) {
  const link = String(url || "").trim();
  const branch = formatBranchLabelForShare(branchLabel);
  const scheduleLines = formatScheduleLinesForShare(pickupReturnSummary);
  const keys = modelKeys.filter(Boolean);
  const labels = modelLabels.filter(Boolean);

  const detailLines = [
    ...scheduleLines,
    ...(branch ? [`Chi nhánh: ${branch}`] : []),
  ];

  if (keys.length === 1) {
    const name = labels[0] || keys[0];
    const price = modelPrices[keys[0]];
    const priceLine = formatPriceLine(name, price);
    const saved = (price?.original ?? 0) - (price?.discounted ?? 0);
    return joinShareMessageLines([
      `Dạ em gửi máy ${name} ạ.`,
      "",
      ...detailLines,
      ...(priceLine
        ? [
            "",
            ...(saved > 0 ? [`Giảm trực tiếp ${formatPriceK(saved)}`] : []),
            `🔥 ${priceLine}`,
          ]
        : []),
      "",
      "Anh/chị bấm đặt tại link:",
      link,
    ]);
  }

  if (keys.length > 1) {
    const names = keys.map((k, i) => labels[i] || k);
    const prices = keys.map((k) => modelPrices[k]);
    const hasPrice = prices.some((p) => (p?.discounted ?? 0) > 0);
    const savingsNote = formatSavingsNote(prices);
    return joinShareMessageLines([
      `Dạ em gửi ${keys.length} máy shop còn trống ạ.`,
      "",
      ...detailLines,
      "",
      ...(hasPrice
        ? [
            "🔥 Giá cả lịch thuê:",
            ...names.map((n, i) => `• ${formatCompactPriceLine(n, prices[i])}`),
            ...(savingsNote ? [savingsNote] : []),
          ]
        : [`Máy: ${names.join(", ")}`]),
      "",
      "Anh/chị chọn máy và bấm đặt tại link:",
      link,
    ]);
  }

  const pricedHotPicks = hotPicks.filter((p) => (p?.discounted ?? 0) > 0);
  const hotSavingsNote = formatSavingsNote(pricedHotPicks);

  return joinShareMessageLines([
    "Dạ em gửi catalog máy còn trống ạ.",
    "",
    ...detailLines,
    ...(pricedHotPicks.length
      ? [
          "",
          "🔥 Máy hot:",
          ...pricedHotPicks.map((p) => `• ${formatCompactPriceLine(p.label, p)}`),
          "… và nhiều máy khác trong link",
          ...(hotSavingsNote ? [hotSavingsNote] : []),
        ]
      : []),
    "",
    "Anh/chị chọn máy và bấm đặt tại link:",
    link,
  ]);
}

/**
 * Tin nhắn theo 1 dòng máy (tab danh mục) — liệt kê máy còn trống của dòng kèm giá.
 * @param {{label:string, original:number, discounted:number}[]} items
 */
export function buildCatalogCategoryShareMessage({
  pickupReturnSummary = "",
  branchLabel = "",
  url = "",
  categoryLabel = "",
  items = [],
}) {
  const link = String(url || "").trim();
  const branch = formatBranchLabelForShare(branchLabel);
  const detailLines = [
    ...formatScheduleLinesForShare(pickupReturnSummary),
    ...(branch ? [`Chi nhánh: ${branch}`] : []),
  ];
  const lines = items
    .filter((p) => p?.label)
    .map((p) => formatCompactPriceLine(stripBrandPrefix(p.label, categoryLabel), p));
  const savingsNote = formatSavingsNote(items);

  return joinShareMessageLines([
    `Dạ em gửi các máy ${categoryLabel} còn trống ạ.`,
    "",
    ...detailLines,
    ...(lines.length
      ? [
          "",
          `🔥 ${categoryLabel}:`,
          ...lines.map((l) => `• ${l}`),
          ...(savingsNote ? [savingsNote] : []),
        ]
      : []),
    "",
    "Anh/chị chọn máy và bấm đặt tại link:",
    link,
  ]);
}

/** Nhãn ngắn cho banner khách — vd. "Canon R50, G7X Mark III". */
export function buildCuratedModelsSummary(modelLabels = []) {
  const labels = modelLabels.filter(Boolean);
  if (!labels.length) return "";
  if (labels.length <= 3) return labels.join(", ");
  return `${labels.slice(0, 2).join(", ")} +${labels.length - 2} máy`;
}

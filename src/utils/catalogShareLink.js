import { format, isValid } from "date-fns";

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
  const params = new URLSearchParams();

  if (availabilityPrefs.branchId) {
    params.set("branchId", availabilityPrefs.branchId);
  }

  if (availabilityPrefs.durationType) {
    params.set("durationType", availabilityPrefs.durationType);
  }

  if (availabilityPrefs.date && isValid(availabilityPrefs.date)) {
    params.set("date", format(availabilityPrefs.date, "yyyy-MM-dd"));
  }

  if (availabilityPrefs.endDate && isValid(availabilityPrefs.endDate)) {
    params.set("endDate", format(availabilityPrefs.endDate, "yyyy-MM-dd"));
  }

  if (availabilityPrefs.timeFrom) {
    params.set("timeFrom", availabilityPrefs.timeFrom);
  }

  if (availabilityPrefs.timeTo) {
    params.set("timeTo", availabilityPrefs.timeTo);
  }

  if (availabilityPrefs.pickupType) {
    params.set("pickupType", availabilityPrefs.pickupType);
  }

  if (availabilityPrefs.pickupSlot) {
    params.set("pickupSlot", availabilityPrefs.pickupSlot);
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

function joinShareMessageLines(lines = []) {
  return lines
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Tin nhắn copy-paste cho Messenger / Zalo — chia dòng, lịch và link dễ quét.
 */
export function buildCatalogShareMessage({
  pickupReturnSummary = "",
  branchLabel = "",
  url = "",
  modelKeys = [],
  modelLabels = [],
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
    return joinShareMessageLines([
      `Dạ em gửi máy ${name} ạ.`,
      "",
      ...detailLines,
      "",
      "Anh/chị bấm đặt tại link:",
      link,
    ]);
  }

  if (keys.length > 1) {
    const nameList = labels.length ? labels.join(", ") : keys.join(", ");
    return joinShareMessageLines([
      `Dạ em gửi ${keys.length} máy shop còn trống ạ.`,
      "",
      ...detailLines,
      "",
      `Máy: ${nameList}`,
      "",
      "Anh/chị chọn máy và bấm đặt tại link:",
      link,
    ]);
  }

  return joinShareMessageLines([
    "Dạ em gửi catalog máy còn trống ạ.",
    "",
    ...detailLines,
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

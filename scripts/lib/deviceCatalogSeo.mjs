/**
 * Fetch catalog từ API backend (cùng nguồn DB admin) — devices + categories/with-items.
 */
import { writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { BRANCHES } from "../../src/data/localBusiness.js";
import {
  buildDeviceKeywordFaqs,
  buildDeviceKeywordPhrase,
  getDeviceSearchKeywords,
} from "./deviceSeoKeywords.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_PATH = join(__dirname, "../../src/data/deviceSeoSnapshot.json");

/** Danh mục máy trên admin — bỏ phụ kiện / concert */
const SEO_CATEGORY_NAMES = new Set([
  "Canon",
  "Fujifilm",
  "Sony",
  "DJI",
  "Ricoh",
  "Insta 360",
]);

const SLUG_LABELS = {
  G7X: "g7x-mark-ii",
  G7X3: "g7x-mark-iii",
  ZV10: "zv-e10",
  ZV1: "zv-1",
  PK3: "pocket-3",
  R50: "r50",
  R50V: "r50v",
  RP: "rp",
  RP24105: "rp-24-105",
  M50: "m50-mark-ii",
  M200: "m200",
  M100: "m100",
  M10: "m10",
  "170": "ixy-170",
  "910": "ixy-910",
  XT30: "xt30-ii",
  XT301545: "xt30-ii-15-45",
  XS10: "xs10",
  XS20: "xs20",
  XT200: "xt200",
  XT20: "xt20",
  XT100: "xt100",
  XA3: "xa3",
  XA5: "xa5",
  X100F: "x100f",
  X100V: "x100v",
  XM5: "xm5",
  A6400: "a6400",
  S23: "s23-ultra",
  RC: "gr-iiix",
  RFS1850: "sigma-18-50-rf",
  GU: "go-ultra",
};

const BRAND_SLUG = {
  Canon: "canon",
  Fujifilm: "fujifilm",
  Fuji: "fujifilm",
  Sony: "sony",
  DJI: "dji",
  Pocket: "dji",
  "Insta 360": "insta360",
  Ricoh: "ricoh",
  Phone: "samsung",
};

export function formatVnd(n) {
  if (!n || n <= 0) return "Liên hệ";
  return `${Math.round(n).toLocaleString("vi-VN")}đ`;
}

/** Làm tròn xuống nghìn — đồng bộ booking app */
export function roundDownToThousand(num) {
  if (typeof num !== "number" || isNaN(num) || num <= 0) return 0;
  return Math.floor(num / 1000) * 1000;
}

/** Giảm 20% T2–T6 đặt online (hiển thị bảng giá) */
export function applyOnlineWeekdayDiscount(price) {
  return roundDownToThousand(price * 0.8);
}

/** Chính sách cọc FAO — đồng bộ booking app */
export function buildDepositPolicyBullets(m) {
  const depositLine =
    m.deposit && m.deposit > 0
      ? `Vui lòng chuyển khoản cọc ${formatVnd(m.deposit)} khi đến nhận máy (mỗi model có mức cọc riêng).`
      : "Mức cọc theo từng máy — xem chi tiết khi đặt trên catalog.";

  return [
    "Học sinh – sinh viên: CỌC 0Đ khi có đầy đủ minh chứng qua website trường hoặc lịch học cụ thể hiện tại.",
    `Khách không thuộc nhóm trên: ${depositLine}`,
    "Sau khi trả máy, shop kiểm tra thiết bị và xác nhận trên hệ thống — hoàn cọc ngay cho bạn.",
  ];
}

export function buildDepositPolicySummary(m) {
  const base =
    "HSSV được CỌC 0Đ với minh chứng lịch học; khách khác chuyển khoản cọc khi nhận máy";
  if (m.deposit && m.deposit > 0) {
    return `${base} (${formatVnd(m.deposit)} với ${m.displayName}). Hoàn cọc sau khi trả máy.`;
  }
  return `${base}. Hoàn cọc sau khi trả máy và shop xác nhận.`;
}

function branchAvailabilityLabel(m) {
  if (m.branches.includes("PHU_NHUAN") && m.branches.includes("Q9")) {
    return "Phú Nhuận hoặc Thủ Đức Q9";
  }
  if (m.branches.includes("Q9")) return "Thủ Đức Q9";
  return "Phú Nhuận";
}

export function buildDevicePageTitle(m) {
  const geo = m.branches.includes("PHU_NHUAN") ? "Phú Nhuận TP.HCM" : "TP.HCM";
  return `Thuê ${m.displayName} giá rẻ ${geo} — ${formatVnd(m.priceOneDay)}/ngày | FAO`;
}

export function buildDevicePageDescription(m) {
  const branch = branchAvailabilityLabel(m);
  const kw = getDeviceSearchKeywords(m)[0] || `thuê ${m.displayName.toLowerCase()} tphcm`;
  return `${kw.charAt(0).toUpperCase() + kw.slice(1)}: ${formatVnd(m.priceSixHours)}/6h, ${formatVnd(m.priceOneDay)}/ngày tại FAO ${branch}. HSSV COC 0D. ${m.useCase} Đặt online — lịch trống realtime faocamera.vn.`;
}

export function buildDevicePageH1(m) {
  return `Thuê ${m.displayName} giá rẻ TP.HCM — ${formatVnd(m.priceOneDay)}/ngày | FAO Camera`;
}

export function buildDeviceDisplaySummary(m) {
  const branch = branchAvailabilityLabel(m);
  return `Cho thuê ${m.displayName} tại FAO Camera ${branch}, TP.HCM: ${formatVnd(m.priceSixHours)}/6 tiếng, ${formatVnd(m.priceOneDay)}/ngày. ${buildDepositPolicySummary(m)} ${m.useCase} Đặt online faocamera.vn — lịch trống instant, giảm 20% T2–T6. Hotline ${BRANCHES.PHU_NHUAN.phoneDisplay}.`;
}

export function buildDeviceAiSummary(m) {
  const kws = buildDeviceKeywordPhrase(m);
  return `${buildDeviceDisplaySummary(m)} Từ khóa: ${kws}.`;
}

export function buildDeviceFaqs(m) {
  const depositBullets = buildDepositPolicyBullets(m);
  const branch = branchAvailabilityLabel(m);
  const phuNhuan = BRANCHES.PHU_NHUAN;
  const q9 = BRANCHES.Q9;

  const faqs = [
    {
      q: `Thuê ${m.displayName} giá bao nhiêu?`,
      a: `Giá thuê ${m.displayName} tại FAO (catalog realtime): ${formatVnd(m.priceSixHours)} (6 tiếng), ${formatVnd(m.priceOneDay)}/ngày, ${formatVnd(m.priceTwoDay)}/2 ngày, ${formatVnd(m.priceThreeDay)}/3 ngày, ngày thêm ${formatVnd(m.priceNextDay)}. Giảm 20% thứ 2–6 trên faocamera.vn.`,
    },
    {
      q: `Thuê ${m.displayName} ở Phú Nhuận / Thủ Đức có không?`,
      a:
        m.branches.includes("PHU_NHUAN") && m.branches.includes("Q9")
          ? `Có — nhận/trả tại Phú Nhuận (${phuNhuan.fullAddress}) hoặc Q9 Thủ Đức (${q9.fullAddress}). Chọn chi nhánh khi đặt trên catalog. Mở cửa 9h–22h.`
          : m.branches.includes("Q9")
            ? `Có — nhận/trả tại FAO Q9 Thủ Đức: ${q9.fullAddress}. Hotline ${q9.phoneDisplay}.`
            : `Có — nhận/trả tại FAO Phú Nhuận: ${phuNhuan.fullAddress}. Hotline ${phuNhuan.phoneDisplay}.`,
    },
    {
      q: `${m.displayName} phù hợp chụp/quay gì?`,
      a: `${m.useCase}${m.pros?.length ? ` Ưu điểm: ${m.pros.slice(0, 3).join("; ")}.` : ""} Xem ảnh feedback thật: ${m.feedbackPath.replace(/^\//, "faocamera.vn/")}.`,
    },
    {
      q: `Thuê ${m.displayName} cần cọc bao nhiêu?`,
      a: depositBullets.join(" "),
    },
    {
      q: `Thuê ${m.displayName} sinh viên có ưu đãi không?`,
      a: `Có — HSSV COC 0D với minh chứng lịch học; giảm 20% T2–T6 khi đặt online. Q9 Thủ Đức tiện sinh viên Làng Đại Học.`,
    },
    ...buildDeviceKeywordFaqs(m, formatVnd, branch, depositBullets),
  ];
  return faqs;
}

export function normalizeDisplayName(raw) {
  return String(raw || "")
    .replace(/\(\d+\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanSentence(s) {
  return String(s || "")
    .trim()
    .replace(/\.+$/, "");
}

/** Parse mô tả feedback admin (Phù hợp / Ưu điểm) */
export function parseFeedbackDescription(text) {
  if (!text || typeof text !== "string") {
    return { title: null, useCase: null, pros: [] };
  }
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const title = lines[0] && !lines[0].includes(":") ? lines[0] : null;

  let useCase = null;
  const phuHop = text.match(/Phù hợp:\s*([\s\S]*?)(?=Ưu điểm:|$)/i);
  if (phuHop) {
    useCase = phuHop[1].replace(/\n+/g, " ").trim();
  }

  const pros = [];
  const uuDiem = text.split(/Ưu điểm:?/i)[1];
  if (uuDiem) {
    for (const line of uuDiem.split(/\r?\n/)) {
      const cleaned = line.replace(/^[\s\-–•*]+/, "").trim();
      if (cleaned) pros.push(cleaned);
    }
  }

  return { title, useCase, pros };
}

function inferBrand(categoryName) {
  return BRAND_SLUG[categoryName] || "may-anh";
}

function modelSlugPart(modelKey) {
  const key = String(modelKey || "").trim();
  if (SLUG_LABELS[key]) return SLUG_LABELS[key];
  return key
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildDeviceSlug({ modelKey, categoryName }) {
  const brand = inferBrand(categoryName);
  const model = modelSlugPart(modelKey);
  return `thue-may-anh-${brand}-${model}`;
}

export function buildCatalogQuery(modelKey) {
  return `/catalog?q=${encodeURIComponent(modelKey || "")}`;
}

/** Link catalog — mở modal đặt lịch đúng model */
export function buildDeviceBookPath(m) {
  const params = new URLSearchParams();
  params.set("modelKey", m.modelKey);
  params.set("q", m.modelKey);
  params.set("focusModel", compactSearchText(m.displayName));
  params.set("book", "1");
  if (m.branches?.length === 1) {
    params.set("branchId", m.branches[0]);
  }
  return `/catalog?${params.toString()}`;
}

/** Deep-link Feedback — preselect đúng model + quay lại trang review */
export function buildDeviceFeedbackPath(m) {
  const params = new URLSearchParams();
  params.set("modelKey", m.modelKey);
  if (m.displayName) params.set("model", m.displayName);
  if (m.slug) params.set("from", `/${m.slug}`);
  return `/feedback?${params.toString()}`;
}

export function compactSearchText(text = "") {
  return String(text).toLowerCase().replace(/\s+/g, "").trim();
}

function normalizeLegacyCategory(cat) {
  if (cat === "Fuji") return "Fujifilm";
  if (cat === "Pocket") return "DJI";
  return cat;
}

function isEligibleDevice(d) {
  return (
    d &&
    d.active &&
    !d.deleted &&
    !/test/i.test(d.name || "") &&
    (d.priceOneDay || 0) >= 80000
  );
}

function pickRepresentativeDevice(devices) {
  return devices.reduce((best, d) => {
    if (!best) return d;
    if (d.priceOneDay < best.priceOneDay) return d;
    if (d.priceOneDay === best.priceOneDay && d.branch === "PHU_NHUAN") return d;
    return best;
  }, null);
}

const MODEL_DISPLAY_OVERRIDES = {
  R50V: "Canon R50V",
};

function applyBrandCasing(raw) {
  return normalizeDisplayName(raw)
    .replace(/\bCANON\b/g, "Canon")
    .replace(/\bSONY\b/g, "Sony")
    .replace(/\bFUJIFILM\b/g, "Fujifilm")
    .replace(/\bDJI\b/g, "DJI")
    .replace(/\bEOS\b/gi, "")
    .replace(/\bMARK\b/g, "Mark")
    .replace(/\bOSMO\b/g, "Osmo")
    .replace(/\bPOCKET\b/g, "Pocket")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDisplayName(name, feedbackTitle, modelKey) {
  if (modelKey && MODEL_DISPLAY_OVERRIDES[modelKey]) {
    return MODEL_DISPLAY_OVERRIDES[modelKey];
  }

  const fromDevice = applyBrandCasing(name);

  if (feedbackTitle) {
    const fb = applyBrandCasing(feedbackTitle);
    const mk = String(modelKey || "").trim();
    if (mk.length >= 2) {
      const mkLower = mk.toLowerCase();
      const fbNorm = fb.toLowerCase().replace(/[\s-]/g, "");
      const devNorm = fromDevice.toLowerCase().replace(/[\s-]/g, "");
      if (devNorm.includes(mkLower) && !fbNorm.includes(mkLower)) {
        return fromDevice;
      }
    }
    return fb;
  }

  return fromDevice;
}

function mergeModelGroup(modelKey, devices, meta = {}) {
  const rep = pickRepresentativeDevice(devices);
  const feedback = parseFeedbackDescription(meta.feedbackDescription);
  const categoryName = meta.categoryName || normalizeLegacyCategory(rep.category);
  const displayName = formatDisplayName(
    meta.deviceName || rep.name,
    feedback.title || (rep.shortName ? normalizeDisplayName(rep.shortName) : null),
    modelKey
  );
  const branches = [...new Set(devices.map((d) => d.branch).filter(Boolean))];
  const image =
    (meta.deviceImages?.[0] || rep.images?.[0] || "").replace(/^http:\/\//, "https://") || null;
  const deposit = Math.min(...devices.map((d) => d.deposit ?? Infinity).filter((x) => x >= 0));

  const comboFromName = devices.some((d) => /len|lens|\+|combo/i.test(d.name));
  const comboNote = comboFromName
    ? "Combo kèm lens/phụ kiện theo tên máy trên catalog — giá có thể khác tùy bộ kit."
    : "Giá thuê theo combo trên catalog (thường gồm pin, sạc, thẻ nhớ, túi — tùy máy).";
  const slug = buildDeviceSlug({ modelKey, categoryName });

  return {
    modelKey,
    displayName,
    categoryName,
    brandLabel: categoryName,
    categoryOrder: meta.categoryOrder ?? 999,
    itemOrder: meta.itemOrder ?? 999,
    slug,
    priceSixHours: Math.min(...devices.map((d) => d.priceSixHours || d.priceOneDay || Infinity)),
    priceOneDay: Math.min(...devices.map((d) => d.priceOneDay || Infinity)),
    priceTwoDay: Math.min(...devices.map((d) => d.priceTwoDay || Infinity)),
    priceThreeDay: Math.min(...devices.map((d) => d.priceThreeDay || Infinity)),
    priceNextDay: Math.min(...devices.map((d) => d.priceNextDay || Infinity)),
    deposit: Number.isFinite(deposit) && deposit !== Infinity && deposit > 0 ? deposit : null,
    unitCount: devices.length,
    branches,
    defaultBranchId:
      branches.length === 1
        ? branches[0]
        : branches.includes("PHU_NHUAN")
          ? "PHU_NHUAN"
          : branches[0],
    image,
    catalogQuery: buildCatalogQuery(modelKey),
    bookPath: buildDeviceBookPath({ modelKey, displayName, branches }),
    feedbackPath: buildDeviceFeedbackPath({ modelKey, displayName, slug }),
    kitLabel: normalizeDisplayName(meta.deviceName || rep.name),
    useCase: cleanSentence(feedback.useCase) || `Thuê ${displayName} tại FAO Camera TP.HCM`,
    pros: feedback.pros,
    comboNote,
    feedbackRaw: meta.feedbackDescription || null,
  };
}

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(45000) });
  if (!res.ok) throw new Error(`API ${res.status}: ${url}`);
  return res.json();
}

/**
 * Lấy dữ liệu từ API backend (mirror DB) — devices + danh mục admin.
 */
export async function fetchDeviceModels(apiUrl) {
  const base = apiUrl.replace(/\/+$/, "");
  const [devicesRaw, categoriesRaw] = await Promise.all([
    fetchJson(`${base}/v1/devices?type=DEVICE&includeFeedbackImages=false`),
    fetchJson(`${base}/v1/device-categories/with-items?includeFeedbackImages=false`),
  ]);

  const deviceById = new Map(
    (devicesRaw || []).filter(isEligibleDevice).map((d) => [d.id, d])
  );

  const devicesByModel = new Map();
  for (const d of deviceById.values()) {
    const mk = (d.modelKey || "").trim() || normalizeDisplayName(d.name);
    if (!devicesByModel.has(mk)) devicesByModel.set(mk, []);
    devicesByModel.get(mk).push(d);
  }

  const metaByModel = new Map();

  for (const cat of categoriesRaw || []) {
    if (!SEO_CATEGORY_NAMES.has(cat.name)) continue;
    for (const item of cat.items || []) {
      const d = deviceById.get(item.deviceId);
      if (!d) continue;
      const mk = (item.modelKey || d.modelKey || "").trim();
      if (!mk) continue;

      const existing = metaByModel.get(mk);
      const fb = (item.feedbackDescription || "").trim();
      if (
        !existing ||
        fb.length > (existing.feedbackDescription || "").length ||
        item.orderIndex < existing.itemOrder
      ) {
        metaByModel.set(mk, {
          categoryName: cat.name,
          categoryOrder: cat.orderNumber ?? 0,
          itemOrder: item.orderIndex ?? 0,
          deviceName: item.deviceName,
          deviceImages: item.deviceImages,
          feedbackDescription: fb,
        });
      }
    }
  }

  const modelKeys = new Set([...devicesByModel.keys(), ...metaByModel.keys()]);

  const models = [];
  for (const mk of modelKeys) {
    const devices = devicesByModel.get(mk);
    const meta = metaByModel.get(mk);
    if (!devices?.length) continue;

    const catName = meta?.categoryName || normalizeLegacyCategory(devices[0].category);
    if (!SEO_CATEGORY_NAMES.has(catName) && !meta) continue;
    if (!SEO_CATEGORY_NAMES.has(catName) && meta?.categoryName) {
      /* có meta từ danh mục SEO */
    } else if (!SEO_CATEGORY_NAMES.has(catName)) {
      continue;
    }

    models.push(mergeModelGroup(mk, devices, meta || { categoryName: catName }));
  }

  return models.sort((a, b) => {
    if (a.categoryOrder !== b.categoryOrder) return a.categoryOrder - b.categoryOrder;
    if (a.itemOrder !== b.itemOrder) return a.itemOrder - b.itemOrder;
    return a.priceOneDay - b.priceOneDay;
  });
}

/** Nội dung review kiểu blog — từ feedback admin + giá/cọc */
export function buildDeviceReviewSections(m) {
  const sections = [];
  const branch = branchAvailabilityLabel(m);

  sections.push({
    type: "p",
    text: `Cho thuê ${m.displayName} giá rẻ tại FAO Camera (${branch}), TP.HCM — ${buildDeviceKeywordPhrase(m)}. ${m.useCase}`,
  });

  if (m.kitLabel && /len|lens|\+|combo|kit|flash|mm/i.test(m.kitLabel)) {
    sections.push({ type: "h2", text: "Combo thuê gồm gì?" });
    sections.push({
      type: "p",
      text: `Gói thuê: ${m.kitLabel}. ${m.comboNote} Chi tiết phụ kiện (pin, thẻ nhớ, túi) theo từng máy — nhân viên shop sẽ liệt kê khi bàn giao.`,
    });
  }

  sections.push({ type: "h2", text: `${m.displayName} phù hợp với ai?` });
  sections.push({ type: "p", text: m.useCase });

  if (m.pros?.length) {
    sections.push({ type: "h2", text: "Ưu điểm khi thuê tại FAO" });
    sections.push({ type: "ul", items: m.pros });
  }

  sections.push({ type: "h2", text: "Bảng giá & ưu đãi" });
  sections.push({
    type: "ul",
    items: [
      `6 tiếng: ${formatVnd(m.priceSixHours)}`,
      `1 ngày: ${formatVnd(m.priceOneDay)}`,
      `2 ngày: ${formatVnd(m.priceTwoDay)}`,
      `3 ngày: ${formatVnd(m.priceThreeDay)}`,
      m.priceNextDay ? `Ngày thêm: ${formatVnd(m.priceNextDay)}` : null,
      "Giảm 20% thứ 2–6 khi đặt trên faocamera.vn",
    ].filter(Boolean),
  });

  sections.push({ type: "h2", text: "Chính sách cọc" });
  sections.push({ type: "ul", items: buildDepositPolicyBullets(m) });

  sections.push({ type: "h2", text: `Thuê ${m.displayName} tại Phú Nhuận & Thủ Đức` });
  sections.push({
    type: "p",
    text: `FAO Camera có 2 chi nhánh TP.HCM phục vụ thuê ${m.displayName}: Phú Nhuận (${BRANCHES.PHU_NHUAN.fullAddress}, ${BRANCHES.PHU_NHUAN.phoneDisplay})${m.branches.includes("Q9") ? ` và Q9 Thủ Đức (${BRANCHES.Q9.fullAddress}, ${BRANCHES.Q9.phoneDisplay})` : ""}. Nhận/trả máy 9h–22h — chọn chi nhánh khi đặt trên catalog.`,
  });

  sections.push({ type: "h2", text: "Tại sao thuê tại FAO thay vì shop khác?" });
  sections.push({
    type: "ul",
    items: [
      "Giá minh bạch trên web — cập nhật realtime từ catalog, không báo giá ẩn.",
      "Lịch trống instant — biết chắc còn máy trước khi đến shop.",
      "HSSV CỌC 0Đ với minh chứng lịch học; hoàn cọc ngay sau khi trả máy.",
      "Hỗ trợ hướng dẫn bật máy, xuất ảnh 5–10 phút — phù hợp người mới.",
      "Xem ảnh feedback thật từ khách thuê cùng model trước khi quyết định.",
    ],
  });

  sections.push({ type: "h2", text: "Mẹo trước khi nhận máy" });
  sections.push({
    type: "ul",
    items: [
      "Đặt online trước 1–2 ngày vào mùa cao điểm (kỷ yếu, lễ Tết) để chắc chắn còn máy.",
      "Đến shop test máy & hỏi kỹ thuật viên cách bật/tắt, xuất ảnh — FAO hỗ trợ 5–10 phút.",
      "Xem ảnh thực tế khách thuê cùng model trên trang Feedback trước khi quyết định.",
    ],
  });

  return sections;
}

export function pickRelatedModels(allModels, current, limit = 4) {
  return allModels
    .filter((x) => x.modelKey !== current.modelKey && x.categoryName === current.categoryName)
    .slice(0, limit);
}

export async function loadOrFetchDeviceModels(apiUrl) {
  try {
    const models = await fetchDeviceModels(apiUrl);
    writeFileSync(
      SNAPSHOT_PATH,
      JSON.stringify(
        {
          fetchedAt: new Date().toISOString(),
          source: "api",
          apiUrl: apiUrl.replace(/\/+$/, ""),
          models,
        },
        null,
        2
      )
    );
    console.log(`  → synced ${models.length} models from API (devices + categories)`);
    return models;
  } catch (err) {
    console.warn("  ⚠ API sync failed, using snapshot:", err.message);
    try {
      const snap = JSON.parse(readFileSync(SNAPSHOT_PATH, "utf8"));
      return snap.models || [];
    } catch {
      throw err;
    }
  }
}

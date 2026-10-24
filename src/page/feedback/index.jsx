import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Columns2,
  Link2,
  MessageSquare,
  Search,
  X,
} from "lucide-react";
import api from "../../config/axios";
import SlideNav from "../../components/SlideNav";
import FloatingContactButton from "../../components/FloatingContactButton";
import { useStaffAccess } from "../../hooks/useStaffAccess";
import { copyTextToClipboard } from "../../utils/clipboard";
import { shortenUrl } from "../../utils/shortLink";
import {
  buildFeedbackShareMessage,
  buildFeedbackViewUrl,
} from "../../utils/feedbackShareLink";
import { normalizeDevicesListResponse } from "../../utils/deviceBranch";
import deviceSeoSnapshot from "../../data/deviceSeoSnapshot.json";

const FALLBACK_IMG =
  "https://placehold.co/1200x800/FFE4F0/E85C9C?text=Anh+khach+chup";
const DEFAULT_CATEGORY_KEY = "all";
const DEFAULT_MODEL = "Tất cả máy";
/** Chỉ dùng khi không có ảnh thật — giữ vừa đủ để demo, tránh spam request. */
const MOCK_IMAGES_PER_MODEL = 6;
const GALLERY_PAGE_SIZE = 12;
/** Số chip dòng máy hiện sẵn; phần còn lại nằm sau nút "Xem thêm". */
const MODEL_CHIP_COLLAPSED_LIMIT = 10;
const ASPECT_RATIO_SEQUENCE = [
  "3 / 4",
  "4 / 5",
  "1 / 1",
  "16 / 9",
  "2 / 3",
  "5 / 6",
];
const MOCK_PLACEHOLDER_COLORS = [
  ["FFE4F0", "E85C9C"],
  ["FFF2CC", "B86A2A"],
  ["E7F5FF", "1E88E5"],
  ["EAFBE7", "2E7D32"],
  ["F3E8FF", "7E57C2"],
];

function normalizeDeviceName(name = "") {
  return String(name).replace(/\s*\(\d+\)\s*$/, "").trim();
}

function detectLineFromName(name = "") {
  const upper = String(name).toUpperCase();
  if (upper.includes("FUJIFILM") || upper.includes("FUJI")) return "FUJIFILM";
  if (upper.includes("CANON")) return "CANON";
  if (upper.includes("RICOH")) return "RICOH";
  if (upper.includes("SONY")) return "SONY";
  if (
    upper.includes("POCKET") ||
    upper.includes("GOPRO") ||
    upper.includes("DJI") ||
    upper.includes("INSTA360")
  ) {
    return "ACTION CAM";
  }
  return "KHÁC";
}

const FEEDBACK_PARENT_TAB_BRANDS = [
  { id: "canon", label: "Canon" },
  { id: "fujifilm", label: "Fujifilm" },
  { id: "ricoh", label: "Ricoh" },
  { id: "sony", label: "Sony" },
];

function parentTabBrandId(label = "") {
  const t = compactToken(label);
  if (!t) return null;
  if (t.includes("fuji")) return "fujifilm";
  if (t.includes("canon")) return "canon";
  if (t.includes("ricoh")) return "ricoh";
  if (t.includes("sony")) return "sony";
  return null;
}

function isAllowedFeedbackBrandLine(line = "") {
  const t = compactToken(line);
  if (!t) return false;
  if (t.includes("fuji")) return true;
  if (t.includes("canon")) return true;
  if (t.includes("ricoh")) return true;
  if (t.includes("sony")) return true;
  return false;
}

/**
 * Lens / flash / phụ kiện — nhóm riêng để chip máy ảnh không bị loãng.
 * Chỉ khớp khi tên *mở đầu* bằng từ khoá phụ kiện, tránh nhận nhầm body kèm kit
 * (vd "Fujifilm XT30II + Len 18-55" vẫn là máy ảnh).
 */
const FEEDBACK_ACCESSORY_NAME_PREFIXES = [
  "LENS",
  "LEN",
  "ỐNG KÍNH",
  "FLASH",
  "TRIGGER",
  "SPEEDLITE",
  "SOFTBOX",
  "TRIPOD",
  "GIMBAL",
  "TAY CẦM",
  "MICROPHONE",
  "MIC",
  "THẺ NHỚ",
  "PIN",
  "SẠC",
];

function isFeedbackAccessoryName(name = "") {
  const upper = String(name).trim().toUpperCase();
  if (!upper) return false;
  return FEEDBACK_ACCESSORY_NAME_PREFIXES.some(
    (prefix) => upper === prefix || upper.startsWith(`${prefix} `) || upper.startsWith(`${prefix},`),
  );
}

/** Dòng dữ liệu nội bộ (đơn test của shop) — không đưa lên trang feedback. */
function isFeedbackInternalTestName(name = "") {
  return /^test\b/i.test(String(name).trim());
}

function sanitizeQuery(value = "") {
  return String(value).toLowerCase().trim().replace(/\s+/g, " ");
}

function compactToken(value = "") {
  return sanitizeQuery(value).replace(/\s+/g, "");
}

function normalizeId(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeImageList(value) {
  if (!value) return [];
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const item of value) {
    if (typeof item === "string" && item.trim()) {
      out.push(item.trim());
      continue;
    }
    if (item && typeof item === "object") {
      const maybeUrl = item.url || item.image || item.src || item.path;
      if (typeof maybeUrl === "string" && maybeUrl.trim()) {
        out.push(maybeUrl.trim());
      }
    }
  }
  return out;
}

function pickDescription(source = {}) {
  return (
    source?.feedbackDescription ||
    source?.description ||
    source?.catalogDescription ||
    source?.summary ||
    source?.note ||
    ""
  );
}

/** API hay trả tên máy FULL CAPS — đổi dạng đọc được; cụm có số (XT20, R50) giữ IN HOA. */
function formatFeedbackModelTitle(raw = "") {
  const s = String(raw).trim();
  if (!s) return s;
  if (/[a-zàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứửữựỳýỷỹđ]/u.test(s)) {
    return s;
  }
  return s
    .split(/(\s+)/)
    .map((p) => {
      if (/^\s+$/.test(p)) return p;
      if (/^\(\d+\)$/.test(p)) return p;
      if (/^[A-Z0-9.-]+$/i.test(p) && /\d/.test(p)) return p.toUpperCase();
      if (p.length <= 1) return p.toUpperCase();
      return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
    })
    .join("");
}

function formatCategoryTabLabel(label = "", key = "") {
  if (key === DEFAULT_CATEGORY_KEY) return "Tất cả";
  return formatFeedbackModelTitle(label) || String(label).trim() || "Khác";
}
const FEEDBACK_TAPE_CLASSES = [
  "h-4 w-16 sm:w-20 bg-gradient-to-b from-[#fce8ef]/95 to-[#f5c8d8]/85 rotate-[-5deg] border border-white/50 shadow-[0_1px_3px_rgba(0,0,0,0.08)]",
  "h-4 w-16 sm:w-20 bg-gradient-to-b from-[#dff5ea]/95 to-[#7dd3b8]/88 rotate-[6deg] border border-white/45 shadow-[0_1px_3px_rgba(0,0,0,0.08)]",
  "h-4 w-16 sm:w-20 bg-gradient-to-b from-[#fff4d6]/95 to-[#f0c14a]/82 rotate-[-7deg] border border-white/50 shadow-[0_1px_3px_rgba(0,0,0,0.08)]",
  "h-4 w-16 sm:w-20 bg-gradient-to-b from-[#eae8ff]/95 to-[#b4a5f5]/85 rotate-[5deg] border border-white/50 shadow-[0_1px_3px_rgba(0,0,0,0.08)]",
  "h-4 w-16 sm:w-20 bg-gradient-to-b from-[#ffe8f0]/95 to-[#fb9ec4]/82 rotate-[-4deg] border border-white/50 shadow-[0_1px_3px_rgba(0,0,0,0.08)]",
  "h-4 w-16 sm:w-20 bg-gradient-to-b from-[#e0f2fe]/95 to-[#5ec5fc]/82 rotate-[8deg] border border-white/50 shadow-[0_1px_3px_rgba(0,0,0,0.08)]",
  "h-4 w-16 sm:w-20 bg-gradient-to-b from-[#fce7f3]/95 to-[#f472b6]/78 rotate-[-6deg] border border-white/50 shadow-[0_1px_3px_rgba(0,0,0,0.08)]",
  "h-4 w-16 sm:w-20 bg-gradient-to-b from-[#ecfccb]/95 to-[#a3e635]/75 rotate-[4deg] border border-emerald-100/60 shadow-[0_1px_3px_rgba(0,0,0,0.08)]",
];

/** Băng washi trên mỗi thẻ ảnh. */
function FeedbackCardAffix({ index }) {
  const tapeClass = FEEDBACK_TAPE_CLASSES[index % FEEDBACK_TAPE_CLASSES.length];
  return (
    <div
      className="pointer-events-none absolute left-[10%] right-[10%] -top-1 z-[2] flex justify-center sm:left-[14%] sm:right-[14%]"
      aria-hidden
    >
      <div className={`rounded-[2px] ${tapeClass}`} />
    </div>
  );
}

/**
 * Cùng model (modelKey): lấy feedback từ máy có "(1)" cuối tên (máy đầu dòng).
 * Không có thì theo unitNo tăng dần, rồi representativeDevice.
 */
function pickFirstUnitDeviceForFeedback(row, deviceById) {
  if (!row) return null;
  const ids = row.groupDeviceIds ? Array.from(row.groupDeviceIds) : [];
  const list = [];
  for (const rawId of ids) {
    const d = deviceById.get(normalizeId(rawId));
    if (d) list.push(d);
  }
  if (list.length === 0 && row.representativeDevice) {
    list.push(row.representativeDevice);
  }
  if (list.length === 0) return null;

  const parenOne = list.find((d) =>
    /\(\s*1\s*\)\s*$/.test(String(d?.name || "").trim()),
  );
  if (parenOne) return parenOne;

  const sorted = [...list].sort((a, b) => {
    const ua = Number(a?.unitNo);
    const ub = Number(b?.unitNo);
    const na = Number.isFinite(ua) ? ua : 9999;
    const nb = Number.isFinite(ub) ? ub : 9999;
    if (na !== nb) return na - nb;
    return Number(a?.id) - Number(b?.id);
  });
  return sorted[0] || null;
}

function resolveModelIdentityFromItem(item, deviceById) {
  const modelKey =
    String(item?.modelKey || item?.device?.modelKey || "").trim() || null;
  if (modelKey) return modelKey;
  const deviceId = normalizeId(item?.deviceId || item?.device?.id);
  if (!deviceId) return null;
  const device = deviceById.get(deviceId);
  if (!device) return null;
  return (String(device?.modelKey || "").trim() || normalizeDeviceName(device?.name || "") || null);
}

function buildModelFeedbackMap(items = []) {
  const grouped = new Map();
  for (const item of items) {
    const modelKey =
      (item.modelKey || "").trim() || normalizeDeviceName(item.name || "");
    if (!modelKey) continue;
    const row = grouped.get(modelKey) || {
      modelKey,
      displayName: normalizeDeviceName(item.name || modelKey),
      line: detectLineFromName(item.name || modelKey),
      images: [],
      groupDeviceIds: new Set(),
      orderNumber: item.orderNumber ?? Number.POSITIVE_INFINITY,
      representativeDevice: item,
    };

    const sourceImages = Array.isArray(item.images) ? item.images : [];
    for (const img of sourceImages) {
      if (img && !row.images.includes(img)) row.images.push(img);
    }
    if (item?.id !== undefined && item?.id !== null) {
      row.groupDeviceIds.add(normalizeId(item.id));
    }

    if ((item.orderNumber ?? Number.POSITIVE_INFINITY) < row.orderNumber) {
      row.orderNumber = item.orderNumber ?? Number.POSITIVE_INFINITY;
      row.representativeDevice = item;
    }
    grouped.set(modelKey, row);
  }

  return Array.from(grouped.values()).sort(
    (a, b) => (a.orderNumber ?? 999999) - (b.orderNumber ?? 999999),
  );
}

function normalizeFromCatalogPath(value = "") {
  const raw = String(value || "").trim();
  if (!raw.startsWith("/")) return "/catalog";
  if (!raw.startsWith("/catalog")) return raw.startsWith("/") ? raw : `/catalog`;
  return raw;
}

function catalogCategoryKeyToParam(categoryKey, apiCategories = []) {
  if (!categoryKey || categoryKey === DEFAULT_CATEGORY_KEY) return null;
  if (!String(categoryKey).startsWith("cat_")) return null;
  const id = String(categoryKey).replace(/^cat_/, "");
  const cat = apiCategories.find((c) => String(c.id) === id);
  const name = String(cat?.name || "").trim();
  return name ? name.toLowerCase() : null;
}

function resolveCategoryKeyForModelRow(row, categoryOptions) {
  if (!row?.groupDeviceIds?.size) return null;
  for (const opt of categoryOptions) {
    if (!opt.deviceIds) continue;
    for (const gid of row.groupDeviceIds) {
      if (opt.deviceIds.has(normalizeId(gid))) return opt.key;
    }
  }
  return null;
}

const SEO_SLUG_INDEX = Object.fromEntries(
  (deviceSeoSnapshot.models || []).map((m) => [
    String(m.slug || "").replace(/^\/|\/$/g, ""),
    { modelKey: m.modelKey, displayName: m.displayName },
  ]),
);

/** Đọc intent deep-link một lần — trước khi URL sync xóa modelKey. */
function readPendingDeepLink(searchParams) {
  const modelKey = String(searchParams.get("modelKey") || "").trim();
  const displayNameHint = String(searchParams.get("model") || "").trim();
  const fromRaw = String(searchParams.get("from") || "").trim();

  if (modelKey) {
    return { modelKey, displayNameHint, fromPath: fromRaw || null };
  }

  const fromSlug = fromRaw.replace(/^\/|\/$/g, "");
  const fromSeo = SEO_SLUG_INDEX[fromSlug];
  if (fromSeo?.modelKey) {
    return {
      modelKey: fromSeo.modelKey,
      displayNameHint: fromSeo.displayName || displayNameHint,
      fromPath: fromRaw || null,
    };
  }

  if (displayNameHint) {
    return { modelKey: null, displayNameHint, fromPath: fromRaw || null };
  }

  return null;
}

function findModelRowForDeepLink(modelRows, { modelKey, displayNameHint }) {
  if (!modelRows?.length) return null;

  const key = String(modelKey || "").trim().toLowerCase();
  if (key) {
    const byKey = modelRows.find(
      (item) => String(item.modelKey || "").trim().toLowerCase() === key,
    );
    if (byKey) return byKey;
  }

  const hint = String(displayNameHint || "").trim();
  if (!hint) return null;

  const token = compactToken(hint);
  const seoEntry = Object.values(SEO_SLUG_INDEX).find((entry) => {
    const seoName = compactToken(entry.displayName || "");
    const seoKey = compactToken(entry.modelKey || "");
    return seoName === token || seoName.includes(token) || token.includes(seoName) || seoKey === token;
  });
  if (seoEntry?.modelKey) {
    const bySeoKey = modelRows.find(
      (item) =>
        String(item.modelKey || "").trim().toLowerCase() ===
        String(seoEntry.modelKey).trim().toLowerCase(),
    );
    if (bySeoKey) return bySeoKey;
  }

  return (
    modelRows.find((item) => {
      const mk = compactToken(item.modelKey);
      const dn = compactToken(item.displayName);
      const fmt = compactToken(formatFeedbackModelTitle(item.displayName));
      return (
        mk === token ||
        dn === token ||
        fmt === token ||
        dn.includes(token) ||
        token.includes(dn) ||
        fmt.includes(token) ||
        token.includes(fmt)
      );
    }) || null
  );
}

/** Tên gửi API gallery — phải khớp backend (vd. CANON EOS R50, không phải Canon R50). */
function galleryModelParamForRow(row) {
  if (!row) return null;
  return String(row.displayName || row.modelKey || "").trim() || null;
}

/** Quay catalog: giữ query (ngày, chi nhánh, giá…), bỏ lọc/scroll theo từng máy; đồng bộ tab category. */
function buildCatalogBackHref(fromCatalogPath, categoryKey, apiCategories) {
  const base = normalizeFromCatalogPath(fromCatalogPath);
  try {
    const url = new URL(base, "https://fao.local");
    const params = url.searchParams;
    params.delete("q");
    params.delete("focusModel");
    const catParam = catalogCategoryKeyToParam(categoryKey, apiCategories);
    if (catParam && categoryKey !== DEFAULT_CATEGORY_KEY) {
      params.set("category", catParam);
    } else {
      params.delete("category");
    }
    const qs = params.toString();
    return `${url.pathname}${qs ? `?${qs}` : ""}`;
  } catch {
    return base;
  }
}

function buildMockPlaceholder(modelName = "", index = 0) {
  const [bg, fg] =
    MOCK_PLACEHOLDER_COLORS[index % MOCK_PLACEHOLDER_COLORS.length];
  const widths = [900, 1000, 1080, 1200];
  const heights = [1200, 1400, 900, 1600, 1100];
  const w = widths[index % widths.length];
  const h = heights[index % heights.length];
  const label = encodeURIComponent(`${modelName} anh ${index + 1}`);
  return `https://placehold.co/${w}x${h}/${bg}/${fg}?text=${label}`;
}

function buildMockRichGallery(images = [], modelName = "", targetCount = 12) {
  const baseImages = Array.from(new Set((images || []).filter(Boolean)));
  const result = [];
  const target = Math.max(targetCount, baseImages.length || 1);

  for (let i = 0; i < target; i += 1) {
    if (i < baseImages.length) {
      result.push(baseImages[i]);
      continue;
    }

    if (baseImages.length > 0) {
      // Reuse ảnh thật để nhìn tự nhiên hơn, kèm mock key để tách item
      const source = baseImages[i % baseImages.length];
      result.push(`${source}${source.includes("?") ? "&" : "?"}mock=${i + 1}`);
      continue;
    }

    result.push(buildMockPlaceholder(modelName, i));
  }

  return result;
}

function getAspectRatioByIndex(index = 0) {
  return ASPECT_RATIO_SEQUENCE[index % ASPECT_RATIO_SEQUENCE.length];
}

const COMPARE_PAGE_SIZE = 6;
const COMPARE_SIDE_STYLES = [
  { tag: "A", tint: "bg-[#fff3f8]", badge: "bg-[#E85C9C] text-white" },
  { tag: "B", tint: "bg-[#eef6ff]", badge: "bg-[#1E88E5] text-white" },
];
const MAX_COMPARE_MODELS = 2;

/** Tải ảnh feedback theo trang cho 1 dòng máy (dùng trong chế độ so sánh). */
function useCompareGallery(name, modelKey) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setItems([]);
    setPage(0);
    setTotalPages(1);
    setTotal(0);
  }, [name]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    api
      .get("/v1/feedback/gallery", {
        params: {
          category: DEFAULT_CATEGORY_KEY,
          model: name,
          page,
          size: COMPARE_PAGE_SIZE,
        },
      })
      .then((res) => {
        if (cancelled) return;
        const content = Array.isArray(res.data?.content) ? res.data.content : [];
        setItems((prev) => {
          const seen = new Set(prev.map((i) => i.id));
          return [...prev, ...content.filter((i) => !seen.has(i.id))];
        });
        setTotalPages(Math.max(1, res.data?.totalPages ?? 1));
        setTotal(res.data?.totalElements ?? content.length);
      })
      .catch(() => {
        if (!cancelled) setError("Không tải được ảnh. Thử lại sau.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [name, page]);

  const visible = useMemo(() => {
    const key = String(modelKey || "").trim().toLowerCase();
    if (!key) return items;
    return items.filter(
      (i) => String(i.modelKey || "").trim().toLowerCase() === key,
    );
  }, [items, modelKey]);

  return {
    items: visible,
    total,
    loading,
    error,
    hasMore: page < totalPages - 1,
    loadMore: () => setPage((p) => p + 1),
  };
}

function CompareCell({ item, name }) {
  return (
    <div className="flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-md border border-[#eadfd3] bg-white/70">
      <img
        src={item.image || FALLBACK_IMG}
        alt={`${formatFeedbackModelTitle(name)} thực tế`}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-contain"
      />
    </div>
  );
}

/**
 * So sánh 2 máy: mỗi máy một nửa màn hình (nền màu + nhãn A/B), tên máy dính trên cùng khi cuộn.
 * Mỗi bên chia 1 / 2 / 3 ảnh mỗi hàng theo chiều rộng màn hình; ô cùng tỉ lệ nên hàng hai bên thẳng nhau.
 */
function ComparePanel({ models, onRemove }) {
  const left = useCompareGallery(models[0].name, models[0].modelKey);
  const right = useCompareGallery(models[1].name, models[1].modelKey);
  const sides = [left, right];
  const loading = left.loading || right.loading;
  const error = left.error || right.error;
  const hasMore = left.hasMore || right.hasMore;
  const empty = left.items.length === 0 && right.items.length === 0;

  return (
    <div className="rounded-xl border border-[#e5d8cc] bg-[#fffdf9] shadow-sm">
      <div className="sticky top-0 z-20 grid grid-cols-2 divide-x divide-[#e5d8cc] overflow-hidden rounded-t-xl border-b border-[#e5d8cc] shadow-sm">
        {models.map((m, idx) => {
          const style = COMPARE_SIDE_STYLES[idx];
          return (
            <div
              key={m.name}
              className={`flex min-w-0 items-center justify-between gap-2 px-2 py-2 sm:px-4 ${style.tint}`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${style.badge}`}
                >
                  {style.tag}
                </span>
                <div className="min-w-0">
                  <h3 className="font-feedback-ui line-clamp-2 text-sm font-bold leading-snug text-[#8b2848] sm:text-base">
                    {formatFeedbackModelTitle(m.name)}
                  </h3>
                  <p className="text-[11px] font-semibold text-[#9a8478]">
                    {sides[idx].total} ảnh thực tế
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemove(m.name)}
                aria-label={`Bỏ ${formatFeedbackModelTitle(m.name)}`}
                className="shrink-0 rounded-full border border-[#e5d5c8] bg-white p-1 text-[#8a6f62] hover:text-[#b03060]"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 divide-x divide-[#e5d8cc]">
        {models.map((m, idx) => (
          <div
            key={m.name}
            className={`min-w-0 p-1.5 sm:p-3 ${COMPARE_SIDE_STYLES[idx].tint}`}
          >
            <div className="grid grid-cols-1 gap-1.5 sm:gap-3 md:grid-cols-2 xl:grid-cols-3">
              {sides[idx].items.map((item) => (
                <CompareCell key={item.id} item={item} name={m.name} />
              ))}
              {sides[idx].loading &&
                Array.from({ length: 3 }).map((_, n) => (
                  <div
                    key={`sk-${n}`}
                    className="aspect-[3/4] w-full animate-pulse rounded-md bg-gradient-to-br from-[#f0e4dc] via-[#faf3ee] to-[#e8ddd4]"
                  />
                ))}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}
      {!loading && !error && empty && (
        <p className="py-6 text-center text-xs text-[#8a7468]">
          Chưa có ảnh feedback cho hai máy này.
        </p>
      )}
      {!loading && hasMore && (
        <div className="p-2 sm:p-3">
          <button
            type="button"
            onClick={() => {
              if (left.hasMore) left.loadMore();
              if (right.hasMore) right.loadMore();
            }}
            className="w-full rounded-lg border border-[#d4c4b0] bg-white py-2 text-xs font-bold text-[#6b3d4a] hover:bg-[#fff5f0]"
          >
            Xem thêm ảnh
          </button>
        </div>
      )}
    </div>
  );
}

export default function FeedbackPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [devices, setDevices] = useState([]);
  const [apiCategories, setApiCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const initialCategory =
    searchParams.get("category") || searchParams.get("line") || DEFAULT_CATEGORY_KEY;
  const fromCatalogPath = normalizeFromCatalogPath(searchParams.get("from"));
  const pendingDeepLinkRef = useRef(readPendingDeepLink(searchParams));
  const deepLinkAppliedRef = useRef(false);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [selectedModelKey, setSelectedModelKey] = useState("");
  const [modelQuery, setModelQuery] = useState("");
  const [showAllModels, setShowAllModels] = useState(false);
  const [galleryPage, setGalleryPage] = useState(0);
  const [galleryPayload, setGalleryPayload] = useState(null);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState("");
  const { isStaff } = useStaffAccess();
  const initialCompare = useMemo(
    () => searchParams.getAll("compare").filter(Boolean).slice(0, MAX_COMPARE_MODELS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  /** null | "compare" (so sánh 2 máy) | "send" (staff chọn nhiều máy để copy tin nhắn). */
  const [pickMode, setPickMode] = useState(initialCompare.length ? "compare" : null);
  const [pickedModels, setPickedModels] = useState(initialCompare);
  const [copyState, setCopyState] = useState(null);
  const [copyBusy, setCopyBusy] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchDevices = async () => {
      setLoading(true);
      setError("");
      try {
        const [res, categoriesRes] = await Promise.all([
          api.get("v1/devices", {
            params: { type: "DEVICE", includeFeedbackImages: false },
          }),
          api
            .get("v1/device-categories/with-items", {
              params: { includeFeedbackImages: false },
            })
            .catch(() => ({ data: [] })),
        ]);
        if (!isMounted) return;
        setDevices(normalizeDevicesListResponse(res.data));
        setApiCategories(Array.isArray(categoriesRes?.data) ? categoriesRes.data : []);
      } catch {
        if (!isMounted) return;
        setError("Không tải được ảnh thực tế. Vui lòng thử lại.");
        setDevices([]);
        setApiCategories([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDevices();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setGalleryPage(0);
  }, [selectedCategory, selectedModel]);

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    const load = async () => {
      setGalleryLoading(true);
      setGalleryError("");
      try {
        const params = {
          category: selectedCategory,
          page: galleryPage,
          size: GALLERY_PAGE_SIZE,
        };
        if (selectedModel && selectedModel !== DEFAULT_MODEL) {
          params.model = selectedModel;
        }
        const res = await api.get("/v1/feedback/gallery", { params });
        if (!cancelled) setGalleryPayload(res.data || null);
      } catch {
        if (!cancelled) {
          setGalleryError("Không tải được danh sách ảnh. Thử lại sau.");
          setGalleryPayload(null);
        }
      } finally {
        if (!cancelled) setGalleryLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [loading, selectedCategory, selectedModel, galleryPage]);

  const modelRows = useMemo(() => {
    const cameraDevices = devices.filter(
      (item) => String(item.type || "").toUpperCase() === "DEVICE",
    );
    return buildModelFeedbackMap(cameraDevices).map((item) => ({
      ...item,
      coverImage: item.images[0] || FALLBACK_IMG,
      gallery: buildMockRichGallery(
        item.images.length > 0 ? item.images : [FALLBACK_IMG],
        item.displayName,
        MOCK_IMAGES_PER_MODEL,
      ),
    }));
  }, [devices]);

  const deviceById = useMemo(() => {
    const map = new Map();
    for (const d of devices) {
      const id = normalizeId(d?.id);
      if (id) map.set(id, d);
    }
    return map;
  }, [devices]);

  const { categoryOptions, modelMetaByCategory, modelMetaGlobal } = useMemo(() => {
    const modelByCategory = new Map();
    const modelGlobal = new Map();

    const dynamic = apiCategories.map((cat) => {
      const key = `cat_${cat.id}`;
      const items = Array.isArray(cat.items) ? cat.items : [];
      const deviceIds = new Set(
        items.map((item) => normalizeId(item.deviceId || item?.device?.id)).filter(Boolean),
      );

      for (const item of items) {
        const identity = resolveModelIdentityFromItem(item, deviceById);
        if (!identity) continue;
        const modelToken = compactToken(identity);
        if (!modelToken) continue;
        const itemDescription = pickDescription(item);
        const itemImages = normalizeImageList(
          item?.feedbackImages || item?.images || item?.photoUrls,
        );
        const payload = {
          description: itemDescription,
          images: itemImages,
        };
        modelByCategory.set(`${key}::${modelToken}`, payload);
        if (!modelGlobal.has(modelToken)) {
          modelGlobal.set(modelToken, payload);
        }
      }

      return {
        key,
        label: String(cat.name || "").toUpperCase(),
        description: pickDescription(cat),
        feedbackImages: normalizeImageList(
          cat?.feedbackImages || cat?.images || cat?.photoUrls,
        ),
        deviceIds,
      };
    });

    return {
      categoryOptions: [
        {
          key: DEFAULT_CATEGORY_KEY,
          label: "TẤT CẢ",
          description: "",
          feedbackImages: [],
          deviceIds: null,
        },
        ...dynamic,
      ],
      modelMetaByCategory: modelByCategory,
      modelMetaGlobal: modelGlobal,
    };
  }, [apiCategories, deviceById]);

  const parentTabCategories = useMemo(() => {
    const allTab = categoryOptions.find((c) => c.key === DEFAULT_CATEGORY_KEY);
    const byBrand = new Map();
    for (const cat of categoryOptions) {
      if (cat.key === DEFAULT_CATEGORY_KEY) continue;
      const brandId = parentTabBrandId(cat.label);
      if (!brandId || byBrand.has(brandId)) continue;
      const preset = FEEDBACK_PARENT_TAB_BRANDS.find((b) => b.id === brandId);
      byBrand.set(brandId, { ...cat, label: preset?.label || cat.label });
    }
    return [
      allTab,
      ...FEEDBACK_PARENT_TAB_BRANDS.map((b) => byBrand.get(b.id)).filter(Boolean),
    ].filter(Boolean);
  }, [categoryOptions]);

  const allowedParentCategoryKeys = useMemo(
    () =>
      new Set(
        parentTabCategories
          .filter((c) => c.key !== DEFAULT_CATEGORY_KEY)
          .map((c) => c.key),
      ),
    [parentTabCategories],
  );

  useEffect(() => {
    if (parentTabCategories.length === 0) return;
    if (!parentTabCategories.some((c) => c.key === selectedCategory)) {
      setSelectedCategory(DEFAULT_CATEGORY_KEY);
    }
  }, [parentTabCategories, selectedCategory]);

  const categoryFilteredRows = useMemo(() => {
    /** groupDeviceIds là Set nên duyệt bằng for..of, không dùng method của Array. */
    const rowHasDeviceIn = (row, deviceIds) => {
      if (!deviceIds) return false;
      for (const gid of row?.groupDeviceIds || []) {
        if (deviceIds.has(normalizeId(gid))) return true;
      }
      return false;
    };

    const rowInAllowedBrand = (row) => {
      for (const opt of categoryOptions) {
        if (!allowedParentCategoryKeys.has(opt.key)) continue;
        if (rowHasDeviceIn(row, opt.deviceIds)) return true;
      }
      return isAllowedFeedbackBrandLine(
        row.line || detectLineFromName(row.displayName),
      );
    };

    const active =
      selectedCategory === DEFAULT_CATEGORY_KEY
        ? null
        : categoryOptions.find((c) => c.key === selectedCategory);

    const rows = active?.deviceIds
      ? modelRows.filter((row) => rowHasDeviceIn(row, active.deviceIds))
      : modelRows.filter(rowInAllowedBrand);

    return rows.filter((row) => !isFeedbackInternalTestName(row.displayName));
  }, [
    modelRows,
    categoryOptions,
    selectedCategory,
    allowedParentCategoryKeys,
  ]);

  const modelOptions = useMemo(() => {
    return [
      DEFAULT_MODEL,
      ...categoryFilteredRows.map((item) => item.displayName).filter(Boolean),
    ];
  }, [categoryFilteredRows]);

  /** Máy ảnh trước, dòng nhiều ảnh feedback lên đầu; lens/phụ kiện xuống nhóm sau. */
  const modelChoices = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const row of categoryFilteredRows) {
      const value = row.displayName;
      if (!value || seen.has(value)) continue;
      seen.add(value);
      out.push({
        value,
        label: formatFeedbackModelTitle(value),
        photoCount: Array.isArray(row.images) ? row.images.length : 0,
        isAccessory: isFeedbackAccessoryName(value),
      });
    }
    return out.sort((a, b) => {
      if (a.isAccessory !== b.isAccessory) return a.isAccessory ? 1 : -1;
      if (b.photoCount !== a.photoCount) return b.photoCount - a.photoCount;
      return a.label.localeCompare(b.label, "vi");
    });
  }, [categoryFilteredRows]);

  const modelSearchToken = compactToken(modelQuery);

  const searchedModelChoices = useMemo(() => {
    if (!modelSearchToken) return modelChoices;
    return modelChoices.filter((choice) =>
      compactToken(choice.value).includes(modelSearchToken),
    );
  }, [modelChoices, modelSearchToken]);

  const { visibleCameraChoices, visibleAccessoryChoices, hiddenModelCount } =
    useMemo(() => {
      const cameras = searchedModelChoices.filter((c) => !c.isAccessory);
      const accessories = searchedModelChoices.filter((c) => c.isAccessory);
      const collapsed = !modelSearchToken && !showAllModels;
      if (!collapsed) {
        return {
          visibleCameraChoices: cameras,
          visibleAccessoryChoices: accessories,
          hiddenModelCount: 0,
        };
      }
      const shown = cameras.slice(0, MODEL_CHIP_COLLAPSED_LIMIT);
      // Dòng đang chọn luôn nhìn thấy, kể cả khi nằm ngoài phần thu gọn.
      const selected = searchedModelChoices.find(
        (c) => c.value === selectedModel,
      );
      if (selected && !shown.some((c) => c.value === selected.value)) {
        shown.push(selected);
      }
      return {
        visibleCameraChoices: shown,
        visibleAccessoryChoices: [],
        hiddenModelCount:
          cameras.length + accessories.length - shown.length,
      };
    }, [searchedModelChoices, modelSearchToken, showAllModels, selectedModel]);

  useEffect(() => {
    if (modelRows.length === 0 || categoryOptions.length === 0) return;
    if (deepLinkAppliedRef.current) return;
    if (!pendingDeepLinkRef.current) {
      deepLinkAppliedRef.current = true;
      return;
    }

    const row = findModelRowForDeepLink(modelRows, pendingDeepLinkRef.current);
    if (row) {
      const galleryModel = galleryModelParamForRow(row);
      if (galleryModel) setSelectedModel(galleryModel);
      setSelectedModelKey(String(row.modelKey || "").trim());
      const catKey = resolveCategoryKeyForModelRow(row, categoryOptions);
      if (catKey) setSelectedCategory(catKey);
    }
    deepLinkAppliedRef.current = true;
  }, [modelRows, categoryOptions]);

  useEffect(() => {
    if (modelRows.length === 0) return;
    if (!deepLinkAppliedRef.current) return;
    if (modelOptions.includes(selectedModel)) return;
    if (selectedModel === DEFAULT_MODEL) return;

    const row = findModelRowForDeepLink(modelRows, {
      modelKey: selectedModelKey,
      displayNameHint: selectedModel,
    });

    if (row) {
      const galleryModel = galleryModelParamForRow(row);
      if (galleryModel && galleryModel !== selectedModel) setSelectedModel(galleryModel);
      if (row.modelKey && row.modelKey !== selectedModelKey) {
        setSelectedModelKey(String(row.modelKey).trim());
      }
      return;
    }

    setSelectedModel(DEFAULT_MODEL);
    setSelectedModelKey("");
  }, [modelRows, modelOptions, selectedModel, selectedModelKey]);

  const backToCatalogHref = useMemo(
    () => buildCatalogBackHref(fromCatalogPath, selectedCategory, apiCategories),
    [fromCatalogPath, selectedCategory, apiCategories],
  );

  const filteredRows = useMemo(() => {
    return categoryFilteredRows.filter((item) => {
      if (selectedModel === DEFAULT_MODEL) return true;
      return sanitizeQuery(item.displayName) === sanitizeQuery(selectedModel);
    });
  }, [categoryFilteredRows, selectedModel]);

  const selectedCategoryOption = useMemo(
    () => categoryOptions.find((c) => c.key === selectedCategory) || null,
    [categoryOptions, selectedCategory],
  );

  const selectedModelRow = useMemo(() => {
    if (selectedModel === DEFAULT_MODEL) return null;
    if (selectedModelKey) {
      const byKey = categoryFilteredRows.find(
        (item) =>
          String(item.modelKey || "").trim().toLowerCase() ===
          selectedModelKey.toLowerCase(),
      );
      if (byKey) return byKey;
    }
    const target = compactToken(selectedModel);
    return (
      categoryFilteredRows.find((item) => compactToken(item.displayName) === target) ||
      categoryFilteredRows.find((item) =>
        compactToken(item.displayName).includes(target),
      ) ||
      null
    );
  }, [categoryFilteredRows, selectedModel, selectedModelKey]);

  const resolveModelMeta = useCallback(
    (row) => {
      if (!row) return null;
      const token = compactToken(row.modelKey || row.displayName);
      if (!token) return null;
      if (selectedCategory !== DEFAULT_CATEGORY_KEY) {
        const scoped = modelMetaByCategory.get(`${selectedCategory}::${token}`);
        if (scoped) return scoped;
      }
      return modelMetaGlobal.get(token) || null;
    },
    [selectedCategory, modelMetaByCategory, modelMetaGlobal],
  );

  const galleryItems = useMemo(() => {
    const rows = Array.isArray(galleryPayload?.content) ? galleryPayload.content : [];
    const mapped = rows.map((row) => {
      return {
        id: row.id,
        modelKey: row.modelKey,
        modelName: row.modelName,
        line: row.line,
        image: row.image || FALLBACK_IMG,
      };
    });
    if (selectedModelKey && selectedModel !== DEFAULT_MODEL) {
      const key = selectedModelKey.toLowerCase();
      return mapped.filter(
        (item) => String(item.modelKey || "").trim().toLowerCase() === key,
      );
    }
    return mapped;
  }, [galleryPayload, selectedModelKey, selectedModel]);

  const galleryTotal = galleryPayload?.totalElements ?? 0;
  const galleryTotalPages = Math.max(1, galleryPayload?.totalPages ?? 1);

  const filterDescription = useMemo(() => {
    if (selectedModelRow) {
      const primaryFb = pickFirstUnitDeviceForFeedback(
        selectedModelRow,
        deviceById,
      );
      const devDesc = String(primaryFb?.feedbackDescription || "").trim();
      if (devDesc) return devDesc;
      const modelMeta = resolveModelMeta(selectedModelRow);
      if (modelMeta?.description) return modelMeta.description;
      return `Ảnh feedback thực tế khách chụp từ dòng ${selectedModelRow.displayName}.`;
    }
    if (selectedCategoryOption && selectedCategory !== DEFAULT_CATEGORY_KEY) {
      if (selectedCategoryOption.description) return selectedCategoryOption.description;
      return `Bộ ảnh feedback của danh mục ${selectedCategoryOption.label}.`;
    }
    return "Khám phá ảnh feedback thực tế theo từng dòng máy để chọn thiết bị phù hợp.";
  }, [
    selectedModelRow,
    resolveModelMeta,
    selectedCategoryOption,
    selectedCategory,
    deviceById,
  ]);

  const handleCategorySelect = useCallback((key) => {
    setSelectedCategory(key);
    setSelectedModel(DEFAULT_MODEL);
    setSelectedModelKey("");
    setModelQuery("");
    setShowAllModels(false);
  }, []);

  const handleModelSelectChange = useCallback(
    (value) => {
      setSelectedModel(value);
      if (value === DEFAULT_MODEL) {
        setSelectedModelKey("");
        return;
      }
      const row =
        modelRows.find((item) => item.displayName === value) ||
        findModelRowForDeepLink(modelRows, { modelKey: null, displayNameHint: value });
      setSelectedModelKey(row?.modelKey ? String(row.modelKey).trim() : "");
      if (row?.displayName && row.displayName !== value) {
        setSelectedModel(galleryModelParamForRow(row));
      }
    },
    [modelRows],
  );

  const handlePickModeToggle = useCallback(
    (mode) => {
      setCopyState(null);
      if (pickMode === mode) {
        setPickMode(null);
        setPickedModels([]);
        return;
      }
      setPickMode(mode);
      setPickedModels(selectedModel !== DEFAULT_MODEL ? [selectedModel] : []);
    },
    [pickMode, selectedModel],
  );

  const handleModelChipClick = useCallback(
    (value) => {
      if (!pickMode) {
        handleModelSelectChange(value);
        return;
      }
      setPickedModels((prev) => {
        if (prev.includes(value)) return prev.filter((v) => v !== value);
        if (pickMode === "compare" && prev.length >= MAX_COMPARE_MODELS) {
          return [...prev.slice(1), value];
        }
        return [...prev, value];
      });
    },
    [pickMode, handleModelSelectChange],
  );

  const flashCopyState = useCallback((kind) => {
    setCopyState(kind);
    window.setTimeout(() => setCopyState(null), 2600);
  }, []);

  const compareReady = pickMode === "compare" && pickedModels.length === MAX_COMPARE_MODELS;

  const handleCopyShortLink = useCallback(async () => {
    setCopyBusy(true);
    try {
      const longUrl = buildFeedbackViewUrl({
        category:
          selectedCategory !== DEFAULT_CATEGORY_KEY ? selectedCategory : "",
        model: selectedModel !== DEFAULT_MODEL ? selectedModel : "",
        compare: compareReady ? pickedModels : [],
      });
      const url = (await shortenUrl(longUrl)) || longUrl;
      flashCopyState((await copyTextToClipboard(url)) ? "link" : "error");
    } finally {
      setCopyBusy(false);
    }
  }, [selectedCategory, selectedModel, compareReady, pickedModels, flashCopyState]);

  const handleCopyMessage = useCallback(async () => {
    if (pickedModels.length === 0) return;
    setCopyBusy(true);
    try {
      const shorten = async (longUrl) => (await shortenUrl(longUrl)) || longUrl;
      const items = await Promise.all(
        pickedModels.map(async (name) => ({
          label: formatFeedbackModelTitle(name),
          url: await shorten(buildFeedbackViewUrl({ model: name })),
        })),
      );
      const compareUrl =
        pickedModels.length === MAX_COMPARE_MODELS
          ? await shorten(buildFeedbackViewUrl({ compare: pickedModels }))
          : "";
      const ok = await copyTextToClipboard(
        buildFeedbackShareMessage({ items, compareUrl }),
      );
      flashCopyState(ok ? "message" : "error");
    } finally {
      setCopyBusy(false);
    }
  }, [pickedModels, flashCopyState]);

  const skeletonItems = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, idx) => ({
        id: `skeleton-${idx}`,
        aspectRatio: getAspectRatioByIndex(idx),
      })),
    [],
  );

  useEffect(() => {
    if (!deepLinkAppliedRef.current) return;

    const next = new URLSearchParams(searchParams);
    if (selectedCategory && selectedCategory !== DEFAULT_CATEGORY_KEY) {
      next.set("category", selectedCategory);
    } else {
      next.delete("category");
    }
    next.delete("line");

    if (selectedModel && selectedModel !== DEFAULT_MODEL) {
      next.set("model", selectedModel);
    }
    else next.delete("model");
    // modelKey chỉ dùng để deep-link ban đầu; không giữ lại để tránh đè model người dùng vừa chọn.
    next.delete("modelKey");
    if (fromCatalogPath) next.set("from", fromCatalogPath);

    next.delete("compare");
    if (pickMode === "compare") {
      for (const name of pickedModels) next.append("compare", name);
    }

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [
    selectedCategory,
    selectedModel,
    fromCatalogPath,
    pickMode,
    pickedModels,
    searchParams,
    setSearchParams,
  ]);

  return (
    <div className="min-h-screen font-sans relative text-[#333] overflow-x-clip pb-32 md:pb-36">
      <div className="fixed inset-0 -z-20 feedback-yearbook-bg" aria-hidden />
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[8%] right-[-12%] w-[420px] h-[420px] bg-[#f0c4d8] rounded-full blur-[130px] opacity-[0.22]" />
        <div className="absolute bottom-[8%] left-[-10%] w-[340px] h-[340px] bg-[#e8dcc4] rounded-full blur-[110px] opacity-[0.35]" />
      </div>
      <div
        className="hidden lg:block fixed left-0 top-0 bottom-0 w-[min(12px,2vw)] z-0 pointer-events-none"
        aria-hidden
      >
        <div className="h-full w-full bg-gradient-to-r from-[#b8956a]/25 via-[#d4b896]/12 to-transparent border-r border-[#a08060]/20 shadow-[inset_-4px_0_12px_rgba(0,0,0,0.06)]" />
      </div>

      <div className="w-full max-w-screen-2xl mx-auto pt-10 sm:pt-12 px-2 sm:px-3 md:px-3 lg:px-4 xl:px-5 relative z-[1]">
        <div className="mb-5 sm:mb-6">
          <Link
            to={backToCatalogHref}
            className="inline-flex items-center gap-2 text-sm font-bold text-[#5c4a42] hover:text-[#b03060] transition-colors"
          >
            <ArrowRight size={16} className="rotate-180" />
            {fromCatalogPath.startsWith("/thue-may-anh-") ? "Quay lại review" : "Quay lại danh mục"}
          </Link>
        </div>

        {selectedModel && selectedModel !== DEFAULT_MODEL && (
          <div className="mb-5 rounded-xl border border-[#e8c4d4] bg-[#fff5f9] px-4 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#9d3d5c]">Ảnh thật từ khách thuê</p>
              <p className="font-feedback-ui mt-0.5 text-[clamp(1.05rem,2.4vw,1.35rem)] font-bold leading-tight tracking-tight text-[#a01e58]">
                {formatFeedbackModelTitle(selectedModel)}
              </p>
              {filterDescription && (
                <p className="mt-1.5 text-xs text-[#7a5c48] leading-relaxed line-clamp-2">
                  {filterDescription}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="relative rounded-[18px] sm:rounded-[22px] border-[3px] border-double border-[#c9b49a] bg-[#fffdf7] py-4 px-3 sm:py-5 sm:px-4 md:py-6 md:px-5 shadow-[0_22px_60px_-18px_rgba(60,40,30,0.22),inset_0_1px_0_rgba(255,255,255,0.85)] ring-1 ring-[#e8dcc8]/80">
          <div className="pointer-events-none absolute inset-x-4 sm:inset-x-6 top-3 h-px bg-gradient-to-r from-transparent via-[#d4c4b0]/60 to-transparent opacity-70 hidden sm:block" aria-hidden />
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-feedback-yearbook-title text-[clamp(2.35rem,5vw,3.25rem)] font-semibold leading-[1.05] text-[#6b3d4a] tracking-wide">
                Feedback
              </p>
              <p className="mt-1.5 font-feedback-ui text-sm text-[#6a5a52] max-w-xl">
                Mỗi dòng máy là một “trang nhớ” — chọn hãng rồi dòng máy để xem
                ảnh thật và lời mô tả từ khách.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e8c4d4] bg-[#fff5f9] px-3.5 py-1.5 text-xs font-bold text-[#9d3d5c] w-fit shadow-sm rotate-[-0.4deg]">
              ♥ {galleryTotal} khoảnh khắc
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handlePickModeToggle("compare")}
              aria-pressed={pickMode === "compare"}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                pickMode === "compare"
                  ? "bg-[#1F1F1F] text-[#FF9FCA]"
                  : "border border-[#e5d5c8] bg-white text-[#6a5a52] hover:border-[#E85C9C]/50"
              }`}
            >
              <Columns2 size={14} />
              So sánh 2 máy
            </button>
            {isStaff && (
              <button
                type="button"
                onClick={() => handlePickModeToggle("send")}
                aria-pressed={pickMode === "send"}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                  pickMode === "send"
                    ? "bg-[#1F1F1F] text-[#FF9FCA]"
                    : "border border-[#e5d5c8] bg-white text-[#6a5a52] hover:border-[#E85C9C]/50"
                }`}
              >
                <MessageSquare size={14} />
                Chọn nhiều máy gửi khách
              </button>
            )}
            <button
              type="button"
              onClick={handleCopyShortLink}
              disabled={copyBusy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#e5d5c8] bg-white px-3 py-2 text-xs font-bold text-[#6a5a52] transition-colors hover:border-[#E85C9C]/50 disabled:opacity-60"
            >
              {copyState === "link" ? (
                <Check size={14} className="text-emerald-600" />
              ) : (
                <Link2 size={14} className="text-[#E85C9C]" />
              )}
              {copyState === "link" ? "Đã copy link ngắn!" : "Copy link ngắn"}
            </button>
          </div>

          {pickMode && (
            <div className="mt-3 rounded-xl border border-[#e8c4d4] bg-[#fff5f9] p-3">
              <p className="text-xs font-semibold text-[#9d3d5c]">
                {pickMode === "compare"
                  ? "Chọn 2 dòng máy bên dưới (có thể đổi hãng giữa chừng) để xem ảnh cạnh nhau."
                  : "Chọn các dòng máy khách xin ảnh feedback, rồi copy tin nhắn gửi khách."}
              </p>
              {pickedModels.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {pickedModels.map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 rounded-full bg-[#1F1F1F] py-1 pl-3 pr-1.5 text-xs font-bold text-[#FF9FCA]"
                    >
                      {formatFeedbackModelTitle(name)}
                      <button
                        type="button"
                        onClick={() => handleModelChipClick(name)}
                        aria-label={`Bỏ ${formatFeedbackModelTitle(name)}`}
                        className="rounded-full p-0.5 hover:bg-white/15"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {isStaff && (
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  disabled={copyBusy || pickedModels.length === 0}
                  className="mt-3 inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-[#222] px-4 py-2 text-xs font-bold text-[#FF9FCA] transition-colors hover:bg-[#333] disabled:opacity-50"
                >
                  {copyState === "message" ? (
                    <Check size={14} />
                  ) : (
                    <MessageSquare size={14} />
                  )}
                  {copyState === "message"
                    ? "Đã copy tin nhắn!"
                    : pickedModels.length > 0
                      ? `Copy tin nhắn ${pickedModels.length} máy`
                      : "Copy tin nhắn"}
                </button>
              )}
              {copyBusy && (
                <p className="mt-2 text-[11px] font-semibold text-[#a89486]">
                  Đang tạo link ngắn…
                </p>
              )}
            </div>
          )}
          {copyState === "error" && (
            <p className="mt-2 text-[11px] font-semibold text-rose-600">
              Không copy được — chạm giữ để copy thủ công.
            </p>
          )}

          <div className="mt-6">
            <div
              role="tablist"
              aria-label="Loại máy"
              className="flex gap-0.5 overflow-x-auto border-b border-[#e5d5c8] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {parentTabCategories.map((category) => {
                const active = selectedCategory === category.key;
                return (
                  <button
                    key={category.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => handleCategorySelect(category.key)}
                    className={`shrink-0 px-3.5 py-2.5 text-sm font-bold tracking-wide transition-colors ${
                      active
                        ? "-mb-px border-b-2 border-[#E85C9C] text-[#a01e58]"
                        : "text-[#8a6f62] hover:text-[#5c4a42]"
                    }`}
                  >
                    {formatCategoryTabLabel(category.label, category.key)}
                  </button>
                );
              })}
            </div>

            <div className="mt-3">
              {modelChoices.length > MODEL_CHIP_COLLAPSED_LIMIT && (
                <div className="relative mb-2.5 w-full max-w-xs">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#b09b8d]"
                  />
                  <input
                    type="search"
                    value={modelQuery}
                    onChange={(e) => setModelQuery(e.target.value)}
                    placeholder={`Tìm trong ${modelChoices.length} dòng máy…`}
                    aria-label="Tìm dòng máy"
                    className="w-full rounded-xl border border-[#e5d5c8] bg-white py-2 pl-8.5 pr-3 text-xs font-semibold text-[#5c4a42] placeholder:font-medium placeholder:text-[#b09b8d] focus:border-[#E85C9C]/60 focus:outline-none"
                  />
                </div>
              )}

              <div
                role="tablist"
                aria-label="Dòng máy"
                className="flex flex-wrap gap-2"
              >
                {!pickMode && (
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedModel === DEFAULT_MODEL}
                  onClick={() => handleModelSelectChange(DEFAULT_MODEL)}
                  className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                    selectedModel === DEFAULT_MODEL
                      ? "bg-[#1F1F1F] text-[#FF9FCA]"
                      : "border border-[#e5d5c8] bg-white text-[#6a5a52] hover:border-[#E85C9C]/50"
                  }`}
                >
                  Tất cả máy
                </button>
                )}
                {visibleCameraChoices.map((choice) => {
                  const active = pickMode
                    ? pickedModels.includes(choice.value)
                    : selectedModel === choice.value;
                  return (
                    <button
                      key={choice.value}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => handleModelChipClick(choice.value)}
                      className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                        active
                          ? "bg-[#1F1F1F] text-[#FF9FCA]"
                          : "border border-[#e5d5c8] bg-white text-[#6a5a52] hover:border-[#E85C9C]/50"
                      }`}
                    >
                      {choice.label}
                    </button>
                  );
                })}
              </div>

              {visibleAccessoryChoices.length > 0 && (
                <>
                  <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#a89486]">
                    Lens & phụ kiện
                  </p>
                  <div
                    role="tablist"
                    aria-label="Lens và phụ kiện"
                    className="mt-1.5 flex flex-wrap gap-2"
                  >
                    {visibleAccessoryChoices.map((choice) => {
                      const active = pickMode
                    ? pickedModels.includes(choice.value)
                    : selectedModel === choice.value;
                      return (
                        <button
                          key={choice.value}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => handleModelChipClick(choice.value)}
                          className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                            active
                              ? "bg-[#1F1F1F] text-[#FF9FCA]"
                              : "border border-dashed border-[#e5d5c8] bg-white/70 text-[#8a7468] hover:border-[#E85C9C]/50"
                          }`}
                        >
                          {choice.label}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {modelSearchToken && searchedModelChoices.length === 0 && (
                <p className="mt-2.5 text-xs text-[#8a7468]">
                  Không có dòng máy nào khớp “{modelQuery.trim()}”.
                </p>
              )}

              {!modelSearchToken &&
                (hiddenModelCount > 0 || showAllModels) &&
                modelChoices.length > MODEL_CHIP_COLLAPSED_LIMIT && (
                  <button
                    type="button"
                    onClick={() => setShowAllModels((prev) => !prev)}
                    aria-expanded={showAllModels}
                    className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-[#a01e58] hover:underline"
                  >
                    {showAllModels
                      ? "Thu gọn danh sách"
                      : `Xem thêm ${hiddenModelCount} dòng máy`}
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${
                        showAllModels ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                )}
            </div>
          </div>

          {(!selectedModel || selectedModel === DEFAULT_MODEL) && filterDescription && (
            <p className="mt-4 text-sm text-[#6a5a52] leading-relaxed">
              {filterDescription}
            </p>
          )}
        </div>

        {pickMode === "compare" ? (
          <div className="mt-6">
            {pickedModels.length < MAX_COMPARE_MODELS ? (
              <div className="rounded-xl border-2 border-dashed border-[#d4c4b0] bg-[#fffdf9] p-8 text-center font-feedback-ui text-[#6a5a52]">
                {pickedModels.length === 0
                  ? "Chọn máy thứ nhất để bắt đầu so sánh."
                  : "Chọn thêm 1 máy nữa để xem ảnh hai máy cạnh nhau."}
              </div>
            ) : (
              <ComparePanel
                models={pickedModels.map((name) => ({
                  name,
                  modelKey: modelRows.find((row) => row.displayName === name)?.modelKey,
                }))}
                onRemove={handleModelChipClick}
              />
            )}
          </div>
        ) : (
        <div className="mt-6">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 items-start">
              {skeletonItems.map((item) => (
                <article
                  key={item.id}
                  className="mb-4 break-inside-avoid rounded-lg bg-[#fffcf7] p-2.5 pb-4 shadow-[4px_6px_0_rgba(180,150,120,0.12),0_12px_28px_-8px_rgba(60,40,30,0.12)] ring-1 ring-[#e8dcc8] border border-[#f0e8dc]"
                >
                  <div className="aspect-[4/5] w-full animate-pulse rounded-sm bg-gradient-to-br from-[#f0e4dc] via-[#faf3ee] to-[#e8ddd4]" />
                  <div className="mt-3 space-y-2 px-1 text-center">
                    <div className="mx-auto h-4 w-2/3 rounded-full bg-[#e5d5c8]/90 animate-pulse" />
                    <div className="mx-auto h-2.5 w-1/2 rounded-full bg-[#e0d4cc] animate-pulse" />
                  </div>
                </article>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-xl border-2 border-dashed border-red-300/80 bg-[#fff5f5] p-6 text-red-800 text-sm font-semibold shadow-[3px_4px_0_rgba(200,100,100,0.12)] rotate-[-0.3deg]">
              {error}
            </div>
          ) : galleryError ? (
            <div className="rounded-xl border-2 border-dashed border-red-300/80 bg-[#fff5f5] p-6 text-red-800 text-sm font-semibold shadow-[3px_4px_0_rgba(200,100,100,0.12)] rotate-[-0.3deg]">
              {galleryError}
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-[#d4c4b0] bg-[#fffdf9] p-8 text-center text-[#6a5a52] font-feedback-ui shadow-[2px_4px_0_rgba(180,150,120,0.1)]">
              Trang này còn trống — thử đổi bộ lọc hoặc chọn &quot;Tất cả&quot;
              nhé.
            </div>
          ) : galleryLoading && galleryItems.length === 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 items-start">
              {skeletonItems.map((item) => (
                <article
                  key={item.id}
                  className="mb-4 break-inside-avoid rounded-lg bg-[#fffcf7] p-2.5 pb-4 shadow-[4px_6px_0_rgba(180,150,120,0.12),0_12px_28px_-8px_rgba(60,40,30,0.12)] ring-1 ring-[#e8dcc8] border border-[#f0e8dc]"
                >
                  <div className="aspect-[4/5] w-full animate-pulse rounded-sm bg-gradient-to-br from-[#f0e4dc] via-[#faf3ee] to-[#e8ddd4]" />
                  <div className="mt-3 space-y-2 px-1 text-center">
                    <div className="mx-auto h-4 w-2/3 rounded-full bg-[#e5d5c8]/90 animate-pulse" />
                    <div className="mx-auto h-2.5 w-1/2 rounded-full bg-[#e0d4cc] animate-pulse" />
                  </div>
                </article>
              ))}
            </div>
          ) : galleryItems.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-[#d4c4b0] bg-[#fffdf9] p-8 text-center text-[#6a5a52] font-feedback-ui shadow-[2px_4px_0_rgba(180,150,120,0.1)]">
              Chưa có ảnh feedback cho bộ lọc này.
            </div>
          ) : (
            <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4 items-start">
              {galleryItems.map((item, idx) => {
                const tilt =
                  idx % 5 === 0
                    ? "-rotate-[0.55deg]"
                    : idx % 5 === 1
                      ? "rotate-[0.5deg]"
                      : idx % 5 === 2
                        ? "-rotate-[0.25deg]"
                        : idx % 5 === 3
                          ? "rotate-[0.65deg]"
                          : "-rotate-[0.1deg]";
                return (
                <article
                  key={item.id}
                  className={`mb-4 break-inside-avoid group transition-transform duration-300 ease-out hover:z-10 hover:scale-[1.02] hover:rotate-0 ${tilt}`}
                >
                  <div
                    className="relative overflow-visible rounded-lg bg-gradient-to-b from-[#fffefb] via-[#fff9f3] to-[#faf0e8] p-2.5 pb-4 shadow-[5px_8px_0_rgba(160,130,100,0.14),0_16px_40px_-12px_rgba(70,50,40,0.18)] ring-1 ring-[#e5d8cc] border border-[#faf5ef]"
                  >
                    <FeedbackCardAffix index={idx} />
                    <div
                      className="pointer-events-none absolute inset-x-5 top-8 h-px bg-gradient-to-r from-transparent via-[#e8d4c8]/80 to-transparent"
                      aria-hidden
                    />
                    <div className="relative overflow-hidden rounded-[3px] bg-gradient-to-br from-[#2c2c2c] via-[#1f1f1f] to-[#141414] p-[5px] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_4px_14px_rgba(0,0,0,0.18)]">
                      <div className="relative overflow-hidden rounded-[1px] ring-1 ring-white/25 shadow-inner">
                        <img
                          src={item.image}
                          alt={`${item.modelName} thực tế`}
                          loading="eager"
                          decoding="async"
                          fetchPriority={idx < 8 ? "high" : "auto"}
                          className="block w-full h-auto transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                        />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/[0.08] via-transparent to-white/[0.06]" />
                      </div>
                    </div>

                    <div className="relative mt-3.5 px-1.5 pt-1 text-center">
                      <div
                        className="absolute left-4 right-4 top-0 border-t border-dashed border-[#e0c8bc]/90"
                        aria-hidden
                      />
                      <p
                        className="font-feedback-ui mt-2 line-clamp-2 text-[15px] font-bold leading-snug tracking-tight text-[#8b2848] sm:text-base"
                      >
                        {formatFeedbackModelTitle(item.modelName)}
                      </p>
                      <div className="font-feedback-ui mt-2.5 flex flex-wrap items-center justify-center gap-2">
                        <span className="rounded-full border border-[#e8c4c4]/90 bg-[#fffefb] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#8b3d52] shadow-sm">
                          {item.line}
                        </span>
                      </div>
                    </div>
                  </div>
                </article>
                );
              })}
            </div>
            {galleryTotalPages > 1 ? (
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 font-feedback-ui text-sm text-[#5c4a42]">
                <button
                  type="button"
                  disabled={galleryPage <= 0 || galleryLoading}
                  onClick={() => setGalleryPage((p) => Math.max(0, p - 1))}
                  className="rounded-lg border border-[#d4c4b0] bg-[#fffdf9] px-4 py-2 font-bold text-[#6b3d4a] shadow-sm transition-colors enabled:hover:bg-[#fff5f0] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Trước
                </button>
                <span className="font-semibold tabular-nums">
                  Trang {galleryPage + 1} / {galleryTotalPages}
                </span>
                <button
                  type="button"
                  disabled={galleryPage >= galleryTotalPages - 1 || galleryLoading}
                  onClick={() =>
                    setGalleryPage((p) => Math.min(galleryTotalPages - 1, p + 1))
                  }
                  className="rounded-lg border border-[#d4c4b0] bg-[#fffdf9] px-4 py-2 font-bold text-[#6b3d4a] shadow-sm transition-colors enabled:hover:bg-[#fff5f0] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Sau →
                </button>
              </div>
            ) : null}
            </>
          )}
        </div>
        )}
      </div>

      <SlideNav />
      <FloatingContactButton />
    </div>
  );
}

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Filter } from "lucide-react";
import { format, addDays } from "date-fns";
import api from "../../config/axios";
import SlideNav from "../../components/SlideNav";
import FloatingContactButton from "../../components/FloatingContactButton";
import QuickBookModal from "../../components/QuickBookModal";
import CatalogCuratedScheduleBanner from "../../components/catalog/CatalogCuratedScheduleBanner";
import {
  computeAvailabilityRange,
  getAvailabilityRangeError,
} from "../../components/BookingPrefsForm";
import {
  buildQuickBookInitialPrefs,
  parseCatalogBookingPrefs,
} from "../../utils/catalogBookingContext";
import { BRANCHES } from "../../data/bookingConstants";
import { formatTimeVi } from "../../utils/formatTimeVi";
import { MESSENGER_LINK } from "../../data/contactConfig";
import { filterBookingsOverlappingSlot } from "../../utils/bookingOverlap";
import {
  devicesForBookingBranch,
  normalizeDevicesListResponse,
} from "../../utils/deviceBranch";
import deviceSeoSnapshot from "../../data/deviceSeoSnapshot.json";

const FALLBACK_IMG =
  "https://placehold.co/1200x800/FFE4F0/E85C9C?text=Anh+khach+chup";
const DEFAULT_CATEGORY_KEY = "all";
const DEFAULT_MODEL = "Tất cả máy";
/** Chỉ dùng khi không có ảnh thật — giữ vừa đủ để demo, tránh spam request. */
const MOCK_IMAGES_PER_MODEL = 6;
const GALLERY_PAGE_SIZE = 12;
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

/** Băng washi nhiều màu — class cho lớp trong cùng (gradient + xoay). */
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

function modelKeyForAvailability(deviceOrKey) {
  if (typeof deviceOrKey === "string") {
    return String(deviceOrKey).trim();
  }
  const mk = String(deviceOrKey?.modelKey || "").trim();
  if (mk) return mk;
  return normalizeDeviceName(deviceOrKey?.name || "");
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
  const [quickBookDevice, setQuickBookDevice] = useState(null);
  const [showQuickBookModal, setShowQuickBookModal] = useState(false);
  const [galleryPage, setGalleryPage] = useState(0);
  const [galleryPayload, setGalleryPayload] = useState(null);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState("");
  const [slotModelAvailability, setSlotModelAvailability] = useState(null);
  const [slotAvailabilityLoading, setSlotAvailabilityLoading] = useState(false);

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

  useEffect(() => {
    if (apiCategories.length === 0) return;
    if (!categoryOptions.some((c) => c.key === selectedCategory)) {
      setSelectedCategory(DEFAULT_CATEGORY_KEY);
    }
  }, [apiCategories.length, categoryOptions, selectedCategory]);

  const categoryFilteredRows = useMemo(() => {
    if (selectedCategory === DEFAULT_CATEGORY_KEY) return modelRows;
    const active = categoryOptions.find((c) => c.key === selectedCategory);
    if (!active?.deviceIds) return modelRows;
    return modelRows.filter((row) => {
      for (const gid of row.groupDeviceIds || []) {
        if (active.deviceIds.has(normalizeId(gid))) return true;
      }
      return false;
    });
  }, [modelRows, categoryOptions, selectedCategory]);

  const modelOptions = useMemo(() => {
    return [
      DEFAULT_MODEL,
      ...categoryFilteredRows.map((item) => item.displayName).filter(Boolean),
    ];
  }, [categoryFilteredRows]);

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
      const bid = row.bookDeviceId != null ? normalizeId(row.bookDeviceId) : "";
      const bookDevice = bid ? deviceById.get(bid) || null : null;
      return {
        id: row.id,
        modelKey: row.modelKey,
        modelName: row.modelName,
        line: row.line,
        image: row.image || FALLBACK_IMG,
        bookDevice,
      };
    });
    if (selectedModelKey && selectedModel !== DEFAULT_MODEL) {
      const key = selectedModelKey.toLowerCase();
      return mapped.filter(
        (item) => String(item.modelKey || "").trim().toLowerCase() === key,
      );
    }
    return mapped;
  }, [galleryPayload, deviceById, selectedModelKey, selectedModel]);

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

  const selectedModelBookDevice = useMemo(() => {
    if (!selectedModel || selectedModel === DEFAULT_MODEL) return null;
    if (selectedModelRow?.representativeDevice) return selectedModelRow.representativeDevice;
    return null;
  }, [selectedModel, selectedModelRow]);

  const catalogSlotPrefs = useMemo(
    () => parseCatalogBookingPrefs(fromCatalogPath),
    [fromCatalogPath],
  );

  const catalogSlotSummaryVi = useMemo(() => {
    if (!catalogSlotPrefs) return "";
    const { fromDateTime, toDateTime } = computeAvailabilityRange({
      date: catalogSlotPrefs.date,
      endDate: catalogSlotPrefs.endDate,
      timeFrom: catalogSlotPrefs.timeFrom,
      timeTo: catalogSlotPrefs.timeTo,
      durationType: catalogSlotPrefs.durationType,
      pickupType: catalogSlotPrefs.pickupType,
      pickupSlot: catalogSlotPrefs.pickupSlot,
    });
    if (!fromDateTime || !toDateTime) return "";
    const dm = (d) => `${d.getDate()}/${d.getMonth() + 1}`;
    return `nhận ${formatTimeVi(fromDateTime)} ${dm(fromDateTime)}, trả ${formatTimeVi(toDateTime)} ${dm(toDateTime)}`;
  }, [catalogSlotPrefs]);

  const catalogSlotBranchLabel = useMemo(() => {
    if (!catalogSlotPrefs?.branchId) return "";
    const branch = BRANCHES.find((b) => b.id === catalogSlotPrefs.branchId);
    return String(branch?.label || "")
      .replace(/^FAO\s*/i, "")
      .trim();
  }, [catalogSlotPrefs]);

  const quickBookInitialPrefs = useMemo(
    () => buildQuickBookInitialPrefs(fromCatalogPath),
    [fromCatalogPath],
  );

  useEffect(() => {
    if (!catalogSlotPrefs || devices.length === 0) {
      setSlotModelAvailability(null);
      setSlotAvailabilityLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setSlotAvailabilityLoading(true);
      try {
        const prefs = {
          date: catalogSlotPrefs.date,
          endDate: catalogSlotPrefs.endDate,
          timeFrom: catalogSlotPrefs.timeFrom,
          timeTo: catalogSlotPrefs.timeTo,
          durationType: catalogSlotPrefs.durationType,
          pickupType: catalogSlotPrefs.pickupType,
          pickupSlot: catalogSlotPrefs.pickupSlot,
        };
        const { fromDateTime, toDateTime } = computeAvailabilityRange(prefs);
        const rangeError = getAvailabilityRangeError(
          prefs,
          fromDateTime,
          toDateTime,
        );
        if (rangeError || !fromDateTime || !toDateTime) {
          if (!cancelled) setSlotModelAvailability(null);
          return;
        }

        const fromStr = format(fromDateTime, "yyyy-MM-dd'T'HH:mm:ss");
        const lookupTo =
          catalogSlotPrefs.durationType === "ONE_DAY"
            ? addDays(toDateTime, 1)
            : toDateTime;
        const toStr = format(lookupTo, "yyyy-MM-dd'T'HH:mm:ss");
        if (!fromStr || !toStr) {
          if (!cancelled) setSlotModelAvailability(null);
          return;
        }

        const resp = await api.get("v1/devices/booking", {
          params: {
            startDate: fromStr.slice(0, 10),
            endDate: toStr.slice(0, 10),
            branchId: catalogSlotPrefs.branchId,
          },
        });
        if (cancelled) return;

        const branchDevices = devicesForBookingBranch(
          devices,
          catalogSlotPrefs.branchId,
        );
        const branchModelKeys = new Set(
          branchDevices
            .filter((d) => String(d.type || "").toUpperCase() === "DEVICE")
            .map((d) => modelKeyForAvailability(d)),
        );

        const filterRowBySlot = (row) => ({
          ...row,
          bookingDtos: filterBookingsOverlappingSlot(
            Array.isArray(row?.bookingDtos) ? row.bookingDtos : [],
            fromDateTime,
            toDateTime,
          ),
        });

        const data = (resp.data || []).map(filterRowBySlot);
        const counts = new Map();
        for (const row of data) {
          const mk = modelKeyForAvailability(row);
          if (!branchModelKeys.has(mk)) continue;
          const busy =
            Array.isArray(row.bookingDtos) && row.bookingDtos.length > 0;
          const entry = counts.get(mk) || { free: 0, total: 0 };
          entry.total += 1;
          if (!busy) entry.free += 1;
          counts.set(mk, entry);
        }

        const availMap = new Map();
        for (const mk of branchModelKeys) {
          const entry = counts.get(mk);
          availMap.set(mk, entry ? entry.free > 0 : false);
        }
        setSlotModelAvailability(availMap);
      } catch {
        if (!cancelled) setSlotModelAvailability(null);
      } finally {
        if (!cancelled) setSlotAvailabilityLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [catalogSlotPrefs, devices]);

  const isModelSlotBookable = useCallback(
    (modelKey) => {
      if (!catalogSlotPrefs) return true;
      if (slotAvailabilityLoading) return false;
      const key = modelKeyForAvailability(modelKey);
      if (!key || !slotModelAvailability) return true;
      return slotModelAvailability.get(key) !== false;
    },
    [catalogSlotPrefs, slotAvailabilityLoading, slotModelAvailability],
  );

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

  const handleOpenQuickBook = useCallback(
    (item) => {
      if (!item?.bookDevice) return;
      const mk =
        item.modelKey || modelKeyForAvailability(item.bookDevice);
      if (!isModelSlotBookable(mk)) return;
      setQuickBookDevice(item.bookDevice);
      setShowQuickBookModal(true);
    },
    [isModelSlotBookable],
  );

  const handleCloseQuickBook = useCallback(() => {
    setShowQuickBookModal(false);
    setQuickBookDevice(null);
  }, []);

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

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [
    selectedCategory,
    selectedModel,
    fromCatalogPath,
    searchParams,
    setSearchParams,
  ]);

  return (
    <div className="min-h-screen font-sans relative text-[#333] overflow-x-hidden pb-32 md:pb-36">
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

        {catalogSlotPrefs && catalogSlotSummaryVi && (
          <CatalogCuratedScheduleBanner
            pickupReturnSummary={catalogSlotSummaryVi}
            branchLabel={catalogSlotBranchLabel}
          />
        )}

        {selectedModel && selectedModel !== DEFAULT_MODEL && (
          <div className="mb-5 rounded-xl border border-[#e8c4d4] bg-[#fff5f9] px-4 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#9d3d5c]">Ảnh thật từ khách thuê</p>
              <p className="font-feedback-display text-[clamp(1.25rem,3vw,1.65rem)] text-[#a01e58] leading-tight mt-0.5">
                {formatFeedbackModelTitle(selectedModel)}
              </p>
              {filterDescription && (
                <p className="mt-1.5 text-xs text-[#7a5c48] leading-relaxed line-clamp-2">
                  {filterDescription}
                </p>
              )}
            </div>
            {selectedModelBookDevice && (
              <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                <button
                  type="button"
                  onClick={() =>
                    handleOpenQuickBook({
                      bookDevice: selectedModelBookDevice,
                      modelKey: selectedModelRow?.modelKey,
                    })
                  }
                  disabled={
                    !isModelSlotBookable(selectedModelRow?.modelKey) ||
                    slotAvailabilityLoading
                  }
                  title={
                    slotAvailabilityLoading
                      ? catalogSlotSummaryVi
                        ? `Kiểm tra trống theo lịch: ${catalogSlotSummaryVi}`
                        : "Đang kiểm tra lịch trống..."
                      : !isModelSlotBookable(selectedModelRow?.modelKey)
                        ? catalogSlotSummaryVi
                          ? `Máy đã kín trong khung ${catalogSlotSummaryVi}`
                          : "Máy đã kín trong khung giờ bạn chọn ở danh mục"
                        : undefined
                  }
                  className="inline-flex rounded-lg bg-[#1F1F1F] px-4 py-2.5 text-sm font-bold text-[#FF9FCA] hover:bg-[#333] transition-colors disabled:bg-[#ccc] disabled:text-[#999] disabled:cursor-not-allowed"
                >
                  {slotAvailabilityLoading
                    ? catalogSlotSummaryVi
                      ? "Kiểm tra lịch shop chọn..."
                      : "Đang kiểm tra..."
                    : !isModelSlotBookable(selectedModelRow?.modelKey)
                      ? "Đã kín — đổi giờ"
                      : `Đặt ${formatFeedbackModelTitle(selectedModel)}`}
                </button>
                {!slotAvailabilityLoading &&
                  catalogSlotPrefs &&
                  !isModelSlotBookable(selectedModelRow?.modelKey) && (
                    <a
                      href={MESSENGER_LINK}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-center text-xs font-bold text-[#0084FF] hover:underline"
                    >
                      Nhắn shop xác nhận lại
                    </a>
                  )}
              </div>
            )}
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
                Mỗi dòng máy là một “trang nhớ” — lật bộ lọc để xem ảnh thật và
                lời mô tả từ khách.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e8c4d4] bg-[#fff5f9] px-3.5 py-1.5 text-xs font-bold text-[#9d3d5c] w-fit shadow-sm rotate-[-0.4deg]">
              ♥ {galleryTotal} khoảnh khắc
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-[#e5d5c8] bg-white p-3 shadow-sm">
              <p className="mb-1.5 text-xs font-semibold text-[#8a6f62]">
                Loại máy
              </p>
              <div className="relative">
                <Filter
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a09088]"
                />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full h-11 rounded-lg border border-[#e5d5c8] bg-[#fffcf7] pl-9 pr-3 text-sm font-semibold text-[#333] focus:outline-none focus:ring-2 focus:ring-[#e8a4bc]/50 focus:border-[#d498a8]"
                >
                  {categoryOptions.map((category) => (
                    <option key={category.key} value={category.key}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rounded-xl border border-[#e5d5c8] bg-white p-3 shadow-sm">
              <p className="mb-1.5 text-xs font-semibold text-[#8a6f62]">
                Dòng máy
              </p>
              <div className="relative">
                <Filter
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a09088]"
                />
                <select
                  value={selectedModel}
                  onChange={(e) => handleModelSelectChange(e.target.value)}
                  className="w-full h-11 rounded-lg border border-[#e5d5c8] bg-[#fffcf7] pl-9 pr-3 text-sm font-semibold text-[#333] focus:outline-none focus:ring-2 focus:ring-[#e8a4bc]/50 focus:border-[#d498a8]"
                >
                  {modelOptions.map((model) => (
                    <option key={model} value={model}>
                      {model === DEFAULT_MODEL
                        ? model
                        : formatFeedbackModelTitle(model)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {(!selectedModel || selectedModel === DEFAULT_MODEL) && filterDescription && (
            <p className="mt-4 text-sm text-[#6a5a52] leading-relaxed">
              {filterDescription}
            </p>
          )}
        </div>

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
                        className="font-feedback-display normal-case mt-2 line-clamp-2 font-normal leading-[1.12] tracking-[0.085em] text-[#8b2848] max-w-full mx-auto"
                        style={{
                          fontSize: "clamp(1.18rem, 3.1vw + 0.4rem, 1.58rem)",
                          textShadow:
                            "0 1px 0 rgba(255,255,255,0.95), 0 0 20px rgba(251, 182, 206, 0.28)",
                        }}
                      >
                        {formatFeedbackModelTitle(item.modelName)}
                      </p>
                      <div className="font-feedback-ui mt-2.5 flex flex-wrap items-center justify-center gap-2">
                        <span className="rounded-full border border-[#e8c4c4]/90 bg-[#fffefb] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#8b3d52] shadow-sm">
                          {item.line}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenQuickBook(item)}
                          disabled={
                            !item.bookDevice ||
                            !isModelSlotBookable(item.modelKey) ||
                            slotAvailabilityLoading
                          }
                          title={
                            item.bookDevice &&
                            catalogSlotPrefs &&
                            !slotAvailabilityLoading &&
                            !isModelSlotBookable(item.modelKey)
                              ? "Máy đã kín trong khung giờ bạn chọn ở danh mục"
                              : undefined
                          }
                          className={`rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider shadow-sm transition-all ${
                            item.bookDevice &&
                            isModelSlotBookable(item.modelKey) &&
                            !slotAvailabilityLoading
                              ? "border-[#e8c8d0] bg-gradient-to-r from-[#fdf2f5] to-[#f8e4eb] text-[#7a2d48] hover:from-[#fce8f0] hover:to-[#f5d0de] hover:text-[#5c1f36]"
                              : "border-[#e5dcd6] bg-[#f5f0ec] text-[#a09088] cursor-not-allowed"
                          }`}
                        >
                          {slotAvailabilityLoading
                            ? "..."
                            : item.bookDevice &&
                                catalogSlotPrefs &&
                                !isModelSlotBookable(item.modelKey)
                              ? "Đã kín"
                              : "Đặt ngay"}
                        </button>
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
      </div>

      <QuickBookModal
        device={quickBookDevice}
        isOpen={showQuickBookModal}
        onClose={handleCloseQuickBook}
        initialPrefs={quickBookInitialPrefs}
      />

      <SlideNav />
      <FloatingContactButton />
    </div>
  );
}

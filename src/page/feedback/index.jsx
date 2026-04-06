import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Filter } from "lucide-react";
import api from "../../config/axios";
import SlideNav from "../../components/SlideNav";
import FloatingContactButton from "../../components/FloatingContactButton";
import QuickBookModal from "../../components/QuickBookModal";
import { loadBookingPrefs } from "../../utils/storage";

const FALLBACK_IMG =
  "https://placehold.co/1200x800/FFE4F0/E85C9C?text=Anh+khach+chup";
const DEFAULT_CATEGORY_KEY = "all";
const DEFAULT_MODEL = "Tất cả máy";
/** Chỉ dùng khi không có ảnh thật — giữ vừa đủ để demo, tránh spam request. */
const MOCK_IMAGES_PER_MODEL = 6;
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

function parseLocalDateParam(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function isValidTimeParam(value) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value || ""));
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
  if (!raw.startsWith("/catalog")) return "/catalog";
  return raw;
}

function buildCatalogLinkWithModel(fromCatalogPath, modelName) {
  try {
    const url = new URL(fromCatalogPath, "https://fao.local");
    const params = new URLSearchParams(url.search);
    if (modelName) params.set("q", modelName);
    else params.delete("q");
    if (modelName) params.set("focusModel", modelName);
    else params.delete("focusModel");
    const q = params.toString();
    return `/catalog${q ? `?${q}` : ""}`;
  } catch {
    const p = new URLSearchParams();
    if (modelName) p.set("q", modelName);
    if (modelName) p.set("focusModel", modelName);
    const q = p.toString();
    return `/catalog${q ? `?${q}` : ""}`;
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
  const initialModel = searchParams.get("model") || "";
  const initialModelKey = searchParams.get("modelKey") || "";
  const fromCatalogPath = normalizeFromCatalogPath(searchParams.get("from"));
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedModel, setSelectedModel] = useState(initialModel || DEFAULT_MODEL);
  const appliedInitialModelKeyRef = useRef("");
  const [quickBookDevice, setQuickBookDevice] = useState(null);
  const [showQuickBookModal, setShowQuickBookModal] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchDevices = async () => {
      setLoading(true);
      setError("");
      try {
        const [res, categoriesRes] = await Promise.all([
          api.get("/v1/devices"),
          api.get("/v1/device-categories/with-items").catch(() => ({ data: [] })),
        ]);
        if (!isMounted) return;
        setDevices(Array.isArray(res.data) ? res.data : []);
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
    if (!initialModelKey || modelRows.length === 0) return;
    if (appliedInitialModelKeyRef.current === initialModelKey) return;

    const byKey = modelRows.find(
      (item) =>
        String(item.modelKey || "").trim().toLowerCase() ===
        String(initialModelKey).trim().toLowerCase(),
    );
    if (byKey && selectedModel !== byKey.displayName) {
      setSelectedModel(byKey.displayName);
    }
    appliedInitialModelKeyRef.current = initialModelKey;
  }, [initialModelKey, modelRows, selectedModel]);

  const backToCatalogHref = useMemo(() => {
    if (selectedModel && selectedModel !== DEFAULT_MODEL) {
      return buildCatalogLinkWithModel(fromCatalogPath, selectedModel);
    }
    return fromCatalogPath;
  }, [fromCatalogPath, selectedModel]);

  useEffect(() => {
    if (modelRows.length === 0) return;
    if (modelOptions.includes(selectedModel)) return;
    if (selectedModel === DEFAULT_MODEL) return;

    const target = compactToken(selectedModel);
    const matched = modelRows.find((item) => {
      const display = compactToken(item.displayName);
      return (
        display === target ||
        display.includes(target) ||
        target.includes(display)
      );
    });

    if (matched) setSelectedModel(matched.displayName);
    else setSelectedModel(DEFAULT_MODEL);
  }, [modelRows, modelOptions, selectedModel]);

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
    const target = compactToken(selectedModel);
    return (
      categoryFilteredRows.find((item) => compactToken(item.displayName) === target) ||
      categoryFilteredRows.find((item) =>
        compactToken(item.displayName).includes(target),
      ) ||
      null
    );
  }, [categoryFilteredRows, selectedModel]);

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
    const items = [];
    for (const row of filteredRows) {
      const primaryFb = pickFirstUnitDeviceForFeedback(row, deviceById);
      const deviceFbImages = normalizeImageList(primaryFb?.feedbackImages);
      const modelMeta = resolveModelMeta(row);
      const metaImages = normalizeImageList(modelMeta?.images);
      const effectiveImages =
        deviceFbImages.length > 0
          ? deviceFbImages
          : metaImages.length > 0
            ? metaImages
            : row.images;
      const realCount = normalizeImageList(effectiveImages).length;
      // Có ảnh thật: chỉ render đúng số file — không nhân bản URL (?mock=) gây tải trùng & giật.
      const galleryTarget =
        realCount > 0 ? realCount : Math.max(1, MOCK_IMAGES_PER_MODEL);
      const gallery = buildMockRichGallery(
        effectiveImages.length > 0 ? effectiveImages : [FALLBACK_IMG],
        row.displayName,
        galleryTarget,
      );
      for (let idx = 0; idx < gallery.length; idx += 1) {
        items.push({
          id: `${row.modelKey}-${idx}`,
          modelKey: row.modelKey,
          modelName: row.displayName,
          line: row.line,
          image: gallery[idx] || FALLBACK_IMG,
          bookDevice: row.representativeDevice || null,
        });
      }
    }
    return items;
  }, [filteredRows, resolveModelMeta, deviceById]);

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

  const quickBookInitialPrefs = useMemo(() => {
    // Ưu tiên lấy context từ catalog để hành vi giống 100% khi mở modal.
    try {
      const url = new URL(fromCatalogPath, "https://fao.local");
      const p = url.searchParams;
      const durationType = ["SIX_HOURS", "ONE_DAY"].includes(
        p.get("durationType"),
      )
        ? p.get("durationType")
        : null;
      const branchId = p.get("branchId");
      const date = parseLocalDateParam(p.get("date"));
      const endDate = parseLocalDateParam(p.get("endDate"));
      const timeFrom = isValidTimeParam(p.get("timeFrom"))
        ? p.get("timeFrom")
        : null;
      const timeTo = isValidTimeParam(p.get("timeTo")) ? p.get("timeTo") : null;
      const pickupType = ["MORNING", "EVENING"].includes(p.get("pickupType"))
        ? p.get("pickupType")
        : null;
      const pickupSlot = isValidTimeParam(p.get("pickupSlot"))
        ? p.get("pickupSlot")
        : null;
      const availabilityConfirmed = p.get("availability") === "1";

      if (availabilityConfirmed && durationType && branchId && date && timeFrom) {
        return {
          step: 2,
          branchId,
          durationType,
          date,
          endDate: endDate || date,
          timeFrom,
          timeTo: timeTo || timeFrom,
          pickupType: pickupType || null,
          pickupSlot: pickupSlot || null,
        };
      }
    } catch {
      // no-op, fallback bên dưới
    }

    const stored = loadBookingPrefs();
    if (!stored) return null;
    const durationType = ["SIX_HOURS", "ONE_DAY"].includes(stored.durationType)
      ? stored.durationType
      : null;
    const date = stored?.date ? new Date(stored.date) : null;
    const endDate = stored?.endDate ? new Date(stored.endDate) : null;
    if (
      durationType &&
      stored.branchId &&
      date &&
      !Number.isNaN(date.getTime()) &&
      stored.timeFrom
    ) {
      return {
        step: 2,
        branchId: stored.branchId,
        durationType,
        date,
        endDate:
          endDate && !Number.isNaN(endDate.getTime()) ? endDate : date,
        timeFrom: stored.timeFrom,
        timeTo: stored.timeTo || stored.timeFrom,
        pickupType: stored.pickupType || null,
        pickupSlot: stored.pickupSlot || null,
      };
    }
    return null;
  }, [fromCatalogPath]);

  const handleOpenQuickBook = useCallback((item) => {
    if (!item?.bookDevice) return;
    setQuickBookDevice(item.bookDevice);
    setShowQuickBookModal(true);
  }, []);

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
            Quay lại danh mục (giữ bộ lọc)
          </Link>
        </div>

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
              ♥ {galleryItems.length} khoảnh khắc
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="relative rounded-xl border-2 border-dashed border-[#d4b8a8]/90 bg-[#fffaf3] p-3 shadow-[2px_3px_0_rgba(180,150,120,0.12)] rotate-[0.25deg]">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#8a6f62]">
                Lọc theo category
              </p>
              <div className="relative">
                <Filter
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a09088]"
                />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full h-11 rounded-lg border border-[#e5d5c8] bg-white pl-9 pr-3 text-sm font-semibold text-[#333] focus:outline-none focus:ring-2 focus:ring-[#e8a4bc]/50 focus:border-[#d498a8]"
                >
                  {categoryOptions.map((category) => (
                    <option key={category.key} value={category.key}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="relative rounded-xl border-2 border-dashed border-[#d4b8a8]/90 bg-[#fffaf3] p-3 shadow-[2px_3px_0_rgba(180,150,120,0.12)] rotate-[-0.2deg] md:rotate-[0.15deg]">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#8a6f62]">
                Chọn model cụ thể
              </p>
              <div className="relative">
                <Filter
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a09088]"
                />
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full h-11 rounded-lg border border-[#e5d5c8] bg-white pl-9 pr-3 text-sm font-semibold text-[#333] focus:outline-none focus:ring-2 focus:ring-[#e8a4bc]/50 focus:border-[#d498a8]"
                >
                  {modelOptions.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-[#e8d89c]/80 bg-[#fffbeb] px-3 py-3 sm:px-3.5 sm:py-3.5 shadow-[3px_5px_0_rgba(200,170,90,0.15),0_8px_24px_-12px_rgba(120,90,40,0.12)] grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center rotate-[0.35deg] ring-1 ring-[#f5e6c8]/90 relative before:content-[''] before:absolute before:-top-2 before:left-1/2 before:-translate-x-1/2 before:w-14 before:h-4 before:bg-gradient-to-b before:from-[#f5e6d0] before:to-[#e8d4b8] before:opacity-90 before:shadow-sm before:rotate-[-3deg] before:rounded-[2px] before:border before:border-white/40">
          <div className="font-feedback-ui text-sm text-[#6b5344] font-semibold min-w-0 pt-2">
            {selectedModel && selectedModel !== DEFAULT_MODEL ? (
              <>
                <p>
                  Bạn đang xem ảnh thực tế của{" "}
                  <span className="font-feedback-display normal-case text-[clamp(1.25rem,2.8vw,1.65rem)] font-normal text-[#a01e58] leading-[1.15]">
                    {formatFeedbackModelTitle(selectedModel)}
                  </span>
                  .
                </p>
                <p className="mt-2 text-xs text-[#7a5c48] font-medium leading-relaxed whitespace-pre-line break-words">
                  {filterDescription}
                </p>
              </>
            ) : (
              <p className="whitespace-pre-line break-words leading-relaxed">
                {filterDescription}
              </p>
            )}
          </div>
          {selectedModel && selectedModel !== DEFAULT_MODEL && (
            <button
              type="button"
              onClick={() =>
                selectedModelBookDevice &&
                handleOpenQuickBook({ bookDevice: selectedModelBookDevice })
              }
              disabled={!selectedModelBookDevice}
              className={`inline-flex w-fit shrink-0 rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wide leading-tight transition-colors ${
                selectedModelBookDevice
                  ? "bg-[#1F1F1F] text-[#FF9FCA] hover:bg-[#333]"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              Đặt {selectedModel}
            </button>
          )}
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="columns-2 md:columns-3 lg:columns-4 gap-2 sm:gap-4 [column-fill:_balance]">
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
          ) : filteredRows.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-[#d4c4b0] bg-[#fffdf9] p-8 text-center text-[#6a5a52] font-feedback-ui shadow-[2px_4px_0_rgba(180,150,120,0.1)]">
              Trang này còn trống — thử đổi bộ lọc hoặc chọn &quot;Tất cả&quot;
              nhé.
            </div>
          ) : (
            <div className="columns-2 md:columns-3 lg:columns-4 gap-2 sm:gap-4 [column-fill:_balance]">
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
                          className="rounded-full border border-[#e8c8d0] bg-gradient-to-r from-[#fdf2f5] to-[#f8e4eb] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#7a2d48] shadow-sm transition-all hover:from-[#fce8f0] hover:to-[#f5d0de] hover:text-[#5c1f36]"
                        >
                          Đặt ngay
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
                );
              })}
            </div>
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

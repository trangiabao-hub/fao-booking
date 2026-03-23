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
const MOCK_IMAGES_PER_MODEL = 12;
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
      } catch (err) {
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
      const modelMeta = resolveModelMeta(row);
      const rowImages = normalizeImageList(modelMeta?.images);
      const effectiveImages = rowImages.length > 0 ? rowImages : row.images;
      const gallery = buildMockRichGallery(
        effectiveImages.length > 0 ? effectiveImages : [FALLBACK_IMG],
        row.displayName,
        MOCK_IMAGES_PER_MODEL,
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
  }, [filteredRows, resolveModelMeta]);

  const filterDescription = useMemo(() => {
    if (selectedModelRow) {
      const modelMeta = resolveModelMeta(selectedModelRow);
      if (modelMeta?.description) return modelMeta.description;
      return `Ảnh feedback thực tế khách chụp từ dòng ${selectedModelRow.displayName}.`;
    }
    if (selectedCategoryOption && selectedCategory !== DEFAULT_CATEGORY_KEY) {
      if (selectedCategoryOption.description) return selectedCategoryOption.description;
      return `Bộ ảnh feedback của danh mục ${selectedCategoryOption.label}.`;
    }
    return "Khám phá ảnh feedback thực tế theo từng dòng máy để chọn thiết bị phù hợp.";
  }, [selectedModelRow, resolveModelMeta, selectedCategoryOption, selectedCategory]);

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
    <div className="min-h-screen font-sans relative text-[#333] overflow-x-hidden bg-[#FEF5ED] pb-32 md:pb-36">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[10%] right-[-10%] w-[460px] h-[460px] bg-[#FFC2DF] rounded-full blur-[120px] opacity-30" />
        <div className="absolute bottom-[5%] left-[-8%] w-[380px] h-[380px] bg-[#FFF2CC] rounded-full blur-[100px] opacity-50" />
      </div>

      <div className="w-full max-w-6xl mx-auto pt-12 px-4">
        <div className="mb-6">
          <Link
            to={backToCatalogHref}
            className="inline-flex items-center gap-2 text-sm font-bold text-[#555] hover:text-[#E85C9C] transition-colors"
          >
            <ArrowRight size={16} className="rotate-180" />
            Quay lại danh mục (giữ bộ lọc)
          </Link>
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/80 backdrop-blur-md p-5 md:p-7 shadow-[0_10px_35px_rgba(20,20,20,0.06)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-[#222] tracking-tight">
                Ảnh Khách Chụp Theo Dòng Máy
              </h1>
              <p className="mt-2 text-sm text-[#666]">
                Chọn category và model để xem mô tả + ảnh feedback tương ứng.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#FFF1F8] px-3 py-1.5 text-xs font-bold text-[#E85C9C] w-fit">
              Tổng {galleryItems.length} ảnh
            </div>
          </div>

          <div className="mt-5 grid gap-2 md:grid-cols-2">
            <div className="relative">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[#9A6C82]">
                Lọc theo category
              </p>
              <Filter
                size={16}
                className="absolute left-3 top-[calc(50%+10px)] -translate-y-1/2 text-[#999]"
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full h-11 rounded-xl border border-[#F2E5EC] bg-white pl-9 pr-3 text-sm font-semibold text-[#333] focus:outline-none focus:border-[#FF9FCA]"
              >
                {categoryOptions.map((category) => (
                  <option key={category.key} value={category.key}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[#9A6C82]">
                Chọn model cụ thể
              </p>
              <Filter
                size={16}
                className="absolute left-3 top-[calc(50%+10px)] -translate-y-1/2 text-[#999]"
              />
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full h-11 rounded-xl border border-[#F2E5EC] bg-white pl-9 pr-3 text-sm font-semibold text-[#333] focus:outline-none focus:border-[#FF9FCA]"
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

        <div className="mt-3 rounded-xl border border-[#FFD7EA] bg-[#FFF4FA] px-4 py-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="text-sm text-[#7A4B64] font-semibold min-w-0">
            {selectedModel && selectedModel !== DEFAULT_MODEL ? (
              <>
                <p>
                  Bạn đang xem ảnh thực tế của{" "}
                  <span className="text-[#E85C9C] font-black">{selectedModel}</span>.
                </p>
                <p className="mt-1 text-xs text-[#8B6078] font-medium whitespace-pre-line break-words">
                  {filterDescription}
                </p>
              </>
            ) : (
              <p className="whitespace-pre-line break-words">{filterDescription}</p>
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
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-2 [column-fill:_balance]">
              {skeletonItems.map((item) => (
                <article
                  key={item.id}
                  className="mb-3 break-inside-avoid overflow-hidden border border-[#F0E2EA] bg-white shadow-[0_6px_14px_rgba(20,20,20,0.05)]"
                >
                  <div
                    className="w-full aspect-square animate-pulse bg-gradient-to-br from-[#FDF2F8] to-[#F5EAF2]"
                  />
                  <div className="px-2.5 py-2.5 space-y-1.5">
                    <div className="h-2.5 w-3/4 rounded bg-[#F2E6ED] animate-pulse" />
                    <div className="h-2.5 w-1/3 rounded bg-[#F2E6ED] animate-pulse" />
                  </div>
                </article>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 text-sm font-semibold">
              {error}
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-2xl border border-[#F0E2EA] bg-white p-8 text-center text-[#777]">
              Chưa có dòng máy khớp bộ lọc. Bạn thử đổi từ khóa hoặc chọn
              "Tất cả" nhé.
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-2 [column-fill:_balance]">
              {galleryItems.map((item) => (
                <article
                  key={item.id}
                  className="mb-3 break-inside-avoid border border-[#EEE1E9] bg-white shadow-[0_8px_16px_rgba(20,20,20,0.06)] group overflow-hidden"
                >
                  <div className="relative w-full overflow-hidden bg-[#F8EDF3]">
                    <img
                      src={item.image}
                      alt={`${item.modelName} thực tế`}
                      loading="lazy"
                      decoding="async"
                      className="block w-full h-auto transition-transform duration-500 group-hover:scale-[1.01]"
                    />
                    <div className="absolute left-2 top-2 rounded-full bg-black/45 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white/95 uppercase">
                      Anh khach chup
                    </div>
                  </div>
                  <div className="px-2.5 py-2.5 bg-gradient-to-r from-[#FFEEF6] to-[#FFF8FC]">
                    <p className="text-[11px] font-black text-[#242424] line-clamp-1 tracking-[0.06em] uppercase">
                      {item.modelName}
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[9px] font-bold text-[#C24082] uppercase border border-[#F1D7E5]">
                        {item.line}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenQuickBook(item)}
                        className="inline-flex text-[10px] font-bold text-[#B93A79] hover:text-[#912A5D]"
                      >
                        Đặt ngay
                      </button>
                    </div>
                  </div>
                </article>
              ))}
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

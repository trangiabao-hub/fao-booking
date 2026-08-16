import { FRAME_SIZE_TEMPLATES, LAYOUT_DEFS } from "./constants";
import { resolveUploadOrigin } from "../../config/apiBase";

export function resolveMediaUrl(path) {
  if (!path) return "";
  if (path.startsWith("blob:") || path.startsWith("data:")) {
    return path;
  }

  if (path.startsWith("http")) {
    try {
      const parsed = new URL(path);
      if (parsed.pathname.startsWith("/uploads/")) {
        // Dev: same-origin qua Vite proxy — canvas export cần path này
        if (import.meta.env.DEV) {
          return parsed.pathname;
        }
        return path;
      }
    } catch {
      return path;
    }
    return path;
  }

  const normalized = path.startsWith("/") ? path : `/${path}`;

  if (normalized.startsWith("/uploads/")) {
    // Dev: Vite proxy /uploads → API server (xem vite.config.js)
    if (import.meta.env.DEV) {
      return normalized;
    }
    return `${resolveUploadOrigin()}${normalized}`;
  }

  if (import.meta.env.DEV) {
    const apiPath = normalized.startsWith("/api/") ? normalized : `/api${normalized}`;
    return apiPath;
  }

  return `${resolveUploadOrigin()}${normalized}`;
}

function parseLayoutEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const slotLayout = entry.slotLayout ?? (entry.slotRects ? { slotRects: entry.slotRects } : null);
  if (!slotLayout) return null;
  return {
    slotLayout,
    frameAspectRatio: entry.frameAspectRatio,
    slotGapMm: entry.slotGapMm,
    slotInsetRatio: entry.slotInsetRatio,
    slotGapRatio: entry.slotGapRatio,
  };
}

export function parseLayoutConfigForSize(layoutConfigJson, sizeType) {
  if (!layoutConfigJson) return null;
  try {
    const parsed =
      typeof layoutConfigJson === "string"
        ? JSON.parse(layoutConfigJson)
        : layoutConfigJson;
    const entry = parsed?.[sizeType];
    return parseLayoutEntry(entry);
  } catch {
    return null;
  }
}

export function mapApiFrames(items = []) {
  const frames = [];

  items.forEach((item) => {
    const themeName = (item?.themeName || "Chủ đề").trim();
    const orderNumber = Number(item?.orderNumber ?? 0);
    const layoutConfig = item?.layoutConfig;

    const pushFrame = (sizeType, src) => {
      if (!src) return;
      const template = FRAME_SIZE_TEMPLATES[sizeType] ?? FRAME_SIZE_TEMPLATES["1x4"];
      const customLayout = parseLayoutConfigForSize(layoutConfig, sizeType);
      const slotCount =
        customLayout?.slotLayout?.slotRects?.length ?? template.slots ?? 4;

      frames.push({
        id: `theme_${item.id}_${sizeType}`,
        apiFrameId: item.id,
        label: `${themeName} · ${sizeType}`,
        src: resolveMediaUrl(src),
        sizeType,
        frameCategoryName: (item?.categoryName || "Chưa phân loại").trim(),
        layoutType: sizeType,
        orderNumber,
        imageCount: slotCount,
        ...template,
        frameLayoutOptions: customLayout ?? {
          slotLayout: template.slotLayout,
          frameAspectRatio: template.frameAspectRatio,
          slotGapRatio: template.slotGapRatio,
          slotInsetRatio: template.slotInsetRatio,
        },
      });
    };

    pushFrame("1x4", item?.frame1x4Url);
    pushFrame("2x2", item?.frame2x2Url);
    pushFrame("1x1", item?.frame1x1Url);
  });

  return frames.sort((a, b) => {
    if ((a.orderNumber ?? 0) !== (b.orderNumber ?? 0)) {
      return (a.orderNumber ?? 0) - (b.orderNumber ?? 0);
    }
    return (a.label || "").localeCompare(b.label || "");
  });
}

export const FRAME_SIZE_ORDER = ["1x4", "2x2", "1x1"];

export const FRAME_SIZE_LABELS = {
  "1x4": "Strip 1×4",
  "2x2": "Khung 2×2",
  "1x1": "Ảnh 1×1",
};

export function groupFramesBySize(frames = []) {
  const groups = new Map();

  frames.forEach((frame) => {
    const size = frame.sizeType || frame.layoutType || "1x4";
    if (!groups.has(size)) groups.set(size, []);
    groups.get(size).push(frame);
  });

  const known = FRAME_SIZE_ORDER.filter((size) => groups.has(size)).map((size) => ({
    size,
    label: FRAME_SIZE_LABELS[size] ?? size,
    frames: groups.get(size),
  }));

  const extra = [...groups.keys()]
    .filter((size) => !FRAME_SIZE_ORDER.includes(size))
    .sort()
    .map((size) => ({
      size,
      label: size,
      frames: groups.get(size),
    }));

  return [...known, ...extra];
}

export function applyFrameToStrip(strip, frame) {
  if (!frame) return strip;
  const slotCount = frame.imageCount ?? frame.slots ?? 4;
  const positions = Array.from({ length: slotCount }, (_, i) =>
    strip.imagePositions?.[i] ?? { x: 50, y: 50, zoom: 1 },
  );
  const images = Array.from({ length: slotCount }, (_, i) => strip.images?.[i] ?? null);

  return {
    ...strip,
    layoutType: frame.layoutType ?? frame.sizeType ?? "1x4",
    imageCount: slotCount,
    images,
    imagePositions: positions,
    frameSource: frame.id,
    frameOverlaySrc: frame.src,
    frameId: frame.apiFrameId ?? null,
    frameLayoutOptions: frame.frameLayoutOptions ?? null,
    footerPatternText: "",
    footerSubText: "",
    dualSame:
      (frame.layoutType ?? frame.sizeType ?? "1x4") === "1x4"
        ? strip.dualSame !== false
        : true,
  };
}

export function applyPlainToStrip(strip, layoutType = "1x4") {
  const type = layoutType || "1x4";
  const slotCount =
    LAYOUT_DEFS[type]?.slots ?? FRAME_SIZE_TEMPLATES[type]?.slots ?? 4;
  const is3x3 = type === "3x3";
  return {
    ...strip,
    layoutType: type,
    imageCount: slotCount,
    images: Array.from({ length: slotCount }, (_, i) => strip.images?.[i] ?? null),
    imagePositions: Array.from(
      { length: slotCount },
      (_, i) => strip.imagePositions?.[i] ?? { x: 50, y: 50, zoom: 1 },
    ),
    frameSource: "plain",
    frameOverlaySrc: null,
    frameId: null,
    frameLayoutOptions: null,
    footerPatternText: "",
    footerSubText: "",
    frameColor: is3x3 ? "#0d0d0d" : strip.frameColor || "#ffffff",
    brandScript: strip.brandScript ?? "Faobooth",
    brandColor: is3x3 ? "#ffffff" : strip.brandColor || "#1a1a1a",
    showBrand: strip.showBrand !== false,
    dualSame: type === "1x4" ? strip.dualSame !== false : true,
  };
}

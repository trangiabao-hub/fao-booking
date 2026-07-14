import {
  LAYOUT_DEFS,
  PHOTO_THEMES,
} from "./constants";
import { resolveMediaUrl } from "./frameUtils";

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function pinchDistance(touches) {
  if (!touches || touches.length < 2) return 0;
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

export function buildSlotRects(slotLayout, slotCount) {
  if (!slotLayout) return [];

  if (Array.isArray(slotLayout.slotRects) && slotLayout.slotRects.length > 0) {
    return slotLayout.slotRects
      .slice(0, slotCount)
      .filter(
        (rect) =>
          Number.isFinite(rect?.leftRatio) &&
          Number.isFinite(rect?.topRatio) &&
          Number.isFinite(rect?.widthRatio) &&
          Number.isFinite(rect?.heightRatio),
      );
  }

  if (
    Number.isFinite(slotLayout.leftRatio) &&
    Number.isFinite(slotLayout.topRatio) &&
    Number.isFinite(slotLayout.widthRatio) &&
    Number.isFinite(slotLayout.heightRatio) &&
    Number.isFinite(slotLayout.gapRatio)
  ) {
    return Array.from({ length: slotCount }, (_, index) => ({
      leftRatio: slotLayout.leftRatio,
      topRatio:
        slotLayout.topRatio + index * (slotLayout.heightRatio + slotLayout.gapRatio),
      widthRatio: slotLayout.widthRatio,
      heightRatio: slotLayout.heightRatio,
    }));
  }

  return [];
}

export function getLayoutDef(layoutType) {
  return LAYOUT_DEFS[layoutType] ?? LAYOUT_DEFS["1x4"];
}

export function getSlotCount(strip) {
  if (strip?.frameSource && strip.frameSource !== "none") {
    return Math.max(1, Number(strip?.imageCount ?? 4));
  }
  return getLayoutDef(strip?.layoutType).slots;
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (/^https?:\/\//.test(src)) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Không tải được ảnh: ${src}`));
    img.src = src;
  });
}

export async function loadImage(src) {
  if (!src) {
    throw new Error("Thiếu đường dẫn ảnh");
  }

  if (src.startsWith("blob:") || src.startsWith("data:")) {
    return loadImageElement(src);
  }

  const url = resolveMediaUrl(src);

  if (url.startsWith("/")) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Không tải được ảnh: ${url}`);
    }
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      return await loadImageElement(objectUrl);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  return loadImageElement(url);
}

export function createEmptyStrip() {
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    images: [],
    fileList: [],
    imagePositions: [],
    imageCount: 4,
    layoutType: "1x4",
    footerPatternText: PHOTO_THEMES.none.footerPatternText ?? "",
    footerSubText: PHOTO_THEMES.none.footerSubText ?? "",
    frameSource: "none",
    frameOverlaySrc: null,
    frameLayoutOptions: null,
    frameId: null,
  };
}

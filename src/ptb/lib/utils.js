import {
  LAYOUT_DEFS,
  PLAIN_BRAND_RATIO,
  PLAIN_FRAME_ASPECT,
  PLAIN_FRAME_DEFAULTS,
  PLAIN_GAP_RATIO,
  PLAIN_PAD_RATIO,
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

export function isPlainFrame(strip) {
  return (
    strip?.frameSource === "plain" ||
    (!strip?.frameOverlaySrc &&
      (strip?.frameSource === "none" || strip?.frameSource == null))
  );
}

export function getPlainAspect(layoutType) {
  return PLAIN_FRAME_ASPECT[layoutType] ?? PLAIN_FRAME_ASPECT["1x4"];
}

export function getPlainFrameMetrics(layoutType, frameWidthPx = 200) {
  const type = layoutType ?? "1x4";
  const frameAspect = getPlainAspect(type);
  const widthPx = Math.max(1, frameWidthPx);
  const heightPx = widthPx * frameAspect;
  const brandPx = Math.max(18, Math.round(heightPx * PLAIN_BRAND_RATIO));
  const padPx = Math.max(6, Math.round(heightPx * PLAIN_PAD_RATIO));
  const padY = padPx + 2;
  const footerPx = brandPx + padY;
  const gapPx = Math.max(4, Math.round(heightPx * PLAIN_GAP_RATIO));
  const is1x1 = type === "1x1";
  const is2x2 = type === "2x2";
  const slotCount = getLayoutDef(type).slots;

  let boxesW;
  let boxesH;
  if (is1x1) {
    boxesW = Math.max(1, widthPx - footerPx - padPx);
    boxesH = Math.max(1, heightPx - padY * 2);
  } else {
    boxesW = Math.max(1, widthPx - padPx * 2);
    boxesH = Math.max(1, heightPx - footerPx - padY);
  }

  const rows = is2x2 ? 2 : slotCount;
  const slotW = is2x2 ? (boxesW - gapPx) / 2 : boxesW;
  const slotH = is2x2
    ? (boxesH - gapPx) / 2
    : (boxesH - gapPx * Math.max(0, rows - 1)) / Math.max(1, rows);

  return {
    frameAspect,
    widthPx,
    heightPx,
    brandPx,
    padPx,
    padY,
    footerPx,
    gapPx,
    boxesW,
    boxesH,
    slotW: Math.max(1, slotW),
    slotH: Math.max(1, slotH),
    slotAspect: Math.max(1, slotW) / Math.max(1, slotH),
    is1x1,
    is2x2,
    slotCount,
  };
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
        slotLayout.topRatio +
        index * (slotLayout.heightRatio + slotLayout.gapRatio),
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
  if (isPlainFrame(strip) && !strip?.frameOverlaySrc) {
    return getLayoutDef(strip?.layoutType).slots;
  }
  if (
    strip?.frameSource &&
    strip.frameSource !== "none" &&
    strip.frameSource !== "plain"
  ) {
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
  const layoutType = "1x4";
  const slots = getLayoutDef(layoutType).slots;
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    images: Array.from({ length: slots }, () => null),
    fileList: [],
    imagePositions: Array.from({ length: slots }, () => ({
      x: 50,
      y: 50,
      zoom: 1,
    })),
    imageCount: slots,
    layoutType,
    footerPatternText: "",
    footerSubText: "",
    dualSame: true,
    ...PLAIN_FRAME_DEFAULTS,
    frameOverlaySrc: null,
    frameLayoutOptions: null,
    frameId: null,
  };
}

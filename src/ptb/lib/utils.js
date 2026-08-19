import {
  DNP_PAGE,
  DNP_STRIP,
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

/**
 * Khổ render export theo layout: 1×4 = strip 2×6"; 2×2 / 1×1 / 3×3 = sheet 4×6".
 * 3×3 dùng pad/gap/footer px tuyệt đối nên sai widthMm là sai luôn tỉ lệ viền.
 */
export function stripWidthMmForLayout(layoutType) {
  const type = String(layoutType || "1x4")
    .toLowerCase()
    .replace(/×/g, "x");
  return type === "1x4" ? DNP_STRIP.wMm : DNP_PAGE.wMm;
}

export function getPlainFrameMetrics(layoutType, frameWidthPx = 200, opts = {}) {
  const type = layoutType ?? "1x4";
  const showBrand = opts.showBrand !== false;
  const frameAspect = getPlainAspect(type);
  const widthPx = Math.max(1, frameWidthPx);
  const heightPx = widthPx * frameAspect;
  const brandPx = Math.max(18, Math.round(heightPx * PLAIN_BRAND_RATIO));
  const is1x1 = type === "1x1";
  const is2x2 = type === "2x2";
  const is3x3 = type === "3x3";
  // 3×3: gap 4px, viền ngoài 16px; có chữ → footer 46px (chữ giữa).
  // Ẩn chữ: viền dưới = viền ngoài (đều 4 cạnh).
  const padPx = is3x3
    ? 16
    : Math.max(6, Math.round(heightPx * PLAIN_PAD_RATIO));
  const padY = is3x3 ? 16 : padPx + 2;
  const footerPx = showBrand
    ? is3x3
      ? 46
      : brandPx + padY
    : 0;
  const padBottom = showBrand ? 0 : is3x3 ? padPx : padY;
  const gapPx = is3x3
    ? 4
    : Math.max(4, Math.round(heightPx * PLAIN_GAP_RATIO));
  const slotCount = getLayoutDef(type).slots;

  let boxesW;
  let boxesH;
  if (is1x1) {
    boxesW = Math.max(1, widthPx - footerPx - padPx);
    boxesH = Math.max(1, heightPx - padY * 2);
  } else if (is3x3) {
    boxesW = Math.max(1, widthPx - padPx * 2);
    boxesH = Math.max(1, heightPx - footerPx - padY - padBottom);
  } else {
    boxesW = Math.max(1, widthPx - padPx * 2);
    boxesH = Math.max(1, heightPx - footerPx - padY - padBottom);
  }

  const cols = is3x3 ? 3 : is2x2 ? 2 : 1;
  const rows = is3x3 ? 3 : is2x2 ? 2 : slotCount;
  const isGrid = is2x2 || is3x3;
  const slotW = isGrid
    ? (boxesW - gapPx * (cols - 1)) / cols
    : boxesW;
  const slotH = isGrid
    ? (boxesH - gapPx * (rows - 1)) / rows
    : (boxesH - gapPx * Math.max(0, rows - 1)) / Math.max(1, rows);

  return {
    frameAspect,
    widthPx,
    heightPx,
    brandPx,
    padPx,
    padY,
    padBottom,
    footerPx,
    gapPx,
    boxesW,
    boxesH,
    slotW: Math.max(1, slotW),
    slotH: Math.max(1, slotH),
    slotAspect: Math.max(1, slotW) / Math.max(1, slotH),
    is1x1,
    is2x2,
    is3x3,
    cols,
    rows,
    slotCount,
    showBrand,
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

/** Aspect CSS (width/height) của 1 ô — khớp lỗ cắt thật (crop modal). */
export function getSlotCssAspect(strip, slotIndex = 0, frameWidthPx = 200) {
  if (isPlainFrame(strip) && !strip?.frameOverlaySrc) {
    const metrics = getPlainFrameMetrics(strip?.layoutType, frameWidthPx, {
      showBrand: strip?.showBrand !== false,
    });
    if (metrics.is1x1) {
      return metrics.slotH / metrics.slotW;
    }
    return metrics.slotAspect;
  }
  const frameOptions = strip?.frameLayoutOptions;
  const slotRects = buildSlotRects(
    frameOptions?.slotLayout,
    getSlotCount(strip),
  );
  if (slotRects.length > 0) {
    const rect = slotRects[Math.min(slotIndex, slotRects.length - 1)];
    const frameAspect = frameOptions?.frameAspectRatio ?? 1;
    const ratio = rect.widthRatio / (rect.heightRatio * frameAspect);
    return Number.isFinite(ratio) && ratio > 0 ? ratio : 4 / 3;
  }
  const layout = getLayoutDef(strip?.layoutType);
  const slotAspect = layout.slotAspect ?? { w: 4, h: 3 };
  return (slotAspect.w || 4) / (slotAspect.h || 3);
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

import { FRAME_SIZE_TEMPLATES, LAYOUT_DEFS, PHOTO_THEMES } from "./constants";

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
          Number.isFinite(rect?.heightRatio)
      );
  }
  return [];
}

/** Mở rộng slot rect để ảnh tràn vào khe giữa các ô — che viền trắng khung PNG */
export function expandSlotRectWithBleed(rect, prevRect, nextRect) {
  if (!rect) return null;
  let { leftRatio, topRatio, widthRatio, heightRatio } = rect;
  const originalBottom = rect.topRatio + rect.heightRatio;

  if (prevRect) {
    const gapAbove = rect.topRatio - (prevRect.topRatio + prevRect.heightRatio);
    if (gapAbove > 0) {
      const bleed = gapAbove * 0.65;
      topRatio -= bleed;
      heightRatio += bleed;
    }
  }

  if (nextRect) {
    const gapBelow = nextRect.topRatio - originalBottom;
    if (gapBelow > 0) {
      heightRatio += gapBelow * 0.65;
    }
  }

  const widthBleed = widthRatio * 0.02;
  leftRatio = Math.max(0, leftRatio - widthBleed / 2);
  widthRatio = Math.min(1 - leftRatio, widthRatio + widthBleed);

  return { leftRatio, topRatio, widthRatio, heightRatio };
}

export function slotRectToPercentStyle(rect) {
  if (!rect) return {};
  return {
    left: `${rect.leftRatio * 100}%`,
    top: `${rect.topRatio * 100}%`,
    width: `${rect.widthRatio * 100}%`,
    height: `${rect.heightRatio * 100}%`,
  };
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

function loadImageElement(src, crossOrigin = false) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Image load failed: ${src}`));
    img.src = src;
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result ?? null);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function imageElementToDataUrl(img) {
  const w = Math.max(1, img.naturalWidth || img.width || 1);
  const h = Math.max(1, img.naturalHeight || img.height || 1);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas not supported");
  ctx.drawImage(img, 0, 0, w, h);
  try {
    const dataUrl = canvas.toDataURL("image/png");
    if (!dataUrl || dataUrl === "data:,") throw new Error("empty canvas");
    return dataUrl;
  } catch {
    throw new Error("Canvas tainted");
  }
}

export function resolveUploadUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  const base = import.meta.env.VITE_API_URL || "";
  const origin = base.replace(/\/api\/?$/, "");
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getApiOrigin() {
  return (import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "");
}

/** Lấy path /uploads/... bất kể http/https hay host API. */
export function extractUploadsPath(src) {
  if (!src || src.startsWith("data:") || src.startsWith("blob:")) return null;
  if (src.startsWith("/uploads/")) return src;

  try {
    const url = new URL(src, window.location.origin);
    if (url.pathname.startsWith("/uploads/")) {
      return `${url.pathname}${url.search}`;
    }
  } catch {
    /* ignore */
  }

  const match = String(src).match(/\/uploads\/(.+)$/);
  return match ? `/uploads/${match[1]}` : null;
}

/** Rewrite URL uploads API → same-origin (/uploads) qua Vite/Vercel proxy, tránh CORS taint canvas. */
export function toSameOriginUploadsUrl(src) {
  if (!src || src.startsWith("data:") || src.startsWith("blob:")) return src;
  return extractUploadsPath(src) ?? src;
}

/** Chuẩn hoá URL frame (relative → absolute) trước khi fetch/load. */
export function resolveFrameSrc(src) {
  if (!src) return null;
  if (/^(data:|blob:|https?:\/\/)/.test(src)) return src;
  return resolveUploadUrl(src);
}

/** Tải ảnh thành data URL — bắt buộc trước khi vẽ canvas export. */
export async function resolveCanvasImageSrc(src) {
  if (!src) return null;
  if (src.startsWith("data:")) return src;

  if (src.startsWith("blob:")) {
    const res = await fetch(src);
    const dataUrl = await blobToDataUrl(await res.blob());
    if (!dataUrl?.startsWith("data:")) throw new Error("Không đọc được blob ảnh");
    return dataUrl;
  }

  const resolved = toSameOriginUploadsUrl(resolveFrameSrc(src) ?? src);

  const fetchCandidates = [resolved];
  if (resolved.startsWith("/uploads/")) {
    const apiOrigin = getApiOrigin();
    if (apiOrigin) fetchCandidates.push(`${apiOrigin}${resolved}`);
  }

  for (const url of fetchCandidates) {
    try {
      const res = await fetch(url, { cache: "force-cache" });
      if (res.ok && res.type !== "opaque") {
        const dataUrl = await blobToDataUrl(await res.blob());
        if (dataUrl?.startsWith("data:")) return dataUrl;
      }
    } catch {
      /* thử URL tiếp theo */
    }
  }

  try {
    const img = await loadImageElement(resolved, true);
    return await imageElementToDataUrl(img);
  } catch {
    /* thử same-origin */
  }

  const sameOrigin =
    resolved.startsWith("/") ||
    resolved.startsWith(window.location.origin) ||
    resolved.startsWith(window.location.protocol + "//" + window.location.host);

  if (sameOrigin) {
    try {
      const img = await loadImageElement(resolved, false);
      return await imageElementToDataUrl(img);
    } catch {
      /* fall through */
    }
  }

  throw new Error(
    "Không xuất được ảnh do giới hạn CORS. Thử chọn khung lại hoặc tải ảnh từ thiết bị."
  );
}

export async function preloadFrameOverlaySrc(src) {
  return resolveCanvasImageSrc(src);
}

export async function loadImage(src) {
  const safeSrc = await resolveCanvasImageSrc(src);
  return loadImageElement(safeSrc, false);
}

export function mapApiFrames(items = []) {
  const frames = [];
  items.forEach((item) => {
    const themeName = (item?.themeName || "Chủ đề").trim();
    const orderNumber = Number(item?.orderNumber ?? 0);
    const pushFrame = (sizeType, src) => {
      if (!src) return;
      frames.push({
        id: `theme_${item.id}_${sizeType}`,
        themeId: item.id,
        label: `${themeName} · ${sizeType}`,
        src: toSameOriginUploadsUrl(src),
        sizeType,
        frameCategoryName: (item?.categoryName || "Khác").trim(),
        layoutType: sizeType,
        orderNumber,
        ...FRAME_SIZE_TEMPLATES[sizeType],
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

export function createEmptyStrip() {
  return {
    id: Date.now() + Math.random(),
    images: [],
    imagePositions: [],
    imageCount: 4,
    layoutType: "1x4",
    frameSource: "none",
    frameOverlaySrc: null,
    frameOverlayExportSrc: null,
    frameLayoutOptions: null,
  };
}

export function buildRoomShareUrl(shareToken) {
  return `${window.location.origin}/photobooth/room/${shareToken}`;
}

export function parseFrameIdForUpload(frameId) {
  if (!frameId) return null;
  if (typeof frameId === "number") return String(frameId);
  const s = String(frameId);
  if (s.startsWith("theme_")) {
    const us = s.indexOf("_", 6);
    if (us > 6) return s.substring(6, us);
  }
  return s;
}

export function filledSlotCount(strip) {
  const n = getSlotCount(strip);
  return (strip.images ?? []).slice(0, n).filter(Boolean).length;
}

/** Thứ tự hiển thị gallery — gom cùng layout để hàng grid đều nhau */
export const GALLERY_LAYOUT_ORDER = ["1x4", "2x2", "1x1"];

export function sortGalleryImagesByLayout(images = []) {
  const rank = new Map(GALLERY_LAYOUT_ORDER.map((id, i) => [id, i]));
  return [...images].sort((a, b) => {
    const ra = rank.get(a?.layoutType ?? "1x4") ?? rank.size;
    const rb = rank.get(b?.layoutType ?? "1x4") ?? rank.size;
    if (ra !== rb) return ra - rb;
    const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
    return ta - tb;
  });
}

/** CSS aspect-ratio (width/height) từ template frame */
export function getGalleryLayoutAspectRatio(layoutType) {
  const template = FRAME_SIZE_TEMPLATES[layoutType ?? "1x4"];
  if (!template?.frameAspectRatio) return null;
  return 1 / template.frameAspectRatio;
}

export function getGalleryColumnCount(breakpoint) {
  if (breakpoint === "desktop") return 4;
  if (breakpoint === "tablet") return 3;
  return 2;
}

const GALLERY_ROW_UNIT_PX = 4;

/** Số hàng grid (dense masonry) để khớp chiều cao theo aspect */
export function getGalleryGridRowSpan(aspectRatio, columnWidth, gapPx = 8) {
  const aspect = aspectRatio ?? 0.75;
  if (!columnWidth || columnWidth <= 0) {
    return Math.max(1, Math.round(24 / aspect));
  }
  const height = columnWidth / aspect;
  return Math.max(1, Math.ceil((height + gapPx) / (GALLERY_ROW_UNIT_PX + gapPx)));
}

export { GALLERY_ROW_UNIT_PX };

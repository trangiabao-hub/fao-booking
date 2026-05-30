import { getApiOrigin, resolveFrameSrc, toSameOriginUploadsUrl } from "./utils";

export const FRAME_SLOT_BG = "#FFF8FB";

/** Một tầng preview nhanh — editor */
export const FRAME_QUICK_EDITOR_W = 180;
/** Một tầng preview nhanh — thumbnail gallery */
export const FRAME_QUICK_THUMB_W = 80;

const blobCache = new Map();
const quickPreviewCache = new Map();
const quickSyncCache = new Map();
const fullPreloadCache = new Map();
let warmListGeneration = 0;

function resolveSrc(src) {
  if (!src || src.startsWith("data:") || src.startsWith("blob:")) return src ?? null;
  return toSameOriginUploadsUrl(resolveFrameSrc(src) ?? src);
}

function quickSyncKey(resolved, maxWidth) {
  return `${resolved}|${maxWidth}`;
}

function getSharedBlob(resolved) {
  if (!resolved) return Promise.resolve(null);
  if (blobCache.has(resolved)) return blobCache.get(resolved);

  const promise = (async () => {
    const candidates = [resolved];
    if (resolved.startsWith("/uploads/")) {
      const apiOrigin = getApiOrigin();
      if (apiOrigin) candidates.push(`${apiOrigin}${resolved}`);
    }
    for (const url of candidates) {
      try {
        const res = await fetch(url, { cache: "force-cache" });
        if (res.ok) return await res.blob();
      } catch {
        /* thử URL tiếp */
      }
    }
    return null;
  })();

  blobCache.set(resolved, promise);
  return promise;
}

async function blobToQuickJpeg(blob, maxWidth, quality = 0.62) {
  if (!blob) return null;

  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(blob, {
        resizeWidth: maxWidth,
        resizeQuality: "low",
      });
      const h = Math.max(
        1,
        Math.round(bitmap.height * (maxWidth / Math.max(1, bitmap.width)))
      );
      const canvas = document.createElement("canvas");
      canvas.width = maxWidth;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = FRAME_SLOT_BG;
        ctx.fillRect(0, 0, maxWidth, h);
        ctx.drawImage(bitmap, 0, 0, maxWidth, h);
      }
      bitmap.close?.();
      const previewBlob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality)
      );
      if (previewBlob) return URL.createObjectURL(previewBlob);
    } catch {
      /* fallback */
    }
  }

  return null;
}

/** Đọc preview mờ từ cache (sync) — paint ngay frame đầu */
export function peekFrameQuickPreview(src, maxWidth = FRAME_QUICK_EDITOR_W) {
  const resolved = resolveSrc(src);
  if (!resolved) return null;
  if (resolved.startsWith("data:") || resolved.startsWith("blob:")) return resolved;
  return quickSyncCache.get(quickSyncKey(resolved, maxWidth)) ?? null;
}

/** JPEG nhỏ 1 lần — hiện mờ trước, song song với PNG full */
export function loadFrameQuickPreview(src, maxWidth = FRAME_QUICK_EDITOR_W) {
  const resolved = resolveSrc(src);
  if (!resolved) return Promise.resolve(null);
  if (resolved.startsWith("data:") || resolved.startsWith("blob:")) {
    return Promise.resolve(resolved);
  }

  const cacheKey = `${resolved}|quick|${maxWidth}|v5`;
  if (quickPreviewCache.has(cacheKey)) return quickPreviewCache.get(cacheKey);

  const quality = maxWidth <= FRAME_QUICK_THUMB_W ? 0.52 : 0.64;

  const promise = (async () => {
    const blob = await getSharedBlob(resolved);
    const url =
      (await blobToQuickJpeg(blob, maxWidth, quality)) ?? null;
    if (url?.startsWith("blob:")) {
      quickSyncCache.set(quickSyncKey(resolved, maxWidth), url);
    }
    return url;
  })();

  quickPreviewCache.set(cacheKey, promise);
  return promise;
}

export function preloadFrameFullSrc(src) {
  const resolved = resolveSrc(src);
  if (!resolved || resolved.startsWith("data:") || resolved.startsWith("blob:")) {
    return Promise.resolve(null);
  }
  if (fullPreloadCache.has(resolved)) return fullPreloadCache.get(resolved);

  const promise = new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = resolved;
  });
  fullPreloadCache.set(resolved, promise);
  return promise;
}

export function warmAllFrameSrcList(frames, concurrency = 8) {
  const gen = ++warmListGeneration;
  const urls = (Array.isArray(frames) ? frames : [])
    .map((f) => resolveSrc(f?.src))
    .filter((url) => url && !url.startsWith("data:") && !url.startsWith("blob:"));

  let index = 0;
  const pump = () => {
    if (gen !== warmListGeneration) return;
    const batch = urls.slice(index, index + concurrency);
    index += concurrency;
    batch.forEach((url) => {
      loadFrameQuickPreview(url, FRAME_QUICK_THUMB_W);
      preloadFrameFullSrc(url);
    });
    if (index < urls.length) setTimeout(pump, 12);
  };
  pump();
}

export function warmAllFramePreviews(frames) {
  warmAllFrameSrcList(frames);
}

export function warmFrameForEditor(src) {
  loadFrameQuickPreview(src, FRAME_QUICK_EDITOR_W);
  preloadFrameFullSrc(src);
}

export function warmFrameThumb(src) {
  loadFrameQuickPreview(src, FRAME_QUICK_THUMB_W);
}

export function warmFrameThumbsIdle(frames) {
  warmAllFrameSrcList(frames);
}

export function warmFramePreviews(src) {
  warmFrameForEditor(src);
}

/** @deprecated */
export function loadFramePreview(src, maxWidth = FRAME_QUICK_EDITOR_W) {
  return loadFrameQuickPreview(src, maxWidth);
}

export function loadFramePreviewSrc(src, maxWidth) {
  return loadFrameQuickPreview(src, maxWidth);
}

export function loadFramePreviewInstant(src, maxWidth = FRAME_QUICK_THUMB_W) {
  return loadFrameQuickPreview(src, maxWidth);
}

export function peekFramePreview(src, maxWidth) {
  return peekFrameQuickPreview(src, maxWidth);
}

export function peekInstantPreview(src) {
  return peekFrameQuickPreview(src, FRAME_QUICK_THUMB_W);
}

export function getFrameOverlayForExport(strip) {
  return strip?.frameOverlayExportSrc || strip?.frameOverlaySrc || null;
}

import {
  DEFAULT_SLOT_GAP_MM,
  PHOTO_THEMES,
  mF,
  mmToPx,
  pF,
  _Et,
} from "./constants";
import { buildSlotRects, clamp, getLayoutDef, getSlotCount, loadImage, expandSlotRectWithBleed } from "./utils";
import { FRAME_SLOT_BG } from "./frameImageLoader";

export function drawCover(ctx, img, x, y, w, h, position, zoom = 1) {
  const naturalW = img.naturalWidth || img.width;
  const naturalH = img.naturalHeight || img.height;
  const scale = Math.max(w / naturalW, h / naturalH) * (zoom ?? 1) * 1.006;
  const drawW = naturalW * scale;
  const drawH = naturalH * scale;
  const anchorX = (position?.x ?? 50) / 100;
  const anchorY = (position?.y ?? 50) / 100;
  let drawX = x + w / 2 - anchorX * drawW;
  let drawY = y + h / 2 - anchorY * drawH;
  drawX = clamp(drawX, x + w - drawW, x);
  drawY = clamp(drawY, y + h - drawH, y);
  ctx.drawImage(img, drawX, drawY, drawW, drawH);
}

export async function renderStripCanvas(strip, widthMm, theme, frameOverlaySrc, layoutOptions = {}) {
  const layout = getLayoutDef(strip.layoutType);
  const slotCount =
    strip.frameSource && strip.frameSource !== "none"
      ? getSlotCount(strip)
      : layout.slots;
  const activeTheme = theme ?? PHOTO_THEMES.none;
  const slotLayout = layoutOptions.slotLayout;
  const slotRects = buildSlotRects(slotLayout, slotCount);
  const hasCustomLayout = slotRects.length > 0;
  const frameAspectRatio = Number.isFinite(layoutOptions.frameAspectRatio)
    ? layoutOptions.frameAspectRatio
    : null;
  const slotGapMm = Number.isFinite(layoutOptions.slotGapMm)
    ? layoutOptions.slotGapMm
    : DEFAULT_SLOT_GAP_MM;
  const cols = Math.max(1, layout.cols ?? 1);
  const rows = Math.max(1, layout.rows ?? slotCount);
  const slotAspect = layout.slotAspect ?? { w: 4, h: 3 };
  const outerInsetMm =
    !hasCustomLayout && Number.isFinite(activeTheme.outerInsetMm)
      ? Math.max(0, activeTheme.outerInsetMm)
      : 0;
  const bottomInsetMm =
    !hasCustomLayout && Number.isFinite(activeTheme.bottomInsetMm)
      ? Math.max(0, activeTheme.bottomInsetMm)
      : 0;
  const hasFrameOverlay = Boolean(frameOverlaySrc);
  const skipThemeChrome = hasCustomLayout && hasFrameOverlay;
  const headerMm = skipThemeChrome ? 0 : (activeTheme.headerMm ?? 0);
  const footerMm = skipThemeChrome ? 0 : (activeTheme.footerMm ?? 0);
  const slotWidthMm =
    (Math.max(1, widthMm - outerInsetMm * 2 - (cols - 1) * slotGapMm) / cols) *
    (slotAspect.h / slotAspect.w);
  const heightMm =
    (hasCustomLayout && frameAspectRatio
      ? widthMm * frameAspectRatio
      : rows * slotWidthMm + (rows - 1) * slotGapMm + outerInsetMm * 2 + bottomInsetMm) +
    headerMm +
    footerMm;

  const canvasW = mmToPx(widthMm);
  const canvasH = mmToPx(heightMm);
  const gapPx = mmToPx(slotGapMm);
  const headerPx = mmToPx(headerMm);
  const footerPx = mmToPx(footerMm);
  const outerInsetPx = mmToPx(outerInsetMm);
  const photoInsetPx = hasCustomLayout ? 0 : mmToPx(activeTheme.photoInsetMm ?? 0);
  const slotInsetPx = Math.round(canvasW * Math.max(0, layoutOptions.slotInsetRatio ?? 0));
  const insetPx = Math.max(photoInsetPx, slotInsetPx);
  const borderPx = Math.max(0, mmToPx(activeTheme.photoBorderMm ?? 0));
  const footerPatternText = skipThemeChrome
    ? ""
    : (strip.footerPatternText ?? "").trim() || (activeTheme.footerPatternText ?? "");
  const footerSubText = skipThemeChrome
    ? ""
    : (strip.footerSubText ?? "").trim() || (activeTheme.footerSubText ?? "");
  const cellWidthPx = Math.max(
    1,
    Math.round((canvasW - outerInsetPx * 2 - (cols - 1) * gapPx) / cols)
  );
  const cellHeightPx = Math.round(cellWidthPx * (slotAspect.h / slotAspect.w));

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas not supported");

  ctx.fillStyle =
    hasCustomLayout && hasFrameOverlay ? FRAME_SLOT_BG : (activeTheme.bg ?? "#ffffff");
  ctx.fillRect(0, 0, canvasW, canvasH);

  if (headerPx > 0 && activeTheme.headerBarColor) {
    ctx.fillStyle = activeTheme.headerBarColor;
    ctx.fillRect(0, 0, canvasW, headerPx);
  }

  try {
    if (document?.fonts?.ready) await document.fonts.ready;
  } catch {
    /* ignore */
  }

  for (let slotIndex = 0; slotIndex < slotCount; slotIndex++) {
    const rect = hasCustomLayout
      ? slotRects[Math.min(slotIndex, slotRects.length - 1)]
      : null;
    const expandedRect = hasCustomLayout
      ? expandSlotRectWithBleed(
          rect,
          slotIndex > 0 ? slotRects[slotIndex - 1] : null,
          slotIndex < slotCount - 1 ? slotRects[slotIndex + 1] : null
        )
      : null;
    const row = Math.floor(slotIndex / cols);
    const col = slotIndex % cols;
    const slotX = expandedRect
      ? Math.floor(canvasW * expandedRect.leftRatio)
      : outerInsetPx + col * (cellWidthPx + gapPx);
    const slotW = expandedRect
      ? Math.ceil(canvasW * expandedRect.widthRatio)
      : cellWidthPx;
    const slotH = expandedRect
      ? Math.ceil(canvasH * expandedRect.heightRatio)
      : cellHeightPx;
    const slotY = expandedRect
      ? Math.floor(canvasH * expandedRect.topRatio)
      : headerPx + outerInsetPx + row * (cellHeightPx + gapPx);
    const imageSrc = strip.images[slotIndex];

    if (imageSrc) {
      const img = await loadImage(imageSrc);
      ctx.save();
      ctx.beginPath();
      ctx.rect(slotX, slotY, slotW, slotH);
      ctx.clip();
      const position = strip.imagePositions?.[slotIndex] ?? { x: 50, y: 50, zoom: 1 };
      drawCover(
        ctx,
        img,
        slotX + insetPx,
        slotY + insetPx,
        slotW - insetPx * 2,
        slotH - insetPx * 2,
        position,
        position.zoom ?? 1
      );
      ctx.restore();
      if (borderPx > 0 && !activeTheme.photoBorderPreviewOnly) {
        ctx.strokeStyle = activeTheme.photoBorderColor ?? mF;
        ctx.lineWidth = borderPx;
        ctx.strokeRect(
          slotX + insetPx + borderPx / 2,
          slotY + insetPx + borderPx / 2,
          slotW - insetPx * 2 - borderPx,
          slotH - insetPx * 2 - borderPx
        );
      }
    } else {
      ctx.fillStyle = "#f5f5f5";
      ctx.fillRect(slotX, slotY, slotW, slotH);
    }
  }

  if (footerPx > 0) {
    ctx.save();
    ctx.fillStyle = activeTheme.footerBarColor ?? _Et;
    ctx.fillRect(0, canvasH - footerPx, canvasW, footerPx);
    if (footerPatternText) {
      ctx.fillStyle = activeTheme.footerPatternColor ?? "#d86ca7";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.font = `${Math.max(mmToPx(5.2), Math.round(footerPx * 0.62))}px "Great Vibes", cursive`;
      ctx.fillText(footerPatternText, canvasW / 2, canvasH - footerPx * 0.64);
    }
    if (footerSubText) {
      ctx.fillStyle = activeTheme.footerSubColor ?? pF;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.font = `${Math.max(mmToPx(3), Math.round(footerPx * 0.36))}px system-ui, sans-serif`;
      ctx.fillText(footerSubText, canvasW / 2, canvasH - footerPx * 0.18);
    }
    ctx.restore();
  }

  if (frameOverlaySrc) {
    const overlay = await loadImage(frameOverlaySrc);
    ctx.drawImage(overlay, 0, 0, canvasW, canvasH);
  }

  return { canvas, hMm: heightMm };
}

export async function canvasToBlob(canvas, type = "image/jpeg", quality = 0.92) {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Xuất ảnh thất bại — canvas không đọc được (CORS)"));
        },
        type,
        quality
      );
    } catch (err) {
      reject(err);
    }
  });
}

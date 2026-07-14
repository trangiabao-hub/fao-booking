import {
  DEFAULT_SLOT_GAP_MM,
  PHOTO_THEMES,
  mF,
  mmToPx,
  pF,
  _Et,
} from "./constants";
import {
  buildSlotRects,
  clamp,
  getLayoutDef,
  getSlotCount,
  loadImage,
} from "./utils";

export function drawCover(ctx, img, x, y, w, h, position, zoom = 1) {
  const naturalW = img.naturalWidth || img.width;
  const naturalH = img.naturalHeight || img.height;
  const scale = Math.max(w / naturalW, h / naturalH) * (zoom ?? 1);
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

export async function renderStripCanvas(
  strip,
  widthMm,
  theme,
  frameOverlaySrc,
  layoutOptions = {},
) {
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
  const slotWidthMm =
    (Math.max(1, widthMm - outerInsetMm * 2 - (cols - 1) * slotGapMm) / cols) *
    (slotAspect.h / slotAspect.w);
  const heightMm =
    (hasCustomLayout && frameAspectRatio
      ? widthMm * frameAspectRatio
      : rows * slotWidthMm + (rows - 1) * slotGapMm + outerInsetMm * 2 + bottomInsetMm) +
    (activeTheme.headerMm ?? 0) +
    (activeTheme.footerMm ?? 0);

  const canvasW = mmToPx(widthMm);
  const canvasH = mmToPx(heightMm);
  const gapPx = mmToPx(slotGapMm);
  const headerPx = mmToPx(activeTheme.headerMm ?? 0);
  const footerPx = mmToPx(activeTheme.footerMm ?? 0);
  const outerInsetPx = mmToPx(outerInsetMm);
  const photoInsetPx = hasCustomLayout ? 0 : mmToPx(activeTheme.photoInsetMm ?? 0);
  const slotInsetPx = Math.round(canvasW * Math.max(0, layoutOptions.slotInsetRatio ?? 0));
  const insetPx = Math.max(photoInsetPx, slotInsetPx);
  const borderPx = Math.max(0, mmToPx(activeTheme.photoBorderMm ?? 0));
  const footerPatternText =
    (strip.footerPatternText ?? "").trim() ||
    (activeTheme.footerPatternText ?? "");
  const footerSubText =
    (strip.footerSubText ?? "").trim() || (activeTheme.footerSubText ?? "");
  const cellWidthPx = Math.max(
    1,
    Math.round((canvasW - outerInsetPx * 2 - (cols - 1) * gapPx) / cols),
  );
  const cellHeightPx = Math.round(cellWidthPx * (slotAspect.h / slotAspect.w));

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas not supported");

  ctx.fillStyle = activeTheme.bg ?? "#ffffff";
  ctx.fillRect(0, 0, canvasW, canvasH);

  if (headerPx > 0) {
    ctx.fillStyle = activeTheme.headerBarColor ?? "#b3261e";
    ctx.fillRect(0, 0, canvasW, headerPx);
    if (activeTheme.headerText) {
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `${mmToPx(5)}px system-ui, -apple-system, Segoe UI, Arial`;
      ctx.fillText(activeTheme.headerText, canvasW / 2, headerPx / 2);
    }
  }

  try {
    if (document?.fonts?.ready) {
      await document.fonts.ready;
    }
  } catch {
    /* ignore */
  }

  for (let slotIndex = 0; slotIndex < slotCount; slotIndex++) {
    const rect = hasCustomLayout
      ? slotRects[Math.min(slotIndex, slotRects.length - 1)]
      : null;
    const row = Math.floor(slotIndex / cols);
    const col = slotIndex % cols;
    const slotX = rect
      ? Math.round(canvasW * rect.leftRatio)
      : outerInsetPx + col * (cellWidthPx + gapPx);
    const slotW = rect ? Math.round(canvasW * rect.widthRatio) : cellWidthPx;
    const slotH = rect ? Math.round(canvasH * rect.heightRatio) : cellHeightPx;
    const slotY = rect
      ? Math.round(canvasH * rect.topRatio)
      : headerPx + outerInsetPx + row * (cellHeightPx + gapPx);
    const imageSrc = strip.images[slotIndex];

    if (imageSrc) {
      const img = await loadImage(imageSrc);
      ctx.save();
      ctx.beginPath();
      ctx.rect(slotX, slotY, slotW, slotH);
      ctx.clip();

      const position = strip.imagePositions?.[slotIndex] ?? {
        x: 50,
        y: 50,
        zoom: 1,
      };
      const customLayoutInset = hasCustomLayout ? 1 : 0;
      const photoX = slotX + insetPx - customLayoutInset;
      const photoY = slotY + insetPx - customLayoutInset;
      const photoW = slotW - insetPx * 2 + customLayoutInset * 2;
      const photoH = slotH - insetPx * 2 + customLayoutInset * 2;

      drawCover(
        ctx,
        img,
        photoX,
        photoY,
        photoW,
        photoH,
        position,
        position.zoom ?? 1,
      );
      ctx.restore();

      if (borderPx > 0 && !activeTheme.photoBorderPreviewOnly) {
        ctx.save();
        ctx.strokeStyle = activeTheme.photoBorderColor ?? mF;
        ctx.lineWidth = borderPx;
        ctx.strokeRect(
          slotX + insetPx + borderPx / 2,
          slotY + insetPx + borderPx / 2,
          slotW - insetPx * 2 - borderPx,
          slotH - insetPx * 2 - borderPx,
        );
        ctx.restore();
      }
    } else {
      ctx.fillStyle = "#ffffff";
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
      ctx.font = `${Math.max(mmToPx(5.2), Math.round(footerPx * 0.62))}px cursive, system-ui`;
      ctx.fillText(footerPatternText, canvasW / 2, canvasH - footerPx * 0.64);
    }

    if (footerSubText) {
      ctx.fillStyle = activeTheme.footerSubColor ?? pF;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.font = `${Math.max(mmToPx(3), Math.round(footerPx * 0.36))}px system-ui`;
      ctx.fillText(footerSubText, canvasW / 2, canvasH - footerPx * 0.18);
    }

    ctx.restore();
  }

  if (frameOverlaySrc) {
    try {
      const overlay = await loadImage(frameOverlaySrc);
      ctx.drawImage(overlay, 0, 0, canvasW, canvasH);
    } catch (err) {
      console.warn("[ptb] Không ghép được khung PNG:", err);
      throw err;
    }
  }

  return { canvas, hMm: heightMm };
}

/**
 * Export strip for album upload. JPEG keeps print quality while staying much
 * smaller than PNG — avoids axios/network timeouts on mobile.
 */
export async function canvasToBlob(canvas, { type = "image/jpeg", quality = 0.88 } = {}) {
  const blob = await new Promise((resolve) =>
    canvas.toBlob((result) => resolve(result), type, quality),
  );
  if (!blob) throw new Error("toBlob failed");
  return blob;
}

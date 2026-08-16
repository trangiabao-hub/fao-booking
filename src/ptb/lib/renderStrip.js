import {
  DEFAULT_SLOT_GAP_MM,
  PHOTO_THEMES,
  PLAIN_FRAME_DEFAULTS,
  mF,
  mmToPx,
  pF,
  _Et,
} from "./constants";
import {
  buildSlotRects,
  clamp,
  getLayoutDef,
  getPlainFrameMetrics,
  getSlotCount,
  isPlainFrame,
  loadImage,
} from "./utils";

export function drawCover(ctx, img, x, y, w, h, position, zoom = 1, rotateDeg = 0) {
  const naturalW = img.naturalWidth || img.width;
  const naturalH = img.naturalHeight || img.height;
  if (!(naturalW > 0 && naturalH > 0 && w > 0 && h > 0)) return;

  const anchorX = (position?.x ?? 50) / 100;
  const anchorY = (position?.y ?? 50) / 100;
  const z = zoom ?? 1;

  if (rotateDeg) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const rw = Math.abs(rotateDeg) % 180 === 90 ? h : w;
    const rh = Math.abs(rotateDeg) % 180 === 90 ? w : h;
    const scale = Math.max(rw / naturalW, rh / naturalH) * z;
    const drawW = naturalW * scale;
    const drawH = naturalH * scale;
    let drawX = -anchorX * drawW;
    let drawY = -anchorY * drawH;
    drawX = clamp(drawX, rw / 2 - drawW, -rw / 2);
    drawY = clamp(drawY, rh / 2 - drawH, -rh / 2);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rotateDeg * Math.PI) / 180);
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();
    return;
  }

  const scale = Math.max(w / naturalW, h / naturalH) * z;
  const drawW = naturalW * scale;
  const drawH = naturalH * scale;

  let drawX = x + w / 2 - anchorX * drawW;
  let drawY = y + h / 2 - anchorY * drawH;

  drawX = clamp(drawX, x + w - drawW, x);
  drawY = clamp(drawY, y + h - drawH, y);

  ctx.drawImage(img, drawX, drawY, drawW, drawH);
}

async function renderPlainStripCanvas(strip, widthMm) {
  const layoutType = strip.layoutType ?? "1x4";
  const approxPreviewW = Math.max(120, Math.round((widthMm / 50.8) * 200));
  const metrics = getPlainFrameMetrics(layoutType, approxPreviewW, {
    showBrand: strip.showBrand !== false,
  });
  const heightMm = widthMm * metrics.frameAspect;
  const canvasW = mmToPx(widthMm);
  const canvasH = mmToPx(heightMm);
  const scale = canvasW / metrics.widthPx;
  const brandH = metrics.brandPx * scale;
  const pad = metrics.padPx * scale;
  const padY = metrics.padY * scale;
  const padBottom = (metrics.padBottom ?? metrics.padY) * scale;
  const footerH = metrics.footerPx * scale;
  const gap = metrics.gapPx * scale;
  const frameColor = strip.frameColor || PLAIN_FRAME_DEFAULTS.frameColor;
  const brandScript =
    (strip.brandScript ?? PLAIN_FRAME_DEFAULTS.brandScript).trim() ||
    PLAIN_FRAME_DEFAULTS.brandScript;
  const brandColor = strip.brandColor || PLAIN_FRAME_DEFAULTS.brandColor;
  const slotCount = metrics.slotCount;
  const { is1x1, is2x2, is3x3, cols, rows, showBrand } = metrics;

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas not supported");

  ctx.fillStyle = frameColor;
  ctx.fillRect(0, 0, canvasW, canvasH);

  let boxesX;
  let boxesY;
  let boxesW;
  let boxesH;
  if (is1x1) {
    boxesX = pad;
    boxesY = padY;
    boxesW = canvasW - footerH - pad;
    boxesH = canvasH - padY * 2;
  } else if (is3x3) {
    boxesX = pad;
    boxesY = padY;
    boxesW = canvasW - pad * 2;
    boxesH = canvasH - footerH - padY - padBottom;
  } else {
    boxesX = pad;
    boxesY = padY;
    boxesW = canvasW - pad * 2;
    boxesH = canvasH - footerH - padY - padBottom;
  }

  if (is3x3) {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  const isGrid = is2x2 || is3x3;
  const gridCols = cols || (is3x3 ? 3 : is2x2 ? 2 : 1);
  const gridRows = rows || (is3x3 ? 3 : is2x2 ? 2 : slotCount);
  const cellW = isGrid
    ? (boxesW - gap * (gridCols - 1)) / gridCols
    : boxesW;
  const cellH = isGrid
    ? (boxesH - gap * (gridRows - 1)) / gridRows
    : (boxesH - gap * Math.max(0, gridRows - 1)) / Math.max(1, gridRows);

  try {
    if (document?.fonts?.ready) await document.fonts.ready;
  } catch {
    /* ignore */
  }

  for (let slotIndex = 0; slotIndex < slotCount; slotIndex++) {
    const col = isGrid ? slotIndex % gridCols : 0;
    const row = isGrid ? Math.floor(slotIndex / gridCols) : slotIndex;
    const slotX = boxesX + col * (cellW + gap);
    const slotY = boxesY + row * (cellH + gap);
    const imageSrc = strip.images?.[slotIndex];

    if (imageSrc) {
      const img = await loadImage(imageSrc);
      const position = strip.imagePositions?.[slotIndex] ?? {
        x: 50,
        y: 50,
        zoom: 1,
      };
      ctx.save();
      ctx.beginPath();
      ctx.rect(slotX, slotY, cellW, cellH);
      ctx.clip();
      drawCover(
        ctx,
        img,
        slotX,
        slotY,
        cellW,
        cellH,
        position,
        position.zoom ?? 1,
        is1x1 ? -90 : 0,
      );
      ctx.restore();
    } else {
      ctx.fillStyle = "#f0f0f0";
      ctx.fillRect(slotX, slotY, cellW, cellH);
    }
  }

  if (showBrand) {
    ctx.save();
    ctx.fillStyle = brandColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const fontPx = Math.max(mmToPx(3.2), Math.round(brandH * 0.72));
    ctx.font = `${fontPx}px "Pinyon Script", "Great Vibes", cursive`;
    if (is1x1) {
      ctx.translate(canvasW - footerH / 2, canvasH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(brandScript, 0, 0);
    } else {
      ctx.fillText(brandScript, canvasW / 2, canvasH - footerH / 2);
    }
    ctx.restore();
  }

  return { canvas, hMm: heightMm };
}

export async function renderStripCanvas(
  strip,
  widthMm,
  theme,
  frameOverlaySrc,
  layoutOptions = {},
) {
  if (isPlainFrame(strip) && !frameOverlaySrc) {
    return renderPlainStripCanvas(strip, widthMm);
  }

  const layout = getLayoutDef(strip.layoutType);
  const slotCount =
    strip.frameSource &&
    strip.frameSource !== "none" &&
    strip.frameSource !== "plain"
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

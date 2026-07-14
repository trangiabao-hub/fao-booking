export const mF = "#2e2e2e";
export const TEt = "#e6e6e6";
export const pF = "rgba(95, 95, 95, 0.7)";
export const _Et = "rgba(55, 55, 55, 0.1)";

export const STRIP_WIDTH_MM = 50;
export const PREVIEW_WIDTH = 220;
export const EXPORT_DPI = 2;
/** Chuyển mm → pixel canvas export (300 DPI × EXPORT_DPI). */
export const mmToPx = (mm) => mm * (300 / 25.4) * EXPORT_DPI;
export const DEFAULT_SLOT_GAP_MM = 1.2;

export const FREE_PRINT_QUOTA = 2;
export const PAID_PRINT_PRICE_VND = 10_000;
export const DUPLICATE_COPY_PRICE_VND = 5_000;
export const LAMINATION_PRICE_VND = 5_000;

export const PHOTO_THEMES = {
  none: {
    id: "none",
    label: "Mặc định",
    bg: "#ffffff",
    headerMm: 0,
    footerMm: 9,
    photoInsetMm: 0.22,
    previewInsetPx: 5,
    outerInsetMm: 1.6,
    previewOuterInsetPx: 7,
    bottomInsetMm: 2.2,
    previewBottomInsetPx: 9,
    photoBorderMm: 0.18,
    photoBorderColor: TEt,
    photoBorderPreviewOnly: true,
    headerBarColor: "#b3261e",
    headerText: "",
    footerBarColor: "#ffffff",
    footerPatternText: "Fao Sài Gòn",
    footerPatternColor: "#d86ca7",
    footerSubText: "photobooth",
    footerSubColor: pF,
  },
};

export const FRAME_SIZE_TEMPLATES = {
  "1x4": {
    slots: 4,
    slotInsetRatio: 0,
    slotGapRatio: 0.023,
    slotLayout: {
      slotRects: [
        { leftRatio: 0.0626, topRatio: 0.0313, widthRatio: 0.8749, heightRatio: 0.2081 },
        { leftRatio: 0.0626, topRatio: 0.2605, widthRatio: 0.8749, heightRatio: 0.2081 },
        { leftRatio: 0.0613, topRatio: 0.4897, widthRatio: 0.8749, heightRatio: 0.2081 },
        { leftRatio: 0.0626, topRatio: 0.719, widthRatio: 0.8749, heightRatio: 0.2081 },
      ],
    },
    frameAspectRatio: 2650 / 880,
  },
  "2x2": {
    slots: 4,
    slotInsetRatio: 0,
    slotGapRatio: 0,
    slotLayout: {
      slotRects: [
        { leftRatio: 0.016, topRatio: 0.0127, widthRatio: 0.476, heightRatio: 0.4495 },
        { leftRatio: 0.508, topRatio: 0.0127, widthRatio: 0.476, heightRatio: 0.4495 },
        { leftRatio: 0.016, topRatio: 0.4729, widthRatio: 0.476, heightRatio: 0.4495 },
        { leftRatio: 0.508, topRatio: 0.4729, widthRatio: 0.476, heightRatio: 0.4495 },
      ],
    },
    frameAspectRatio: 11813 / 8401,
  },
  "1x1": {
    slots: 1,
    slotInsetRatio: 0.004,
    slotGapRatio: 0,
    slotLayout: {
      slotRects: [
        { leftRatio: 0.0491, topRatio: 0.034, widthRatio: 0.9016, heightRatio: 0.8616 },
      ],
    },
    frameAspectRatio: 11572 / 7715,
  },
};

export const LAYOUT_DEFS = {
  "1x4": {
    id: "1x4",
    label: "1x4",
    slots: 4,
    cols: 1,
    rows: 4,
    slotAspect: { w: 4, h: 3 },
  },
  "2x2": {
    id: "2x2",
    label: "2x2",
    slots: 4,
    cols: 2,
    rows: 2,
    slotAspect: { w: 1, h: 1 },
  },
  "1x1": {
    id: "1x1",
    label: "1x1",
    slots: 1,
    cols: 1,
    rows: 1,
    slotAspect: { w: 3, h: 4 },
  },
};

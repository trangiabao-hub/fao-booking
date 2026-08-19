export const mF = "#2e2e2e";
export const TEt = "#e6e6e6";
export const pF = "rgba(95, 95, 95, 0.7)";
export const _Et = "rgba(55, 55, 55, 0.1)";

/**
 * DNP DS-RX1HS — in 2×6" strip từ media 4×6" + 2" cut.
 * Sheet: 4×6" (101.6×152.4 mm), 2 strip cạnh nhau mỗi tấm 2×6".
 */
export const DNP_PAGE = { wIn: 4, hIn: 6, wMm: 101.6, hMm: 152.4 };
export const DNP_STRIP = { wIn: 2, hIn: 6, wMm: 50.8, hMm: 152.4 };

export const PREVIEW_WIDTH = 220;
export const EXPORT_DPI = 2;
/** Chuyển mm → pixel canvas export (300 DPI × EXPORT_DPI). */
export const mmToPx = (mm) => mm * (300 / 25.4) * EXPORT_DPI;
export const DEFAULT_SLOT_GAP_MM = 1.2;

export const FREE_PRINT_QUOTA = 2;
/** Giá mỗi ảnh in vượt quota — khớp PtbCollectionService.PAID_PRINT_PRICE_VND. */
export const PAID_PRINT_PRICE_VND = 10000;

/** Tỉ lệ demo-frame (height / width). 1×4 = 2×6", còn lại = 4×6". */
export const PLAIN_FRAME_ASPECT = {
  "1x4": 6 / 2,
  "1x3": 6 / 2,
  "2x2": 6 / 4,
  "1x1": 6 / 4,
  /** 3×3 portrait cells ≈ 4×6" (H/W). */
  "3x3": 6 / 4,
};

/** Brand band 1 dòng script ≈ 6% chiều cao frame. */
export const PLAIN_BRAND_RATIO = 0.06;
export const PLAIN_PAD_RATIO = 0.029;
export const PLAIN_GAP_RATIO = 0.011;

export const PLAIN_FRAME_DEFAULTS = {
  frameSource: "plain",
  frameColor: "#0d0d0d",
  brandScript: "Faobooth",
  brandColor: "#f5f5f5",
  showBrand: true,
};

export const PLAIN_COLOR_PRESETS = [
  { id: "white", label: "Trắng", color: "#ffffff", brand: "#1a1a1a" },
  { id: "black", label: "Đen", color: "#0d0d0d", brand: "#f5f5f5" },
  { id: "moss", label: "Xanh rêu", color: "#4d613b", brand: "#f3f0e6" },
];

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
  "3x3": {
    id: "3x3",
    label: "9 ô trắng đen",
    slots: 9,
    cols: 3,
    rows: 3,
    slotAspect: { w: 2, h: 3 },
    hot: true,
  },
};

/** Catalog / DeviceCatalogPage — hằng số dùng chung API + UI */

export const FALLBACK_IMG =
  "https://placehold.co/400x300/FFE4F0/E85C9C?text=📷";

export const DEFAULT_TIME_FROM = "09:00";
export const MORNING_PICKUP_TIME = "09:00";
export const SIX_HOUR_SECOND_PICKUP_TIME = "15:00";
export const DEFAULT_EVENING_SLOT = "20:30";
export const ONE_DAY_EVENING_SLOTS = [
  "19:15",
  "19:00",
  "19:30",
  "20:00",
  "20:15",
  "20:30",
];
export const SIX_HOUR_MAX_HOURS = 12;

export const DURATION_TYPES = [
  { id: "SIX_HOURS", label: "6 tiếng" },
  { id: "ONE_DAY", label: "Thuê theo ngày" },
];

/** Axios mặc định không timeout — request treo khiến catalog skeleton load vô hạn. */
export const CATALOG_API_TIMEOUT_MS = 35000;

export const PRICE_RANGES = [
  { id: "all", label: "Tất cả", min: 0, max: Infinity },
  { id: "under200", label: "Dưới 200k", min: 0, max: 200000 },
  { id: "200to400", label: "200k - 400k", min: 200000, max: 400000 },
  { id: "400to600", label: "400k - 600k", min: 400000, max: 600000 },
  { id: "above600", label: "Trên 600k", min: 600000, max: Infinity },
];

/** Tab danh mục nội bộ (built-in + API); luôn hiển thị đủ tab — không ẩn khi không có máy */
export const BUILTIN_CATEGORIES = [
  { key: "all", label: "TẤT CẢ" },
  { key: "available", label: "MÁY TRỐNG" },
];

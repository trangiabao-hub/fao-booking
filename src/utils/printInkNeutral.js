/**
 * Thang xám trung tính (R=G=B) ưu tiên kênh mực xám ảnh GI-73GY trên Canon PIXMA G570.
 * Tránh #000 — dùng xám đậm để driver dễ map sang xám/photo grey thay vì chỉ kéo kênh đen.
 */
export const PRINT_NEUTRAL_DARK = "#2e2e2e";
export const PRINT_NEUTRAL_LIGHT = "#e6e6e6";
export const PRINT_NEUTRAL_SUB = "rgba(95, 95, 95, 0.7)";
export const PRINT_NEUTRAL_FOOT_TINT = "rgba(55, 55, 55, 0.1)";
export const PRINT_NEUTRAL_GUIDE = "#c9c9c9";
/** Chữ chính — thay #000 */
export const PRINT_NEUTRAL_BODY = PRINT_NEUTRAL_DARK;
/** Chữ phụ — tương đương ~#666 */
export const PRINT_NEUTRAL_MUTED = "#737373";

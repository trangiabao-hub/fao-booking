/**
 * Grade trắng đen dùng chung cho preview, file export và print agent.
 *
 * Ba bước: trộn kênh nghiêng đỏ → tone curve → split-tone ấm.
 * Tham số đo từ ảnh mẫu photobooth (9 ô, ~121k pixel): ~2.7% pixel gần đen
 * tuyệt đối, và R−B tăng từ +3 ở vùng tối lên ~+12.5 ở vùng sáng rồi bão hoà.
 */

/** Nặng kênh đỏ để da sáng mịn, nhẹ kênh lam vì lam lộ lỗ chân lông và nhiễu. */
export const BW_MIX = Object.freeze({ r: 0.5, g: 0.38, b: 0.12 });

/**
 * Dốc ở vùng tối cho tóc đen sâu, thoải dần qua dải da 175–240 để nén tương
 * phản trên mặt (da mịn), rồi vai ngắn ở cuối giữ catchlight mắt tách khỏi da.
 */
const CURVE_IN = [0, 10, 28, 50, 75, 100, 125, 150, 175, 200, 225, 240, 255];
const CURVE_OUT = [0, 0, 6, 24, 56, 96, 138, 174, 202, 223, 239, 247, 255];

const TONE_AMOUNT = 12.5;
const TONE_GAMMA = 0.35;
const TONE_WEIGHT_R = 0.53;
const TONE_WEIGHT_G = -0.006;
const TONE_WEIGHT_B = -0.47;
/** Split-tone cộng thêm sáng, trừ lại để giữ nguyên độ sáng tổng. */
const TONE_LUMA_OFFSET = 0.101;

function clamp255(value) {
  if (value < 0) return 0;
  if (value > 255) return 255;
  return value;
}

function curveAt(value) {
  const v = clamp255(value);
  for (let i = 1; i < CURVE_IN.length; i += 1) {
    if (v <= CURVE_IN[i]) {
      const span = CURVE_IN[i] - CURVE_IN[i - 1];
      const t = span === 0 ? 0 : (v - CURVE_IN[i - 1]) / span;
      return CURVE_OUT[i - 1] + t * (CURVE_OUT[i] - CURVE_OUT[i - 1]);
    }
  }
  return CURVE_OUT[CURVE_OUT.length - 1];
}

function tonedChannel(lum, weight) {
  const t = TONE_AMOUNT * Math.pow(clamp255(lum) / 255, TONE_GAMMA);
  return clamp255(lum - TONE_LUMA_OFFSET * t + weight * t);
}

function buildLut(weight) {
  const lut = new Uint8Array(256);
  for (let i = 0; i < 256; i += 1) {
    lut[i] = Math.round(tonedChannel(curveAt(i), weight));
  }
  return lut;
}

export const BW_LUT_R = buildLut(TONE_WEIGHT_R);
export const BW_LUT_G = buildLut(TONE_WEIGHT_G);
export const BW_LUT_B = buildLut(TONE_WEIGHT_B);

/** Áp grade tại chỗ lên buffer RGBA (ImageData.data). */
export function applyBwGradeToRgba(data, channels = 4) {
  for (let i = 0; i < data.length; i += channels) {
    const mixed =
      data[i] * BW_MIX.r + data[i + 1] * BW_MIX.g + data[i + 2] * BW_MIX.b;
    const idx = mixed > 254.5 ? 255 : (mixed + 0.5) | 0;
    data[i] = BW_LUT_R[idx];
    data[i + 1] = BW_LUT_G[idx];
    data[i + 2] = BW_LUT_B[idx];
  }
  return data;
}

/**
 * Bake grade vào riêng một vùng của canvas — CSS filter của preview không đi
 * theo file export. Chỉ gọi trên vùng ảnh, gọi ngay sau khi vẽ ảnh và trước khi
 * vẽ khung/overlay, để màu khung khách chọn không bị kéo sang trắng đen.
 */
export function applyBwGradeToRegion(ctx, x, y, w, h) {
  const maxW = ctx.canvas?.width ?? 0;
  const maxH = ctx.canvas?.height ?? 0;
  const left = Math.max(0, Math.floor(x));
  const top = Math.max(0, Math.floor(y));
  const width = Math.min(maxW - left, Math.ceil(x + w) - left);
  const height = Math.min(maxH - top, Math.ceil(y + h) - top);
  if (width <= 0 || height <= 0) return;
  const imageData = ctx.getImageData(left, top, width, height);
  applyBwGradeToRgba(imageData.data);
  ctx.putImageData(imageData, left, top);
}

export const BW_SVG_FILTER_ID = "ptb-bw-grade";

const SVG_TABLE_STEPS = 33;

function tableValues(lut) {
  const values = [];
  for (let i = 0; i < SVG_TABLE_STEPS; i += 1) {
    const idx = Math.round((i * 255) / (SVG_TABLE_STEPS - 1));
    values.push((lut[idx] / 255).toFixed(4));
  }
  return values.join(" ");
}

/** Bảng cho feComponentTransfer, để preview khớp với bản in. */
export const BW_SVG_TABLES = Object.freeze({
  r: tableValues(BW_LUT_R),
  g: tableValues(BW_LUT_G),
  b: tableValues(BW_LUT_B),
});

export const BW_PREVIEW_FILTER = `url(#${BW_SVG_FILTER_ID})`;

/**
 * Khung của máy booth trên web đặt lịch.
 *
 * Booth vẽ khung từ "pack" (pack.json: css + font nhúng + phần thân SVG từng khổ). Ở đây dùng đúng dữ liệu đó và đúng cách
 * điền token như `packOverlayMarkup` của photobooth-electron (src/shared/domain/framePacks.ts), rồi đưa SVG đã điền vào
 * renderer hiện có như một lớp phủ (ô ảnh nằm dưới, lỗ đục trong suốt). Danh sách khung lấy từ máy booth được gán cho web
 * (VITE_BOOTH_UNIT_ID) nên đổi khung trong admin là web đổi theo.
 */
import api from "../../config/axios";

const PACK_BASE = "/booth-mgmt/frames/packs";
const HEX = /^#[0-9a-f]{6}$/i;
const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

/** Khổ của pack → khổ mà web đặt lịch biết vẽ. */
export const PACK_KIND_TO_LAYOUT = { s4: "1x4", p4: "2x2", l1: "1x1" };

/** Máy booth "Booth Web" (id 5, booth-mgmt). Đặt VITE_BOOTH_UNIT_ID để dùng máy khác; đặt "0" để tắt và về kho khung cũ. */
const envUnit = String(import.meta.env.VITE_BOOTH_UNIT_ID ?? "5").trim();
export const BOOTH_UNIT_ID = envUnit === "0" ? "" : envUnit;

/* ------------------------------ token lịch ------------------------------ */

function parseSpec(spec) {
  const out = {};
  for (const part of spec.split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = part.slice(i + 1).trim();
  }
  return out;
}
const num = (s, k, d) => (Number.isFinite(Number(s[k])) ? Number(s[k]) : d);
const r1 = (v) => String(Math.round(v * 10) / 10);
const family = (n) => (n || "sans-serif").replace(/[^\w ,'-]/g, "");

function cell(first, day, s) {
  const idx = first + day - 1;
  return { x: num(s, "fx", 0) + (idx % 7) * num(s, "cw", 0), y: num(s, "fy", 0) + Math.floor(idx / 7) * num(s, "rh", 0) };
}

function monthMarkup(s, now) {
  const m = now.getMonth();
  const first = (new Date(now.getFullYear(), m, 1).getDay() + 6) % 7;
  const days = new Date(now.getFullYear(), m + 1, 0).getDate();
  const ff = family(s.ff);
  const name = MONTHS[m];
  const ts = num(s, "ts", 60) * Math.min(1, 7.4 / name.length);
  let o = `<text x="${r1(num(s, "tx", 0))}" y="${r1(num(s, "ty", 0))}" font-family="${ff}" font-weight="400" font-size="${r1(ts)}" letter-spacing="${r1(ts * 0.08)}" fill="${s.tc ?? "#2b2926"}">${name}</text>`;
  o += `<g font-family="${ff}" font-weight="400" font-size="${r1(num(s, "ds", 30))}" text-anchor="middle" fill="${s.c ?? "#2b2926"}">`;
  for (let d = 1; d <= days; d++) {
    const p = cell(first, d, s);
    o += `<text x="${r1(p.x)}" y="${r1(p.y)}" dy="0.36em">${d}</text>`;
  }
  return `${o}</g>`;
}

function focusMarkup(s, now) {
  const first = (new Date(now.getFullYear(), now.getMonth(), 1).getDay() + 6) % 7;
  const p = cell(first, now.getDate(), s);
  const r = num(s, "fr", 40);
  const hot = s.hot ?? "#d9463a";
  return (
    `<circle cx="${r1(p.x)}" cy="${r1(p.y)}" r="${r1(r)}" fill="${s.bg ?? "#f6f4ee"}"/>` +
    `<circle cx="${r1(p.x)}" cy="${r1(p.y)}" r="${r1(r)}" fill="none" stroke="${hot}" stroke-width="${r1(r * 0.07)}"/>` +
    `<text x="${r1(p.x)}" y="${r1(p.y)}" dy="0.36em" text-anchor="middle" font-family="${family(s.ff)}" font-weight="700" font-size="${r1(r * 0.95)}" fill="${hot}">${now.getDate()}</text>`
  );
}

function expandCalendarTokens(svg, now = new Date()) {
  if (!svg.includes("{{cal")) return svg;
  return svg.replace(/\{\{cal(f?):([^}]*)\}\}/g, (_m, f, spec) => (f ? focusMarkup(parseSpec(spec), now) : monthMarkup(parseSpec(spec), now)));
}

/* ------------------------------ vẽ overlay ------------------------------ */

function mixHex(a, b, t) {
  const ch = (i) =>
    Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - t) + parseInt(b.slice(i, i + 2), 16) * t)
      .toString(16)
      .padStart(2, "0");
  return `#${ch(1)}${ch(3)}${ch(5)}`;
}
const luminance = (hex) => {
  const ch = (i) => parseInt(hex.slice(i, i + 2), 16) / 255;
  return 0.2126 * ch(1) + 0.7152 * ch(3) + 0.0722 * ch(5);
};
const escapeXml = (v) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Giống packOverlayMarkup của booth. `style` = { frameColor, brandColor, brandScript, showBrand } (đều tuỳ chọn). */
export function packOverlayMarkup(pack, variant, style = {}) {
  const p = `${pack.prefix}${variant.kind}`;
  const base = pack.palettes[0];
  const paper = style.frameColor && HEX.test(style.frameColor) ? style.frameColor : base.color;
  const ink = style.brandColor && HEX.test(style.brandColor) ? style.brandColor : base.brand;
  const same = (a, b) => a.toLowerCase() === b.toLowerCase();
  const pal = pack.palettes.find((c) => same(c.color, paper) && same(c.brand, ink)) ?? pack.palettes.find((c) => same(c.color, paper));
  const accent = pal?.accent ?? mixHex(paper, ink, 0.55);
  const accent2 = pal?.accent2 ?? mixHex(paper, ink, 0.25);
  const stroke = pal?.stroke ?? (luminance(ink) < luminance(paper) ? ink : paper);

  const title = (style.brandScript || "").trim() || pack.title;
  const words = title.split(/\s+/);
  const names = title.split(/\s*[&+♥❤]\s*|\s+và\s+/i).filter(Boolean);
  const pair = names.length >= 2;
  const fill = (s) =>
    expandCalendarTokens(s.replace(/\{\{p\}\}/g, p))
      .replace(/\{\{title\}\}/g, escapeXml(title))
      .replace(/\{\{t1\}\}/g, escapeXml(words[0] ?? ""))
      .replace(/\{\{t2\}\}/g, escapeXml(words.slice(1).join(" ")))
      .replace(/\{\{n1\}\}/g, escapeXml(pair ? names[0] : title))
      .replace(/\{\{n2\}\}/g, escapeXml(pair ? names.slice(1).join(" & ") : ""));
  const strip = (s) =>
    (style.showBrand === false ? s.replace(/<!--b-->[\s\S]*?<!--\/b-->/g, "") : s)
      .replace(title === pack.title ? /<!--c-->[\s\S]*?<!--\/c-->/g : /<!--d-->[\s\S]*?<!--\/d-->/g, "")
      .replace(pair ? /<!--1-->[\s\S]*?<!--\/1-->/g : /<!--2-->[\s\S]*?<!--\/2-->/g, "");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${variant.w}" height="${variant.h}" viewBox="0 0 ${variant.w} ${variant.h}" preserveAspectRatio="none" style="--paper:${paper};--ink:${ink};--accent:${accent};--accent2:${accent2};--stroke:${stroke}">
<defs><style>${pack.css}</style>${fill(pack.defs)}<mask id="${p}-m" maskUnits="userSpaceOnUse" x="0" y="0" width="${variant.w}" height="${variant.h}"><rect width="${variant.w}" height="${variant.h}" fill="#fff"/><g fill="#000">${variant.holes}</g></mask></defs>
<g mask="url(#${p}-m)">${fill(strip(variant.under))}</g>${fill(strip(variant.over))}
</svg>`;
}

/* --------------------------- nạp dữ liệu pack --------------------------- */

const packCache = new Map();

async function loadPackJson(slug) {
  if (packCache.has(slug)) return packCache.get(slug);
  const job = (async () => {
    // Bộ đã tải lên server: lấy từ server. Bộ chỉ có trong app booth: bản sao đi kèm web (scripts/sync-booth-packs.mjs).
    try {
      const res = await api.get(`${PACK_BASE}/${encodeURIComponent(slug)}/pack.json`, { timeout: 30000 });
      if (res.data?.variants) return res.data;
    } catch {
      /* thử bản đi kèm */
    }
    const res = await fetch(`${import.meta.env.BASE_URL}booth-packs/${encodeURIComponent(slug)}.json`);
    if (!res.ok) throw new Error(`pack ${slug}`);
    return res.json();
  })();
  packCache.set(slug, job);
  job.catch(() => packCache.delete(slug));
  return job;
}

/** Danh sách bộ khung của máy booth được gán cho web: [{ packSlug, name, price }] theo thứ tự admin đã sắp. */
export async function fetchBoothFrameList() {
  if (!BOOTH_UNIT_ID) return [];
  const res = await api.get(`/booth-mgmt/frames/for-booth/${encodeURIComponent(BOOTH_UNIT_ID)}`);
  return Array.isArray(res.data) ? res.data : [];
}

const urlCache = new Map();

function svgUrl(key, markup) {
  if (urlCache.has(key)) return urlCache.get(key);
  const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }));
  urlCache.set(key, url);
  return url;
}

function slotRectsOf(variant) {
  return variant.slots.map((s) => ({
    leftRatio: s.x / variant.w,
    topRatio: s.y / variant.h,
    widthRatio: s.w / variant.w,
    heightRatio: s.h / variant.h,
  }));
}

/** Một khung web (cùng hình dạng với mapApiFrames) cho một khổ của pack. */
export function packVariantToFrame(pack, variant, order, extra = {}) {
  const sizeType = PACK_KIND_TO_LAYOUT[variant.kind];
  if (!sizeType) return null;
  const slotCount = variant.slots.length;
  const base = pack.palettes[0];
  const frameStyle = { frameColor: base.color, brandColor: base.brand, brandScript: pack.title, showBrand: true };
  const slotLayout = { slotRects: slotRectsOf(variant) };
  const frameAspectRatio = variant.h / variant.w;
  return {
    id: `pack_${pack.slug}_${variant.kind}`,
    apiFrameId: null,
    boothPackSlug: pack.slug,
    boothVariantId: variant.id,
    label: `${pack.name} · ${sizeType}`,
    src: svgUrl(`${pack.slug}:${variant.kind}:default`, packOverlayMarkup(pack, variant, frameStyle)),
    sizeType,
    frameCategoryName: (extra.categoryName || "Khung booth").trim(),
    layoutType: sizeType,
    orderNumber: order,
    imageCount: slotCount,
    slots: slotCount,
    slotInsetRatio: 0,
    slotGapRatio: 0.01,
    slotLayout,
    frameAspectRatio,
    frameLayoutOptions: { slotLayout, frameAspectRatio, slotGapRatio: 0.01, slotInsetRatio: 0 },
    packPalettes: pack.palettes,
    packTitles: pack.titles,
    packStyle: frameStyle,
    price: extra.price ?? 0,
  };
}

/** Tải lần lượt (song song giới hạn) rồi gọi `onFrames` mỗi khi có thêm khung để thư viện hiện dần. */
export async function loadBoothFrames(list, onFrames, { concurrency = 6, signal } = {}) {
  const acc = [];
  let next = 0;
  const worker = async () => {
    while (next < list.length && !signal?.aborted) {
      const i = next++;
      const item = list[i];
      try {
        const pack = await loadPackJson(item.packSlug);
        const frames = pack.variants.map((v) => packVariantToFrame(pack, v, i, { price: item.price })).filter(Boolean);
        if (frames.length) {
          acc.push(...frames);
          onFrames([...acc].sort((a, b) => a.orderNumber - b.orderNumber));
        }
      } catch {
        /* bộ này chưa có dữ liệu: bỏ qua, không làm hỏng cả thư viện */
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, list.length) }, worker));
  return acc;
}

/**
 * First-touch attribution (30 ngày) — nối SEO/blog → catalog → đơn thanh toán.
 * Dữ liệu gửi kèm mọi event booking-analytics qua metaJson.attribution.
 */
const STORAGE_KEY = "fao_traffic_attribution";
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

const SEO_SLUG_PREFIX = "thue-may-anh-";

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Nhận diện kênh từ path landing (trang HTML tĩnh hoặc SPA). */
const SPA_ROUTES = new Set([
  "catalog",
  "menu",
  "feedback",
  "account",
  "my-bookings",
  "payment-status",
  "order",
  "photobooth",
  "hop-dong-thue-chuan",
  "chinh-sach-quyen-rieng-tu",
  "privacy-policy",
  "blog",
]);

export function inferChannelFromPath(pathname = "") {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/blog" || p.startsWith("/blog/")) {
    return { channel: "blog", medium: p === "/blog" ? "index" : "article" };
  }
  const seg = p.split("/").filter(Boolean)[0] || "";
  if (seg.startsWith(SEO_SLUG_PREFIX)) {
    return { channel: "seo", medium: "landing", campaign: seg };
  }
  if (seg && !SPA_ROUTES.has(seg) && !seg.startsWith(SEO_SLUG_PREFIX)) {
    return { channel: "blog", medium: "article", campaign: seg };
  }
  return null;
}

function inferFromUtm(search = "") {
  const q = new URLSearchParams(search);
  const source = (q.get("utm_source") || "").toLowerCase();
  const medium = q.get("utm_medium") || "";
  const campaign = q.get("utm_campaign") || "";
  if (!source) return null;

  if (source === "fao_seo" || source.includes("seo")) {
    return { channel: "seo", source, medium: medium || "landing", campaign };
  }
  if (source === "fao_blog" || source.includes("blog")) {
    return { channel: "blog", source, medium: medium || "article", campaign };
  }
  if (source === "google" || source === "gclid") {
    return { channel: "paid", source, medium: medium || "cpc", campaign };
  }
  return { channel: "campaign", source, medium, campaign };
}

function inferFromReferrer(referrer = "") {
  if (!referrer) return { channel: "direct", source: "direct", medium: "none" };
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    if (/google\.|bing\.|coccoc\.|yahoo\./.test(host)) {
      return { channel: "organic", source: host.split(".")[0], medium: "organic" };
    }
    if (/facebook\.|instagram\.|tiktok\.|zalo\./.test(host)) {
      return { channel: "social", source: host.split(".")[0], medium: "referral" };
    }
    return { channel: "referral", source: host, medium: "referral" };
  } catch {
    return { channel: "referral", source: "unknown", medium: "referral" };
  }
}

export function buildAttributionSnapshot(overrides = {}) {
  if (typeof window === "undefined") return null;

  const path = overrides.landingPath || `${window.location.pathname}${window.location.search || ""}`;
  const pathname = path.split("?")[0];
  const search = path.includes("?") ? path.slice(path.indexOf("?")) : window.location.search;

  const fromUtm = inferFromUtm(search);
  const fromPath = inferChannelFromPath(pathname);
  const base = fromUtm || fromPath || inferFromReferrer(document.referrer);

  return {
    ...base,
    landingPath: pathname,
    referrer: overrides.referrer ?? (document.referrer || null),
    capturedAt: new Date().toISOString(),
    ...overrides,
  };
}

/** Lưu first-touch (không ghi đè nếu còn hạn, trừ khi force hoặc có utm FAO mới). */
export function captureTrafficAttribution(options = {}) {
  if (typeof window === "undefined") return null;

  const { force = false } = options;
  const existing = loadTrafficAttribution();
  const hasFaoUtm = /utm_source=fao_(seo|blog)/i.test(window.location.search);

  if (existing && !force && !hasFaoUtm) {
    const age = Date.now() - new Date(existing.capturedAt || 0).getTime();
    if (age < TTL_MS) return existing;
  }

  const snap = buildAttributionSnapshot();
  if (!snap) return null;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
  } catch {
    /* ignore */
  }
  return snap;
}

export function loadTrafficAttribution() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = safeParse(raw);
    if (!data?.capturedAt) return null;
    if (Date.now() - new Date(data.capturedAt).getTime() > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/** Gắn UTM lên link catalog từ trang SEO/blog tĩnh. */
export function catalogUrlWithAttribution(href, { channel, slug }) {
  const base = href.startsWith("http") ? href : href.startsWith("/") ? href : `/${href}`;
  const url = new URL(base, "https://faocamera.vn");
  if (channel === "seo") {
    url.searchParams.set("utm_source", "fao_seo");
    url.searchParams.set("utm_medium", "landing");
    if (slug) url.searchParams.set("utm_campaign", slug);
  } else if (channel === "blog") {
    url.searchParams.set("utm_source", "fao_blog");
    url.searchParams.set("utm_medium", "article");
    if (slug) url.searchParams.set("utm_campaign", slug);
  }
  return `${url.pathname}${url.search}`;
}

export function attributionMetaJson(extra = {}) {
  const attribution = loadTrafficAttribution() || captureTrafficAttribution();
  return JSON.stringify({
    attribution: attribution || null,
    ...extra,
  });
}

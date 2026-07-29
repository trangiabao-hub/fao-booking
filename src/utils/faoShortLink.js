import { resolveShareOrigin } from "./catalogShareLink";

const TABLE = "short_links";
const CODE_LEN = 7;
const MAX_INSERT_ATTEMPTS = 6;
const CODE_ALPHABET =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function supabaseConfig() {
  const url = String(import.meta.env.VITE_SUPABASE_URL || "").replace(
    /\/+$/,
    "",
  );
  const key = String(import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();
  if (!url || !key) return null;
  return { url, key };
}

function supabaseHeaders(key, extra = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extra,
  };
}

function randomCode(length = CODE_LEN) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join(
    "",
  );
}

function buildShortUrl(code) {
  return `${resolveShareOrigin()}/l/${code}`;
}

async function findCodeByLongUrl(longUrl, cfg) {
  const res = await fetch(
    `${cfg.url}/rest/v1/${TABLE}?select=code&long_url=eq.${encodeURIComponent(longUrl)}&limit=1`,
    { headers: supabaseHeaders(cfg.key) },
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows?.[0]?.code || null;
}

async function insertShortLink(code, longUrl, cfg) {
  const res = await fetch(`${cfg.url}/rest/v1/${TABLE}`, {
    method: "POST",
    headers: supabaseHeaders(cfg.key, {
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    }),
    body: JSON.stringify({ code, long_url: longUrl }),
  });
  return res.ok;
}

/** Tạo link ngắn faocamera.vn/l/{code} — lưu Supabase, không qua dịch vụ ngoài. */
export async function createFaoShortUrl(longUrl) {
  const cfg = supabaseConfig();
  const target = String(longUrl || "").trim();
  if (!cfg || !/^https?:\/\//i.test(target)) return null;

  try {
    const existing = await findCodeByLongUrl(target, cfg);
    if (existing) return buildShortUrl(existing);

    for (let attempt = 0; attempt < MAX_INSERT_ATTEMPTS; attempt += 1) {
      const code = randomCode();
      const inserted = await insertShortLink(code, target, cfg);
      if (inserted) return buildShortUrl(code);
    }
  } catch {
    /* fallback caller dùng URL dài */
  }

  return null;
}

/** Tra cứu URL gốc từ mã /l/{code}. */
export async function resolveFaoShortCode(code) {
  const cfg = supabaseConfig();
  const token = String(code || "").trim();
  if (!cfg || !/^[A-Za-z0-9]{4,16}$/.test(token)) return null;

  try {
    const res = await fetch(
      `${cfg.url}/rest/v1/${TABLE}?select=long_url&code=eq.${encodeURIComponent(token)}&limit=1`,
      { headers: supabaseHeaders(cfg.key) },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    const longUrl = rows?.[0]?.long_url;
    return typeof longUrl === "string" && longUrl.trim() ? longUrl.trim() : null;
  } catch {
    return null;
  }
}

export function isFaoShortLinkConfigured() {
  return Boolean(supabaseConfig());
}

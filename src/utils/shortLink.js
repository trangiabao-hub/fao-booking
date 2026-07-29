import { createFaoShortUrl, isFaoShortLinkConfigured } from "./faoShortLink";

/**
 * Rút gọn URL gửi khách — dùng faocamera.vn/l/{code} (Supabase), không qua shrtr/da.gd.
 * Lỗi / chưa cấu hình DB → null, caller fallback URL catalog đầy đủ.
 */

const shortCache = new Map();
const CACHE_VERSION = 4;

function cacheKey(longUrl) {
  return `${CACHE_VERSION}:${longUrl}`;
}

export function isUrlShorteningEnabled() {
  return isFaoShortLinkConfigured();
}

export async function shortenUrl(longUrl, { timeoutMs = 8000 } = {}) {
  const url = String(longUrl || "").trim();
  if (!url || !isUrlShorteningEnabled()) return null;

  const key = cacheKey(url);
  if (shortCache.has(key)) return shortCache.get(key);

  const run = createFaoShortUrl(url);
  const timed =
    timeoutMs > 0
      ? Promise.race([
          run,
          new Promise((resolve) => {
            setTimeout(() => resolve(null), timeoutMs);
          }),
        ])
      : run;

  const short = await timed;
  if (short) shortCache.set(key, short);
  return short || null;
}

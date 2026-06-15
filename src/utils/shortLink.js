/**
 * Rút gọn URL cho link gửi khách (Messenger/Zalo).
 *
 * Chỉ dùng các endpoint trả `Access-Control-Allow-Origin: *` (fetch từ trình duyệt không bị CORS chặn).
 * is.gd / tinyurl / cleanuri KHÔNG gửi CORS header → bỏ.
 *  - da.gd: GET, trả plain text — ổn định, ưu tiên.
 *  - spoo.me: POST form-urlencoded, trả JSON — dự phòng.
 *
 * Mọi lỗi/timeout đều trả null để caller fallback về URL gốc (không bao giờ chặn luồng copy).
 */

const shortCache = new Map();

function isHttpUrl(value) {
  return /^https?:\/\/\S+$/i.test(value);
}

async function withTimeout(run, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

async function shortenViaDagd(url, signal) {
  const endpoint = `https://da.gd/s?url=${encodeURIComponent(url)}`;
  const res = await fetch(endpoint, { method: "GET", signal });
  if (!res.ok) return null;
  const text = (await res.text()).trim();
  return isHttpUrl(text) ? text : null;
}

async function shortenViaSpoo(url, signal) {
  const res = await fetch("https://spoo.me/", {
    method: "POST",
    headers: { Accept: "application/json" },
    body: new URLSearchParams({ url }),
    signal,
  });
  if (!res.ok) return null;
  const data = await res.json();
  const short = String(data?.short_url || "")
    .trim()
    .replace(/^http:\/\//i, "https://");
  return isHttpUrl(short) ? short : null;
}

export async function shortenUrl(longUrl, { timeoutMs = 5000 } = {}) {
  const url = String(longUrl || "").trim();
  if (!url) return null;
  if (shortCache.has(url)) return shortCache.get(url);

  const providers = [shortenViaDagd, shortenViaSpoo];
  for (const provider of providers) {
    try {
      const short = await withTimeout((signal) => provider(url, signal), timeoutMs);
      if (short) {
        shortCache.set(url, short);
        return short;
      }
    } catch {
      /* thử provider kế tiếp */
    }
  }

  return null;
}

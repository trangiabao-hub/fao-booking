import api from "../config/axios";
import { loadCustomerInfo } from "../utils/storage";

/**
 * Meta Pixel (browser) + Conversions API (server, qua backend) — bắn song song cùng 1 eventId
 * để Meta tự dedup, không đếm trùng 1 lượt chuyển đổi. CAPI bù lại tín hiệu Pixel bị chặn
 * (adblock, ITP Safari, iOS 14.5+) — quan trọng để thuật toán rào đúng tệp & tối ưu CPA thấp.
 * Không cấu hình VITE_META_PIXEL_ID thì toàn bộ hàm dưới đây tự no-op an toàn.
 */

let pixelInitialized = false;

function readCookie(name) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Chuẩn hoá SĐT VN về dạng 84xxxxxxxxx (không dấu) — khớp chuẩn Advanced Matching của Meta. */
function normalizePhone(rawPhone) {
  if (!rawPhone) return null;
  const digits = String(rawPhone).replace(/[^0-9]/g, "");
  if (!digits) return null;
  if (digits.startsWith("84")) return digits;
  if (digits.startsWith("0")) return `84${digits.slice(1)}`;
  return digits;
}

/**
 * Nạp email/SĐT khách (đã lưu từ lúc điền form đặt máy) vào Pixel qua Advanced Matching —
 * Meta tự hash trước khi gửi đi. Tăng "Chất lượng so khớp" (match quality) mà không cần khách
 * đăng nhập, giúp thuật toán rào đúng tệp & học nhanh hơn.
 */
function syncAdvancedMatching(emailOverride, phoneOverride) {
  const saved = emailOverride && phoneOverride ? null : loadCustomerInfo();
  const email = emailOverride || saved?.gmail || null;
  const phone = normalizePhone(phoneOverride || saved?.phone);

  if (typeof window !== "undefined" && typeof window.fbq === "function" && (email || phone)) {
    try {
      const userData = {};
      if (email) userData.em = email;
      if (phone) userData.ph = phone;
      window.fbq("set", "userData", userData);
    } catch {
      /* ignore */
    }
  }

  return { email, phone };
}

function generateEventId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `evt_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

/** Nạp script Pixel — gọi 1 lần từ AnalyticsShell, tự bỏ qua nếu chưa cấu hình pixel ID. */
export function initMetaPixelIfConfigured() {
  if (pixelInitialized || typeof window === "undefined") return;
  const pixelId = import.meta.env.VITE_META_PIXEL_ID;
  if (!pixelId) return;
  pixelInitialized = true;

  /* eslint-disable */
  (function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = true;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */

  window.fbq("init", pixelId);
}

/** Gọi mỗi khi đổi route (SPA không tự có pageload) — an toàn nếu Pixel chưa nạp xong. */
export function trackMetaPageView() {
  if (typeof window !== "undefined" && typeof window.fbq === "function") {
    syncAdvancedMatching();
    window.fbq("track", "PageView");
  }
}

/**
 * Bắn 1 sự kiện chuẩn Meta (Lead, Contact, InitiateCheckout, Purchase...) qua cả 2 đường.
 * @param {string} eventName
 * @param {object} params - custom_data: value, currency, content_name, content_ids...
 * @param {{eventId?: string, email?: string, phone?: string}} options
 */
export function trackMetaEvent(eventName, params = {}, options = {}) {
  if (typeof window === "undefined") return null;
  const eventId = options.eventId || generateEventId();
  const { email, phone } = syncAdvancedMatching(options.email, options.phone);

  if (typeof window.fbq === "function") {
    try {
      window.fbq("track", eventName, params, { eventID: eventId });
    } catch {
      /* ignore */
    }
  }

  void api
    .post("v1/meta-capi/event", {
      eventName,
      eventId,
      eventSourceUrl: `${window.location.origin}${window.location.pathname}${window.location.search || ""}`,
      fbp: readCookie("_fbp"),
      fbc: readCookie("_fbc"),
      email,
      phone,
      params,
    })
    .catch(() => {});

  return eventId;
}

/** Khách bấm Messenger/Zalo/gọi điện — tín hiệu quan trọng nhất khi tối ưu ads theo mục tiêu nhắn tin. */
export function trackMetaContact(channel, extra = {}) {
  return trackMetaEvent("Contact", { content_category: channel, ...extra });
}

export function trackMetaInitiateCheckout(params = {}, options = {}) {
  return trackMetaEvent("InitiateCheckout", params, options);
}

export function trackMetaPurchase(params = {}, options = {}) {
  return trackMetaEvent("Purchase", params, options);
}

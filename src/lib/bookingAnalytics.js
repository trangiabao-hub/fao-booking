import api from "../config/axios";
import {
  attributionMetaJson,
  captureTrafficAttribution,
  loadTrafficAttribution,
} from "./trafficAttribution";

const VISITOR_KEY = "fao_booking_visitor_id";

export { captureTrafficAttribution, loadTrafficAttribution, attributionMetaJson };

export function getBookingVisitorId() {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `v_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

/**
 * Gửi sự kiện analytics (không chặn UI; lỗi mạng bị bỏ qua).
 * Token Bearer (nếu có) được axios gắn tự động — backend map accountId khi hợp lệ.
 */
export function trackBookingEvent(payload) {
  const path =
    payload.path ||
    (typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search || ""}`
      : "");

  captureTrafficAttribution();

  let metaJson = payload.metaJson ?? null;
  if (payload.includeAttribution !== false) {
    const extra = payload.metaExtra && typeof payload.metaExtra === "object"
      ? payload.metaExtra
      : payload.metaExtra
        ? { data: payload.metaExtra }
        : {};
    if (typeof payload.metaJson === "string") {
      try {
        Object.assign(extra, JSON.parse(payload.metaJson));
      } catch {
        extra.rawMeta = payload.metaJson;
      }
    }
    metaJson = attributionMetaJson(extra);
  }

  const body = {
    eventType: payload.eventType,
    path,
    clientSessionId: getBookingVisitorId(),
    deviceId: payload.deviceId ?? null,
    modelKey: payload.modelKey ?? null,
    deviceLabel: payload.deviceLabel ?? null,
    metaJson,
    userAgent:
      typeof navigator !== "undefined" ? navigator.userAgent : null,
  };

  void api.post("v1/booking-analytics/events", body).catch(() => {});
}

const PRESENCE_INTERVAL_MS = 45_000;
let presenceTimer = null;

/** Báo “đang mở web” cho backend (ADMIN xem tại /reports/booking-live-viewers). */
export function startBookingPresencePing() {
  if (presenceTimer != null) return;
  const tick = () => {
    const clientSessionId = getBookingVisitorId();
    void api
      .post("v1/booking-analytics/presence", { clientSessionId })
      .catch(() => {});
  };
  tick();
  presenceTimer = setInterval(tick, PRESENCE_INTERVAL_MS);
}

export function stopBookingPresencePing() {
  if (presenceTimer != null) {
    clearInterval(presenceTimer);
    presenceTimer = null;
  }
}

export function trackCatalogBookClick(device, source) {
  if (!device) return;
  trackBookingEvent({
    eventType: "CATALOG_BOOK_CLICK",
    path: "/catalog",
    deviceId: device.id ?? null,
    modelKey: device.modelKey || device.model_key || "",
    deviceLabel: device.displayName || device.name || "",
    metaJson: JSON.stringify({ source: source || "catalog" }),
  });
}

export function trackBookingCheckoutStart(device, meta) {
  if (!device) return;
  trackBookingEvent({
    eventType: "BOOKING_CHECKOUT_START",
    path: "/catalog",
    deviceId: device.id ?? null,
    modelKey: device.modelKey || "",
    deviceLabel: device.displayName || device.name || "",
    metaExtra: meta || null,
  });
}

/** Đơn thanh toán thành công (PAID) — dùng attribution đã lưu để báo cáo SEO/blog. */
export function trackBookingOrderPaid(details = {}) {
  trackBookingEvent({
    eventType: "BOOKING_ORDER_PAID",
    path: "/payment-status",
    metaExtra: {
      orderCode: details.orderCode ?? null,
      orderIdNew: details.orderIdNew ?? null,
      total: details.total ?? null,
      branchId: details.branchId ?? null,
      deviceCount: details.deviceCount ?? null,
    },
  });
}

/** User từ trang nội dung (SEO/blog) vào catalog — có thể gọi khi detect utm trên /catalog. */
export function trackContentToCatalog() {
  const att = loadTrafficAttribution();
  if (!att || !["seo", "blog"].includes(att.channel)) return;
  trackBookingEvent({
    eventType: "CONTENT_CATALOG_ENTRY",
    path: "/catalog",
    metaExtra: { step: "catalog_with_content_attribution" },
  });
}

import api from "../config/axios";

const VISITOR_KEY = "fao_booking_visitor_id";

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

  const body = {
    eventType: payload.eventType,
    path,
    clientSessionId: getBookingVisitorId(),
    deviceId: payload.deviceId ?? null,
    modelKey: payload.modelKey ?? null,
    deviceLabel: payload.deviceLabel ?? null,
    metaJson: payload.metaJson ?? null,
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
    path: "/booking",
    deviceId: device.id ?? null,
    modelKey: device.modelKey || "",
    deviceLabel: device.displayName || device.name || "",
    metaJson: meta ? JSON.stringify(meta) : null,
  });
}

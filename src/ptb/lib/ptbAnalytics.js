import { trackBookingEvent } from "../../lib/bookingAnalytics";

export function trackPtbEvent(eventType, metaExtra = {}) {
  trackBookingEvent({
    eventType,
    path: typeof window !== "undefined" ? window.location.pathname : "/trip",
    metaExtra,
  });
}

export const PTB_EVENTS = {
  ALBUM_OPENED: "PTB_ALBUM_OPENED",
  STRIP_CREATED: "PTB_STRIP_CREATED",
  PRINT_SUBMITTED: "PTB_PRINT_SUBMITTED",
  PAID_PRINTS: "PTB_PAID_PRINTS",
};

import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import {
  startBookingPresencePing,
  stopBookingPresencePing,
  trackBookingEvent,
  captureTrafficAttribution,
  trackContentToCatalog,
} from "../lib/bookingAnalytics";
import { initMetaPixelIfConfigured, trackMetaPageView } from "../lib/metaPixel";

/**
 * Bọc toàn bộ route fao-booking: gửi PAGE_VIEW mỗi khi đổi URL (và PageView cho Meta Pixel).
 */
export default function AnalyticsShell() {
  const location = useLocation();

  useEffect(() => {
    captureTrafficAttribution();
    trackBookingEvent({
      eventType: "PAGE_VIEW",
      path: `${location.pathname}${location.search || ""}`,
    });
    if (location.pathname === "/catalog") {
      trackContentToCatalog();
    }
    initMetaPixelIfConfigured();
    trackMetaPageView();
  }, [location.pathname, location.search]);

  useEffect(() => {
    startBookingPresencePing();
    return () => stopBookingPresencePing();
  }, []);

  return <Outlet />;
}

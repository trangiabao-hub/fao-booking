import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { trackBookingEvent } from "../lib/bookingAnalytics";

/**
 * Bọc toàn bộ route fao-booking: gửi PAGE_VIEW mỗi khi đổi URL.
 */
export default function AnalyticsShell() {
  const location = useLocation();

  useEffect(() => {
    trackBookingEvent({
      eventType: "PAGE_VIEW",
      path: `${location.pathname}${location.search || ""}`,
    });
  }, [location.pathname, location.search]);

  return <Outlet />;
}

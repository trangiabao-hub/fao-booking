import { useEffect, useRef, useCallback, useState } from "react";
import socketService from "./socketService";

const REFRESH_EVENT_TYPES = [
  "CREATE",
  "BATCH_CREATE",
  "UPDATE",
  "BATCH_UPDATE",
  "CANCEL",
  "STATUS_CHANGE",
  "REFRESH",
];

/**
 * Hook to subscribe to real-time booking events and auto-refresh data.
 *
 * @param {Object} options
 * @param {Function} options.onRefresh - Called when data should be refreshed
 * @param {number}  options.debounceMs - Min interval between refreshes (default 800ms)
 * @param {boolean} options.refreshOnTabFocus - Also refresh when user returns to tab (default true)
 */
export const useBookingSocket = (options = {}) => {
  const { onRefresh, debounceMs = 800, refreshOnTabFocus = true } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const refreshTimeoutRef = useRef(null);
  const lastRefreshRef = useRef(Date.now());
  const tabVisibleRef = useRef(true);
  const pendingRef = useRef(false);

  const debouncedRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);

    if (!tabVisibleRef.current) {
      pendingRef.current = true;
      return;
    }

    refreshTimeoutRef.current = setTimeout(() => {
      if (typeof onRefresh === "function") {
        const now = Date.now();
        if (now - lastRefreshRef.current >= debounceMs) {
          lastRefreshRef.current = now;
          onRefresh();
          pendingRef.current = false;
        }
      }
    }, debounceMs);
  }, [onRefresh, debounceMs]);

  const handleBookingEvent = useCallback(
    (event) => {
      setLastEvent(event);
      if (REFRESH_EVENT_TYPES.includes(event.type)) {
        debouncedRefresh();
      }
    },
    [debouncedRefresh],
  );

  // Tab visibility → refresh when returning
  useEffect(() => {
    if (!refreshOnTabFocus) return;

    const onVisChange = () => {
      const visible = document.visibilityState === "visible";
      const wasHidden = !tabVisibleRef.current;
      tabVisibleRef.current = visible;

      if (visible && wasHidden) {
        const stale =
          pendingRef.current ||
          Date.now() - lastRefreshRef.current > 30_000;
        if (stale && typeof onRefresh === "function") {
          setTimeout(() => {
            onRefresh();
            lastRefreshRef.current = Date.now();
            pendingRef.current = false;
          }, 150);
        }
      }
    };

    document.addEventListener("visibilitychange", onVisChange);
    return () => document.removeEventListener("visibilitychange", onVisChange);
  }, [refreshOnTabFocus, onRefresh]);

  // Connect + subscribe
  useEffect(() => {
    let unsubEvent = null;
    let unsubConnect = null;
    let unsubDisconnect = null;

    const setup = async () => {
      try {
        await socketService.connect();
        setIsConnected(true);
      } catch {
        setIsConnected(false);
      }

      unsubEvent = socketService.onBookingEvent(handleBookingEvent);
      unsubConnect = socketService.onConnect(() => setIsConnected(true));
      unsubDisconnect = socketService.onDisconnect(() => setIsConnected(false));
    };

    setup();

    return () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      unsubEvent?.();
      unsubConnect?.();
      unsubDisconnect?.();
    };
  }, [handleBookingEvent]);

  const forceRefresh = useCallback(() => {
    lastRefreshRef.current = 0;
    debouncedRefresh();
  }, [debouncedRefresh]);

  return { isConnected, lastEvent, forceRefresh };
};

export default useBookingSocket;

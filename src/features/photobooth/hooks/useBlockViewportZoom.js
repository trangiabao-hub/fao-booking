import { useEffect } from "react";

/** Chặn pinch/scroll zoom trình duyệt trong vùng preview — chỉ zoom ảnh trong slot. */
export function useBlockViewportZoom(containerRef, enabled = true) {
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !enabled) return;

    const onWheel = (event) => {
      // Chặn zoom trang (ctrl+scroll / trackpad pinch) — vẫn cho slot xử lý zoom ảnh
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
      }
    };

    const onTouchMove = (event) => {
      if (event.touches.length >= 2) {
        event.preventDefault();
      }
    };

    const onGesture = (event) => {
      event.preventDefault();
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("gesturestart", onGesture);
    el.addEventListener("gesturechange", onGesture);
    el.addEventListener("gestureend", onGesture);

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("gesturestart", onGesture);
      el.removeEventListener("gesturechange", onGesture);
      el.removeEventListener("gestureend", onGesture);
    };
  }, [containerRef, enabled]);
}

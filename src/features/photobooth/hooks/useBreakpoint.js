import { useEffect, useState } from "react";

/** mobile <768 · tablet 768–1023 · desktop ≥1024 */
export function useBreakpoint() {
  const [bp, setBp] = useState(() => getBreakpoint());

  useEffect(() => {
    const onResize = () => setBp(getBreakpoint());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return bp;
}

function getBreakpoint() {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

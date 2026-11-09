import { useEffect, useState } from "react";
import { fetchFrames } from "../api/ptbApi";
import { mapApiFrames } from "../lib/frameUtils";
import { BOOTH_UNIT_ID, fetchBoothFrameList, loadBoothFrames } from "../lib/boothPacks";

/**
 * Khung cho khách chọn. Khi web được cài như một máy booth (VITE_BOOTH_UNIT_ID) thì dùng đúng bộ khung của máy đó,
 * vẽ bằng pack như booth. Chưa cài, hoặc máy chưa có khung nào dùng được: về kho khung cũ như trước.
 */
export function usePtbFrames() {
  const [frames, setFrames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const abort = new AbortController();
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");
      try {
        if (BOOTH_UNIT_ID) {
          let list = [];
          try {
            list = await fetchBoothFrameList();
          } catch {
            list = [];
          }
          if (list.length) {
            let shown = false;
            const got = await loadBoothFrames(
              list,
              (items) => {
                if (cancelled) return;
                setFrames(items);
                if (!shown) {
                  shown = true;
                  setLoading(false);
                }
              },
              { signal: abort.signal },
            );
            if (got.length) return;
          }
        }
        const items = await fetchFrames();
        if (!cancelled) setFrames(mapApiFrames(items));
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.message || "Không tải được khung ảnh");
          setFrames([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      abort.abort();
    };
  }, []);

  return { frames, loading, error };
}

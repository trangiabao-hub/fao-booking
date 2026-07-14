import { useEffect, useState } from "react";
import { fetchFrames } from "../api/ptbApi";
import { mapApiFrames } from "../lib/frameUtils";

export function usePtbFrames() {
  const [frames, setFrames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const items = await fetchFrames();
        const mapped = mapApiFrames(items);
        if (!cancelled) setFrames(mapped);
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
    };
  }, []);

  return { frames, loading, error };
}

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  FRAME_SLOT_BG,
  FRAME_QUICK_EDITOR_W,
  loadFrameQuickPreview,
  peekFrameQuickPreview,
} from "../frameImageLoader";
import { toSameOriginUploadsUrl } from "../utils";

const FADE_MS = 120;

/**
 * Blur-up: JPEG ~180px hiện ngay → PNG full đè lên khi decode xong.
 * suppressOpaquePreview: bỏ JPEG (ảnh user nằm dưới lỗ trong suốt).
 */
export default function ProgressiveFrameImage({
  src,
  className = "",
  wrapperClassName = "relative",
  wrapperStyle,
  alt = "",
  fetchPriority = "high",
  suppressOpaquePreview = false,
}) {
  const resolved = src ? toSameOriginUploadsUrl(src) : null;
  const isInline = Boolean(
    resolved && (resolved.startsWith("data:") || resolved.startsWith("blob:"))
  );
  const useQuick = Boolean(resolved && !suppressOpaquePreview && !isInline);

  const [quickSrc, setQuickSrc] = useState(() =>
    useQuick ? peekFrameQuickPreview(resolved, FRAME_QUICK_EDITOR_W) : null
  );
  const [fullReady, setFullReady] = useState(isInline);
  const imgRef = useRef(null);

  const markFullReady = useCallback(() => setFullReady(true), []);

  useEffect(() => {
    if (!useQuick) {
      setQuickSrc(null);
      return undefined;
    }
    const cached = peekFrameQuickPreview(resolved, FRAME_QUICK_EDITOR_W);
    if (cached) setQuickSrc(cached);

    let cancelled = false;
    loadFrameQuickPreview(resolved, FRAME_QUICK_EDITOR_W).then((url) => {
      if (!cancelled && url) setQuickSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [resolved, useQuick]);

  useEffect(() => {
    if (isInline) setFullReady(true);
    else setFullReady(false);
  }, [resolved, isInline]);

  useLayoutEffect(() => {
    const img = imgRef.current;
    if (!img || !resolved) return;
    if (img.complete && img.naturalWidth > 0) markFullReady();
  }, [resolved, markFullReady]);

  if (!resolved) return null;

  const layerClass = `${className} absolute inset-0 w-full h-full`;
  const showQuick = useQuick && quickSrc && !fullReady;

  return (
    <div
      className={`${wrapperClassName} overflow-hidden`}
      style={{
        backgroundColor: suppressOpaquePreview ? "transparent" : FRAME_SLOT_BG,
        ...wrapperStyle,
      }}
    >
      {showQuick && (
        <img
          src={quickSrc}
          alt=""
          aria-hidden
          className={`${layerClass} object-fill scale-[1.02] blur-[3px] brightness-[1.02]`}
          draggable={false}
          decoding="sync"
          fetchPriority={fetchPriority}
        />
      )}

      <img
        ref={imgRef}
        src={resolved}
        alt={alt}
        className={`${layerClass} transition-opacity ease-out ${
          fullReady ? "opacity-100" : "opacity-0"
        }`}
        style={{ transitionDuration: `${FADE_MS}ms` }}
        draggable={false}
        loading="eager"
        decoding="async"
        fetchPriority={fetchPriority === "high" ? "high" : "auto"}
        onLoad={markFullReady}
      />
    </div>
  );
}

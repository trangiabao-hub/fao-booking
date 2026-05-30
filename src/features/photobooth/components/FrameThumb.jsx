import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { toSameOriginUploadsUrl } from "../utils";
import {
  FRAME_SLOT_BG,
  FRAME_QUICK_THUMB_W,
  loadFrameQuickPreview,
  peekFrameQuickPreview,
} from "../frameImageLoader";

const FADE_MS = 120;

/** Thumbnail — blur-up JPEG 80px → ảnh gốc */
export default function FrameThumb({
  src,
  alt = "",
  active = false,
  className = "object-contain absolute inset-0 w-full h-full",
  wrapperClassName = "relative w-full h-full overflow-hidden",
  wrapperStyle,
}) {
  const resolved = src ? toSameOriginUploadsUrl(src) : null;
  const isInline = Boolean(
    resolved && (resolved.startsWith("data:") || resolved.startsWith("blob:"))
  );

  const [quickSrc, setQuickSrc] = useState(() =>
    resolved && !isInline ? peekFrameQuickPreview(resolved, FRAME_QUICK_THUMB_W) : null
  );
  const [fullReady, setFullReady] = useState(isInline);
  const imgRef = useRef(null);

  const markFullReady = useCallback(() => setFullReady(true), []);

  useEffect(() => {
    if (!resolved || isInline) return undefined;
    const cached = peekFrameQuickPreview(resolved, FRAME_QUICK_THUMB_W);
    if (cached) setQuickSrc(cached);

    let cancelled = false;
    loadFrameQuickPreview(resolved, FRAME_QUICK_THUMB_W).then((url) => {
      if (!cancelled && url) setQuickSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [resolved, isInline]);

  useLayoutEffect(() => {
    const img = imgRef.current;
    if (!img || !resolved) return;
    if (img.complete && img.naturalWidth > 0) markFullReady();
  }, [resolved, markFullReady]);

  if (!resolved) {
    return (
      <div
        className={wrapperClassName}
        style={{ backgroundColor: FRAME_SLOT_BG, ...wrapperStyle }}
      >
        <div className="absolute inset-0 bg-pink-100/60 animate-pulse" aria-hidden />
      </div>
    );
  }

  const showQuick = quickSrc && !fullReady;

  return (
    <div
      className={wrapperClassName}
      style={{ backgroundColor: FRAME_SLOT_BG, ...wrapperStyle }}
    >
      {showQuick && (
        <img
          src={quickSrc}
          alt=""
          aria-hidden
          className={`${className} scale-[1.03] blur-[2px]`}
          draggable={false}
          decoding="sync"
          fetchPriority={active ? "high" : "auto"}
        />
      )}
      <img
        ref={imgRef}
        src={resolved}
        alt={alt}
        className={`${className} transition-opacity ease-out ${
          fullReady ? "opacity-100" : "opacity-0"
        }`}
        style={{ transitionDuration: `${FADE_MS}ms` }}
        draggable={false}
        loading={active ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={active ? "high" : "auto"}
        onLoad={markFullReady}
      />
    </div>
  );
}

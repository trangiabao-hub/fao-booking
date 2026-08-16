import React, { useEffect, useRef } from "react";
import { CameraIcon } from "@heroicons/react/24/outline";
import { PHOTO_THEMES } from "../lib/constants";
import {
  buildSlotRects,
  getLayoutDef,
  getSlotCount,
  isPlainFrame,
  pinchDistance,
} from "../lib/utils";
import PlainStripPreview from "./PlainStripPreview";

export default function StripPreview(props) {
  const { strip } = props;
  if (isPlainFrame(strip) && !strip?.frameOverlaySrc) {
    return <PlainStripPreview {...props} />;
  }
  return <OverlayStripPreview {...props} />;
}

function OverlayStripPreview({
  strip,
  previewWidth = 220,
  theme,
  onSlotUpload,
  onSlotRemove,
  onDragStart,
  onDragMove,
  onDragEnd,
  onPinchZoom,
  dragState,
  readOnly = false,
  showShadow = true,
}) {
  const fileInputRefs = useRef({});
  const pinchRef = useRef(null);
  const tapRef = useRef(null);
  const containerRef = useRef(null);
  const wheelStateRef = useRef({ images: [], positions: [], onPinchZoom, readOnly });
  const layout = getLayoutDef(strip.layoutType);
  const slotCount = getSlotCount(strip);
  const frameOptions = strip.frameLayoutOptions ?? null;
  const slotLayout = frameOptions?.slotLayout;
  const slotRects = buildSlotRects(slotLayout, slotCount);
  const hasCustomLayout = slotRects.length > 0;
  const frameAspectRatio = frameOptions?.frameAspectRatio ?? 1;
  const activeTheme = theme ?? PHOTO_THEMES.none;
  const imagePositions = strip.imagePositions ?? [];

  wheelStateRef.current = {
    images: strip.images ?? [],
    positions: imagePositions,
    onPinchZoom,
    readOnly,
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    const handleWheel = (e) => {
      const { images, positions, onPinchZoom: zoomFn, readOnly: locked } =
        wheelStateRef.current;
      if (locked || !zoomFn) return;
      const slotEl = e.target.closest?.("[data-slot-index]");
      if (!slotEl || !el.contains(slotEl)) return;
      const slotIndex = Number(slotEl.dataset.slotIndex);
      if (!images[slotIndex]) return;
      e.preventDefault();
      const currentZoom = positions[slotIndex]?.zoom ?? 1;
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      zoomFn(slotIndex, currentZoom + delta);
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  const innerStyle = hasCustomLayout
    ? {
        position: "relative",
        width: previewWidth,
        aspectRatio: `${1 / frameAspectRatio}`,
        overflow: "hidden",
        background: activeTheme.bg ?? "#fff",
        borderRadius: 12,
      }
    : {
        position: "relative",
        width: previewWidth,
        display: "grid",
        gridTemplateColumns: `repeat(${layout.cols ?? 1}, 1fr)`,
        gap: 6,
        padding: 8,
        background: activeTheme.bg ?? "#fff",
        borderRadius: 12,
      };

  return (
    <div
      className="mx-auto"
      style={{
        width: previewWidth,
        boxShadow: showShadow ? "0 2px 10px rgba(16, 24, 40, 0.08)" : "none",
      }}
    >
      <div ref={containerRef} style={innerStyle}>
        {Array.from({ length: slotCount }).map((_, slotIndex) => {
          const imageSrc = strip.images?.[slotIndex];
          const rawPosition = imagePositions[slotIndex];
          const position = {
            x: Number.isFinite(rawPosition?.x) ? rawPosition.x : 50,
            y: Number.isFinite(rawPosition?.y) ? rawPosition.y : 50,
            zoom: Number.isFinite(rawPosition?.zoom) ? rawPosition.zoom : 1,
          };
          const rect = hasCustomLayout
            ? slotRects[Math.min(slotIndex, slotRects.length - 1)]
            : null;
          const isDragging =
            !readOnly && dragState?.slotIndex === slotIndex && dragState?.active;

          const slotStyle = hasCustomLayout
            ? {
                position: "absolute",
                left: `${(rect?.leftRatio ?? 0) * 100}%`,
                top: `${(rect?.topRatio ?? 0) * 100}%`,
                width: `${(rect?.widthRatio ?? 1) * 100}%`,
                height: `${(rect?.heightRatio ?? 0.25) * 100}%`,
              }
            : { position: "relative", aspectRatio: "4/3" };

          return (
            <div
              key={slotIndex}
              data-slot-index={slotIndex}
              style={slotStyle}
              className={`overflow-hidden bg-white/90 ${
                imageSrc ? "ring-1 ring-[#FCE7F3]" : ""
              }`}
              onPointerDown={(e) => {
                if (readOnly || !imageSrc) return;
                if (e.target.closest?.("[data-slot-action]")) return;
                e.currentTarget.setPointerCapture?.(e.pointerId);
                tapRef.current = { x: e.clientX, y: e.clientY, moved: false };
                onDragStart?.(slotIndex, e.clientX, e.clientY);
              }}
              onPointerMove={(e) => {
                if (!isDragging) return;
                const tap = tapRef.current;
                if (
                  tap &&
                  Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 6
                ) {
                  tap.moved = true;
                }
                onDragMove?.(slotIndex, e.clientX, e.clientY);
              }}
              onPointerUp={() => {
                const tap = tapRef.current;
                tapRef.current = null;
                onDragEnd?.();
                if (tap && !tap.moved && imageSrc && !readOnly) {
                  fileInputRefs.current[slotIndex]?.click();
                }
              }}
              onPointerCancel={() => {
                tapRef.current = null;
                onDragEnd?.();
              }}
              onTouchStart={(e) => {
                if (readOnly) return;
                if (e.touches.length === 2) {
                  tapRef.current = null;
                  pinchRef.current = {
                    slotIndex,
                    distance: pinchDistance(e.touches),
                    zoom: position.zoom ?? 1,
                  };
                }
              }}
              onTouchMove={(e) => {
                if (readOnly) return;
                if (
                  e.touches.length === 2 &&
                  pinchRef.current?.slotIndex === slotIndex
                ) {
                  const dist = pinchDistance(e.touches);
                  const ratio = dist / (pinchRef.current.distance || 1);
                  onPinchZoom?.(slotIndex, pinchRef.current.zoom * ratio);
                }
              }}
              onTouchEnd={() => {
                pinchRef.current = null;
              }}
            >
              {!readOnly ? (
                <input
                  ref={(el) => {
                    fileInputRefs.current[slotIndex] = el;
                  }}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      onSlotUpload?.(slotIndex, e.target.files);
                    }
                    e.target.value = "";
                  }}
                />
              ) : null}

              {imageSrc ? (
                <div className="relative h-full w-full">
                  <img
                    src={imageSrc}
                    alt=""
                    className="pointer-events-none h-full w-full select-none object-cover"
                    style={{
                      objectPosition: `${position.x}% ${position.y}%`,
                      transform: `scale(${position.zoom ?? 1})`,
                      transformOrigin: `${position.x}% ${position.y}%`,
                    }}
                    draggable={false}
                  />
                  {!readOnly ? (
                    <button
                      type="button"
                      data-slot-action="remove"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onSlotRemove?.(slotIndex);
                      }}
                      className="absolute right-1 top-1 z-30 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm font-bold leading-none text-white shadow-sm backdrop-blur-sm"
                      aria-label={`Xóa ảnh ${slotIndex + 1}`}
                    >
                      ×
                    </button>
                  ) : null}
                </div>
              ) : readOnly ? (
                <div className="flex h-full w-full items-center justify-center bg-[#FCE7F3]/30" />
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRefs.current[slotIndex]?.click()}
                  className="flex h-full min-h-[44px] w-full flex-col items-center justify-center gap-1 bg-[#FFF9FC] text-[#667085] transition-colors hover:bg-[#FCE7F3]/50 hover:text-[#E6007E]"
                  aria-label={`Thêm ảnh ${slotIndex + 1}`}
                >
                  <CameraIcon className="h-5 w-5" strokeWidth={1.5} />
                  <span className="text-[11px] font-semibold">
                    Ảnh {slotIndex + 1}
                  </span>
                </button>
              )}
            </div>
          );
        })}

        {strip.frameOverlaySrc ? (
          <img
            src={strip.frameOverlaySrc}
            alt=""
            className="pointer-events-none absolute inset-0 z-[5] h-full w-full object-fill"
            draggable={false}
          />
        ) : null}
      </div>
    </div>
  );
}

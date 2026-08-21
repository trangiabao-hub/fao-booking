import React, { useEffect, useRef, useState } from "react";
import { CameraIcon } from "@heroicons/react/24/outline";
import { PLAIN_FRAME_DEFAULTS } from "../lib/constants";
import {
  clamp,
  getPlainFrameMetrics,
  getSlotCount,
  pinchDistance,
} from "../lib/utils";
import { BW_PREVIEW_FILTER } from "../lib/bwGrade";

/**
 * Frame trơn — layout theo demo-frame; đổi màu nền + chữ brand.
 * API khớp StripPreview booking (slotIndex, không stripId).
 */
export default function PlainStripPreview({
  strip,
  previewWidth,
  dragState,
  onSlotUpload,
  onSlotRemove,
  onAdjustSlot,
  onDragStart,
  onDragMove,
  onDragEnd,
  onPinchZoom,
  readOnly = false,
  showShadow = true,
  bwPhotos = false,
}) {
  const fileInputRefs = useRef({});
  const pinchRef = useRef(null);
  const tapRef = useRef(null);
  const [, setFontReady] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const mark = () => {
      if (!cancelled) setFontReady((n) => n + 1);
    };
    if (document?.fonts?.load) {
      Promise.all([
        document.fonts.load('400 48px "Pinyon Script"'),
        document.fonts.load('400 48px "Great Vibes"'),
      ])
        .then(mark)
        .catch(() => {});
    }
    document?.fonts?.ready?.then(mark).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const layoutType = strip.layoutType ?? "1x4";
  const slotCount = getSlotCount(strip);
  const widthPx = Math.max(1, previewWidth || 140);
  const metrics = getPlainFrameMetrics(layoutType, widthPx, {
    showBrand: strip.showBrand !== false,
  });
  const {
    heightPx,
    brandPx,
    padPx,
    padY,
    padBottom,
    footerPx,
    gapPx,
    is1x1,
    is2x2,
    is3x3,
    showBrand,
  } = metrics;
  const frameColor = strip.frameColor || PLAIN_FRAME_DEFAULTS.frameColor;
  const brandScript =
    (strip.brandScript ?? PLAIN_FRAME_DEFAULTS.brandScript).trim() ||
    PLAIN_FRAME_DEFAULTS.brandScript;
  const brandColor = strip.brandColor || PLAIN_FRAME_DEFAULTS.brandColor;
  const imagePositions = strip.imagePositions ?? [];
  const scriptSize = Math.max(12, Math.round(brandPx * 0.72));
  const isGrid = is2x2 || is3x3;

  const boxesStyle = is1x1
    ? {
        position: "absolute",
        top: 0,
        left: 0,
        right: footerPx,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        gap: gapPx,
        padding: `${padY}px 0 ${padY}px ${padPx}px`,
        zIndex: 1,
      }
    : {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: footerPx,
        display: isGrid ? "grid" : "flex",
        flexDirection: isGrid ? undefined : "column",
        gridTemplateColumns: is3x3
          ? "1fr 1fr 1fr"
          : is2x2
            ? "1fr 1fr"
            : undefined,
        gridTemplateRows: is3x3
          ? "1fr 1fr 1fr"
          : is2x2
            ? "1fr 1fr"
            : undefined,
        gap: gapPx,
        padding: `${padY}px ${padPx}px ${padBottom}px`,
        background: is3x3 ? "#000000" : undefined,
        zIndex: 1,
      };

  const overlayStyle = is1x1
    ? {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        width: footerPx,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2,
        pointerEvents: "none",
      }
    : {
        position: "absolute",
        left: 0,
        bottom: 0,
        width: "100%",
        height: footerPx,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: is3x3 ? "#000000" : undefined,
        zIndex: 2,
        pointerEvents: "none",
      };

  return (
    <div
      className="mx-auto"
      style={{
        position: "relative",
        width: widthPx,
        height: heightPx,
        flexShrink: 0,
        overflow: "hidden",
        background: frameColor,
        boxShadow: showShadow ? "0 2px 10px rgba(16, 24, 40, 0.08)" : "none",
      }}
    >
      <div style={boxesStyle}>
        {Array.from({ length: slotCount }).map((_, slotIndex) => {
          const imageSrc = strip.images?.[slotIndex];
          const position = imagePositions[slotIndex] ?? {
            x: 50,
            y: 50,
            zoom: 1,
          };
          const zoom = position.zoom ?? 1;
          const isDragging =
            !readOnly && dragState?.slotIndex === slotIndex && dragState?.active;

          return (
            <div
              key={slotIndex}
              data-slot-index={slotIndex}
              style={{
                position: "relative",
                flex: isGrid ? undefined : 1,
                minWidth: 0,
                minHeight: 0,
                overflow: "hidden",
                background: "#f0f0f0",
                touchAction: "none",
                cursor: imageSrc
                  ? isDragging
                    ? "grabbing"
                    : "grab"
                  : "pointer",
                userSelect: "none",
                ...(is1x1 ? { containerType: "size" } : null),
              }}
              onPointerDown={
                imageSrc && !readOnly
                  ? (event) => {
                      if (event.target.closest?.("[data-slot-action]")) return;
                      if (event.button != null && event.button !== 0) return;
                      event.currentTarget.setPointerCapture?.(event.pointerId);
                      tapRef.current = {
                        x: event.clientX,
                        y: event.clientY,
                        moved: false,
                      };
                      onDragStart?.(slotIndex, event.clientX, event.clientY);
                    }
                  : undefined
              }
              onPointerMove={
                imageSrc && !readOnly
                  ? (event) => {
                      if (!isDragging) return;
                      const tap = tapRef.current;
                      if (
                        tap &&
                        Math.hypot(event.clientX - tap.x, event.clientY - tap.y) >
                          6
                      ) {
                        tap.moved = true;
                      }
                      onDragMove?.(slotIndex, event.clientX, event.clientY);
                    }
                  : undefined
              }
              onPointerUp={
                imageSrc && !readOnly
                  ? () => {
                      const tap = tapRef.current;
                      tapRef.current = null;
                      onDragEnd?.();
                      if (tap && !tap.moved) {
                        if (onAdjustSlot) onAdjustSlot(slotIndex);
                        else fileInputRefs.current[slotIndex]?.click();
                      }
                    }
                  : undefined
              }
              onPointerCancel={() => {
                tapRef.current = null;
                onDragEnd?.();
              }}
              onTouchStart={
                imageSrc && !readOnly
                  ? (event) => {
                      if (event.touches.length === 2) {
                        event.preventDefault();
                        tapRef.current = null;
                        onDragEnd?.();
                        pinchRef.current = {
                          slotIndex,
                          distance: pinchDistance(event.touches),
                          zoom,
                        };
                      }
                    }
                  : undefined
              }
              onTouchMove={
                imageSrc && !readOnly
                  ? (event) => {
                      if (
                        event.touches.length !== 2 ||
                        pinchRef.current?.slotIndex !== slotIndex
                      ) {
                        return;
                      }
                      event.preventDefault();
                      const dist = pinchDistance(event.touches);
                      const ratio = dist / (pinchRef.current.distance || 1);
                      onPinchZoom?.(
                        slotIndex,
                        clamp((pinchRef.current.zoom ?? 1) * ratio, 0.5, 3),
                      );
                    }
                  : undefined
              }
              onTouchEnd={() => {
                if (pinchRef.current?.slotIndex === slotIndex) {
                  pinchRef.current = null;
                }
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
                    draggable={false}
                    className="pointer-events-none select-none"
                    style={{
                      ...(is1x1
                        ? {
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            width: "100cqh",
                            height: "100cqw",
                            maxWidth: "none",
                            objectFit: "cover",
                            objectPosition: `${position.x}% ${position.y}%`,
                            transform: `translate(-50%, -50%) rotate(-90deg) scale(${zoom})`,
                            transformOrigin: "center center",
                          }
                        : {
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            objectPosition: `${position.x}% ${position.y}%`,
                            transform: `scale(${zoom})`,
                            transformOrigin: `${position.x}% ${position.y}%`,
                          }),
                      ...(bwPhotos ? { filter: BW_PREVIEW_FILTER } : null),
                    }}
                  />
                  {!readOnly ? (
                    <>
                      <button
                        type="button"
                        data-slot-action="adjust"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAdjustSlot?.(slotIndex);
                        }}
                        className="absolute left-1 top-1 z-30 rounded-full bg-black/60 px-2 py-1 text-[10px] font-bold leading-none text-white"
                        aria-label={`Cắt ảnh ${slotIndex + 1}`}
                      >
                        Cắt
                      </button>
                      <button
                        type="button"
                        data-slot-action="replace"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRefs.current[slotIndex]?.click();
                        }}
                        className="absolute bottom-1 left-1 z-30 rounded-full bg-black/60 px-2 py-1 text-[10px] font-bold leading-none text-white"
                        aria-label={`Đổi ảnh ${slotIndex + 1}`}
                      >
                        Đổi
                      </button>
                      <button
                        type="button"
                        data-slot-action="remove"
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSlotRemove?.(slotIndex);
                        }}
                        className="absolute right-1 top-1 z-30 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm font-bold leading-none text-white"
                        aria-label={`Xóa ảnh ${slotIndex + 1}`}
                      >
                        ×
                      </button>
                    </>
                  ) : null}
                </div>
              ) : readOnly ? (
                <div className="flex h-full w-full items-center justify-center bg-[#FCE7F3]/30" />
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRefs.current[slotIndex]?.click()}
                  className="flex h-full w-full min-h-[44px] flex-col items-center justify-center gap-1 bg-[#FFF9FC] text-[#667085]"
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
      </div>

      {showBrand ? (
        <div style={overlayStyle}>
          <div
            className="ptb-plain-brand"
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: brandColor,
              textAlign: "center",
              lineHeight: 1,
              writingMode: is1x1 ? "vertical-rl" : undefined,
              transform: is1x1 ? "rotate(180deg)" : undefined,
              fontSize: scriptSize,
              fontWeight: 400,
            }}
          >
            {brandScript}
          </div>
        </div>
      ) : null}
    </div>
  );
}

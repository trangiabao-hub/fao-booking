import React, { useRef } from "react";
import { CameraIcon } from "@heroicons/react/24/solid";
import { PHOTO_THEMES } from "../constants";
import {
  buildSlotRects,
  getLayoutDef,
  getSlotCount,
  pinchDistance,
  expandSlotRectWithBleed,
  slotRectToPercentStyle,
} from "../utils";
import { useBlockViewportZoom } from "../hooks/useBlockViewportZoom";
import ProgressiveFrameImage from "./ProgressiveFrameImage";
import { FRAME_SLOT_BG } from "../frameImageLoader";
import { PREVIEW_WIDTH } from "../constants";

function EmptySlotPrompt({ showSlotLabel, slotIndex }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/90 shadow-lg shadow-pink-900/10 border border-pink-200/90 backdrop-blur-[2px]">
      <CameraIcon className="w-8 h-8 text-pink-600 shrink-0" aria-hidden />
      <span className="text-xs font-bold text-pink-900 leading-tight text-center">
        Bấm để thêm ảnh
      </span>
      {showSlotLabel && (
        <span className="text-[10px] font-medium text-pink-500/90">Ảnh {slotIndex + 1}</span>
      )}
    </div>
  );
}

function slotInputId(stripId, slotIndex) {
  return `ptb-file-${String(stripId)}-${slotIndex}`;
}

export default function StripPreview({
  strip,
  previewWidth = PREVIEW_WIDTH,
  theme,
  dragState,
  hoverState,
  fileInputRefs,
  pinchRef,
  onHoverEnter,
  onHoverLeave,
  onDragStart,
  onDragCancel,
  onWheelZoom,
  onPinchZoom,
  onUploadClick,
  onFileChange,
  onRemoveImage,
}) {
  const rootRef = useRef(null);
  useBlockViewportZoom(rootRef);

  const layout = getLayoutDef(strip.layoutType);
  const slotCount = getSlotCount(strip);
  const frameOptions = strip.frameLayoutOptions ?? null;
  const slotLayout = frameOptions?.slotLayout;
  const slotRects = buildSlotRects(slotLayout, slotCount);
  const hasCustomLayout = slotRects.length > 0;
  const frameAspectRatio = frameOptions?.frameAspectRatio ?? 1;
  const activeTheme = theme ?? PHOTO_THEMES.none;
  const firstRect = slotRects[0];
  const outerInsetPx =
    !hasCustomLayout && Number.isFinite(activeTheme.previewOuterInsetPx)
      ? Math.max(0, activeTheme.previewOuterInsetPx)
      : 0;
  const bottomInsetPx =
    !hasCustomLayout && Number.isFinite(activeTheme.previewBottomInsetPx)
      ? Math.max(0, activeTheme.previewBottomInsetPx)
      : 0;
  const slotGapPx = Math.max(5, Math.round(previewWidth * (frameOptions?.slotGapRatio ?? 0.012)));
  const cols = Math.max(1, layout.cols ?? 1);
  const cellWidthPx = hasCustomLayout
    ? previewWidth * (firstRect?.widthRatio ?? 1)
    : Math.max(1, (previewWidth - outerInsetPx * 2 - (cols - 1) * slotGapPx) / cols);
  const slotInsetPx = hasCustomLayout
    ? Math.round(cellWidthPx * (frameOptions?.slotInsetRatio ?? 0))
    : Math.max(
        activeTheme.previewInsetPx ?? 0,
        Math.round(cellWidthPx * (frameOptions?.slotInsetRatio ?? 0))
      );
  const imagePositions = strip.imagePositions ?? [];
  const slotImages = strip.images ?? [];
  const hasSlotPhotos = slotImages.slice(0, slotCount).some(Boolean);
  const headerPx = Math.max(0, (activeTheme.headerMm ?? 0) * 2);
  const footerPx = Math.max(0, (activeTheme.footerMm ?? 0) * 2);

  const innerLayoutStyle = hasCustomLayout
    ? {
        position: "relative",
        width: "100%",
        aspectRatio: `${1 / frameAspectRatio}`,
        overflow: "hidden",
      }
    : {
        position: "relative",
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        paddingLeft: outerInsetPx,
        paddingRight: outerInsetPx,
        gap: slotGapPx,
      };

  const renderSlot = (slotIndex) => {
    const imageSrc = slotImages[slotIndex];
    const position = imagePositions[slotIndex] ?? { x: 50, y: 50, zoom: 1 };
    const zoom = position.zoom ?? 1;
    const rect = hasCustomLayout ? slotRects[Math.min(slotIndex, slotRects.length - 1)] : null;
    const bleedRect = hasCustomLayout
      ? expandSlotRectWithBleed(
          rect,
          slotIndex > 0 ? slotRects[slotIndex - 1] : null,
          slotIndex < slotCount - 1 ? slotRects[slotIndex + 1] : null
        )
      : null;
    const isDragging = dragState?.stripId === strip.id && dragState?.imgIdx === slotIndex;
    const inputId = slotInputId(strip.id, slotIndex);

    return (
      <div
        key={slotIndex}
        className={hasCustomLayout ? "absolute" : "relative"}
        style={
          hasCustomLayout
            ? slotRectToPercentStyle(bleedRect)
            : { position: "relative" }
        }
        onMouseEnter={() => onHoverEnter?.(strip.id, slotIndex)}
        onMouseLeave={onHoverLeave}
      >
        <input
          id={inputId}
          ref={(el) => {
            if (el) {
              fileInputRefs.current[inputId] = el;
              fileInputRefs.current[`${strip.id}-${slotIndex}`] = el;
            }
          }}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFileChange?.(strip.id, slotIndex, e)}
        />
        <div
          className={`w-full h-full overflow-hidden ${
            hasCustomLayout ? "" : "aspect-[4/3]"
          } ${imageSrc ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-pointer"}`}
          style={{
            height: hasCustomLayout ? "100%" : undefined,
            backgroundColor: hasCustomLayout ? FRAME_SLOT_BG : "#f8f8f8",
            touchAction: "none",
          }}
          onClick={
            imageSrc
              ? undefined
              : () => {
                  fileInputRefs.current[inputId]?.click();
                  onUploadClick?.(strip.id, slotIndex);
                }
          }
          onMouseDown={
            imageSrc
              ? (e) => onDragStart?.(strip.id, slotIndex, e.clientX, e.clientY)
              : undefined
          }
          onTouchStart={
            imageSrc
              ? (e) => {
                  if (e.touches.length === 2) {
                    e.preventDefault();
                    pinchRef.current = {
                      stripId: strip.id,
                      imgIdx: slotIndex,
                      distance: pinchDistance(e.touches),
                    };
                    onDragCancel?.();
                    return;
                  }
                  if (e.touches.length === 1) {
                    e.preventDefault();
                    onDragStart?.(strip.id, slotIndex, e.touches[0].clientX, e.touches[0].clientY);
                  }
                }
              : undefined
          }
          onTouchMove={
            imageSrc
              ? (e) => {
                  if (e.touches.length !== 2) return;
                  const pinchState = pinchRef.current;
                  const distance = pinchDistance(e.touches);
                  if (
                    !pinchState ||
                    pinchState.stripId !== strip.id ||
                    pinchState.imgIdx !== slotIndex
                  ) {
                    pinchRef.current = { stripId: strip.id, imgIdx: slotIndex, distance };
                    return;
                  }
                  e.preventDefault();
                  const delta = Math.max(-0.15, Math.min(0.15, (distance - pinchState.distance) / 220));
                  if (Math.abs(delta) > 0.002) {
                    onPinchZoom?.(strip.id, slotIndex, delta);
                    pinchRef.current = { ...pinchState, distance };
                  }
                }
              : undefined
          }
          onTouchEnd={() => {
            const pinchState = pinchRef.current;
            if (pinchState?.stripId === strip.id && pinchState?.imgIdx === slotIndex) {
              pinchRef.current = null;
            }
          }}
          onWheel={imageSrc ? (e) => onWheelZoom?.(strip.id, slotIndex, e) : undefined}
        >
          <div className="w-full h-full" style={{ padding: hasCustomLayout ? 0 : slotInsetPx }}>
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={`Ảnh ${slotIndex + 1}`}
                draggable={false}
                className="relative z-0 block w-full h-full object-cover pointer-events-none select-none"
                style={{
                  objectPosition: `${position.x}% ${position.y}%`,
                  transform: `scale(${zoom ?? 1})`,
                  transformOrigin: `${position.x}% ${position.y}%`,
                }}
              />
            ) : (
              <div
                className={`w-full h-full flex items-center justify-center bg-[#FFF8FB] ${
                  hasCustomLayout ? "" : "border border-dashed border-pink-200/80"
                }`}
              >
                {!hasCustomLayout && <EmptySlotPrompt showSlotLabel slotIndex={slotIndex} />}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const slotsLayerStyle = hasCustomLayout
    ? { position: "relative", width: "100%", height: "100%", overflow: "hidden" }
    : {
        ...innerLayoutStyle,
        paddingTop: headerPx + outerInsetPx,
        paddingBottom: footerPx + outerInsetPx + bottomInsetPx,
      };

  const rootAspectStyle =
    hasCustomLayout && Number.isFinite(frameAspectRatio) && frameAspectRatio > 0
      ? { aspectRatio: `${1 / frameAspectRatio}`, width: "100%" }
      : undefined;

  const frameOverlaySrc =
    strip.frameOverlayExportSrc?.startsWith("data:")
      ? strip.frameOverlayExportSrc
      : strip.frameOverlaySrc;

  return (
    <div
      ref={rootRef}
      className="relative isolate w-full rounded-2xl overflow-hidden shadow-xl shadow-pink-500/15 touch-none select-none"
      style={{ touchAction: "none", ...rootAspectStyle }}
    >
      {/* z-[1]: ảnh user — in-flow (grid) hoặc fill khung custom; luôn dưới khung PNG */}
      <div
        className={`relative z-[1] ${hasCustomLayout ? "absolute inset-0" : ""}`}
        style={{
          ...slotsLayerStyle,
          background: hasCustomLayout ? FRAME_SLOT_BG : (activeTheme.bg ?? "#fff"),
          paddingTop: hasCustomLayout ? 0 : undefined,
          paddingBottom: hasCustomLayout ? 0 : undefined,
        }}
      >
        {Array.from({ length: slotCount }, (_, i) => renderSlot(i))}
      </div>

      {/* z-[5]: khung PNG — luôn trên ảnh (viền/họa tiết che, lỗ trong suốt để thấy ảnh) */}
      {frameOverlaySrc && (
        <ProgressiveFrameImage
          src={frameOverlaySrc}
          fetchPriority="high"
          suppressOpaquePreview={hasSlotPhotos}
          wrapperClassName="absolute inset-0 z-[5] pointer-events-none"
          className="object-fill"
        />
      )}

      {hasCustomLayout && (
        <div className="absolute inset-0 z-[6] pointer-events-none">
          {Array.from({ length: slotCount }, (_, slotIndex) => {
            if (slotImages[slotIndex]) return null;
            const rect = slotRects[Math.min(slotIndex, slotRects.length - 1)];
            if (!rect) return null;
            return (
              <label
                key={`empty-${slotIndex}`}
                htmlFor={slotInputId(strip.id, slotIndex)}
                className="absolute flex items-center justify-center p-1 cursor-pointer touch-manipulation pointer-events-auto"
                style={slotRectToPercentStyle(rect)}
                onMouseEnter={() => onHoverEnter?.(strip.id, slotIndex)}
                onMouseLeave={onHoverLeave}
              >
                <EmptySlotPrompt showSlotLabel={slotCount > 1} slotIndex={slotIndex} />
              </label>
            );
          })}
        </div>
      )}

      <div
        className={`absolute inset-0 z-[10] pointer-events-none ${
          hasCustomLayout ? "" : "grid"
        }`}
        style={
          hasCustomLayout
            ? undefined
            : {
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                paddingLeft: outerInsetPx,
                paddingRight: outerInsetPx,
                paddingTop: headerPx + outerInsetPx,
                paddingBottom: footerPx + outerInsetPx + bottomInsetPx,
                gap: slotGapPx,
              }
        }
      >
        {Array.from({ length: slotCount }, (_, slotIndex) => {
          if (!slotImages[slotIndex]) {
            return hasCustomLayout ? null : <div key={`remove-${slotIndex}`} />;
          }
          const rect = hasCustomLayout
            ? slotRects[Math.min(slotIndex, slotRects.length - 1)]
            : null;
          const isHovered =
            hoverState?.stripId === strip.id && hoverState?.imgIdx === slotIndex;

          return (
            <div
              key={`remove-${slotIndex}`}
              className={`pointer-events-none ${hasCustomLayout ? "absolute" : "relative"}`}
              style={hasCustomLayout ? slotRectToPercentStyle(rect) : undefined}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveImage?.(strip.id, slotIndex);
                }}
                onMouseEnter={() => onHoverEnter?.(strip.id, slotIndex)}
                onMouseLeave={onHoverLeave}
                className={`absolute top-1 right-1 z-[11] w-7 h-7 rounded-full bg-black/65 text-white text-base font-bold leading-none shadow-md pointer-events-auto flex items-center justify-center active:scale-95 transition-opacity ${
                  isHovered ? "opacity-100" : "opacity-90"
                }`}
                aria-label={`Xóa ảnh ${slotIndex + 1}`}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

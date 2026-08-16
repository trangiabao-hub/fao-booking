import React, { useLayoutEffect, useRef, useState } from "react";
import { Download, Images } from "lucide-react";
import StripPreview from "../StripPreview";
import {
  PHOTO_THEMES,
  PLAIN_COLOR_PRESETS,
  PLAIN_FRAME_ASPECT,
  LAYOUT_DEFS,
} from "../../lib/constants";
import { isPlainFrame } from "../../lib/utils";
import { cn } from "../../lib/theme";

const LAYOUT_SIZES = ["1x4", "2x2", "1x1", "3x3"];

function getFrameHeightRatio(strip) {
  if (isPlainFrame(strip) && !strip?.frameOverlaySrc) {
    return PLAIN_FRAME_ASPECT[strip.layoutType] ?? PLAIN_FRAME_ASPECT["1x4"];
  }
  return strip.frameLayoutOptions?.frameAspectRatio ?? 3;
}

export default function StripPreviewPanel({
  strip,
  onSlotUpload,
  onSlotRemove,
  onDragStart,
  onDragMove,
  onDragEnd,
  onPinchZoom,
  dragState,
  isMobile = false,
  selectedFrame = null,
  onOpenFrames,
  onLayoutChange,
  onUpdateStrip,
  onClearFrame,
  dualPreview = false,
  canSave = false,
  saving = false,
  onSave,
  printBw = false,
  printNoCrop = false,
  onPrintBwChange,
  onPrintNoCropChange,
}) {
  const [previewWidth, setPreviewWidth] = useState(140);
  const panelRef = useRef(null);
  const boxRef = useRef(null);
  const frameRatio = getFrameHeightRatio(strip);
  const previewAspect = dualPreview ? frameRatio / 2 : frameRatio;
  const hasOverlay = Boolean(strip.frameOverlaySrc);
  const plainMode = isPlainFrame(strip) && !hasOverlay;
  const dualSame = strip.dualSame !== false;
  const activeLayout = strip.layoutType ?? "1x4";

  // Giống staff: đo theo box thật — không bao giờ ép size lớn hơn ô (iPhone Safari)
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return undefined;

    const measure = () => {
      const pad = isMobile ? 2 : 8;
      const boxHeight = Math.max(0, box.clientHeight - pad);
      const boxWidth = Math.max(0, box.clientWidth - pad);
      if (boxHeight <= 0 || !(previewAspect > 0)) return;
      const totalFromHeight = Math.floor(
        boxHeight / Math.max(previewAspect, 0.5),
      );
      const totalFromWidth = Math.floor(boxWidth);
      // Chỉ fit trong box — minTotal cũ (200) làm strip tràn đè chip layout trên iPhone
      const fitted = Math.min(
        totalFromHeight,
        totalFromWidth > 0 ? totalFromWidth : totalFromHeight,
      );
      // Chưa đo xong / ô quá nhỏ — giữ width cũ, không ép min làm tràn
      if (fitted < 40) return;
      const totalW = fitted;
      const stripW = dualPreview
        ? Math.max(32, Math.floor(totalW / 2))
        : totalW;
      setPreviewWidth(stripW);
    };

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", measure);
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    if (panelRef.current) ro.observe(panelRef.current);

    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      vv?.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, [
    previewAspect,
    dualPreview,
    isMobile,
    strip?.id,
    strip?.layoutType,
    strip?.frameSource,
  ]);

  const previewProps = {
    strip,
    previewWidth,
    theme: PHOTO_THEMES.none,
    onSlotUpload,
    onSlotRemove,
    onDragStart,
    onDragMove,
    onDragEnd,
    onPinchZoom,
    dragState,
  };

  const panelWidth = isMobile
    ? undefined
    : Math.max(
        200,
        (dualPreview ? previewWidth * 2 : previewWidth) + 40,
      );

  return (
    <aside
      className={cn(
        isMobile
          ? "flex w-full min-h-0 flex-1 flex-col"
          : "flex max-w-[48%] shrink-0 flex-col self-stretch",
      )}
      style={isMobile ? undefined : { width: panelWidth }}
    >
      <div
        ref={panelRef}
        className={cn(
          "flex min-h-0 flex-1 flex-col border border-[#F1E4EC] bg-white shadow-[0_12px_32px_rgba(16,24,40,0.06)]",
          isMobile
            ? "overflow-hidden p-1.5"
            : "h-full overflow-hidden p-2.5 lg:p-3",
        )}
      >
        {!hasOverlay ? (
          <div className="relative z-10 mb-1 flex shrink-0 flex-wrap justify-center gap-1 bg-white pb-0.5">
            {LAYOUT_SIZES.map((id) => {
              const def = LAYOUT_DEFS[id] ?? { label: id };
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onLayoutChange?.(id)}
                  className={cn(
                    "inline-flex items-center gap-1 border px-2 py-1 text-[11px] font-bold transition-colors sm:gap-1.5 sm:px-2.5 sm:text-[12px]",
                    activeLayout === id
                      ? "border-[#E6007E] bg-[#FCE7F3] text-[#E6007E]"
                      : "border-[#F1E4EC] bg-white text-[#667085] hover:border-[#F3D4E4] hover:text-[#E6007E]",
                  )}
                >
                  <span>{def.label || id}</span>
                  {def.hot ? (
                    <span className="rounded-[3px] bg-[#E6007E] px-1.5 py-px text-[9px] font-extrabold tracking-wide text-white">
                      HOT
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}

        <div
          ref={boxRef}
          className={cn(
            "relative z-0 flex w-full min-h-0 flex-1 items-center justify-center overflow-hidden bg-transparent p-0",
            isMobile && "min-h-[120px]",
          )}
        >
          <div
            className={cn(
              "flex max-h-full items-stretch justify-center",
              dualPreview && "shadow-[0_2px_10px_rgba(16,24,40,0.08)]",
            )}
            style={printBw ? { filter: "grayscale(1)" } : undefined}
          >
            <StripPreview {...previewProps} showShadow={!dualPreview} />
            {dualPreview && dualSame ? (
              <div className="pointer-events-none select-none" aria-hidden="true">
                <StripPreview
                  {...previewProps}
                  dragState={null}
                  onSlotUpload={() => {}}
                  onSlotRemove={() => {}}
                  onDragStart={() => {}}
                  onDragMove={() => {}}
                  onDragEnd={() => {}}
                  onPinchZoom={() => {}}
                  showShadow={false}
                />
              </div>
            ) : null}
          </div>
        </div>

        <div
          className={cn(
            "mt-1.5 flex shrink-0 flex-col border-t border-[#F1E4EC] bg-white",
            // Mobile Safari: config cuộn riêng — ưu tiên chiều cao preview
            isMobile
              ? "max-h-[min(42dvh,320px)] gap-1.5 overflow-y-auto overscroll-contain pt-1.5 [-webkit-overflow-scrolling:touch]"
              : "gap-2.5 pt-2.5",
          )}
        >
          {/* Khi in — chip toggle, quét nhanh hơn checkbox dọc */}
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[#98A2B3]">
              Khi in
            </p>
            <div className="flex flex-wrap gap-1">
              {dualPreview ? (
                <button
                  type="button"
                  onClick={() => onUpdateStrip?.({ dualSame: !dualSame })}
                  className={cn(
                    "inline-flex h-7 items-center border px-2 text-[11px] font-semibold transition-colors sm:h-8 sm:px-2.5 sm:text-[12px]",
                    dualSame
                      ? "border-[#E6007E] bg-[#FCE7F3] text-[#E6007E]"
                      : "border-[#E4E7EC] bg-white text-[#667085]",
                  )}
                  aria-pressed={dualSame}
                >
                  2 frame giống nhau
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => onPrintBwChange?.(!printBw)}
                className={cn(
                  "inline-flex h-7 items-center border px-2 text-[11px] font-semibold transition-colors sm:h-8 sm:px-2.5 sm:text-[12px]",
                  printBw
                    ? "border-[#E6007E] bg-[#FCE7F3] text-[#E6007E]"
                    : "border-[#E4E7EC] bg-white text-[#667085]",
                )}
                aria-pressed={printBw}
              >
                Trắng đen
              </button>
              <button
                type="button"
                onClick={() => onPrintNoCropChange?.(!printNoCrop)}
                className={cn(
                  "inline-flex h-7 items-center border px-2 text-[11px] font-semibold transition-colors sm:h-8 sm:px-2.5 sm:text-[12px]",
                  printNoCrop
                    ? "border-[#E6007E] bg-[#FCE7F3] text-[#E6007E]"
                    : "border-[#E4E7EC] bg-white text-[#667085]",
                )}
                aria-pressed={printNoCrop}
              >
                Không cắt
              </button>
            </div>
          </div>

          {plainMode ? (
            <>
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[#98A2B3]">
                  Màu khung
                </p>
                <div className="flex flex-wrap items-center gap-1">
                  {PLAIN_COLOR_PRESETS.map((preset) => {
                    const active =
                      (strip.frameColor || "").toLowerCase() ===
                      preset.color.toLowerCase();
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        title={preset.label}
                        onClick={() =>
                          onUpdateStrip?.({
                            frameColor: preset.color,
                            brandColor: preset.brand,
                          })
                        }
                        className={cn(
                          "inline-flex h-7 items-center gap-1 border px-1.5 text-[11px] font-semibold sm:h-8 sm:gap-1.5 sm:px-2 sm:text-[12px]",
                          active
                            ? "border-[#E6007E] bg-[#FCE7F3] text-[#E6007E]"
                            : "border-[#E4E7EC] bg-white text-[#344054]",
                        )}
                      >
                        <span
                          className="h-3.5 w-3.5 shrink-0 border border-black/10 sm:h-4 sm:w-4"
                          style={{ background: preset.color }}
                          aria-hidden
                        />
                        {preset.label}
                      </button>
                    );
                  })}
                  <label
                    title="Tùy chọn màu"
                    className={cn(
                      "relative inline-flex h-7 cursor-pointer items-center gap-1 overflow-hidden border px-1.5 text-[11px] font-semibold sm:h-8 sm:gap-1.5 sm:px-2 sm:text-[12px]",
                      !PLAIN_COLOR_PRESETS.some(
                        (p) =>
                          p.color.toLowerCase() ===
                          (strip.frameColor || "").toLowerCase(),
                      )
                        ? "border-[#E6007E] bg-[#FCE7F3] text-[#E6007E]"
                        : "border-[#E4E7EC] bg-white text-[#344054]",
                    )}
                  >
                    <span
                      className="h-3.5 w-3.5 shrink-0 border border-black/10 sm:h-4 sm:w-4"
                      style={{ background: strip.frameColor || "#ffffff" }}
                      aria-hidden
                    />
                    Khác
                    <input
                      type="color"
                      className="absolute inset-0 cursor-pointer opacity-0"
                      value={strip.frameColor || "#ffffff"}
                      onChange={(e) =>
                        onUpdateStrip?.({ frameColor: e.target.value })
                      }
                      aria-label="Chọn màu khung tùy chọn"
                    />
                  </label>
                </div>
              </div>

              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[#98A2B3]">
                  Chữ dưới frame
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateStrip?.({
                        showBrand: strip.showBrand === false,
                      })
                    }
                    className={cn(
                      "inline-flex h-7 shrink-0 items-center border px-2 text-[11px] font-semibold sm:h-8 sm:px-2.5 sm:text-[12px]",
                      strip.showBrand !== false
                        ? "border-[#E6007E] bg-[#FCE7F3] text-[#E6007E]"
                        : "border-[#E4E7EC] bg-white text-[#667085]",
                    )}
                    aria-pressed={strip.showBrand !== false}
                  >
                    {strip.showBrand !== false ? "Hiện" : "Ẩn"}
                  </button>
                  <input
                    type="text"
                    className="h-7 min-w-0 flex-1 border border-[#E4E7EC] bg-white px-2 text-[11px] font-semibold text-[#172033] outline-none focus:border-[#E6007E] disabled:cursor-not-allowed disabled:bg-[#F9FAFB] disabled:opacity-50 sm:h-8 sm:px-2.5 sm:text-[12px]"
                    value={strip.brandScript ?? ""}
                    placeholder="Vd: Faobooth"
                    disabled={strip.showBrand === false}
                    onChange={(e) =>
                      onUpdateStrip?.({ brandScript: e.target.value })
                    }
                    aria-label="Nội dung chữ"
                  />
                  <label
                    className={cn(
                      "relative inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center overflow-hidden border border-[#E4E7EC] bg-white sm:h-8 sm:w-8",
                      strip.showBrand === false &&
                        "pointer-events-none opacity-45",
                    )}
                    title="Màu chữ"
                  >
                    <span
                      className="h-3.5 w-3.5 border border-black/10 sm:h-4 sm:w-4"
                      style={{ background: strip.brandColor || "#1a1a1a" }}
                      aria-hidden
                    />
                    <input
                      type="color"
                      className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                      value={strip.brandColor || "#1a1a1a"}
                      disabled={strip.showBrand === false}
                      onChange={(e) =>
                        onUpdateStrip?.({ brandColor: e.target.value })
                      }
                      aria-label="Màu chữ"
                    />
                  </label>
                </div>
              </div>
            </>
          ) : null}

          {hasOverlay ? (
            <button
              type="button"
              className="w-full border border-[#FED7AA] bg-white py-1.5 text-[12px] font-bold text-[#C2410C] sm:py-2"
              onClick={() => onClearFrame?.()}
            >
              Về frame trơn
            </button>
          ) : null}

          {onSave ? (
            <button
              type="button"
              disabled={!canSave || saving}
              onClick={onSave}
              className={cn(
                "inline-flex w-full shrink-0 items-center justify-center gap-2 py-2 text-[13px] font-bold transition-colors sm:py-2.5",
                canSave && !saving
                  ? "bg-[#E6007E] text-white hover:bg-[#C4006A]"
                  : "cursor-not-allowed bg-[#F2F4F7] text-[#98A2B3]",
              )}
            >
              <Download size={16} aria-hidden />
              {saving ? "Đang lưu…" : "Lưu vào Album"}
            </button>
          ) : null}
        </div>

        {isMobile && onOpenFrames ? (
          <button
            type="button"
            onClick={onOpenFrames}
            className="mt-1.5 flex w-full shrink-0 items-center gap-2 border border-[#F1E4EC] bg-[#FFF7FB] px-2 py-1.5 text-left"
          >
            {selectedFrame?.src ? (
              <img
                src={selectedFrame.src}
                alt=""
                className="h-9 w-9 shrink-0 border border-[#F1E4EC] bg-white object-contain"
              />
            ) : (
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center border border-[#F1E4EC] bg-white text-[#E6007E]">
                <Images size={16} />
              </span>
            )}
            <span className="min-w-0 flex-1">
              <strong className="block text-[13px] font-bold leading-snug text-[#172033]">
                Đổi frame hoặc xem lại ảnh của bạn
              </strong>
              {selectedFrame?.label ? (
                <small className="block text-[11px] font-medium text-[#98A2B3]">
                  Đang dùng: {selectedFrame.label}
                </small>
              ) : null}
            </span>
          </button>
        ) : null}
      </div>
    </aside>
  );
}

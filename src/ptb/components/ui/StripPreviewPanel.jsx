import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Download, Images, Settings2, X } from "lucide-react";
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

function ConfigFields({
  strip,
  plainMode,
  dualPreview,
  dualSame,
  hasOverlay,
  printBw,
  printNoCrop,
  onUpdateStrip,
  onPrintBwChange,
  onPrintNoCropChange,
  onClearFrame,
  chipClass,
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#98A2B3]">
          Khi in
        </p>
        <div className="flex flex-wrap gap-1.5">
          {dualPreview ? (
            <button
              type="button"
              onClick={() => onUpdateStrip?.({ dualSame: !dualSame })}
              className={cn(
                chipClass,
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
              chipClass,
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
              chipClass,
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
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#98A2B3]">
              Màu khung
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
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
                      chipClass,
                      "gap-1.5",
                      active
                        ? "border-[#E6007E] bg-[#FCE7F3] text-[#E6007E]"
                        : "border-[#E4E7EC] bg-white text-[#344054]",
                    )}
                  >
                    <span
                      className="h-4 w-4 shrink-0 border border-black/10"
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
                  chipClass,
                  "relative cursor-pointer gap-1.5 overflow-hidden",
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
                  className="h-4 w-4 shrink-0 border border-black/10"
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
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#98A2B3]">
              Chữ dưới frame
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  onUpdateStrip?.({
                    showBrand: strip.showBrand === false,
                  })
                }
                className={cn(
                  chipClass,
                  "shrink-0",
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
                className="h-9 min-w-0 flex-1 border border-[#E4E7EC] bg-white px-2.5 text-[13px] font-semibold text-[#172033] outline-none focus:border-[#E6007E] disabled:cursor-not-allowed disabled:bg-[#F9FAFB] disabled:opacity-50"
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
                  "relative inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden border border-[#E4E7EC] bg-white",
                  strip.showBrand === false &&
                    "pointer-events-none opacity-45",
                )}
                title="Màu chữ"
              >
                <span
                  className="h-4 w-4 border border-black/10"
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
          className="w-full border border-[#FED7AA] bg-white py-2.5 text-[13px] font-bold text-[#C2410C]"
          onClick={() => onClearFrame?.()}
        >
          Về frame trơn
        </button>
      ) : null}
    </div>
  );
}

function SaveButton({ canSave, saving, onSave, className }) {
  if (!onSave) return null;
  return (
    <button
      type="button"
      disabled={!canSave || saving}
      onClick={onSave}
      className={cn(
        "inline-flex w-full shrink-0 items-center justify-center gap-2 py-2.5 text-[13px] font-bold transition-colors",
        canSave && !saving
          ? "bg-[#E6007E] text-white hover:bg-[#C4006A]"
          : "cursor-not-allowed bg-[#F2F4F7] text-[#98A2B3]",
        className,
      )}
    >
      <Download size={16} aria-hidden />
      {saving ? "Đang lưu…" : "Lưu vào Album"}
    </button>
  );
}

export default function StripPreviewPanel({
  strip,
  onSlotUpload,
  onSlotRemove,
  onAdjustSlot,
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
  const [configOpen, setConfigOpen] = useState(false);
  const panelRef = useRef(null);
  const boxRef = useRef(null);
  const frameRatio = getFrameHeightRatio(strip);
  const previewAspect = dualPreview ? frameRatio / 2 : frameRatio;
  const hasOverlay = Boolean(strip.frameOverlaySrc);
  const plainMode = isPlainFrame(strip) && !hasOverlay;
  const dualSame = strip.dualSame !== false;
  const activeLayout = strip.layoutType ?? "1x4";

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
      const fitted = Math.min(
        totalFromHeight,
        totalFromWidth > 0 ? totalFromWidth : totalFromHeight,
      );
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

  useEffect(() => {
    if (!configOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [configOpen]);

  const previewProps = {
    strip,
    previewWidth,
    theme: PHOTO_THEMES.none,
    onSlotUpload,
    onSlotRemove,
    onAdjustSlot,
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

  const chipClass =
    "inline-flex h-9 items-center border px-2.5 text-[13px] font-semibold transition-colors";

  const configProps = {
    strip,
    plainMode,
    dualPreview,
    dualSame,
    hasOverlay,
    printBw,
    printNoCrop,
    onUpdateStrip,
    onPrintBwChange,
    onPrintNoCropChange,
    onClearFrame,
    chipClass,
  };

  const activeHints = [
    printBw ? "BW" : null,
    printNoCrop ? "Không cắt" : null,
    dualPreview && dualSame ? "×2" : null,
  ].filter(Boolean);

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
            isMobile && "min-h-[160px]",
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
                  onAdjustSlot={() => {}}
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

        {/* Desktop: config inline */}
        {!isMobile ? (
          <div className="mt-2 flex shrink-0 flex-col gap-2.5 border-t border-[#F1E4EC] bg-white pt-2.5">
            <ConfigFields {...configProps} />
            <SaveButton canSave={canSave} saving={saving} onSave={onSave} />
          </div>
        ) : (
          <div className="mt-1.5 flex shrink-0 flex-col gap-1.5">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setConfigOpen(true)}
                className="inline-flex h-11 items-center justify-center gap-1.5 border border-[#F1E4EC] bg-white text-[13px] font-bold text-[#172033]"
              >
                <Settings2 size={16} aria-hidden />
                Tùy chỉnh
                {activeHints.length ? (
                  <span className="text-[10px] font-semibold text-[#E6007E]">
                    · {activeHints.join(" · ")}
                  </span>
                ) : null}
              </button>
              <SaveButton
                canSave={canSave}
                saving={saving}
                onSave={onSave}
                className="h-11 py-0"
              />
            </div>

            {onOpenFrames ? (
              <button
                type="button"
                onClick={onOpenFrames}
                className="flex w-full shrink-0 items-center gap-2 border border-[#F1E4EC] bg-[#FFF7FB] px-2 py-1.5 text-left"
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
        )}
      </div>

      {/* Mobile: config bottom sheet */}
      {isMobile && configOpen ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Tùy chỉnh in ảnh"
        >
          <button
            type="button"
            className="absolute inset-0 border-0 bg-[rgba(15,23,42,0.45)]"
            aria-label="Đóng"
            onClick={() => setConfigOpen(false)}
          />
          <div className="relative z-10 flex max-h-[min(78dvh,640px)] w-full flex-col bg-white shadow-[0_-16px_40px_rgba(16,24,40,0.16)] animate-[ptb-drawer-up_0.22s_ease-out]">
            <div className="flex shrink-0 items-center justify-between border-b border-[#F1E4EC] px-3.5 py-2.5">
              <h2 className="m-0 text-[15px] font-bold text-[#172033]">
                Tùy chỉnh
              </h2>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center border border-[#F1E4EC] bg-white text-[#667085]"
                aria-label="Đóng"
                onClick={() => setConfigOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3.5 py-3 [-webkit-overflow-scrolling:touch]">
              <ConfigFields {...configProps} />
            </div>
            <div className="shrink-0 border-t border-[#F1E4EC] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                className="inline-flex h-11 w-full items-center justify-center bg-[#E6007E] text-[13px] font-bold text-white"
                onClick={() => setConfigOpen(false)}
              >
                Xong
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}

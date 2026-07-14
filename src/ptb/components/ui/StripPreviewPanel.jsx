import React, { useLayoutEffect, useRef, useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import StripPreview from "../StripPreview";
import SaveToAlbumButton from "./SaveToAlbumButton";
import { PHOTO_THEMES } from "../../lib/constants";
import { cn, ptb } from "../../lib/theme";

function getFrameHeightRatio(strip) {
  return strip.frameLayoutOptions?.frameAspectRatio ?? 3;
}

export default function StripPreviewPanel({
  strip,
  selectedFrame,
  filledCount,
  slotCount,
  canSave,
  saving,
  hasFrame,
  onSave,
  onSlotUpload,
  onSlotRemove,
  onDragStart,
  onDragMove,
  onDragEnd,
  onPinchZoom,
  dragState,
}) {
  const [expanded, setExpanded] = useState(true);
  const [previewWidth, setPreviewWidth] = useState(180);
  const panelRef = useRef(null);
  const headerRef = useRef(null);
  const footerRef = useRef(null);
  const frameLabel = selectedFrame?.label ?? "Chưa chọn khung";
  const frameRatio = getFrameHeightRatio(strip);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return undefined;

    const measure = () => {
      const panelTop = panel.getBoundingClientRect().top;
      const maxPanelH = window.innerHeight - panelTop - 8;
      const headerH = headerRef.current?.offsetHeight ?? 0;
      const footerH = footerRef.current?.offsetHeight ?? 0;
      const previewPad = 24;
      const available = maxPanelH - headerH - footerH - previewPad;

      if (available < 80) return;

      const width = Math.min(
        window.innerWidth >= 1280 ? 280 : 240,
        Math.max(110, Math.floor(available / frameRatio)),
      );
      setPreviewWidth(width);
    };

    measure();
    window.addEventListener("resize", measure);
    const ro = new ResizeObserver(measure);
    ro.observe(panel);
    if (headerRef.current) ro.observe(headerRef.current);
    if (footerRef.current) ro.observe(footerRef.current);

    return () => {
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, [frameRatio, expanded, frameLabel]);

  return (
    <aside className="sticky top-[3.25rem] z-[9] w-full shrink-0 self-start lg:top-4 lg:w-[300px] xl:w-[340px]">
      <div
        ref={panelRef}
        className={cn(
          ptb.card,
          "flex max-h-[calc(100dvh-3.25rem-0.5rem)] flex-col overflow-hidden p-4 sm:p-5 lg:max-h-[calc(100dvh-1rem)]",
        )}
      >
        <div ref={headerRef} className="shrink-0">
          {/* Mobile compact bar */}
          <div className="flex items-center justify-between gap-3 lg:hidden">
            <div className="min-w-0">
              <p className={ptb.textCaption}>Strip của bạn</p>
              <p className="mt-0.5 truncate text-[14px] font-bold text-[#172033]">
                {frameLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex h-11 min-w-[44px] items-center justify-center gap-1 rounded-xl border border-[#F1E4EC] bg-[#FFF9FC] px-3 text-[12px] font-bold text-[#E6007E]"
              aria-expanded={expanded}
            >
              {expanded ? "Thu gọn" : "Xem strip"}
              {expanded ? (
                <ChevronUpIcon className="h-4 w-4" />
              ) : (
                <ChevronDownIcon className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Desktop header */}
          <div className="hidden lg:block">
            <p className={ptb.textCaption}>Strip của bạn</p>
            <p className="mt-1 text-[15px] font-bold text-[#172033]">{frameLabel}</p>
            <p className="mt-0.5 text-[12px] font-semibold text-[#E6007E]">
              Ảnh {filledCount}/{slotCount}
            </p>
          </div>
        </div>

        <div
          className={cn(
            "min-h-0 shrink transition-all duration-200",
            expanded ? "mt-3 flex flex-1 flex-col lg:mt-4" : "mt-3 hidden lg:mt-4 lg:flex lg:flex-1 lg:flex-col",
          )}
        >
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl border border-[#F1E4EC] bg-[#FFF9FC] p-2 shadow-[inset_0_1px_2px_rgba(16,24,40,0.04)]">
            <StripPreview
              strip={strip}
              previewWidth={previewWidth}
              theme={PHOTO_THEMES.none}
              onSlotUpload={onSlotUpload}
              onSlotRemove={onSlotRemove}
              onDragStart={onDragStart}
              onDragMove={onDragMove}
              onDragEnd={onDragEnd}
              onPinchZoom={onPinchZoom}
              dragState={dragState}
            />
          </div>
        </div>

        {!expanded ? (
          <div className="mt-3 flex shrink-0 justify-center lg:hidden">
            <div className="w-[72px] rounded-xl border border-[#F1E4EC] bg-white p-1 shadow-sm">
              <StripPreview
                strip={strip}
                previewWidth={64}
                theme={PHOTO_THEMES.none}
                readOnly
              />
            </div>
          </div>
        ) : null}

        <div ref={footerRef} className="mt-3 shrink-0 lg:mt-4">
          <p className={cn(ptb.textBody, "text-center text-[12px]")}>
            Chạm ảnh để thay · Kéo để chỉnh · Chụm để zoom
          </p>
          <div className="mt-3">
            <SaveToAlbumButton
              onClick={onSave}
              disabled={!canSave}
              saving={saving}
              hasFrame={hasFrame}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}

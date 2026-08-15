import React, { useLayoutEffect, useRef, useState } from "react";
import StripPreview from "../StripPreview";
import { PHOTO_THEMES } from "../../lib/constants";
import { cn, ptb } from "../../lib/theme";

const EDIT_HINT_SEEN_KEY = "ptb_edit_hint_seen";

function getFrameHeightRatio(strip) {
  return strip.frameLayoutOptions?.frameAspectRatio ?? 3;
}

export default function StripPreviewPanel({
  strip,
  filledCount,
  onSlotUpload,
  onSlotRemove,
  onDragStart,
  onDragMove,
  onDragEnd,
  onPinchZoom,
  dragState,
}) {
  const [previewWidth, setPreviewWidth] = useState(140);
  const [hintSeen, setHintSeen] = useState(() => {
    try {
      return localStorage.getItem(EDIT_HINT_SEEN_KEY) === "1";
    } catch {
      return false;
    }
  });
  const panelRef = useRef(null);
  const boxRef = useRef(null);
  const frameRatio = getFrameHeightRatio(strip);

  useLayoutEffect(() => {
    if (!dragState?.active || hintSeen) return;
    setHintSeen(true);
    try {
      localStorage.setItem(EDIT_HINT_SEEN_KEY, "1");
    } catch {
      /* ignore storage errors */
    }
  }, [dragState, hintSeen]);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const box = boxRef.current;
    if (!panel || !box) return undefined;

    const measure = () => {
      // Bề ngang cột quyết định kích thước strip (chiều cao suy ra từ tỉ lệ),
      // chỉ chặn thêm theo viewport để không tràn màn hình thấp / xoay ngang.
      const boxWidth = box.clientWidth - 8;
      const vh = window.innerHeight;
      const heightBudget = window.innerWidth >= 1024 ? vh - 200 : vh * 0.6;
      setPreviewWidth(
        Math.max(88, Math.min(boxWidth, Math.floor(heightBudget / frameRatio))),
      );
    };

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    const ro = new ResizeObserver(measure);
    ro.observe(panel);

    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      ro.disconnect();
    };
  }, [frameRatio]);

  return (
    <aside className="w-[40%] shrink-0 sm:w-[34%] lg:w-[26%] lg:max-w-[340px] xl:w-[22%]">
      <div
        ref={panelRef}
        className={cn(ptb.card, "flex h-full flex-col p-2 sm:p-3 lg:p-4")}
      >
        <p className={cn(ptb.textCaption, "hidden shrink-0 lg:block")}>
          Strip của bạn
        </p>

        <div
          ref={boxRef}
          className="flex min-h-0 flex-1 items-center justify-center rounded-lg bg-[#FFF9FC] p-1 lg:mt-3 lg:rounded-2xl lg:border lg:border-[#F1E4EC] lg:p-2"
        >
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

        <p
          className={cn(
            ptb.textBody,
            "mt-2 hidden shrink-0 text-center text-[12px] text-[#98A2B3] lg:block",
          )}
        >
          Kéo ảnh để chỉnh vị trí · Scroll để zoom
        </p>
        {!hintSeen && filledCount > 0 ? (
          <p className="mt-1.5 shrink-0 text-center text-[10px] font-medium leading-tight text-[#98A2B3] lg:hidden">
            Chạm để thay · Kéo để chỉnh
          </p>
        ) : null}
      </div>
    </aside>
  );
}

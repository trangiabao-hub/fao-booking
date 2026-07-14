import React, { useState } from "react";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { cn } from "../../lib/theme";

const THUMB_ASPECT = { "1x4": 5 / 15, "2x2": 8401 / 11813, "1x1": 7715 / 11572 };

function getThumbAspectRatio(frame, sizeType) {
  const hOverW =
    frame.frameAspectRatio ?? frame.frameLayoutOptions?.frameAspectRatio;
  if (hOverW) return 1 / hOverW;
  return THUMB_ASPECT[sizeType] ?? THUMB_ASPECT["1x4"];
}

function FrameThumb({ src, alt }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#FFF9FC]">
        <div className="h-[70%] w-[55%] rounded-md border border-dashed border-[#F1E4EC] bg-white" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="h-full w-full object-contain"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export default function FrameCard({ frame, selected, onSelect, sizeType }) {
  const resolvedSize = sizeType || frame.sizeType || frame.layoutType || "1x4";
  const thumbAspect = getThumbAspectRatio(frame, resolvedSize);
  const themeLabel = (frame.label || "").split(" · ")[0] || frame.label;

  return (
    <button
      type="button"
      onClick={() => onSelect(frame)}
      title={frame.label}
      aria-pressed={selected}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-white p-2 text-left transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EC4899]/40 focus-visible:ring-offset-2",
        selected
          ? "border-2 border-[#E6007E] shadow-[0_8px_24px_rgba(230,0,126,0.15)] ring-2 ring-[#FCE7F3]"
          : "border-[#EEF2F6] shadow-[0_4px_12px_rgba(16,24,40,0.04)] hover:-translate-y-0.5 hover:border-[#F3D4E4] hover:shadow-[0_12px_28px_rgba(16,24,40,0.08)]",
      )}
    >
      <div
        className="w-full overflow-hidden rounded-xl bg-[#FAFAFA]"
        style={{ aspectRatio: thumbAspect }}
      >
        <FrameThumb src={frame.src} alt={frame.label} />
      </div>

      {selected ? (
        <span className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md">
          <CheckCircleIcon className="h-5 w-5 text-[#E6007E]" aria-hidden />
        </span>
      ) : null}

      <div className="mt-2 px-0.5">
        <p className="truncate text-[12px] font-bold text-[#172033] sm:text-[13px]">
          {themeLabel}
        </p>
        <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#667085]">
          {resolvedSize}
        </p>
        {selected ? (
          <span className="mt-0.5 inline-block text-[10px] font-semibold uppercase tracking-wide text-[#E6007E]">
            Đang dùng
          </span>
        ) : null}
      </div>
    </button>
  );
}

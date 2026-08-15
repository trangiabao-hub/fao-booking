import React, { useState } from "react";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { cn } from "../../lib/theme";

const THUMB_RATIO = { "1x4": 15 / 5, "2x2": 11813 / 8401, "1x1": 11572 / 7715 };

/** Chiều cao / chiều rộng của khung. */
function getFrameRatio(frame, sizeType) {
  return (
    frame.frameAspectRatio ??
    frame.frameLayoutOptions?.frameAspectRatio ??
    THUMB_RATIO[sizeType] ??
    THUMB_RATIO["1x4"]
  );
}

function FrameThumb({ src, alt, ratio }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className="w-full border border-dashed border-[#F1E4EC] bg-white"
        style={{ aspectRatio: 1 / ratio }}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="h-auto w-full object-contain"
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

export default function FrameCard({ frame, selected, onSelect, sizeType }) {
  const resolvedSize = sizeType || frame.sizeType || frame.layoutType || "1x4";
  const ratio = getFrameRatio(frame, resolvedSize);

  return (
    <button
      type="button"
      onClick={() => onSelect(frame)}
      title={frame.label}
      // Không còn nhãn hiện ra nên tên khung phải nằm ở aria-label.
      aria-label={frame.label}
      role="radio"
      aria-checked={selected}
      className={cn(
        "group relative flex w-full min-w-0 items-center justify-end border p-1 transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EC4899]/40",
        selected
          ? "border-[#E6007E] bg-[#FFF1F8]"
          : "border-[#F1E4EC] hover:border-[#F3D4E4] hover:bg-[#FFF9FC]",
      )}
    >
      <div className="flex w-full items-center justify-end">
        <FrameThumb src={frame.src} alt="" ratio={ratio} />
      </div>

      {selected ? (
        <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow">
          <CheckCircleIcon className="h-4 w-4 text-[#E6007E]" aria-hidden />
        </span>
      ) : null}
    </button>
  );
}

import React from "react";
import { GiftIcon } from "@heroicons/react/24/solid";
import {
  PhotoIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import { FREE_PRINT_QUOTA } from "../../lib/constants";
import { cn, ptb } from "../../lib/theme";

const actionClass =
  "inline-flex shrink-0 items-center gap-1 rounded-full border border-[#F3D4E4] px-2.5 py-1 text-[11px] font-bold text-[#D9488A] transition-colors hover:bg-[#FDE8F0]/70 sm:text-[12px]";

export default function AlbumHeaderCard({
  isReadonly,
  albumCount = 0,
  onViewAlbum,
  onShowGuide,
}) {
  return (
    <header
      className={cn(
        ptb.card,
        "flex shrink-0 items-center gap-2 px-3 py-1.5 sm:px-5 sm:py-3",
      )}
    >
      {isReadonly ? (
        <p className={cn(ptb.textBody, "min-w-0 flex-1 truncate text-[13px]")}>
          Album chỉ xem — chuyến thuê đã kết thúc.
        </p>
      ) : (
        <p className="flex min-w-0 flex-1 items-center gap-2 text-[12px] font-semibold text-emerald-800 sm:text-[14px]">
          <GiftIcon className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
          <span className="truncate">
            Tặng bạn {FREE_PRINT_QUOTA} ảnh miễn phí đơn này
          </span>
        </p>
      )}

      {onViewAlbum ? (
        <button type="button" onClick={onViewAlbum} className={actionClass}>
          <PhotoIcon className="h-4 w-4" aria-hidden />
          Ảnh của tôi
          {albumCount > 0 ? (
            <span className="ml-0.5 inline-flex min-w-[1.15rem] items-center justify-center rounded-full bg-[#FDE8F0] px-1 text-[10px] font-bold text-[#C7367A]">
              {albumCount}
            </span>
          ) : null}
        </button>
      ) : null}

      {onShowGuide ? (
        <button type="button" onClick={onShowGuide} className={actionClass}>
          <QuestionMarkCircleIcon className="h-4 w-4" aria-hidden />
          Hướng dẫn
        </button>
      ) : null}
    </header>
  );
}

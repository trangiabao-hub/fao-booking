import React from "react";
import { GiftIcon, PhotoIcon } from "@heroicons/react/24/solid";
import { FREE_PRINT_QUOTA } from "../../lib/constants";
import { cn, ptb } from "../../lib/theme";

export default function AlbumHeaderCard({ album, isReadonly }) {
  const freeRemaining = album?.freePrintRemaining ?? 0;
  const title = album?.title || "Album chuyến đi";

  const freeBadge = (
    <span className={ptb.badgeSuccess}>
      <GiftIcon className="h-4 w-4 text-emerald-600" />
      <span>
        {freeRemaining} / {FREE_PRINT_QUOTA} ảnh in miễn phí
      </span>
    </span>
  );

  return (
    <header className={cn(ptb.card, "p-4 sm:p-5")}>
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FCE7F3] sm:h-12 sm:w-12">
          <PhotoIcon className="h-6 w-6 text-[#E6007E]" />
        </div>
        <h1 className={cn(ptb.textTitle, "min-w-0 flex-1 truncate")}>{title}</h1>
        {!isReadonly ? (
          <div className="hidden shrink-0 sm:block">{freeBadge}</div>
        ) : null}
      </div>

      {isReadonly ? (
        <p
          className={cn(
            ptb.textBody,
            "mt-3 rounded-xl border border-[#EEF2F6] bg-[#F9FAFB] px-3 py-2.5",
          )}
        >
          Album chỉ xem — chuyến thuê đã kết thúc.
        </p>
      ) : (
        <div className="mt-3 sm:hidden">{freeBadge}</div>
      )}
    </header>
  );
}

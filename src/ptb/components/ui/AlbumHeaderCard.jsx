import React from "react";
import { GiftIcon } from "@heroicons/react/24/solid";
import { FREE_PRINT_QUOTA } from "../../lib/constants";
import { cn, ptb } from "../../lib/theme";

export default function AlbumHeaderCard({ isReadonly }) {
  return (
    <header className={cn(ptb.card, "shrink-0 px-3 py-1.5 sm:px-5 sm:py-3")}>
      {isReadonly ? (
        <p className={cn(ptb.textBody, "text-[13px]")}>
          Album chỉ xem — chuyến thuê đã kết thúc.
        </p>
      ) : (
        <p className="flex items-center gap-2 text-[12px] font-semibold text-emerald-800 sm:text-[14px]">
          <GiftIcon className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
          <span>
            Tặng bạn {FREE_PRINT_QUOTA} ảnh miễn phí đơn này
          </span>
        </p>
      )}
    </header>
  );
}

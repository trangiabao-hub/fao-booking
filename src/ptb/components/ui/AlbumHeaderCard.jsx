import React from "react";
import { GiftIcon, PhotoIcon } from "@heroicons/react/24/solid";
import { FREE_PRINT_QUOTA, PAID_PRINT_PRICE_VND } from "../../lib/constants";
import { cn, ptb } from "../../lib/theme";

export default function AlbumHeaderCard({ album, isReadonly }) {
  const freeRemaining = album?.freePrintRemaining ?? 0;
  const title = album?.title || "Album chuyến đi";

  return (
    <header className={cn(ptb.card, "p-4 sm:p-5")}>
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#FCE7F3]">
          <PhotoIcon className="h-6 w-6 text-[#E6007E]" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className={ptb.textTitle}>{title}</h1>
          <p className={cn(ptb.textBody, "mt-1")}>
            Ghép ảnh chuyến đi — nhận in đẹp khi trả máy tại shop.
          </p>
        </div>
      </div>

      {!isReadonly ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span className={ptb.badgeSuccess}>
            <GiftIcon className="h-4 w-4 text-emerald-600" />
            <span>
              {freeRemaining} / {FREE_PRINT_QUOTA} ảnh in miễn phí
            </span>
          </span>
          {freeRemaining < FREE_PRINT_QUOTA && freeRemaining >= 0 ? (
            <span className={cn(ptb.textBody, "text-[12px]")}>
              Ảnh thêm {PAID_PRINT_PRICE_VND.toLocaleString("vi-VN")}đ/strip
            </span>
          ) : freeRemaining > 0 ? (
            <span className={cn(ptb.textBody, "text-[12px]")}>
              Dùng khi trả máy tại shop FAO
            </span>
          ) : null}
        </div>
      ) : (
        <p
          className={cn(
            ptb.textBody,
            "mt-4 rounded-xl border border-[#EEF2F6] bg-[#F9FAFB] px-3 py-2.5",
          )}
        >
          Album chỉ xem — chuyến thuê đã kết thúc.
        </p>
      )}
    </header>
  );
}

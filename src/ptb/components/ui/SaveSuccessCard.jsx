import React from "react";
import { CheckCircleIcon, GiftIcon } from "@heroicons/react/24/solid";
import { cn, ptb } from "../../lib/theme";

export default function SaveSuccessCard({
  freeRemaining,
  onContinue,
  onViewAlbum,
  onGoPrint,
}) {
  return (
    <div className={cn(ptb.card, "flex flex-col items-center gap-4 p-6 text-center sm:p-8")}>
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
        <CheckCircleIcon className="h-8 w-8 text-emerald-500" aria-hidden />
      </span>

      <div>
        <p className={ptb.textSection}>Đã lưu vào Album</p>
        {freeRemaining > 0 ? (
          <p className={cn(ptb.textBody, "mt-1.5")}>
            Bạn còn <strong className="text-[#172033]">{freeRemaining} ảnh in miễn phí</strong>{" "}
            khi trả máy tại shop FAO.
          </p>
        ) : (
          <p className={cn(ptb.textBody, "mt-1.5")}>
            Ghép thêm strip hoặc xem lại album của bạn.
          </p>
        )}
      </div>

      <div className="flex w-full max-w-xs flex-col gap-2.5 sm:flex-row">
        <button type="button" onClick={onContinue} className={cn(ptb.btnPrimary, "sm:flex-1")}>
          Ghép ảnh tiếp
        </button>
        <button
          type="button"
          onClick={onViewAlbum}
          className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#F3D4E4] bg-white px-4 text-sm font-bold text-[#E6007E] transition-colors hover:bg-[#FCE7F3]/50 sm:h-[52px] sm:flex-1"
        >
          Xem Album
        </button>
      </div>

      <button
        type="button"
        onClick={onGoPrint}
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#667085] transition-colors hover:text-[#E6007E]"
      >
        <GiftIcon className="h-4 w-4" aria-hidden />
        Đặt in strip vừa lưu
      </button>
    </div>
  );
}

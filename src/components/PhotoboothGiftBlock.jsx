import React from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { normalizeBookingBranchId } from "../utils/deviceBranch";

/** Booth chỉ đặt ở Phú Nhuận nên chi nhánh khác không hứa quà frame. */
export function hasPhotoboothGift(branchId) {
  return normalizeBookingBranchId(branchId) === "PHU_NHUAN";
}

/**
 * Khối quà 2 frame photobooth — dùng ở bước xác nhận đơn (QuickBookModal)
 * và trang sau thanh toán. Nội dung giữ nguyên ở cả hai chỗ, chỉ khác dáng:
 * `stack` xếp dọc cho cột hẹp trong modal, `banner` xoay ngang từ sm trở lên
 * để không ăn hết chiều cao màn hình sau thanh toán.
 */
const VARIANTS = {
  stack: {
    container: "rounded-xl p-3.5",
    body: "",
    images: "justify-center",
    sideImage: "h-[167px] w-[106px]",
    centerImage: "h-[189px] w-[117px]",
    text: "mt-4 text-center",
    badgeRow: "justify-center",
    title: "text-[15px]",
    desc: "mx-auto mt-1.5 max-w-[34ch] text-[12px]",
  },
  banner: {
    container: "rounded-2xl p-4 sm:p-5",
    body: "sm:flex sm:items-center sm:gap-6",
    images: "justify-center sm:shrink-0",
    sideImage: "h-[150px] w-[95px]",
    centerImage: "h-[170px] w-[105px]",
    text: "mt-4 text-center sm:mt-0 sm:text-left",
    badgeRow: "justify-center sm:justify-start",
    title: "text-base sm:text-[17px]",
    desc: "mx-auto mt-1.5 max-w-[34ch] text-[13px] sm:mx-0",
  },
};

export default function PhotoboothGiftBlock({
  branchId,
  variant = "stack",
  className = "",
}) {
  if (!hasPhotoboothGift(branchId)) return null;

  const s = VARIANTS[variant] || VARIANTS.stack;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: 0.05 }}
      className={`relative overflow-hidden border border-[#ffd3e7] bg-gradient-to-br from-[#fff4f9] via-white to-[#fff7fb] ${s.container} ${className}`}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[#ffd0e6]/55 blur-2xl"
        aria-hidden
      />

      <div className={`relative ${s.body}`}>
        <div className={`flex items-end ${s.images}`}>
          <img
            src="/home/fao-photobooth-gift.png"
            alt="Frame photobooth FAO Booth bản ngôi sao"
            className={`-rotate-[7deg] object-cover object-left shadow-[0_10px_22px_rgba(180,50,110,0.22)] ${s.sideImage}`}
          />
          <img
            src="/home/fao-photobooth-gift-3.png"
            alt="Frame photobooth FAO Booth bản hồng ren"
            className={`relative z-10 -mx-[18px] object-cover object-left shadow-[0_12px_26px_rgba(180,50,110,0.28)] ${s.centerImage}`}
          />
          <img
            src="/home/fao-photobooth-gift-2.png"
            alt="Frame photobooth FAO Booth bản chấm bi"
            className={`rotate-[7deg] object-cover object-left shadow-[0_10px_22px_rgba(180,50,110,0.22)] ${s.sideImage}`}
          />
        </div>

        <div className={s.text}>
          <div className={`flex items-center gap-1.5 ${s.badgeRow}`}>
            <Sparkles
              size={12}
              className="shrink-0 text-[#E85C9C]"
              strokeWidth={2.6}
            />
            <span className="text-[10px] font-bold uppercase tracking-[0.09em] text-[#E85C9C]">
              Quà cho khách iu nhà FAO
            </span>
          </div>

          <p className={`mt-1.5 font-bold leading-snug text-[#1f1f1f] ${s.title}`}>
            2 frame photobooth siêu hot
            <span className="ml-1.5 inline-flex items-center rounded-md bg-[#E85C9C] px-1.5 py-0.5 align-middle text-[10px] font-black uppercase tracking-wide text-white">
              Miễn phí
            </span>
          </p>

          <p className={`leading-relaxed text-[#777] ${s.desc}`}>
            Trả máy 30s là frame ảnh miễn phí đem về làm kỉ niệm
          </p>
        </div>
      </div>
    </motion.div>
  );
}

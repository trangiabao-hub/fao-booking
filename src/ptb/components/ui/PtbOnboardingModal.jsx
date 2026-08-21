import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Gift, ImagePlus, LayoutGrid, Printer, X } from "lucide-react";
import { FREE_PRINT_QUOTA } from "../../lib/constants";
import { useBodyScrollLock } from "../../../hooks/useBodyScrollLock";

const VARIANTS = {
  album: {
    icon: Gift,
    title: `Nhận ${FREE_PRINT_QUOTA} ảnh Photobooth miễn phí`,
    intro:
      "Ghép ảnh chuyến đi của bạn thành strip photobooth ngay trên điện thoại. Shop in thật và giao khi bạn trả máy.",
    steps: [
      {
        icon: LayoutGrid,
        title: "Chọn kiểu ảnh và frame",
        body: "Strip dọc 1×4, lưới 2×2, ảnh đơn 1×1 hoặc 9 ô trắng đen — rồi chọn frame trong kho theo chủ đề.",
      },
      {
        icon: ImagePlus,
        title: "Thêm ảnh của bạn",
        body: "Chạm vào từng ô trống để tải ảnh lên. Kéo để dời, chụm hai ngón để phóng to cho vừa khung.",
      },
      {
        icon: Printer,
        title: "Lưu rồi gửi in",
        body: "Lưu strip vào Album và chọn ảnh muốn in. Shop in sẵn, giao cho bạn khi trả máy.",
      },
    ],
    quotaLeft: (remaining) =>
      `Đơn này còn ${remaining}/${FREE_PRINT_QUOTA} ảnh in miễn phí. Ghép bao nhiêu strip cũng được, chỉ tính khi bạn gửi in.`,
    quotaOut:
      "Đơn này đã dùng hết lượt in miễn phí. Bạn vẫn ghép và lưu ảnh thoải mái, in thêm thì trả phí tại shop.",
  },
  instant: {
    icon: Printer,
    title: "Ghép ảnh Photobooth, in ngay tại shop",
    intro:
      "Chọn frame, thêm ảnh rồi bấm In ngay — máy in ở shop nhận liền, bạn không cần lưu Album hay đăng nhập.",
    steps: [
      {
        icon: LayoutGrid,
        title: "Chọn kiểu ảnh và frame",
        body: "Strip dọc 1×4, lưới 2×2, ảnh đơn 1×1 hoặc 9 ô trắng đen — rồi chọn frame trong kho theo chủ đề.",
      },
      {
        icon: ImagePlus,
        title: "Thêm ảnh của bạn",
        body: "Chạm vào từng ô trống để tải ảnh lên. Kéo để dời, chụm hai ngón để phóng to cho vừa khung.",
      },
      {
        icon: Printer,
        title: "Bấm In ngay",
        body: "Ảnh vào thẳng hàng in của shop. Ghép tấm khác rồi in tiếp cũng được, miễn là link còn hạn.",
      },
    ],
    quotaLeft: (remaining) =>
      `Link này còn ${remaining}/${FREE_PRINT_QUOTA} ảnh in miễn phí. Ghép bao nhiêu tấm cũng được, chỉ tính khi bạn bấm In ngay.`,
    quotaOut:
      "Link này đã dùng hết lượt in miễn phí. Bạn vẫn ghép ảnh thoải mái, in thêm thì trả phí tại shop.",
  },
};

/**
 * Màn chào khi khách mở editor — nói rõ quyền lợi trước, cách dùng sau.
 * onStartTour mở coach-mark; onStart vào thẳng editor.
 *
 * `variant` chọn giữa album chuyến đi (lưu rồi gửi in) và link tạm tại shop
 * (bấm In ngay), vì hai luồng có bước cuối và cách tính lượt in khác nhau.
 */
export default function PtbOnboardingModal({
  isOpen,
  freeRemaining,
  variant = "album",
  onStart,
  onStartTour,
}) {
  useBodyScrollLock(isOpen);

  const copy = VARIANTS[variant] ?? VARIANTS.album;
  const HeaderIcon = copy.icon;
  const remaining = Number.isFinite(freeRemaining)
    ? freeRemaining
    : FREE_PRINT_QUOTA;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="ptb-onboarding"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[140] flex items-end justify-center bg-[rgba(15,23,42,0.5)] backdrop-blur-[2px] sm:items-center sm:p-4"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ptb-onboarding-title"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 340 }}
            className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_-8px_40px_rgba(61,36,48,0.18)] sm:max-h-[88vh] sm:rounded-2xl"
          >
            <div className="relative shrink-0 border-b border-[#F3D4E4] bg-[linear-gradient(135deg,#FDE8F0_0%,#FFF6FA_100%)] px-5 py-5">
              <button
                type="button"
                onClick={onStart}
                aria-label="Đóng"
                className="absolute right-2.5 top-2.5 rounded-full p-2 text-[#A98F9C] transition-colors hover:bg-white/70 hover:text-[#6E5360]"
              >
                <X size={18} />
              </button>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#D9488A] shadow-[0_2px_8px_rgba(217,72,138,0.18)]">
                <HeaderIcon size={20} aria-hidden />
              </span>
              <h2
                id="ptb-onboarding-title"
                className="mt-3 pr-8 text-[19px] font-bold leading-tight text-[#3D2430]"
              >
                {copy.title}
              </h2>
              <p className="mt-1.5 text-[13px] font-medium leading-relaxed text-[#6E5360]">
                {copy.intro}
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 [-webkit-overflow-scrolling:touch]">
              <ol className="space-y-3.5">
                {copy.steps.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <li key={step.title} className="flex gap-3">
                      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FDE8F0] text-[#D9488A]">
                        <Icon size={17} aria-hidden />
                        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#D9488A] text-[10px] font-bold text-white">
                          {i + 1}
                        </span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-bold leading-snug text-[#3D2430]">
                          {step.title}
                        </p>
                        <p className="mt-0.5 text-[12.5px] font-medium leading-relaxed text-[#6E5360]">
                          {step.body}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>

              {remaining > 0 ? (
                <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[12.5px] font-semibold leading-relaxed text-emerald-900">
                  {copy.quotaLeft(remaining)}
                </p>
              ) : (
                <p className="mt-4 rounded-xl border border-[#F3D4E4] bg-[#FFF6FA] px-3.5 py-2.5 text-[12.5px] font-semibold leading-relaxed text-[#6E5360]">
                  {copy.quotaOut}
                </p>
              )}
            </div>

            <div className="shrink-0 space-y-2 border-t border-[#F3D4E4] bg-white px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={onStart}
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#D9488A_0%,#C7367A_100%)] text-[14px] font-bold text-white shadow-[0_10px_26px_-12px_rgba(217,72,138,0.7)] transition-all hover:brightness-[1.04] active:scale-[0.99]"
              >
                Bắt đầu ghép ảnh
              </button>
              <button
                type="button"
                onClick={onStartTour}
                className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-[#F3D4E4] bg-white text-[13px] font-bold text-[#D9488A] transition-colors hover:bg-[#FDE8F0]/70"
              >
                Xem hướng dẫn từng bước
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

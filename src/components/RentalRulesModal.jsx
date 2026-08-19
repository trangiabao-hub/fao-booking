import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import {
  RENTAL_RULES_PATH,
  RENTAL_RULES_UPDATED,
  rentalRulesSections,
} from "../content/rentalRulesVi";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";

/**
 * Quy định thuê máy dạng modal — dùng trong luồng đặt máy để khách đọc trước khi cam kết.
 * onAcknowledge (nếu có) hiển thị nút xác nhận đã đọc ở cuối.
 */
export default function RentalRulesModal({ isOpen, onClose, onAcknowledge }) {
  useBodyScrollLock(isOpen);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="rental-rules-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-[130] flex items-end justify-center bg-black/55 backdrop-blur-[2px] sm:items-center sm:p-4"
        >
          <motion.div
            role="dialog"
            aria-labelledby="rental-rules-modal-title"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 340 }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_-8px_40px_rgba(0,0,0,0.16)] sm:max-h-[85vh] sm:rounded-2xl"
          >
            <div className="flex shrink-0 items-start gap-3 border-b border-[#f0f0f0] px-4 py-3">
              <div className="min-w-0 flex-1">
                <h2
                  id="rental-rules-modal-title"
                  className="text-[15px] font-bold leading-snug text-[#222]"
                >
                  Quy định thuê máy
                </h2>
                <p className="mt-0.5 text-[11px] text-[#999]">
                  Cập nhật {RENTAL_RULES_UPDATED}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng"
                className="-mr-1 shrink-0 rounded-full p-2 text-[#888] transition-colors hover:bg-[#f5f5f5] active:scale-95"
              >
                <X size={20} />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-[#f7f5f3] px-4 py-3.5 [-webkit-overflow-scrolling:touch]">
              {rentalRulesSections.map((section, index) => (
                <section
                  key={section.id}
                  className="rounded-xl border border-[#eee] bg-white p-3.5"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1F1F1F] text-[10px] font-black text-[#FF9FCA]">
                      {index + 1}
                    </span>
                    <h3 className="text-[14px] font-bold leading-snug text-[#222]">
                      {section.title}
                    </h3>
                  </div>
                  <ul className="mt-2.5 space-y-2">
                    {section.items.map((item) => (
                      <li
                        key={item.text}
                        className={`flex gap-2 rounded-lg px-2.5 py-2 text-[12.5px] leading-relaxed ${
                          item.emphasis
                            ? "bg-[#fff0f6] font-semibold text-[#1f1f1f]"
                            : "bg-[#faf9f8] text-[#555]"
                        }`}
                      >
                        <span
                          className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${
                            item.emphasis ? "bg-[#E85C9C]" : "bg-[#ccc]"
                          }`}
                          aria-hidden
                        />
                        <span>{item.text}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}

              <p className="px-1 text-[11px] leading-relaxed text-[#999]">
                Xem bản đầy đủ tại{" "}
                <a
                  href={RENTAL_RULES_PATH}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#E85C9C]"
                >
                  trang quy định thuê máy
                </a>
                .
              </p>
            </div>

            <div className="shrink-0 border-t border-[#f0f0f0] bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {onAcknowledge ? (
                <button
                  type="button"
                  onClick={onAcknowledge}
                  className="min-h-[44px] w-full rounded-lg bg-[#E85C9C] text-[14px] font-bold text-white shadow-sm transition-all hover:bg-[#d94d8a] active:scale-[0.99]"
                >
                  Tôi đã đọc và đồng ý
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] w-full rounded-lg border border-[#ddd] text-[14px] font-semibold text-[#555] transition-colors hover:bg-[#fafafa]"
                >
                  Đóng
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

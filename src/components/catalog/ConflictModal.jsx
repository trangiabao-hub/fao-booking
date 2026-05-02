import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FALLBACK_IMG } from "../../constants/catalog";

export default function ConflictModal({ info, onDismiss }) {
  if (!info) return null;
  const { devices } = info;

  return (
    <AnimatePresence>
      <motion.div
        key="conflict-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
        onClick={onDismiss}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#FFFBF5] rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl"
        >
          <div className="bg-gradient-to-br from-red-50 to-[#FFE4F0] px-6 pt-8 pb-5 text-center">
            <div className="text-5xl mb-3">😔</div>
            <h3 className="text-xl font-black text-[#222] mb-1.5">Rất tiếc!</h3>
            <p className="text-sm text-[#666] leading-relaxed">
              {devices.length === 1
                ? "Máy bạn đang chọn vừa được người khác đặt trước rồi."
                : `${devices.length} máy bạn chọn vừa được người khác đặt trước.`}
            </p>
          </div>

          <div className="px-5 py-4 space-y-2">
            {devices.map((d) => (
              <div
                key={d.id || d.modelKey}
                className="flex items-center gap-3 bg-red-50/80 rounded-xl px-3.5 py-2.5 border border-red-100"
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#FFE4F0] shrink-0">
                  <img
                    src={d.img || d.images?.[0] || FALLBACK_IMG}
                    alt={d.displayName}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = FALLBACK_IMG;
                    }}
                  />
                </div>
                <span className="text-sm font-bold text-[#333] uppercase">
                  {d.displayName || d.name}
                </span>
              </div>
            ))}
          </div>

          <div className="px-5 pb-6">
            <p className="text-xs text-[#999] text-center mb-4">
              Bạn có thể chọn máy khác hoặc thử lại với thời gian khác nhé!
            </p>
            <button
              type="button"
              onClick={onDismiss}
              className="w-full py-3 rounded-xl bg-[#222] text-[#FF9FCA] font-black uppercase tracking-wider hover:bg-[#333] transition-colors active:scale-[0.98]"
            >
              Đã hiểu, chọn máy khác
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { PRICE_RANGES } from "../../constants/catalog";

export default function FilterModal({
  isOpen,
  onClose,
  priceRange,
  setPriceRange,
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="filter-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center pb-24 md:pb-28"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 400 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FFFBF5] w-full max-w-md rounded-t-3xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-[#222] uppercase tracking-wider">
                Lọc theo giá
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-[#FF9FCA]/20 rounded-full transition-colors"
              >
                <X size={20} className="text-[#555]" />
              </button>
            </div>

            <div className="space-y-2">
              {PRICE_RANGES.map((range) => (
                <button
                  key={range.id}
                  type="button"
                  onClick={() => {
                    setPriceRange(range.id);
                    onClose();
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all font-bold ${
                    priceRange === range.id
                      ? "bg-[#222] text-[#FF9FCA]"
                      : "bg-white text-[#555] hover:bg-[#FF9FCA]/20 border border-[#eee]"
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

import React from "react";
import { CheckIcon, PhotoIcon } from "@heroicons/react/24/solid";
import { motion } from "framer-motion";

export default function SlotProgressChips({ total, filled, images, onSlotClick }) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {Array.from({ length: total }).map((_, index) => {
        const hasImage = Boolean(images?.[index]);
        return (
          <motion.button
            key={index}
            type="button"
            initial={false}
            animate={{ scale: hasImage ? 1 : 0.96 }}
            onClick={() => onSlotClick?.(index)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              hasImage
                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                : "bg-white/80 text-slate-500 ring-1 ring-slate-200 hover:ring-pink-300 hover:text-pink-600"
            }`}
          >
            {hasImage ? (
              <CheckIcon className="w-3.5 h-3.5" />
            ) : (
              <PhotoIcon className="w-3.5 h-3.5" />
            )}
            Ảnh {index + 1}
          </motion.button>
        );
      })}
    </div>
  );
}

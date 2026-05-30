import React from "react";
import { PHOTOBOOTH_MARKETING_SAMPLES } from "../constants";

const TILTS = ["-rotate-2", "rotate-0", "rotate-2"];

/**
 * 3 strip mẫu — marketing trên trang đặt đơn thành công.
 */
export default function PhotoboothMarketingShowcase({ className = "" }) {
  return (
    <div className={className}>
      <div className="flex items-end justify-center gap-2 sm:gap-3 px-1">
        {PHOTOBOOTH_MARKETING_SAMPLES.map((sample, index) => (
          <figure
            key={sample.src}
            className={`group relative flex-1 max-w-[92px] sm:max-w-[108px] ${TILTS[index % TILTS.length]} transition-transform duration-300 hover:rotate-0 hover:scale-[1.03]`}
          >
            <div className="rounded-lg sm:rounded-xl overflow-hidden shadow-md shadow-pink-900/15 ring-1 ring-pink-200/80 bg-[#FFF8FB]">
              <img
                src={sample.src}
                alt={`Mẫu photobooth ${sample.label}`}
                className="w-full aspect-[1/2.65] object-cover object-top"
                loading="lazy"
                decoding="async"
                draggable={false}
              />
            </div>
            <figcaption className="mt-1.5 text-center">
              <p className="text-[10px] sm:text-[11px] font-bold text-pink-900 leading-tight truncate">
                {sample.label}
              </p>
              <p className="text-[9px] text-pink-500/90 font-medium">{sample.tag}</p>
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="mt-3 text-center text-[11px] sm:text-xs text-slate-500 leading-relaxed">
        Hàng trăm khung đẹp — tạo strip, share story ngay sau chuyến đi
      </p>
    </div>
  );
}

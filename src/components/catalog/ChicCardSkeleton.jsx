import React from "react";

/** Khung chờ cùng bố cục với ChicCard để lưới không nhảy khi máy tải xong. */
export default function ChicCardSkeleton() {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl border border-[#f5d7e6] bg-[#fffdfb] shadow-[0_12px_32px_rgba(15,23,42,0.06)]"
      aria-hidden
    >
      <div className="fao-skeleton relative aspect-[4/3] w-full">
        <div className="absolute right-2.5 top-2.5 h-10 w-[4.75rem] rounded-xl bg-white/60" />
      </div>

      <div className="flex flex-col gap-3.5 p-3.5 sm:gap-4 sm:p-4">
        <div className="space-y-1.5">
          <div className="fao-skeleton h-3.5 w-4/5 rounded" />
          <div className="fao-skeleton h-3 w-1/2 rounded" />
        </div>

        <div className="space-y-2 rounded-2xl border border-pink-100 bg-[#fff8fc] px-3.5 py-3">
          <div className="fao-skeleton h-3.5 w-12 rounded" />
          <div className="fao-skeleton h-6 w-3/4 rounded" />
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex gap-2">
            <div className="fao-skeleton h-11 flex-1 rounded-xl" />
            <div className="fao-skeleton h-11 w-12 rounded-xl" />
          </div>
          <div className="fao-skeleton h-8 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

import React from "react";

/** Chuyển giữa danh sách máy đã chọn (link shop / staff +) và full catalog. */
export default function CatalogModelFilterToggle({
  selectedLabel,
  viewAll,
  onViewSelected,
  onViewAll,
  className = "",
}) {
  const stretch = className.includes("w-full");

  return (
    <div
      className={`${stretch ? "flex w-full" : "inline-flex max-w-full"} rounded-xl border border-[#EADCE3] bg-white p-1 shadow-sm ${className}`}
      role="tablist"
      aria-label="Lọc danh sách máy"
    >
      <button
        type="button"
        role="tab"
        aria-selected={!viewAll}
        onClick={onViewSelected}
        className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-bold transition-all touch-manipulation whitespace-nowrap ${
          stretch ? "flex-1" : ""
        } ${
          !viewAll
            ? "bg-[#222] text-[#FF9FCA] shadow-sm"
            : "text-[#666] hover:bg-[#FFF5F9]"
        }`}
      >
        {selectedLabel}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={viewAll}
        onClick={onViewAll}
        className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-bold transition-all touch-manipulation whitespace-nowrap ${
          stretch ? "flex-1" : ""
        } ${
          viewAll
            ? "bg-[#222] text-[#FF9FCA] shadow-sm"
            : "text-[#666] hover:bg-[#FFF5F9]"
        }`}
      >
        Xem tất cả máy
      </button>
    </div>
  );
}

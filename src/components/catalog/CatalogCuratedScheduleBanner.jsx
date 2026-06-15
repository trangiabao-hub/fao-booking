import React from "react";
import { Sparkles, Clock, MapPin } from "lucide-react";
import CatalogModelFilterToggle from "./CatalogModelFilterToggle";

/**
 * Khách mở link catalog do shop gửi (availability=1) — nhắc lịch đã chọn sẵn.
 * Thay cho khung NHẬN/TRẢ/CHI NHÁNH; có nút đổi giờ / địa điểm ngay trong banner.
 */
export default function CatalogCuratedScheduleBanner({
  pickupReturnSummary,
  branchLabel,
  modelsSummary,
  onChangeTime,
  onChangeBranch,
  catalogViewAllDevices,
  onViewSelectedModels,
  onViewAllModels,
  modelFilterSelectedLabel,
}) {
  if (!pickupReturnSummary) return null;

  const branch = String(branchLabel || "")
    .replace(/^FAO\s*/i, "")
    .trim();

  const showActions = onChangeTime || onChangeBranch;

  return (
    <div
      className="mb-4 rounded-xl border border-emerald-200/90 bg-gradient-to-r from-emerald-50 to-[#f0fdf9] px-4 py-4 shadow-sm"
      role="status"
    >
      <div className="flex gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700"
          aria-hidden
        >
          <Sparkles size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base sm:text-lg font-black leading-snug text-emerald-950">
            FAO đã chọn lịch theo tin nhắn của bạn
          </p>
          <p className="mt-2 text-[15px] sm:text-base leading-snug text-emerald-900/90">
            <span className="font-black">{pickupReturnSummary}</span>
            {branch ? (
              <>
                {" "}
                · <span className="font-bold">{branch}</span>
              </>
            ) : null}
          </p>
          {modelsSummary ? (
            <p className="mt-2 text-sm sm:text-[15px] font-bold leading-snug text-emerald-900/95">
              Máy shop gửi: {modelsSummary}
            </p>
          ) : null}
          <p className="mt-2 text-sm sm:text-[15px] leading-snug text-emerald-800/80">
            Chọn máy bên dưới — bấm đặt để giữ slot.
          </p>
          {showActions ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {onChangeTime ? (
                <button
                  type="button"
                  onClick={onChangeTime}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300/80 bg-white/80 px-3 py-1.5 text-xs font-bold text-emerald-900 shadow-sm transition-all hover:border-emerald-400 hover:bg-white active:scale-[0.98] touch-manipulation"
                >
                  <Clock size={14} aria-hidden />
                  Đổi giờ
                </button>
              ) : null}
              {onChangeBranch ? (
                <button
                  type="button"
                  onClick={onChangeBranch}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300/80 bg-white/80 px-3 py-1.5 text-xs font-bold text-emerald-900 shadow-sm transition-all hover:border-emerald-400 hover:bg-white active:scale-[0.98] touch-manipulation"
                >
                  <MapPin size={14} aria-hidden />
                  Đổi địa điểm
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      {modelFilterSelectedLabel &&
      onViewSelectedModels &&
      onViewAllModels ? (
        <div className="mt-3 border-t border-emerald-200/80 pt-3">
          <CatalogModelFilterToggle
            selectedLabel={modelFilterSelectedLabel}
            viewAll={!!catalogViewAllDevices}
            onViewSelected={onViewSelectedModels}
            onViewAll={onViewAllModels}
            className="w-full border-emerald-200/90 sm:w-auto"
          />
        </div>
      ) : null}
    </div>
  );
}

import React from "react";
import { CalendarDays, ChevronDown, MapPin, Navigation, PencilLine } from "lucide-react";
import CatalogModelFilterToggle from "./CatalogModelFilterToggle";
import { BRANCHES } from "../../data/bookingConstants";
import { formatPriceK } from "../../utils/bookingHelpers";
import { FALLBACK_IMG } from "../../constants/catalog";

const WEEKDAY_VI = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function isValidDate(d) {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

function formatHour(d) {
  const m = d.getMinutes();
  return m ? `${d.getHours()}h${String(m).padStart(2, "0")}` : `${d.getHours()}h`;
}

function dayPeriod(d) {
  const h = d.getHours();
  if (h < 11) return "sáng";
  if (h < 13) return "trưa";
  if (h < 18) return "chiều";
  return "tối";
}

function formatDay(d) {
  return `${WEEKDAY_VI[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}`;
}

function ScheduleCell({ label, date, align = "left" }) {
  const alignCls = align === "right" ? "items-end text-right" : "items-start text-left";
  return (
    <div className={`flex shrink-0 flex-col ${alignCls}`}>
      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#b0a9a4]">{label}</span>
      <span className="mt-1 whitespace-nowrap text-[17px] font-black leading-none tabular-nums text-[#1f1f1f]">
        {formatHour(date)}
        <span className="ml-1 text-[13px] font-bold text-[#55504b]">{dayPeriod(date)}</span>
      </span>
      <span className="mt-1 whitespace-nowrap text-[12px] font-semibold text-[#8a847f]">
        {formatDay(date)}
      </span>
    </div>
  );
}

function DurationConnector({ label }) {
  return (
    <div className="flex min-w-[56px] flex-1 items-center px-2 sm:px-4" aria-hidden>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#E85C9C]" />
      <span className="h-px flex-1 border-t border-dashed border-[#f0b8d1]" />
      {label ? (
        <span className="mx-1.5 shrink-0 whitespace-nowrap rounded-full bg-[#fff0f7] px-2 py-0.5 text-[10.5px] font-bold text-[#E85C9C]">
          {label}
        </span>
      ) : null}
      <span className="h-px flex-1 border-t border-dashed border-[#f0b8d1]" />
      <span className="h-1.5 w-1.5 shrink-0 rounded-full border-[1.5px] border-[#E85C9C] bg-white" />
    </div>
  );
}

function formatDuration(from, to) {
  const hours = Math.round((to - from) / 3600000);
  if (hours <= 0) return "";
  if (hours < 24) return `${hours} tiếng`;
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return rest ? `${days} ngày ${rest} tiếng` : `${days} ngày`;
}

/**
 * Khách mở link catalog do shop gửi (availability=1) — lịch đã chọn sẵn + máy shop gửi
 * bấm đặt ngay. Gọn cho mobile: 1 dòng lịch, danh sách máy, nút cuộn xuống xem thêm.
 * `picks`: [{ key, label, img, original, discounted, available, onBook }].
 */
export default function CatalogCuratedScheduleBanner({
  pickupReturnSummary,
  branchLabel,
  branchId,
  rangeFrom,
  rangeTo,
  picks = [],
  picksLoadingCount = 0,
  moreCount = 0,
  onSeeMore,
  onChangeTime,
  onChangeBranch,
  catalogViewAllDevices,
  onViewSelectedModels,
  onViewAllModels,
  modelFilterSelectedLabel,
}) {
  if (!pickupReturnSummary) return null;

  const branchInfo = BRANCHES.find((b) => b.id === branchId);
  const branch = String(branchLabel || branchInfo?.label || "")
    .replace(/^FAO\s*/i, "")
    .trim();
  const hasRange = isValidDate(rangeFrom) && isValidDate(rangeTo) && rangeTo > rangeFrom;
  const duration = hasRange ? formatDuration(rangeFrom, rangeTo) : "";

  return (
    <section
      className="mb-4 overflow-hidden rounded-2xl border border-[#ffd3e7] bg-white shadow-[0_6px_22px_rgba(232,92,156,0.10)]"
      aria-label="Lịch thuê shop đã chọn"
    >
      <div className="bg-[#fff6fa] px-3.5 pb-2.5 pt-3">
        <div className="rounded-xl bg-white px-3.5 pb-3 pt-2.5 ring-1 ring-[#fbe0ec]">
          <div className="mb-2 flex items-center justify-between border-b border-[#f6eef1] pb-2">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#3d3935]">
              <CalendarDays size={13} className="text-[#E85C9C]" />
              Lịch thuê
            </span>
            {onChangeTime ? (
              <button
                type="button"
                onClick={onChangeTime}
                className="inline-flex items-center gap-1 text-[12px] font-bold text-[#E85C9C] touch-manipulation"
              >
                <PencilLine size={12} />
                Đổi lịch
              </button>
            ) : null}
          </div>
          {hasRange ? (
            <div className="flex items-center">
              <ScheduleCell label="Nhận máy" date={rangeFrom} />
              <DurationConnector label={duration} />
              <ScheduleCell label="Trả máy" date={rangeTo} align="right" />
            </div>
          ) : (
            <p className="text-[14.5px] font-black leading-snug text-[#1f1f1f]">
              {pickupReturnSummary}
            </p>
          )}
        </div>

        {branch ? (
          <div className="mt-2 rounded-xl bg-white px-3.5 pb-3 pt-2.5 ring-1 ring-[#fbe0ec]">
            <div className="mb-2 flex items-center justify-between border-b border-[#f6eef1] pb-2">
              <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#3d3935]">
                <MapPin size={13} className="text-[#E85C9C]" />
                Nhận & trả máy
              </span>
              {onChangeBranch ? (
                <button
                  type="button"
                  onClick={onChangeBranch}
                  className="inline-flex items-center gap-1 text-[12px] font-bold text-[#E85C9C] touch-manipulation"
                >
                  <PencilLine size={12} />
                  Đổi chi nhánh
                </button>
              ) : null}
            </div>
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] font-black leading-tight text-[#1f1f1f]">FAO {branch}</p>
                {branchInfo?.address ? (
                  <p className="mt-1 text-[12.5px] leading-snug text-[#77716c]">
                    {branchInfo.address}
                  </p>
                ) : null}
              </div>
              {branchInfo?.mapUrl ? (
                <a
                  href={branchInfo.mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#fff0f7] px-2.5 py-1 text-[11.5px] font-bold text-[#E85C9C]"
                >
                  <Navigation size={11} />
                  Chỉ đường
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {!picks.length && picksLoadingCount > 0 ? (
        <div className="px-3.5 pb-1 pt-2.5" role="status" aria-label="Đang tải máy shop gửi">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#a3a09d]">
            Máy shop gửi bạn
          </p>
          <ul className="divide-y divide-[#f3eef0]">
            {Array.from({ length: Math.min(picksLoadingCount, 3) }, (_, i) => (
              <li key={i} className="flex items-center gap-3 py-2.5" aria-hidden>
                <div className="fao-skeleton h-11 w-11 shrink-0 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="fao-skeleton h-3.5 w-3/5 rounded" />
                  <div className="fao-skeleton h-3.5 w-2/5 rounded" />
                </div>
                <div className="fao-skeleton h-9 w-14 shrink-0 rounded-xl" />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {picks.length ? (
        <div className="px-3.5 pb-1 pt-2.5">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#a3a09d]">
            Máy shop gửi bạn
          </p>
          <ul className="divide-y divide-[#f3eef0]">
            {picks.map((p) => (
              <li
                key={p.key}
                className={`flex items-center gap-3 py-2.5 ${
                  p.available || p.checking || p.onSwitchBranch ? "" : "opacity-60"
                }`}
              >
                <img
                  src={p.img || FALLBACK_IMG}
                  alt=""
                  className={`h-11 w-11 shrink-0 rounded-lg bg-[#faf9f8] object-cover ${
                    p.available || p.checking ? "" : "opacity-50 grayscale"
                  }`}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = FALLBACK_IMG;
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-[13px] font-bold text-[#1f1f1f]">{p.label}</p>
                  {p.available && p.discounted > 0 ? (
                    <p className="flex items-baseline gap-1.5 tabular-nums">
                      <span className="text-[14.5px] font-black text-[#E85C9C]">
                        {formatPriceK(p.discounted)}
                      </span>
                      {p.original > p.discounted ? (
                        <span className="text-[11px] text-[#b5b0ab] line-through">
                          {formatPriceK(p.original)}
                        </span>
                      ) : null}
                    </p>
                  ) : p.checking ? (
                    <p className="flex items-center gap-1.5 text-[12px] font-semibold text-[#b07a97]">
                      <span className="h-2.5 w-2.5 shrink-0 animate-spin rounded-full border-[1.5px] border-[#f0c3da] border-t-[#E85C9C]" />
                      Đang kiểm tra lịch trống…
                    </p>
                  ) : (
                    <p className="text-[12px] font-semibold text-[#a3a09d]">
                      {p.unavailableNote || "Hết máy giờ này"}
                    </p>
                  )}
                </div>
                {p.checking ? (
                  <div className="fao-skeleton h-9 w-14 shrink-0 rounded-xl" aria-hidden />
                ) : p.available ? (
                  <button
                    type="button"
                    onClick={p.onBook}
                    className="shrink-0 rounded-xl bg-[#E85C9C] px-4 py-2 text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(232,92,156,0.28)] active:scale-[0.97] touch-manipulation"
                  >
                    Đặt
                  </button>
                ) : p.onSwitchBranch ? (
                  <button
                    type="button"
                    onClick={p.onSwitchBranch}
                    className="shrink-0 rounded-xl px-3 py-1.5 text-[12px] font-bold text-[#E85C9C] ring-1 ring-[#ffd3e7] active:scale-[0.97] touch-manipulation"
                  >
                    {p.switchLabel}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {onSeeMore ? (
        <button
          type="button"
          onClick={onSeeMore}
          className="flex w-full items-center justify-center gap-1.5 border-t border-[#f3eef0] bg-[#fffafc] py-3 text-[13px] font-bold text-[#55504b] transition-colors active:bg-[#fff0f6] touch-manipulation"
        >
          {moreCount > 0 ? `Xem thêm ${moreCount} máy khác còn trống` : "Xem thêm máy khác"}
          <ChevronDown size={16} className="animate-bounce text-[#E85C9C]" />
        </button>
      ) : null}

      {modelFilterSelectedLabel && onViewSelectedModels && onViewAllModels ? (
        <div className="border-t border-[#f3eef0] px-3.5 py-3">
          <CatalogModelFilterToggle
            selectedLabel={modelFilterSelectedLabel}
            viewAll={!!catalogViewAllDevices}
            onViewSelected={onViewSelectedModels}
            onViewAll={onViewAllModels}
            className="w-full sm:w-auto"
          />
        </div>
      ) : null}
    </section>
  );
}

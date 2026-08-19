import React, { useCallback } from "react";
import { format, isValid } from "date-fns";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Star, Clock3, Check, Bell } from "lucide-react";
import { BRANCHES } from "../../data/bookingConstants";
import { formatPriceK } from "../../utils/bookingHelpers";
import { parseDeviceReleaseDate } from "../../utils/deviceReleaseDate";
import { formatTimeVi, formatTimeViFromString } from "../../utils/formatTimeVi";
import { FALLBACK_IMG } from "../../constants/catalog";

function ChicCardInner({
  device,
  pricing,
  onQuickBook,
  onSuggestedQuickBook,
  onNotifyWaitlist,
  isSelected,
  onToggleSelect,
  feedbackHref,
  cardAnchorId,
  isFocused,
  index = 0,
  crossBranchHint,
  onSwitchToBranch,
  priceFootnote = "Giá đã áp dụng ưu đãi trong tuần",
  selectAddLabel = "Thêm vào đơn",
  selectRemoveLabel = "Bỏ chọn",
}) {
  const originalLabel = formatPriceK(pricing?.original || 0);
  const discountedLabel = formatPriceK(pricing?.discounted || 0);
  const billableDays = Math.max(1, pricing?.billableDays || 1);
  const savingAmount = (pricing?.original || 0) - (pricing?.discounted || 0);
  const savingLabel = savingAmount > 0 ? formatPriceK(savingAmount) : null;

  const discountedDisplayLabel =
    pricing?.durationType === "SIX_HOURS"
      ? `${discountedLabel} / 6 tiếng`
      : `${discountedLabel} / ${
          billableDays > 1 ? `${billableDays} ngày` : "ngày"
        }`;

  const isHot = device.bookingCount > 5 || device.priceOneDay >= 400000;

  const branchShort =
    device.crossBranchOnly && device.primaryBookBranchId
      ? (BRANCHES.find((b) => b.id === device.primaryBookBranchId)?.label || "")
          .replace(/^FAO\s*/i, "")
          .trim()
      : "";

  const isAvailable = device.isAvailable !== false;
  const blockedBeforeRelease = device.blockedBeforeRelease === true;
  const releaseDay = blockedBeforeRelease
    ? parseDeviceReleaseDate(device)
    : null;

  const suggestedSlot = device.availabilitySuggestion || null;
  const sixHourChoicesList = suggestedSlot?.sixHourChoices || [];
  const hasSixHourChoices = sixHourChoicesList.length > 0;

  const shiftedHourLabel =
    suggestedSlot?.fromDateTime && isValid(suggestedSlot.fromDateTime)
      ? formatTimeVi(suggestedSlot.fromDateTime)
      : formatTimeViFromString(suggestedSlot?.timeFrom);
  const shiftMinutes = Number(suggestedSlot?.shiftMinutes);
  const shiftedBookLabel = Number.isFinite(shiftMinutes) && shiftMinutes !== 0
    ? shiftMinutes > 0
      ? `Đặt trễ hơn ${Math.abs(Math.round(shiftMinutes))}p`
      : `Đặt sớm hơn ${Math.abs(Math.round(shiftMinutes))}p`
    : shiftedHourLabel
      ? `Đặt nhận trả ${shiftedHourLabel}`
      : "";
  const hasShiftedOneDay =
    !!suggestedSlot &&
    !!suggestedSlot.fromDateTime &&
    !!suggestedSlot.toDateTime &&
    !!shiftedBookLabel;

  const hasSuggestedSlot =
    !isAvailable && (hasSixHourChoices || hasShiftedOneDay);

  const hasCrossBranchEscape =
    crossBranchHint?.branches?.length > 0 && !device.crossBranchOnly;

  const showCrossBranchPrimaryButton =
    hasCrossBranchEscape &&
    !isAvailable &&
    !hasSuggestedSlot &&
    !blockedBeforeRelease &&
    typeof onSwitchToBranch === "function" &&
    !!crossBranchHint?.branches?.[0]?.branchId;

  const handleQuickBook = useCallback(
    (e) => {
      e.stopPropagation();
      if (!isAvailable) return;
      onQuickBook(device);
    },
    [device, isAvailable, onQuickBook],
  );

  const handleSuggestedQuickBook = useCallback(
    (e) => {
      e.stopPropagation();
      if (!hasShiftedOneDay) return;
      onSuggestedQuickBook?.(device);
    },
    [device, hasShiftedOneDay, onSuggestedQuickBook],
  );

  const handleSixHourChoice = useCallback(
    (e, key) => {
      e.stopPropagation();
      if (!isAvailable && hasSixHourChoices) {
        onSuggestedQuickBook?.(device, key);
      }
    },
    [device, isAvailable, hasSixHourChoices, onSuggestedQuickBook],
  );

  const handleToggleSelect = useCallback(
    (e) => {
      e.stopPropagation();
      if (!isAvailable) return;
      onToggleSelect?.(device);
    },
    [device, isAvailable, onToggleSelect],
  );

  const handleNotifyWaitlistClick = useCallback(
    (e) => {
      e.stopPropagation();
      onNotifyWaitlist?.(device);
    },
    [device, onNotifyWaitlist],
  );

  const suggestionBtnClass =
    "w-full rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold leading-snug text-white shadow-[0_8px_16px_rgba(5,150,105,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-700 active:translate-y-0";

  const renderSuggestionButtons = () => (
    <div className="flex w-full flex-col gap-2">
      {hasShiftedOneDay ? (
        <button
          type="button"
          onClick={handleSuggestedQuickBook}
          className={suggestionBtnClass}
        >
          {shiftedBookLabel}
        </button>
      ) : null}
      {sixHourChoicesList.map((c) => {
        const sixDay =
          c.fromDateTime && isValid(c.fromDateTime)
            ? format(c.fromDateTime, "d/M")
            : suggestedSlot?.sixHourLabelDay &&
                isValid(suggestedSlot.sixHourLabelDay)
              ? format(suggestedSlot.sixHourLabelDay, "d/M")
              : "";
        const timeLabel = c.key === "morning" ? "9h-15h" : "15h-21h";
        return (
          <button
            key={c.key}
            type="button"
            onClick={(e) => handleSixHourChoice(e, c.key)}
            className={suggestionBtnClass}
          >
            Đặt {timeLabel}
            {sixDay ? ` (${sixDay})` : ""}
          </button>
        );
      })}
    </div>
  );

  const isSoldOutNoSuggestion =
    !isAvailable && !hasSuggestedSlot && !blockedBeforeRelease;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.22,
        ease: "easeOut",
        delay: Math.min(index * 0.025, 0.25),
      }}
      className={`group relative z-10 h-fit select-none ${
        isAvailable || hasSuggestedSlot || blockedBeforeRelease
          ? ""
          : "cursor-not-allowed"
      }`}
      id={cardAnchorId}
    >
      <div
        className={`relative flex h-fit flex-col overflow-hidden rounded-xl border bg-[#fffdfb] shadow-[0_12px_32px_rgba(15,23,42,0.08)] transition-all duration-200 ${
          isSoldOutNoSuggestion ? "opacity-90" : ""
        } ${
          isFocused
            ? "border-[#E85C9C] ring-2 ring-[#ffb6d7]/70"
            : "border-[#f5d7e6]"
        } ${
          blockedBeforeRelease
            ? "ring-2 ring-[#f6afcc]/45"
            : "group-hover:-translate-y-1 group-hover:shadow-[0_20px_42px_rgba(15,23,42,0.13)]"
        }`}
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-[#fff1f7] to-[#fff8fc]">
          <img
            src={device.img || FALLBACK_IMG}
            alt={device.displayName}
            className={`h-full w-full object-cover transition-transform duration-300 ${
              isAvailable ? "group-hover:scale-[1.035]" : "scale-100"
            }`}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = FALLBACK_IMG;
            }}
          />

          <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-2.5">
            {isAvailable && onToggleSelect && !device.crossBranchOnly ? (
              <button
                type="button"
                onClick={handleToggleSelect}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border shadow-sm backdrop-blur-md transition-all duration-200 ${
                  isSelected
                    ? "border-[#E85C9C] bg-[#E85C9C] text-white"
                    : "border-white/70 bg-white/90 text-[#E85C9C] hover:border-[#E85C9C]"
                }`}
                aria-label={isSelected ? selectRemoveLabel : selectAddLabel}
              >
                {isSelected ? (
                  <Check size={17} strokeWidth={3} />
                ) : (
                  <span className="text-base font-black leading-none">+</span>
                )}
              </button>
            ) : (
              <div />
            )}

            <div className="flex flex-col items-end gap-1.5">
              {savingLabel ? (
                <div className="flex min-w-[4.75rem] flex-col items-center justify-center rounded-xl border border-amber-200 bg-black/85 px-3 py-2 text-center shadow-md backdrop-blur-md">
                  <span className="mb-[2px] text-[9px] font-bold leading-none tracking-wide text-amber-300/90">
                    Giảm ngay
                  </span>
                  <span className="text-sm font-black leading-none text-amber-100 sm:text-base">
                    {savingLabel}
                  </span>
                </div>
              ) : isHot && !blockedBeforeRelease ? (
                <div className="inline-flex items-center gap-1 rounded-full border border-[#ffe6a9] bg-[#fff7dc]/95 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.06em] text-[#a65a00] shadow-sm backdrop-blur-md">
                  <Star size={11} fill="currentColor" />
                  Hot
                </div>
              ) : null}
            </div>
          </div>

          {!isAvailable && (
            <div
              className={`absolute inset-0 z-10 flex items-end justify-center p-3 ${
                blockedBeforeRelease
                  ? "bg-gradient-to-t from-black/65 via-black/10 to-transparent"
                  : "bg-gradient-to-t from-black/70 via-black/25 to-transparent"
              }`}
            >
              {blockedBeforeRelease && releaseDay ? (
                <div className="w-full rounded-xl border border-white/20 bg-white/92 px-3 py-2.5 text-center shadow-xl backdrop-blur-md">
                  <p className="text-xs font-bold leading-snug text-[#333]">
                    Có thể đặt từ{" "}
                    <span className="font-black text-[#E85C9C]">
                      {releaseDay && isValid(releaseDay)
                        ? format(releaseDay, "dd/MM/yyyy")
                        : "—"}
                    </span>
                  </p>
                </div>
              ) : hasSuggestedSlot ? (
                <div className="w-full rounded-xl border border-white/20 bg-black/55 px-3 py-2.5 text-center shadow-xl backdrop-blur-md">
                  <p className="text-[11px] font-black uppercase tracking-[0.08em] text-white">
                    Không trống khung giờ
                  </p>
                  <p className="mt-1 text-[10px] font-semibold leading-snug text-white/85">
                    Xem gợi ý đặt nhanh ở bên dưới
                  </p>
                </div>
              ) : (
                <div className="flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/20 bg-black/55 px-3 py-2.5 text-center text-white shadow-xl backdrop-blur-md">
                  <Clock3 size={15} />
                  <span className="text-xs font-black uppercase leading-snug tracking-[0.06em]">
                    Không trống ngày bạn chọn
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3.5 p-3.5 sm:gap-4 sm:p-4">
          <div>
            <h3 className="line-clamp-2 text-[13px] font-black uppercase leading-snug tracking-[0.04em] text-[#171717] sm:text-sm lg:text-[15px]">
              {device.displayName}
            </h3>

            {branchShort ? (
              <p className="mt-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-sky-700">
                Chỉ có tại {branchShort}
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-pink-100 bg-gradient-to-br from-[#fff8fc] to-white px-3.5 py-3">
            <div className="flex flex-col gap-1.5">
              {savingLabel ? (
                <span className="text-sm font-semibold leading-none text-gray-400 line-through decoration-rose-400 decoration-1 sm:text-base">
                  {originalLabel}
                </span>
              ) : (
                <span className="text-sm font-bold leading-none text-gray-500 sm:text-base">
                  {originalLabel}
                </span>
              )}

              <span className="text-xl font-black leading-tight text-[#d43487] sm:text-2xl">
                {discountedDisplayLabel}
              </span>
            </div>

            <p className="mt-2.5 text-[10px] font-semibold leading-snug text-[#9b5879]">
              {priceFootnote}
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            {!isAvailable &&
            !hasSixHourChoices &&
            !hasSuggestedSlot &&
            !blockedBeforeRelease &&
            !device.crossBranchOnly &&
            !hasCrossBranchEscape ? (
              <button
                type="button"
                onClick={handleNotifyWaitlistClick}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#ffd3e7] bg-[#fff5fa] px-3 py-2.5 text-xs font-black uppercase tracking-[0.06em] text-[#E85C9C] shadow-sm transition-all duration-200 hover:bg-[#ffe9f4]"
              >
                <Bell size={14} />
                Nhận thông báo khi trống
              </button>
            ) : !isAvailable && blockedBeforeRelease ? (
              <div className="rounded-2xl border border-[#ffd0e8] bg-[#fff8fc] px-3 py-2.5 text-center text-xs font-semibold leading-snug text-[#444]">
                Bạn có thể đặt lịch từ{" "}
                <span className="font-black text-[#E85C9C]">
                  {releaseDay && isValid(releaseDay)
                    ? format(releaseDay, "dd/MM/yyyy")
                    : "—"}
                </span>
                .
              </div>
            ) : showCrossBranchPrimaryButton ? (
              <button
                type="button"
                title={`Đặt tại ${crossBranchHint.branches[0].label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSwitchToBranch(crossBranchHint.branches[0].branchId);
                }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-3 py-3 text-xs font-black uppercase leading-snug tracking-[0.06em] text-white shadow-[0_12px_22px_rgba(2,132,199,0.24)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-sky-700"
              >
                <MapPin size={15} className="shrink-0" aria-hidden />
                <span>
                  Còn máy ở{" "}
                  {crossBranchHint.branches[0].label
                    .replace(/^FAO\s*/i, "")
                    .trim()}{" "}
                  Đặt ngay
                </span>
              </button>
            ) : !isAvailable && hasSuggestedSlot ? (
              renderSuggestionButtons()
            ) : (
              <button
                type="button"
                onClick={handleQuickBook}
                disabled={!isAvailable}
                className={`w-full rounded-xl px-3 py-3 text-xs font-black uppercase leading-tight tracking-[0.07em] transition-all duration-200 sm:text-[13px] ${
                  isAvailable
                    ? "bg-gradient-to-r from-[#f1469d] via-[#df4eb2] to-[#b65bff] text-white shadow-[0_14px_26px_rgba(225,69,154,0.34)] hover:-translate-y-0.5 hover:shadow-[0_18px_32px_rgba(225,69,154,0.42)]"
                    : "cursor-not-allowed bg-gray-200 text-gray-500"
                }`}
              >
                {isAvailable
                  ? branchShort
                    ? `Đặt tại ${branchShort}`
                    : "Đặt ngay"
                  : "Tạm hết máy"}
              </button>
            )}

            <Link
              to={feedbackHref || "/feedback"}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-2xl border border-[#ffd3e7] bg-white px-3 py-2 text-center text-[11px] font-black uppercase tracking-[0.06em] text-[#d43487] transition-all duration-200 hover:bg-[#fff1f7]"
            >
              Ảnh feedback
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function chicPropsEqual(prev, next) {
  if (prev.device?.modelKey !== next.device?.modelKey) return false;
  if (prev.isSelected !== next.isSelected) return false;
  if (prev.selectAddLabel !== next.selectAddLabel) return false;
  if (prev.selectRemoveLabel !== next.selectRemoveLabel) return false;
  if (prev.isFocused !== next.isFocused) return false;
  if (prev.index !== next.index) return false;
  if (prev.feedbackHref !== next.feedbackHref) return false;
  if (prev.priceFootnote !== next.priceFootnote) return false;
  if (prev.cardAnchorId !== next.cardAnchorId) return false;
  if (prev.device?.isAvailable !== next.device?.isAvailable) return false;
  if (prev.device?.blockedBeforeRelease !== next.device?.blockedBeforeRelease)
    return false;
  if (prev.device?.displayName !== next.device?.displayName) return false;
  if (prev.device?.img !== next.device?.img) return false;
  if (prev.device?.bookingCount !== next.device?.bookingCount) return false;
  if (prev.device?.priceOneDay !== next.device?.priceOneDay) return false;
  if (prev.device?.crossBranchOnly !== next.device?.crossBranchOnly)
    return false;
  if (prev.device?.primaryBookBranchId !== next.device?.primaryBookBranchId)
    return false;
  if (prev.pricing?.original !== next.pricing?.original) return false;
  if (prev.pricing?.discounted !== next.pricing?.discounted) return false;
  if (prev.pricing?.durationType !== next.pricing?.durationType) return false;
  if (prev.pricing?.billableDays !== next.pricing?.billableDays) return false;

  const pb = prev.crossBranchHint?.branches;
  const nb = next.crossBranchHint?.branches;

  if ((pb?.length || 0) !== (nb?.length || 0)) return false;

  if (pb?.length) {
    for (let i = 0; i < pb.length; i += 1) {
      if (pb[i]?.branchId !== nb[i]?.branchId) return false;
    }
  }

  const ps = prev.device?.availabilitySuggestion;
  const ns = next.device?.availabilitySuggestion;

  if (ps !== ns) {
    const p6 = ps?.sixHourChoices?.length || 0;
    const n6 = ns?.sixHourChoices?.length || 0;
    if (p6 !== n6) return false;
    if (ps?.fromDateTime !== ns?.fromDateTime) return false;
    if (ps?.toDateTime !== ns?.toDateTime) return false;
    if (ps?.timeFrom !== ns?.timeFrom) return false;
    if (ps?.shiftMinutes !== ns?.shiftMinutes) return false;
    if (ps?.sixHourLabelDay !== ns?.sixHourLabelDay) return false;
  }

  return true;
}

const ChicCard = React.memo(ChicCardInner, chicPropsEqual);

export default ChicCard;

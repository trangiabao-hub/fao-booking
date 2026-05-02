import React, { useCallback } from "react";
import { format, isValid } from "date-fns";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Star, Clock3, Check, Bell } from "lucide-react";
import { BRANCHES } from "../../data/bookingConstants";
import { formatPriceK } from "../../utils/bookingHelpers";
import { parseDeviceReleaseDate } from "../../utils/deviceReleaseDate";
import { formatTimeVi } from "../../utils/formatTimeVi";
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
      ? (
          BRANCHES.find((b) => b.id === device.primaryBookBranchId)?.label || ""
        )
          .replace(/^FAO\s*/i, "")
          .trim()
      : "";

  const suggestionBranchLabel =
    (
      BRANCHES.find((b) => b.id === device.primaryBookBranchId)?.label || ""
    )
      .replace(/^FAO\s*/i, "")
      .trim() || "chi nhánh hiện tại";

  const isAvailable = device.isAvailable !== false;
  const blockedBeforeRelease = device.blockedBeforeRelease === true;
  const releaseDay = blockedBeforeRelease ? parseDeviceReleaseDate(device) : null;

  const suggestedSlot = device.availabilitySuggestion || null;
  const hasSixHourChoices =
    Array.isArray(suggestedSlot?.sixHourChoices) &&
    suggestedSlot.sixHourChoices.length > 0;

  const hasSingleTimeSuggestion =
    !!suggestedSlot &&
    !hasSixHourChoices &&
    !!suggestedSlot.fromDateTime &&
    !!suggestedSlot.toDateTime;

  const hasSuggestedSlot =
    !isAvailable && !!(hasSixHourChoices || hasSingleTimeSuggestion);

  const hasCrossBranchEscape =
    crossBranchHint?.branches?.length > 0 && !device.crossBranchOnly;

  const showCrossBranchPrimaryButton =
    hasCrossBranchEscape &&
    !isAvailable &&
    !hasSuggestedSlot &&
    !blockedBeforeRelease &&
    typeof onSwitchToBranch === "function" &&
    !!crossBranchHint?.branches?.[0]?.branchId;

  const demoteLocalSlotSuggestions =
    hasCrossBranchEscape && !isAvailable && hasSuggestedSlot;

  const sixHourChoicesList = suggestedSlot?.sixHourChoices || [];
  const sixHourChoiceCount = sixHourChoicesList.length;

  const sixHourButtonsLayoutClass =
    sixHourChoiceCount >= 2
      ? "grid grid-cols-2 gap-2"
      : "flex w-full flex-col gap-2";

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
      if (!hasSuggestedSlot) return;
      if (hasSixHourChoices) return;
      onSuggestedQuickBook?.(device);
    },
    [device, hasSuggestedSlot, hasSixHourChoices, onSuggestedQuickBook],
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

  const renderSixHourButtons = () => (
    <div className={sixHourButtonsLayoutClass}>
      {sixHourChoicesList.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={(e) => handleSixHourChoice(e, c.key)}
          className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-3 py-2.5 text-[11px] font-black uppercase leading-tight tracking-[0.06em] text-white shadow-[0_10px_20px_rgba(5,150,105,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_24px_rgba(5,150,105,0.28)] active:translate-y-0 sm:text-xs"
        >
          {c.key === "morning" ? "Sáng 9h–15h" : "Tối 15h–21h"}
        </button>
      ))}
    </div>
  );

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
        className={`relative flex h-fit flex-col overflow-hidden rounded-[20px] border bg-[#fffdfb] shadow-[0_12px_32px_rgba(15,23,42,0.08)] transition-all duration-200 ${
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
                aria-label={isSelected ? "Bỏ chọn" : "Thêm vào đơn"}
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
                <div className="rounded-full border border-amber-200 bg-black/85 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.06em] text-amber-200 shadow-md backdrop-blur-md">
                  Giảm {savingLabel}
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
                  : hasSuggestedSlot
                    ? "bg-gradient-to-t from-emerald-950/55 via-emerald-900/10 to-transparent"
                    : "bg-gradient-to-t from-black/70 via-black/25 to-transparent"
              }`}
            >
              {blockedBeforeRelease && releaseDay ? (
                <div className="w-full rounded-2xl border border-white/20 bg-white/92 px-3 py-2.5 text-center shadow-xl backdrop-blur-md">
                  <p className="text-xs font-bold leading-snug text-[#333]">
                    Có thể đặt từ{" "}
                    <span className="font-black text-[#E85C9C]">
                      {releaseDay && isValid(releaseDay)
                        ? format(releaseDay, "dd/MM/yyyy")
                        : "—"}
                    </span>
                  </p>
                </div>
              ) : demoteLocalSlotSuggestions ? (
                <div className="w-full rounded-2xl border border-white/20 bg-black/55 px-3 py-2.5 text-center shadow-xl backdrop-blur-md">
                  <p className="text-[11px] font-black uppercase tracking-[0.08em] text-white">
                    Không trống khung giờ
                  </p>
                  <p className="mt-1 text-[10px] font-semibold leading-snug text-white/85">
                    Xem gợi ý đặt nhanh ở bên dưới
                  </p>
                </div>
              ) : hasSuggestedSlot ? (
                <div className="w-full rounded-2xl border border-emerald-200 bg-emerald-50/95 px-3 py-2.5 shadow-xl backdrop-blur-md">
                  <div className="mb-1 flex items-center gap-1.5">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                    <span className="text-[11px] font-black uppercase tracking-[0.08em] text-emerald-700">
                      {hasSixHourChoices ? "Còn slot 6 tiếng" : "Gợi ý dời lịch"}
                    </span>
                  </div>

                  <div className="text-[11px] font-bold leading-snug text-emerald-950">
                    {hasSixHourChoices ? (
                      <>
                        Ngày{" "}
                        <span className="font-black text-[#E85C9C]">
                          {suggestedSlot.sixHourLabelDay &&
                          isValid(suggestedSlot.sixHourLabelDay)
                            ? format(suggestedSlot.sixHourLabelDay, "dd/MM")
                            : suggestedSlot.sixHourChoices?.[0]?.fromDateTime &&
                                isValid(
                                  suggestedSlot.sixHourChoices[0].fromDateTime,
                                )
                              ? format(
                                  suggestedSlot.sixHourChoices[0].fromDateTime,
                                  "dd/MM",
                                )
                              : "—"}
                        </span>{" "}
                        còn khung trống.
                      </>
                    ) : (
                      <>
                        Đổi sang{" "}
                        <span className="font-black text-[#E85C9C]">
                          {isValid(suggestedSlot.fromDateTime)
                            ? `${formatTimeVi(suggestedSlot.fromDateTime)} ${format(
                                suggestedSlot.fromDateTime,
                                "dd/MM",
                              )}`
                            : "—"}
                        </span>{" "}
                        là có thể đặt.
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/20 bg-black/55 px-3 py-2.5 text-white shadow-xl backdrop-blur-md">
                  <Clock3 size={15} />
                  <span className="text-xs font-black uppercase tracking-[0.06em]">
                    Hết khung giờ
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col p-3 sm:p-4">
          <div className="min-h-[48px]">
            <h3 className="line-clamp-2 text-[13px] font-black uppercase leading-snug tracking-[0.04em] text-[#171717] sm:text-sm lg:text-[15px]">
              {device.displayName}
            </h3>

            {branchShort ? (
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.08em] text-sky-700">
                Chỉ có tại {branchShort}
              </p>
            ) : null}
          </div>

          <div className="mt-3 rounded-2xl border border-pink-100 bg-gradient-to-br from-[#fff8fc] to-white px-3 py-2.5">
            <span className="block text-[11px] font-semibold text-gray-400 line-through">
              {originalLabel}
            </span>

            <div className="mt-0.5 flex items-end justify-between gap-2">
              <span className="text-xl font-black leading-none text-[#d43487] sm:text-2xl">
                {discountedDisplayLabel}
              </span>
            </div>

            <p className="mt-1 text-[10px] font-semibold text-[#9b5879]">
              {priceFootnote}
            </p>
          </div>

          <div className="mt-3 flex flex-col gap-2">
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
                  Còn máy tại{" "}
                  {crossBranchHint.branches[0].label
                    .replace(/^FAO\s*/i, "")
                    .trim()}{" "}
                  · Đặt ngay
                </span>
              </button>
            ) : demoteLocalSlotSuggestions && hasSixHourChoices ? (
              <details className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
                <summary className="cursor-pointer select-none px-3 py-2.5 text-xs font-black uppercase tracking-[0.06em] text-emerald-900 hover:bg-emerald-50 [&::-webkit-details-marker]:hidden">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={13} className="text-emerald-700" />
                    Còn máy tại {suggestionBranchLabel}
                    <span className="text-emerald-600">▾</span>
                  </span>
                </summary>

                <div className="border-t border-emerald-100 p-2">
                  {renderSixHourButtons()}
                </div>
              </details>
            ) : demoteLocalSlotSuggestions && hasSingleTimeSuggestion ? (
              <details className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
                <summary className="cursor-pointer select-none px-3 py-2.5 text-xs font-black uppercase tracking-[0.06em] text-emerald-900 hover:bg-emerald-50 [&::-webkit-details-marker]:hidden">
                  Không tiện đổi chi nhánh?{" "}
                  <span className="text-emerald-700">Đổi khung giờ ▾</span>
                </summary>

                <div className="border-t border-emerald-100 p-2">
                  <button
                    type="button"
                    onClick={handleSuggestedQuickBook}
                    className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-3 py-2.5 text-xs font-black uppercase tracking-[0.06em] text-white shadow-[0_10px_20px_rgba(5,150,105,0.22)] transition-all duration-200 hover:-translate-y-0.5"
                  >
                    Dời theo gợi ý & đặt
                  </button>
                </div>
              </details>
            ) : !isAvailable && hasSixHourChoices ? (
              <details
                open
                className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm"
              >
                <summary className="cursor-pointer select-none px-3 py-2.5 text-xs font-black uppercase tracking-[0.06em] text-emerald-900 hover:bg-emerald-50 [&::-webkit-details-marker]:hidden">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={13} className="text-emerald-700" />
                    Còn máy tại {suggestionBranchLabel}
                    <span className="text-emerald-600">▾</span>
                  </span>
                </summary>

                <div className="border-t border-emerald-100 p-2">
                  {renderSixHourButtons()}
                </div>
              </details>
            ) : (
              <button
                type="button"
                onClick={hasSuggestedSlot ? handleSuggestedQuickBook : handleQuickBook}
                disabled={!isAvailable && !hasSuggestedSlot}
                className={`w-full rounded-2xl px-3 py-3 text-xs font-black uppercase leading-tight tracking-[0.07em] transition-all duration-200 sm:text-[13px] ${
                  isAvailable
                    ? "bg-gradient-to-r from-[#f1469d] via-[#df4eb2] to-[#b65bff] text-white shadow-[0_14px_26px_rgba(225,69,154,0.34)] hover:-translate-y-0.5 hover:shadow-[0_18px_32px_rgba(225,69,154,0.42)]"
                    : hasSuggestedSlot
                      ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-[0_12px_22px_rgba(5,150,105,0.24)] hover:-translate-y-0.5"
                      : "cursor-not-allowed bg-gray-200 text-gray-500"
                }`}
              >
                {isAvailable
                  ? branchShort
                    ? `Đặt tại ${branchShort}`
                    : "Đặt ngay"
                  : hasSuggestedSlot
                    ? "Dời theo gợi ý & đặt"
                    : "Tạm hết máy"}
              </button>
            )}

            <Link
              to={feedbackHref || "/feedback"}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-2xl border border-[#ffd3e7] bg-white px-3 py-2 text-center text-[11px] font-black uppercase tracking-[0.06em] text-[#d43487] transition-all duration-200 hover:bg-[#fff1f7]"
            >
              Xem feedback thực tế
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
    if (ps?.sixHourLabelDay !== ns?.sixHourLabelDay) return false;
  }

  return true;
}

const ChicCard = React.memo(ChicCardInner, chicPropsEqual);

export default ChicCard;
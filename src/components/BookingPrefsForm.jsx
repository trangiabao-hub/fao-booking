import React, { useMemo, useEffect } from "react";
import { format, addDays, isValid } from "date-fns";
import vi from "date-fns/locale/vi";
import DatePicker from "react-datepicker";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import { formatTimeVi, formatTimeViFromString } from "../utils/formatTimeVi";
import {
  BRANCHES,
  isBranchBookable,
  Q9_BOOKING_OPENS_DATE,
} from "../data/bookingConstants";
import { getDefaultBranchId as getDefaultBranchIdFromHelpers } from "../utils/bookingHelpers";

/* ── Constants ── */

const MORNING_PICKUP_TIME = "09:00";
const SIX_HOUR_SECOND_PICKUP_TIME = "15:00";
const DEFAULT_EVENING_SLOT = "20:30";
const ONE_DAY_EVENING_SLOTS = [
  "19:15",
  "19:00",
  "19:30",
  "20:00",
  "20:15",
  "20:30",
];
const QUICK_RETURN_DAY_OFFSETS = [1, 2, 3];
const SIX_HOUR_MAX_HOURS = 12;

/** react-datepicker gọi date-fns format(selected) — Invalid Date vẫn truthy → RangeError */
function pickerSelected(d) {
  return d instanceof Date && isValid(d) ? d : null;
}

const ONE_DAY_PICKUP_OPTIONS = [
  {
    id: "MORNING_0900",
    pickupType: "MORNING",
    time: MORNING_PICKUP_TIME,
    label: `Sáng ${formatTimeViFromString(MORNING_PICKUP_TIME)}`,
  },
  {
    id: "AFTERNOON_1500",
    pickupType: "AFTERNOON",
    time: SIX_HOUR_SECOND_PICKUP_TIME,
    label: `Chiều ${formatTimeViFromString(SIX_HOUR_SECOND_PICKUP_TIME)}`,
  },
  ...ONE_DAY_EVENING_SLOTS.map((slot) => ({
    id: `EVENING_${slot.replace(":", "")}`,
    pickupType: "EVENING",
    time: slot,
    label: `Tối ${formatTimeViFromString(slot)}`,
  })),
];

/* ── Helpers ── */

export function normalizeDate(date) {
  if (!date) return null;
  const d = new Date(date);
  if (!isValid(d)) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getDefaultBranchId() {
  return getDefaultBranchIdFromHelpers();
}

function combineDateWithTimeString(dateOnly, timeStr) {
  if (!dateOnly || !timeStr) return null;
  const [hStr, mStr] = timeStr.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10) || 0;
  if (isNaN(h) || isNaN(m)) return null;
  const d = new Date(dateOnly);
  if (!isValid(d)) return null;
  d.setHours(h, m, 0, 0);
  return isValid(d) ? d : null;
}

export function getSixHourAutoReturnTime(timeFrom) {
  if (!timeFrom) return "15:00";
  const [hStr, mStr] = timeFrom.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return "15:00";
  const totalMinutes = h * 60 + m + 6 * 60;
  const normalizedMinutes = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const outH = Math.floor(normalizedMinutes / 60);
  const outM = normalizedMinutes % 60;
  return `${String(outH).padStart(2, "0")}:${String(outM).padStart(2, "0")}`;
}

function getDayPartLabel(date) {
  if (!date) return "";
  const hour = date.getHours();
  if (hour < 12) return "Sáng";
  if (hour < 18) return "Chiều";
  return "Tối";
}

function formatWeekdayLabel(date) {
  if (!date) return "";
  const dow = date.getDay();
  if (dow === 0) return "CN";
  return `Thứ ${dow + 1}`;
}

function formatTimeShort(date) {
  return formatTimeVi(date);
}

function formatSixHourSlotLabel(slot, isGate) {
  const from = formatTimeViFromString(slot);
  const to = formatTimeViFromString(getSixHourAutoReturnTime(slot));
  if (isGate) {
    const period = slot === MORNING_PICKUP_TIME ? "Sáng" : "Chiều";
    return `${period} · ${from} → ${to}`;
  }
  return `Nhận ${from} → trả ${to}`;
}

export function formatPickupReturnSummary(date) {
  if (!date || !isValid(date)) return "";
  return `${formatTimeShort(date)} • ${getDayPartLabel(date)} • ${formatWeekdayLabel(
    date,
  )} (${format(date, "dd/MM")})`;
}

function countWeekdaysInRange(startDateTime, endDateTime) {
  if (!startDateTime || !endDateTime || endDateTime <= startDateTime) {
    return { totalDays: 0, weekdayDays: 0 };
  }
  const start = new Date(startDateTime);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDateTime);
  end.setHours(0, 0, 0, 0);

  let totalDays = 0;
  let weekdayDays = 0;
  const cur = new Date(start);
  while (cur < end) {
    totalDays += 1;
    const dow = cur.getDay();
    if (dow >= 1 && dow <= 5) weekdayDays += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return { totalDays, weekdayDays };
}

export function computeAvailabilityRange(prefs) {
  if (!prefs?.date || !prefs?.timeFrom) {
    return { fromDateTime: null, toDateTime: null };
  }
  if (prefs.durationType === "SIX_HOURS") {
    const fromDateTime = combineDateWithTimeString(prefs.date, prefs.timeFrom);
    const toDateTime = combineDateWithTimeString(prefs.date, prefs.timeTo);
    return { fromDateTime, toDateTime };
  }

  const baseDate =
    prefs.durationType === "ONE_DAY"
      ? prefs.date
      : prefs.pickupType === "EVENING"
        ? addDays(prefs.date, -1)
        : prefs.date;
  const fromDateTime = combineDateWithTimeString(baseDate, prefs.timeFrom);
  if (!fromDateTime) return { fromDateTime: null, toDateTime: null };

  if (prefs.durationType === "ONE_DAY") {
    const safeEndDate = prefs.endDate || addDays(prefs.date, 1);
    const toDateTime = combineDateWithTimeString(
      safeEndDate,
      prefs.timeTo || prefs.timeFrom,
    );
    return {
      fromDateTime,
      toDateTime,
    };
  }

  const toDateTime = prefs.endDate
    ? combineDateWithTimeString(prefs.endDate, prefs.timeFrom)
    : null;
  return { fromDateTime, toDateTime };
}

export const STALE_AVAILABILITY_SLOT_MESSAGE =
  "Lịch shop gửi đã qua thời điểm nhận — vui lòng chọn lại giờ nhận / trả ạ.";

/** Khung nhận máy đã qua (ngày hoặc giờ trong quá khứ). */
export function isAvailabilitySlotStale(prefs, nowMs = Date.now()) {
  try {
    const { fromDateTime } = computeAvailabilityRange(prefs);
    return !!fromDateTime && fromDateTime.getTime() < nowMs;
  } catch {
    return false;
  }
}

/** Đẩy ngày nhận/trả về hôm nay khi link shop gửi đã lỗi thời — giữ giờ/chi nhánh. */
export function clampStaleAvailabilityDates(prefs) {
  const today = normalizeDate(new Date());
  const durationType = prefs?.durationType || "ONE_DAY";
  const endDate = durationType === "ONE_DAY" ? addDays(today, 1) : today;
  const dateSame = prefs?.date?.getTime() === today.getTime();
  const endSame = prefs?.endDate?.getTime() === endDate.getTime();
  if (dateSame && endSame) return prefs;
  return {
    ...prefs,
    date: today,
    endDate,
  };
}

export function getAvailabilityRangeError(prefs, fromDateTime, toDateTime) {
  if (!fromDateTime || !toDateTime) return "Vui lòng chọn giờ nhận / trả.";
  if (fromDateTime.getTime() < Date.now()) {
    return STALE_AVAILABILITY_SLOT_MESSAGE;
  }
  if (toDateTime <= fromDateTime)
    return "Thời gian trả phải sau thời gian nhận.";
  if (prefs?.durationType === "SIX_HOURS") {
    const hours =
      (toDateTime.getTime() - fromDateTime.getTime()) / (1000 * 60 * 60);
    if (hours > SIX_HOUR_MAX_HOURS + 0.05) {
      return "Gói 6 tiếng chỉ áp dụng tối đa 12 tiếng.";
    }
  }
  return "";
}

/* ── Component ── */

/**
 * Shared booking preferences form.
 * Used inside AvailabilityGate (catalog) and QuickBookModal step 1.
 *
 * Props:
 *  - branchId, date, endDate, timeFrom, timeTo, durationType, pickupType, pickupSlot
 *  - setBranchId, setDate, setEndDate, setTimeFrom, setTimeTo, setDurationType, setPickupType, setPickupSlot
 *  - error (optional string)
 *  - minPickupDate (optional Date) — releaseDate máy: không chọn nhận máy trước ngày này (vẫn không trước hôm nay)
 *  - variant (optional) — "default" | "gate" layout gọn cho AvailabilityGate
 */
export default function BookingPrefsForm({
  branchId,
  date,
  endDate,
  timeFrom,
  timeTo,
  durationType,
  pickupType,
  pickupSlot,
  setBranchId,
  setDate,
  setEndDate,
  setTimeFrom,
  setTimeTo,
  setDurationType,
  setPickupType,
  setPickupSlot,
  error,
  minPickupDate = null,
  /** "all" | "time" | "branch" — form gọn trong sheet sửa lịch khách */
  sections = "all",
  /** "default" | "gate" — layout gọn cho AvailabilityGate trên mobile */
  variant = "default",
}) {
  const isGate = variant === "gate";
  const showTimeFields = sections === "all" || sections === "time";
  const showTimeSummaryRow =
    durationType !== "SIX_HOURS" && sections === "all" && !isGate;
  const showBranch = sections === "all" || sections === "branch";
  const showBillableTeaser = sections === "all" && !isGate;
  const effectiveMinPickup = useMemo(() => {
    const today = normalizeDate(new Date());
    const q9Opens = normalizeDate(
      new Date(`${Q9_BOOKING_OPENS_DATE}T12:00:00`),
    );
    let base = today;
    if (minPickupDate) {
      const r = normalizeDate(minPickupDate);
      if (r && r.getTime() > base.getTime()) base = r;
    }
    if (
      branchId === "Q9" &&
      q9Opens &&
      q9Opens.getTime() > base.getTime()
    ) {
      base = q9Opens;
    }
    return base;
  }, [minPickupDate, branchId]);

  const pickupMinDate =
    effectiveMinPickup && isValid(effectiveMinPickup)
      ? effectiveMinPickup
      : undefined;

  const endPickerMinDate = useMemo(() => {
    if (durationType === "ONE_DAY") {
      if (date && isValid(date)) {
        const d = addDays(date, 1);
        return isValid(d) ? d : undefined;
      }
      if (effectiveMinPickup && isValid(effectiveMinPickup)) {
        const d = addDays(effectiveMinPickup, 1);
        return isValid(d) ? d : undefined;
      }
      return undefined;
    }
    if (date && isValid(date)) return date;
    return pickupMinDate;
  }, [durationType, date, effectiveMinPickup, pickupMinDate]);

  const showFutureReleaseNotice = useMemo(() => {
    if (!minPickupDate) return false;
    const r = normalizeDate(minPickupDate);
    const today = normalizeDate(new Date());
    return Boolean(r && r.getTime() > today.getTime());
  }, [minPickupDate]);

  const { fromDateTime, toDateTime } = useMemo(
    () =>
      computeAvailabilityRange({
        date,
        endDate,
        timeFrom,
        timeTo,
        durationType,
        pickupType,
        pickupSlot,
      }),
    [date, endDate, timeFrom, timeTo, durationType, pickupType, pickupSlot],
  );

  const billableDays = useMemo(() => {
    if (durationType !== "ONE_DAY" || !fromDateTime || !toDateTime) return 0;
    const diffMs = toDateTime.getTime() - fromDateTime.getTime();
    if (diffMs <= 0) return 0;
    return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }, [durationType, fromDateTime, toDateTime]);

  const pickupLine = fromDateTime
    ? formatPickupReturnSummary(fromDateTime)
    : "";
  const returnLine = toDateTime ? formatPickupReturnSummary(toDateTime) : "";
  const { weekdayDays } = useMemo(
    () => countWeekdaysInRange(fromDateTime, toDateTime),
    [fromDateTime, toDateTime],
  );
  const teaserSaving = useMemo(() => weekdayDays * 90000, [weekdayDays]);
  const teaserSavingLabel = useMemo(
    () => `${teaserSaving.toLocaleString("vi-VN")} VND`,
    [teaserSaving],
  );
  const MotionDiv = motion.div;
  const MotionButton = motion.button;

  const gateLabelClass =
    "mb-1.5 block text-xs font-black uppercase tracking-widest text-[#888]";
  const gateFieldClass =
    "w-full max-w-full min-w-0 min-h-[48px] rounded-xl border-2 border-[#eee] bg-white px-3.5 py-3.5 text-base font-semibold focus:border-[#FF9FCA] focus:outline-none";
  const gateChoiceClass =
    "min-h-[52px] touch-manipulation rounded-xl border-2 font-black transition-all active:scale-[0.98]";
  const gateLinkClass =
    "flex min-h-[44px] items-center text-left text-sm font-semibold text-[#E85C9C] underline-offset-2 hover:underline touch-manipulation";

  useEffect(() => {
    if (durationType === "SIX_HOURS") {
      const autoTimeTo = getSixHourAutoReturnTime(timeFrom);
      if (timeTo !== autoTimeTo) setTimeTo(autoTimeTo);
    }
  }, [durationType, timeFrom, timeTo, setTimeTo]);

  useEffect(() => {
    if (durationType === "ONE_DAY" && timeFrom && timeTo !== timeFrom) {
      setTimeTo(timeFrom);
    }
  }, [durationType, timeFrom, timeTo, setTimeTo]);

  useEffect(() => {
    if (branchId !== "Q9") return;
    const minQ = normalizeDate(new Date(`${Q9_BOOKING_OPENS_DATE}T12:00:00`));
    if (!minQ) return;
    const cur = date ? normalizeDate(date) : normalizeDate(new Date());
    if (!cur) {
      setDate(minQ);
      return;
    }
    if (cur.getTime() < minQ.getTime()) setDate(minQ);
  }, [branchId, date, setDate]);

  useEffect(() => {
    if (durationType !== "ONE_DAY") return;
    const isValidOneDayTime = ONE_DAY_PICKUP_OPTIONS.some(
      (option) => option.time === timeFrom,
    );
    if (isValidOneDayTime) return;
    setPickupType("MORNING");
    setPickupSlot(MORNING_PICKUP_TIME);
    setTimeFrom(MORNING_PICKUP_TIME);
    setTimeTo(MORNING_PICKUP_TIME);
  }, [
    durationType,
    timeFrom,
    setPickupType,
    setPickupSlot,
    setTimeFrom,
    setTimeTo,
  ]);

  return (
    <div className="min-w-0 max-w-full overflow-x-hidden">
      <div className="space-y-4">
        {showFutureReleaseNotice && minPickupDate ? (
          <div
            className={`rounded-xl border border-amber-200 bg-amber-50/90 px-3.5 text-amber-900 font-medium ${
              isGate ? "py-2.5 text-xs leading-relaxed" : "py-2 text-sm"
            }`}
          >
            Máy mở đặt lịch từ{" "}
            <span className="font-black text-amber-950">
              {(() => {
                const nd = normalizeDate(minPickupDate);
                return nd && isValid(nd)
                  ? format(nd, "dd/MM/yyyy")
                  : "";
              })()}
            </span>
            .
          </div>
        ) : null}
        {showTimeFields ? (
        <>
        {durationType === "SIX_HOURS" ? (
          <>
            <div className="min-w-0">
              <label className={isGate ? gateLabelClass : "text-sm mb-1 font-bold uppercase tracking-wider text-[#777] block"}>
                Ngày thuê
              </label>
              <DatePicker
                selected={pickerSelected(date)}
                onChange={(nextDate) => setDate(normalizeDate(nextDate))}
                dateFormat="dd/MM/yyyy"
                locale="vi"
                minDate={pickupMinDate}
                placeholderText="Chọn ngày thuê"
                className={isGate ? gateFieldClass : "w-full max-w-full min-w-0 rounded-xl border-2 border-[#eee] bg-white font-medium focus:border-[#FF9FCA] focus:outline-none px-4 py-3 text-base"}
              />
            </div>

            <div className="min-w-0">
              <label className={isGate ? gateLabelClass : "text-sm mb-1 font-bold uppercase tracking-wider text-[#777] block"}>
                Nhận — trả
              </label>
              <div className={`min-w-0 ${isGate ? "flex flex-col gap-2.5" : "grid grid-cols-2 gap-1.5"}`}>
                {[MORNING_PICKUP_TIME, SIX_HOUR_SECOND_PICKUP_TIME].map((slot) => {
                  const active = timeFrom === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => {
                        setTimeFrom(slot);
                        setTimeTo(getSixHourAutoReturnTime(slot));
                      }}
                      className={`${isGate ? gateChoiceClass : "min-w-0 rounded-xl border-2 font-black transition-all px-3 py-3 text-sm"} ${
                        isGate ? "w-full px-4 py-3.5 text-sm leading-snug" : ""
                      } ${
                        active
                          ? "bg-[#222] text-[#FF9FCA] border-[#222]"
                          : "bg-white text-[#555] border-[#eee] hover:border-[#FF9FCA]"
                      }`}
                    >
                      {formatSixHourSlotLabel(slot, isGate)}
                    </button>
                  );
                })}
              </div>
            </div>

            {sections === "all" ? (
              <button
                type="button"
                onClick={() => setDurationType("ONE_DAY")}
                className={isGate ? gateLinkClass : "text-left text-xs font-semibold text-[#E85C9C] underline-offset-2 hover:underline"}
              >
                Cần thuê nhiều ngày?
              </button>
            ) : null}
          </>
        ) : (
          <>
        <div className={`grid grid-cols-2 min-w-0 ${isGate ? "gap-3" : "gap-3"}`}>
          <div className="min-w-0">
            <label className={isGate ? gateLabelClass : "text-sm mb-1 font-bold uppercase tracking-wider text-[#777] block"}>
              Ngày nhận
            </label>
            <DatePicker
              selected={pickerSelected(date)}
              onChange={(nextDate) => setDate(normalizeDate(nextDate))}
              dateFormat="dd/MM/yyyy"
              locale="vi"
              minDate={pickupMinDate}
              placeholderText="Chọn ngày nhận"
              className={isGate ? gateFieldClass : "w-full max-w-full min-w-0 rounded-xl border-2 border-[#eee] bg-white font-medium focus:border-[#FF9FCA] focus:outline-none px-4 py-3 text-base"}
            />
          </div>
          <div className="min-w-0">
            <label className={isGate ? gateLabelClass : "text-sm mb-1 font-bold uppercase tracking-wider text-[#777] block"}>
              Ngày trả
            </label>
            <DatePicker
              selected={pickerSelected(endDate)}
              onChange={(nextDate) => setEndDate(normalizeDate(nextDate))}
              dateFormat="dd/MM/yyyy"
              locale="vi"
              minDate={endPickerMinDate}
              placeholderText="Chọn ngày trả"
              className={isGate ? gateFieldClass : "w-full max-w-full min-w-0 rounded-xl border-2 border-[#eee] bg-white font-medium focus:border-[#FF9FCA] focus:outline-none px-4 py-3 text-base"}
            />
            {date && isValid(date) && (
              <div
                className={`grid grid-cols-3 min-w-0 ${
                  isGate ? "mt-2 gap-1.5" : "flex flex-wrap gap-1.5 mt-2"
                }`}
              >
                {QUICK_RETURN_DAY_OFFSETS.map((offset) => {
                  const candidate = normalizeDate(addDays(date, offset));
                  const active =
                    endDate &&
                    candidate &&
                    candidate.getTime() === normalizeDate(endDate)?.getTime();
                  return (
                    <button
                      key={offset}
                      type="button"
                      onClick={() => candidate && setEndDate(candidate)}
                      className={`rounded-lg border font-semibold transition-all touch-manipulation ${
                        isGate
                          ? "min-h-[40px] px-1.5 py-2 text-xs font-bold"
                          : "px-2 py-1 text-xs"
                      } ${
                        active
                          ? "bg-[#222] text-[#FF9FCA] border-[#222]"
                          : "bg-white text-[#555] border-[#eee] hover:border-[#FF9FCA]"
                      }`}
                    >
                      +{offset} ngày
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {showTimeSummaryRow ? (
        <div className={`grid grid-cols-2 min-w-0 ${isGate ? "gap-2" : "gap-3"}`}>
          <div className="min-w-0">
            <label
              className={`font-bold uppercase tracking-wider text-[#777] mb-0.5 block ${
                isGate ? "text-[10px] font-black tracking-[0.1em] text-[#999]" : "text-sm mb-1"
              }`}
            >
              Nhận
            </label>
            <div
              className={`w-full max-w-full min-w-0 rounded-xl border-2 border-[#eee] bg-[#f5f5f5] font-medium text-[#777] ${
                isGate ? "px-2.5 py-2 text-[13px]" : "px-4 py-3 text-sm"
              }`}
            >
              {!pickupType
                ? "Chưa chọn giờ nhận"
                : pickupType === "EVENING"
                  ? `Nhận Tối (${formatTimeViFromString(pickupSlot)})`
                  : pickupType === "AFTERNOON"
                    ? `Nhận Chiều (${formatTimeViFromString(pickupSlot || SIX_HOUR_SECOND_PICKUP_TIME)})`
                    : `Nhận Sáng (${formatTimeViFromString(MORNING_PICKUP_TIME)})`}
            </div>
          </div>
          <div className="min-w-0">
            <label
              className={`font-bold uppercase tracking-wider text-[#777] mb-0.5 block ${
                isGate ? "text-[10px] font-black tracking-[0.1em] text-[#999]" : "text-sm mb-1"
              }`}
            >
              Trả
            </label>
            <input
              type="time"
              value={timeTo || ""}
              disabled
              className={`w-full max-w-full min-w-0 rounded-xl border-2 border-[#eee] bg-[#f5f5f5] font-medium text-[#777] cursor-not-allowed ${
                isGate ? "px-2.5 py-2 text-[14px]" : "px-4 py-3 text-base"
              }`}
            />
          </div>
        </div>
        ) : null}

        {isGate ? (
            <div className="space-y-2">
              <div className={gateLabelClass}>Giờ nhận/trả máy</div>
              <div className="grid min-w-0 grid-cols-2 gap-2">
                {ONE_DAY_PICKUP_OPTIONS.map((option) => {
                  const active = timeFrom === option.time;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setPickupType(option.pickupType);
                        setPickupSlot(option.time);
                        setTimeFrom(option.time);
                        setTimeTo(option.time);
                      }}
                      className={`${gateChoiceClass} min-w-0 px-2 py-3 text-xs font-bold leading-tight ${
                        active
                          ? "bg-[#222] text-[#FF9FCA] border-[#222]"
                          : "bg-white text-[#555] border-[#eee] hover:border-[#FF9FCA]"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <AnimatePresence initial={false} mode="wait">
              <MotionDiv
                key="one-day-options"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="pt-2 space-y-3">
                  <div className="text-sm text-[#666] font-semibold">
                    Giờ nhận/trả máy
                  </div>
                  <div className="grid min-w-0 grid-cols-3 gap-2">
                    {ONE_DAY_PICKUP_OPTIONS.map((option) => {
                      const active = timeFrom === option.time;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            setPickupType(option.pickupType);
                            setPickupSlot(option.time);
                            setTimeFrom(option.time);
                            setTimeTo(option.time);
                          }}
                          className={`rounded-xl border-2 px-2 py-2 text-xs font-bold transition-all ${
                            active
                              ? "bg-[#222] text-[#FF9FCA] border-[#222]"
                              : "bg-white text-[#555] border-[#eee] hover:border-[#FF9FCA]"
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </MotionDiv>
            </AnimatePresence>
          )}

            {sections === "all" ? (
              <button
                type="button"
                onClick={() => setDurationType("SIX_HOURS")}
                className={isGate ? gateLinkClass : "text-left text-xs font-semibold text-[#E85C9C] underline-offset-2 hover:underline"}
              >
                Chỉ thuê 6 tiếng?
              </button>
            ) : null}
          </>
        )}
        </>
        ) : null}

        {showBillableTeaser && durationType === "ONE_DAY" && billableDays > 0 && (
          <div className="rounded-xl border border-sky-200 bg-sky-50/70 px-4 py-3 text-sm text-slate-700">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[#334155] font-medium">
                Số ngày tính tiền:{" "}
                <span className="font-black text-[#1f2937]">
                  {billableDays}
                </span>
              </div>
              {billableDays > 2 && (
                <span className="rounded-full border border-[#0f766e]/25 bg-[#ecfdf5] px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-[#0f766e]">
                  Ưu đãi dài ngày
                </span>
              )}
            </div>

            {pickupLine && returnLine && (
              <div className="mt-2 text-sm text-slate-700 space-y-1">
                <div className="text-[#475569]">
                  Nhận:{" "}
                  <span className="font-semibold text-slate-800">
                    {pickupLine}
                  </span>
                </div>
                <div className="text-[#475569]">
                  Trả:{" "}
                  <span className="font-semibold text-slate-800">
                    {returnLine}
                  </span>
                </div>
              </div>
            )}
            <div className="text-sm text-[#0f766e] mt-2.5 font-semibold">
              Đơn hàng được giảm thẳng 20%. Giảm lên đến{" "}
              <span className="font-bold text-[#E85C9C]">
                {teaserSavingLabel}
              </span>
              .
            </div>
          </div>
        )}

        {showBranch ? (
        <div>
          <label className={isGate ? gateLabelClass : "text-sm mb-2 font-bold uppercase tracking-wider text-[#777] block"}>
            Chi nhánh
          </label>
          <div className={isGate ? "flex min-w-0 items-stretch gap-2" : "space-y-2"}>
            {BRANCHES.map((branch) => {
              const pickupDay = date ? normalizeDate(date) : normalizeDate(new Date());
              const bookable = isBranchBookable(branch, pickupDay);
              const comingSoon = branch.id === "Q9" && !bookable;
              if (comingSoon) {
                const openLabel =
                  typeof branch.opensAt === "string" && branch.opensAt
                    ? (() => {
                        const od = new Date(`${branch.opensAt}T12:00:00`);
                        return isValid(od)
                          ? od.toLocaleDateString("vi-VN")
                          : "";
                      })()
                    : "";
                const activateQ9 = () => {
                  const minQ = normalizeDate(
                    new Date(`${Q9_BOOKING_OPENS_DATE}T12:00:00`),
                  );
                  setDate(minQ);
                  setEndDate((prev) => {
                    if (durationType === "SIX_HOURS") return minQ;
                    const minEnd = addDays(minQ, 1);
                    if (!prev || prev <= minQ) return minEnd;
                    return prev < minEnd ? minEnd : prev;
                  });
                  setBranchId("Q9");
                };
                return (
                  <MotionButton
                    key={branch.id}
                    type="button"
                    layout
                    onClick={activateQ9}
                    aria-label={`${branch.label} — đặt từ ${openLabel || Q9_BOOKING_OPENS_DATE}`}
                    transition={{ layout: { type: "spring", stiffness: 420, damping: 34 } }}
                    className={`relative min-w-0 overflow-hidden rounded-xl border-2 border-dashed border-[#f5b8d4]/90 bg-gradient-to-br from-[#fff8fc] via-[#fff5f9] to-[#ffecf5] text-left cursor-pointer hover:border-[#E85C9C]/80 hover:shadow-md active:scale-[0.99] touch-manipulation ${
                      isGate
                        ? `min-h-[52px] px-3 py-3 ${branchId === "Q9" ? "flex-[2.6]" : "flex-[1]"}`
                        : "w-full px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]"
                    }`}
                  >
                    {!isGate ? (
                      <div
                        aria-hidden
                        className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-[#E85C9C]/10 blur-2xl"
                      />
                    ) : null}
                    <div className="relative flex items-start justify-between gap-2">
                      <p
                        className={`min-w-0 flex-1 font-black uppercase tracking-wide text-[#c2185b] leading-tight ${
                          isGate ? "text-sm" : "text-sm"
                        }`}
                      >
                        {isGate ? "Q9" : branch.label}
                      </p>
                      <span
                        className={`inline-flex shrink-0 items-center gap-0.5 rounded-full bg-gradient-to-r from-[#E85C9C] to-[#ff7eb3] font-black uppercase tracking-wider text-white ${
                          isGate
                            ? "px-2 py-0.5 text-[10px]"
                            : "px-2 py-0.5 text-[9px] shadow-sm ring-2 ring-white/80"
                        }`}
                      >
                        {!isGate ? (
                          <Sparkles className="h-2.5 w-2.5" strokeWidth={2.5} />
                        ) : null}
                        {isGate ? "Sớm" : "Chạm để chọn"}
                      </span>
                    </div>
                    {!isGate && branch.address ? (
                      <p className="relative mt-1.5 text-[11px] font-medium leading-snug text-[#a8557c]/90 break-words">
                        {branch.address}
                      </p>
                    ) : null}
                    {!isGate ? (
                      <p className="relative mt-1.5 text-[10px] font-semibold text-[#d9468c]/80">
                        Ngày nhận hiện trước {openLabel || "—"}. Chạm để chọn Q9 và
                        đặt ngày nhận từ {openLabel || "—"} (đặt trước được).
                      </p>
                    ) : null}
                  </MotionButton>
                );
              }

              const selected = branchId === branch.id;
              return (
                <MotionButton
                  key={branch.id}
                  type="button"
                  layout
                  disabled={!bookable}
                  onClick={() => bookable && setBranchId(branch.id)}
                  transition={{ layout: { type: "spring", stiffness: 420, damping: 34 } }}
                  className={`relative min-w-0 overflow-hidden rounded-xl border-2 text-left touch-manipulation active:scale-[0.98] transition-colors duration-300 ${
                    isGate
                      ? selected
                        ? "flex-[2.6] px-4 py-4 min-h-[76px]"
                        : "flex-[1] px-3 py-3 min-h-[76px]"
                      : "w-full px-3 py-2.5"
                  } ${
                    !bookable
                      ? "cursor-not-allowed border-[#eee] bg-[#f5f5f5] text-[#bbb]"
                      : selected
                        ? "border-[#222] bg-[#222] shadow-md"
                        : "border-[#eee] bg-white hover:border-[#FF9FCA]"
                  }`}
                >
                  <div
                    className={`relative flex gap-1 ${
                      selected && isGate ? "items-start" : "items-center justify-between"
                    }`}
                  >
                    <p
                      className={`min-w-0 flex-1 font-black uppercase tracking-wide leading-tight ${
                        isGate ? (selected ? "text-base" : "text-sm truncate") : "text-sm"
                      } ${
                        !bookable
                          ? "text-[#bbb]"
                          : selected
                            ? "text-[#FF9FCA]"
                            : "text-[#222]"
                      }`}
                    >
                      {isGate
                        ? branch.id === "PHU_NHUAN"
                          ? "Phú Nhuận"
                          : "Q9"
                        : branch.label}
                    </p>
                    {selected && bookable ? (
                      <span
                        className={`shrink-0 rounded-full bg-[#FF9FCA]/15 font-black uppercase tracking-wider text-[#FF9FCA] ring-1 ring-[#FF9FCA]/30 ${
                          isGate
                            ? "px-2 py-0.5 text-[10px]"
                            : "px-2 py-0.5 text-[9px]"
                        }`}
                      >
                        ✓
                      </span>
                    ) : null}
                  </div>
                  {selected && bookable && branch.address ? (
                    <AnimatePresence initial={false}>
                      <motion.p
                        key={`${branch.id}-address`}
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        className={`overflow-hidden font-medium leading-snug break-words ${
                          isGate ? "text-xs text-[#ffb6d7]" : "text-[11px] text-[#f5c0dc]"
                        }`}
                      >
                        {branch.address}
                      </motion.p>
                    </AnimatePresence>
                  ) : null}
                </MotionButton>
              );
            })}
          </div>
        </div>
        ) : null}

        {/* Error */}
        {error && (
          <div
            className={`font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl ${
              isGate ? "p-2 text-xs" : "p-3 text-base"
            }`}
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

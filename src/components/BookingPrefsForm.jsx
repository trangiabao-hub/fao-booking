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

const DURATION_TYPES = [
  { id: "SIX_HOURS", label: "Thuê 6 tiếng" },
  { id: "ONE_DAY", label: "Thuê theo ngày" },
];

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
  const showDuration = sections === "all";
  const showTimeFields = sections === "all" || sections === "time";
  const showTimeSummaryRow =
    durationType === "SIX_HOURS"
      ? sections === "all" || sections === "time"
      : sections === "all" && !isGate;
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
      <div className={isGate ? "space-y-2.5" : "space-y-4"}>
        {showFutureReleaseNotice && minPickupDate ? (
          <div
            className={`rounded-xl border border-amber-200 bg-amber-50/90 px-3 text-amber-900 font-medium ${
              isGate ? "py-1.5 text-[11px]" : "py-2 text-sm"
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
        {showDuration ? (
        <div>
          <label
            className={`font-bold uppercase tracking-wider text-[#777] block ${
              isGate
                ? "text-[10px] font-black tracking-[0.1em] text-[#999] mb-1"
                : "text-sm mb-2"
            }`}
          >
            Gói thuê
          </label>
          <div className="grid grid-cols-2 gap-1.5 min-w-0">
            {DURATION_TYPES.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setDurationType(opt.id)}
                className={`min-w-0 rounded-xl border-2 transition-all text-left ${
                  isGate ? "px-2.5 py-2" : "px-3 py-2.5"
                } ${
                  durationType === opt.id
                    ? "bg-[#222] text-white border-[#222]"
                    : "bg-white text-[#555] border-[#eee] hover:border-[#FF9FCA]"
                }`}
              >
                <span
                  className={`font-black tracking-wide truncate block ${
                    isGate ? "text-[13px]" : "text-sm"
                  } ${
                    durationType === opt.id ? "text-[#FF9FCA]" : "text-[#222]"
                  }`}
                >
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>
        ) : null}

        {showTimeFields ? (
        <>
        <div className={`grid grid-cols-2 min-w-0 ${isGate ? "gap-2" : "gap-3"}`}>
          <div className="min-w-0">
            <label
              className={`font-bold uppercase tracking-wider text-[#777] mb-0.5 block ${
                isGate ? "text-[10px] font-black tracking-[0.1em] text-[#999]" : "text-sm mb-1"
              }`}
            >
              Ngày nhận
            </label>
            <DatePicker
              selected={pickerSelected(date)}
              onChange={(nextDate) => setDate(normalizeDate(nextDate))}
              dateFormat="dd/MM/yyyy"
              locale="vi"
              minDate={pickupMinDate}
              placeholderText="Chọn ngày nhận"
              className={`w-full max-w-full min-w-0 rounded-xl border-2 border-[#eee] bg-white font-medium focus:border-[#FF9FCA] focus:outline-none ${
                isGate ? "px-2.5 py-2 text-[14px]" : "px-4 py-3 text-base"
              }`}
            />
          </div>
          <div className="min-w-0">
            <label
              className={`font-bold uppercase tracking-wider text-[#777] mb-0.5 block ${
                isGate ? "text-[10px] font-black tracking-[0.1em] text-[#999]" : "text-sm mb-1"
              }`}
            >
              Ngày trả
            </label>
            {durationType === "SIX_HOURS" ? (
              <input
                type="text"
                value={
                  toDateTime && isValid(toDateTime)
                    ? format(toDateTime, "dd/MM/yyyy")
                    : ""
                }
                disabled
                className={`w-full max-w-full min-w-0 rounded-xl border-2 border-[#eee] bg-[#f5f5f5] font-medium text-[#777] cursor-not-allowed ${
                  isGate ? "px-2.5 py-2 text-[14px]" : "px-4 py-3 text-base"
                }`}
              />
            ) : (
              <>
                <DatePicker
                  selected={pickerSelected(endDate)}
                  onChange={(nextDate) => setEndDate(normalizeDate(nextDate))}
                  dateFormat="dd/MM/yyyy"
                  locale="vi"
                  minDate={endPickerMinDate}
                  placeholderText="Chọn ngày trả"
                  className={`w-full max-w-full min-w-0 rounded-xl border-2 border-[#eee] bg-white font-medium focus:border-[#FF9FCA] focus:outline-none ${
                    isGate ? "px-2.5 py-2 text-[14px]" : "px-4 py-3 text-base"
                  }`}
                />
                {durationType === "ONE_DAY" && date && isValid(date) && (
                  <div
                    className={`grid grid-cols-3 min-w-0 ${
                      isGate ? "gap-1 mt-1" : "flex flex-wrap gap-1.5 mt-2"
                    }`}
                  >
                    {QUICK_RETURN_DAY_OFFSETS.map((offset) => {
                      const candidate = normalizeDate(addDays(date, offset));
                      const active =
                        endDate &&
                        candidate &&
                        candidate.getTime() ===
                          normalizeDate(endDate)?.getTime();
                      return (
                        <button
                          key={offset}
                          type="button"
                          onClick={() =>
                            candidate && setEndDate(candidate)
                          }
                          className={`rounded-lg border font-semibold transition-all ${
                            isGate
                              ? "px-1 py-0.5 text-[10px] font-bold"
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
              </>
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
            {durationType === "SIX_HOURS" ? (
              <div className="grid grid-cols-2 gap-1.5 min-w-0">
                {[MORNING_PICKUP_TIME, SIX_HOUR_SECOND_PICKUP_TIME].map(
                  (slot) => {
                    const active = timeFrom === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => {
                          setTimeFrom(slot);
                          setTimeTo(getSixHourAutoReturnTime(slot));
                        }}
                        className={`min-w-0 rounded-xl border-2 font-black uppercase tracking-wider transition-all ${
                          isGate
                            ? "px-1 py-2 text-[11px] leading-tight"
                            : "px-3 py-3 text-sm"
                        } ${
                          active
                            ? "bg-[#222] text-[#FF9FCA] border-[#222]"
                            : "bg-white text-[#555] border-[#eee] hover:border-[#FF9FCA]"
                        }`}
                      >
                        {isGate
                          ? formatTimeViFromString(slot)
                          : `Nhận ${formatTimeViFromString(slot)}`}
                      </button>
                    );
                  },
                )}
              </div>
            ) : (
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
            )}
          </div>
          <div className="min-w-0">
            <label
              className={`font-bold uppercase tracking-wider text-[#777] mb-0.5 block ${
                isGate ? "text-[10px] font-black tracking-[0.1em] text-[#999]" : "text-sm mb-1"
              }`}
            >
              Trả
            </label>
            {durationType === "SIX_HOURS" ? (
              <input
                type="time"
                value={timeTo}
                disabled
                className={`w-full max-w-full min-w-0 rounded-xl border-2 border-[#eee] bg-[#f5f5f5] font-medium text-[#777] cursor-not-allowed ${
                  isGate ? "px-2.5 py-2 text-[14px]" : "px-4 py-3 text-base"
                }`}
              />
            ) : durationType === "ONE_DAY" ? (
              <input
                type="time"
                value={timeTo || ""}
                disabled
                className={`w-full max-w-full min-w-0 rounded-xl border-2 border-[#eee] bg-[#f5f5f5] font-medium text-[#777] cursor-not-allowed ${
                  isGate ? "px-2.5 py-2 text-[14px]" : "px-4 py-3 text-base"
                }`}
              />
            ) : (
              <div
                className={`w-full max-w-full min-w-0 rounded-xl border-2 border-[#eee] bg-[#f5f5f5] font-medium text-[#777] ${
                  isGate ? "px-2.5 py-2 text-[13px]" : "px-4 py-3 text-sm"
                }`}
              >
                Tự động
              </div>
            )}
          </div>
        </div>
        ) : null}

        {durationType === "ONE_DAY" &&
          (isGate ? (
            <div className="pt-0.5 space-y-1">
              <div className="text-[10px] font-black uppercase tracking-[0.1em] text-[#999]">
                Giờ nhận máy
              </div>
              <div className="grid min-w-0 grid-cols-4 gap-1">
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
                      className={`min-w-0 truncate rounded-lg border-2 py-1.5 text-[10px] font-bold leading-tight transition-all ${
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
                    Giờ nhận máy
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
          ))}
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
          <label
            className={`font-bold uppercase tracking-wider text-[#777] block ${
              isGate
                ? "text-[10px] font-black tracking-[0.1em] text-[#999] mb-1"
                : "text-sm mb-2"
            }`}
          >
            Chi nhánh
          </label>
          <div className={isGate ? "grid grid-cols-2 gap-1.5 min-w-0" : "space-y-2"}>
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
                  <button
                    key={branch.id}
                    type="button"
                    onClick={activateQ9}
                    aria-label={`${branch.label} — đặt từ ${openLabel || Q9_BOOKING_OPENS_DATE}`}
                    className={`relative w-full overflow-hidden rounded-xl border-2 border-dashed border-[#f5b8d4]/90 bg-gradient-to-br from-[#fff8fc] via-[#fff5f9] to-[#ffecf5] text-left cursor-pointer transition hover:border-[#E85C9C]/80 hover:shadow-md active:scale-[0.99] ${
                      isGate
                        ? "col-span-2 px-2 py-1.5"
                        : "px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]"
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
                          isGate ? "text-[11px]" : "text-sm"
                        }`}
                      >
                        {isGate ? "Q9" : branch.label}
                      </p>
                      <span
                        className={`inline-flex shrink-0 items-center gap-0.5 rounded-full bg-gradient-to-r from-[#E85C9C] to-[#ff7eb3] font-black uppercase tracking-wider text-white ${
                          isGate
                            ? "px-1.5 py-px text-[8px]"
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
                  </button>
                );
              }

              const selected = branchId === branch.id;
              return (
                <button
                  key={branch.id}
                  type="button"
                  disabled={!bookable}
                  onClick={() => bookable && setBranchId(branch.id)}
                  className={`relative w-full min-w-0 overflow-hidden rounded-xl border-2 text-left transition-all ${
                    isGate ? "px-2 py-2" : "px-3 py-2.5"
                  } ${
                    !bookable
                      ? "cursor-not-allowed border-[#eee] bg-[#f5f5f5] text-[#bbb]"
                      : selected
                        ? "border-[#222] bg-[#222] shadow-md"
                        : "border-[#eee] bg-white hover:border-[#FF9FCA]"
                  }`}
                >
                  <div className="relative flex items-center justify-between gap-1">
                    <p
                      className={`min-w-0 flex-1 font-black uppercase tracking-wide leading-tight truncate ${
                        isGate ? "text-[11px]" : "text-sm"
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
                            ? "px-1 py-px text-[8px]"
                            : "px-2 py-0.5 text-[9px]"
                        }`}
                      >
                        ✓
                      </span>
                    ) : null}
                  </div>
                  {!isGate && branch.address ? (
                    <p
                      className={`relative mt-1.5 text-[11px] font-medium leading-snug break-words ${
                        !bookable
                          ? "text-[#ccc]"
                          : selected
                            ? "text-[#f5c0dc]"
                            : "text-[#666]"
                      }`}
                    >
                      {branch.address}
                    </p>
                  ) : null}
                </button>
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

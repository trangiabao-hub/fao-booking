import React, { useMemo, useEffect } from "react";
import { format, addDays } from "date-fns";
import vi from "date-fns/locale/vi";
import DatePicker from "react-datepicker";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

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
const SIX_HOUR_MAX_HOURS = 12;

const DURATION_TYPES = [
  { id: "SIX_HOURS", label: "6 tiếng" },
  { id: "ONE_DAY", label: "Thuê theo ngày" },
];

const BRANCHES = [
  { id: "PHU_NHUAN", label: "FAO Phú Nhuận" },
  { id: "Q9", label: "FAO Q9 (Vinhomes)", disabled: true, comingSoon: true },
];

/* ── Helpers ── */

export function normalizeDate(date) {
  if (!date) return null;
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getDefaultBranchId() {
  return BRANCHES.find((b) => !b.disabled)?.id || BRANCHES[0]?.id;
}

function combineDateWithTimeString(dateOnly, timeStr) {
  if (!dateOnly || !timeStr) return null;
  const [hStr, mStr] = timeStr.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10) || 0;
  if (isNaN(h) || isNaN(m)) return null;
  const d = new Date(dateOnly);
  d.setHours(h, m, 0, 0);
  return d;
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
  if (!date) return "";
  const hour = format(date, "HH");
  const minute = format(date, "mm");
  return minute === "00" ? `${hour}h` : `${hour}:${minute}`;
}

export function formatPickupReturnSummary(date) {
  if (!date) return "";
  return `${formatTimeShort(date)} • ${getDayPartLabel(date)} • ${formatWeekdayLabel(
    date
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

export function getAvailabilityRangeError(prefs, fromDateTime, toDateTime) {
  if (!fromDateTime || !toDateTime) return "Vui lòng chọn giờ nhận / trả.";
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
}) {
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

  return (
    <div className="min-w-0 overflow-x-hidden">
      {/* Promo banner */}
      <div className="rounded-xl border border-pink-200/70 bg-[#fff7fb] px-3 py-2 mb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[#E85C9C] text-[11px] font-semibold tracking-wide">
            <Sparkles size={12} />
            Khuyến mãi tuần này
          </div>
          <span className="rounded-full bg-[#E85C9C] px-1.5 py-0.5 text-[9px] font-semibold text-white">
            Hot
          </span>
        </div>
        <div className="text-[11px] text-[#555] mt-1 font-medium leading-relaxed">
          Giảm trực tiếp{" "}
          <span className="text-[#E85C9C] font-black">20%</span> từ thứ 2 đến
          thứ 6. Tự áp dụng khi đủ điều kiện, không cần nhập mã.
        </div>
        <div className="text-[11px] text-[#555] mt-1 font-medium leading-relaxed">
          Thuê máy ảnh{" "}
          <span className="font-black text-[#E85C9C] bg-[#FFE4F0] px-1.5 py-0.5 rounded">
            không cần cọc
          </span>
          , chỉ cần CCCD chính chủ hoặc VNeID định danh mức 2.
        </div>
      </div>

      <div className="space-y-4">
        {/* Gói thuê */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[#777] mb-2 block">
            Gói thuê
          </label>
          <div className="grid grid-cols-2 gap-2">
            {DURATION_TYPES.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setDurationType(opt.id)}
                className={`px-3 py-2.5 rounded-xl border-2 transition-all text-left ${
                  durationType === opt.id
                    ? "bg-[#222] text-white border-[#222]"
                    : "bg-white text-[#555] border-[#eee] hover:border-[#FF9FCA]"
                }`}
              >
                <div
                  className={`text-[12px] font-black tracking-wide ${
                    durationType === opt.id ? "text-[#FF9FCA]" : "text-[#222]"
                  }`}
                >
                  {opt.label}
                </div>
                <div
                  className={`text-[10px] mt-0.5 ${
                    durationType === opt.id ? "text-[#f3d7e6]" : "text-[#888]"
                  }`}
                >
                  {opt.id === "ONE_DAY"
                    ? "Tiết kiệm hơn, ưu đãi mạnh ngày thường"
                    : "Linh hoạt theo giờ, nhận nhanh trong ngày"}
                </div>
                {opt.id === "ONE_DAY" && (
                  <span className="mt-1 inline-flex rounded-md border border-[#FF9FCA]/50 bg-[#FF9FCA]/15 px-2 py-0.5 text-[9px] font-black leading-none tracking-normal text-[#E85C9C]">
                    Giá ưu đãi
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Ngày nhận / trả */}
        <div className="grid grid-cols-2 gap-3 min-w-0">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#777] mb-1 block">
              Ngày nhận
            </label>
            <DatePicker
              selected={date}
              onChange={(nextDate) => setDate(normalizeDate(nextDate))}
              dateFormat="dd/MM/yyyy"
              locale="vi"
              minDate={normalizeDate(new Date())}
              placeholderText="Chọn ngày nhận"
              className="w-full px-4 py-3 rounded-xl border-2 border-[#eee] bg-white text-sm font-medium focus:border-[#FF9FCA] focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#777] mb-1 block">
              Ngày trả
            </label>
            {durationType === "SIX_HOURS" ? (
              <input
                type="text"
                value={toDateTime ? format(toDateTime, "dd/MM/yyyy") : ""}
                disabled
                className="w-full px-4 py-3 rounded-xl border-2 border-[#eee] bg-[#f5f5f5] text-sm font-medium text-[#777] cursor-not-allowed"
              />
            ) : (
              <DatePicker
                selected={endDate}
                onChange={(nextDate) => setEndDate(normalizeDate(nextDate))}
                dateFormat="dd/MM/yyyy"
                locale="vi"
                minDate={
                  durationType === "ONE_DAY"
                    ? date
                      ? addDays(date, 1)
                      : addDays(new Date(), 1)
                    : date || normalizeDate(new Date())
                }
                placeholderText="Chọn ngày trả"
                className="w-full px-4 py-3 rounded-xl border-2 border-[#eee] bg-white text-sm font-medium focus:border-[#FF9FCA] focus:outline-none"
              />
            )}
          </div>
        </div>

        {/* Nhận / Trả time display */}
        <div className="grid grid-cols-2 gap-3 min-w-0">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#777] mb-1 block">
              Nhận
            </label>
            {durationType === "SIX_HOURS" ? (
              <div className="grid grid-cols-2 gap-2">
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
                        className={`px-3 py-3 rounded-xl border-2 text-xs font-black uppercase tracking-wider transition-all ${
                          active
                            ? "bg-[#222] text-[#FF9FCA] border-[#222]"
                            : "bg-white text-[#555] border-[#eee] hover:border-[#FF9FCA]"
                        }`}
                      >
                        Nhận {slot}
                      </button>
                    );
                  },
                )}
              </div>
            ) : (
              <div className="w-full px-4 py-3 rounded-xl border-2 border-[#eee] bg-[#f5f5f5] text-sm font-medium text-[#777]">
                {pickupType === "EVENING"
                  ? `Nhận Tối (${pickupSlot})`
                  : `Nhận Sáng (${MORNING_PICKUP_TIME})`}
              </div>
            )}
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#777] mb-1 block">
              Trả
            </label>
            {durationType === "SIX_HOURS" ? (
              <input
                type="time"
                value={timeTo}
                disabled
                className="w-full px-4 py-3 rounded-xl border-2 border-[#eee] bg-[#f5f5f5] text-sm font-medium text-[#777] cursor-not-allowed"
              />
            ) : durationType === "ONE_DAY" ? (
              <input
                type="time"
                value={timeTo || ""}
                disabled
                className="w-full px-4 py-3 rounded-xl border-2 border-[#eee] bg-[#f5f5f5] text-sm font-medium text-[#777] cursor-not-allowed"
              />
            ) : (
              <div className="w-full px-4 py-3 rounded-xl border-2 border-[#eee] bg-[#f5f5f5] text-sm font-medium text-[#777]">
                Tự động
              </div>
            )}
          </div>
        </div>

        {/* Chọn thời gian nhận máy (ONE_DAY only) */}
        <AnimatePresence initial={false} mode="wait">
          {durationType === "ONE_DAY" && (
            <MotionDiv
              key="one-day-options"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="pt-2 space-y-3">
                <div className="text-xs text-[#666] font-semibold">
                  Chọn thời gian nhận máy
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPickupType("MORNING");
                      setTimeFrom(MORNING_PICKUP_TIME);
                      setTimeTo(MORNING_PICKUP_TIME);
                    }}
                    className={`px-3 py-2 rounded-xl border-2 text-xs font-bold uppercase tracking-wide transition-all ${
                      pickupType === "MORNING"
                        ? "bg-[#222] text-[#FF9FCA] border-[#222]"
                        : "bg-white text-[#555] border-[#eee] hover:border-[#FF9FCA]"
                    }`}
                  >
                    Nhận sáng
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const defaultNight = ONE_DAY_EVENING_SLOTS[0];
                      setPickupType("EVENING");
                      setPickupSlot(defaultNight);
                      setTimeFrom(defaultNight);
                      setTimeTo(defaultNight);
                    }}
                    className={`px-3 py-2 rounded-xl border-2 text-xs font-bold uppercase tracking-wide transition-all ${
                      pickupType === "EVENING"
                        ? "bg-[#222] text-[#FF9FCA] border-[#222]"
                        : "bg-white text-[#555] border-[#eee] hover:border-[#FF9FCA]"
                    }`}
                  >
                    Nhận tối
                  </button>
                </div>

                {pickupType === "MORNING" ? (
                  <div className="p-3 rounded-xl border border-[#eee] bg-white">
                    <div className="text-sm font-black text-[#222] mb-2">
                      Khung giờ nhận sáng
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPickupType("MORNING");
                        setTimeFrom(MORNING_PICKUP_TIME);
                        setTimeTo(MORNING_PICKUP_TIME);
                      }}
                      className="px-3 py-2 rounded-xl border-2 text-xs font-black bg-[#222] text-[#FF9FCA] border-[#222]"
                    >
                      {MORNING_PICKUP_TIME}
                    </button>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl border border-[#eee] bg-white">
                    <div className="text-sm font-black text-[#222] mb-2">
                      Khung giờ nhận tối
                    </div>
                    <div className="grid grid-cols-3 gap-2 min-w-0">
                      {ONE_DAY_EVENING_SLOTS.map((slot) => {
                        const active =
                          pickupType === "EVENING" && pickupSlot === slot;
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => {
                              setPickupType("EVENING");
                              setPickupSlot(slot);
                              setTimeFrom(slot);
                              setTimeTo(slot);
                            }}
                            className={`px-2 py-2 rounded-xl border-2 text-xs font-black transition-all ${
                              active
                                ? "bg-[#222] text-[#FF9FCA] border-[#222]"
                                : "bg-white text-[#555] border-[#eee] hover:border-[#FF9FCA]"
                            }`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </MotionDiv>
          )}
        </AnimatePresence>

        {/* Billable days summary (ONE_DAY) */}
        {durationType === "ONE_DAY" && billableDays > 0 && (
          <div className="rounded-xl border border-sky-200 bg-sky-50/70 px-3.5 py-3 text-[13px] text-slate-700">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[#334155] font-medium">
                Số ngày tính tiền:{" "}
                <span className="font-black text-[#1f2937]">
                  {billableDays}
                </span>
              </div>
              {billableDays > 2 && (
                <span className="rounded-full border border-[#0f766e]/25 bg-[#ecfdf5] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#0f766e]">
                  Ưu đãi dài ngày
                </span>
              )}
            </div>

            {pickupLine && returnLine && (
              <div className="mt-2 text-[11px] text-slate-700 space-y-1">
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
            <div className="text-[11px] text-[#0f766e] mt-2.5 font-semibold">
              Đơn hàng được giảm thẳng 20%. Giảm lên đến{" "}
              <span className="font-bold text-[#E85C9C]">
                {teaserSavingLabel}
              </span>
              .
            </div>
          </div>
        )}

        {/* Chi nhánh */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[#777] mb-2 block">
            Chi nhánh
          </label>
          <div className="grid grid-cols-2 gap-2">
            {BRANCHES.map((branch) => (
              <button
                key={branch.id}
                type="button"
                disabled={branch.disabled}
                onClick={() => !branch.disabled && setBranchId(branch.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border-2 transition-all ${
                  branch.disabled
                    ? "bg-[#f5f5f5] text-[#bbb] border-[#eee] cursor-not-allowed"
                    : branchId === branch.id
                      ? "bg-[#222] text-[#FF9FCA] border-[#222]"
                      : "bg-white text-[#555] border-[#eee] hover:border-[#FF9FCA]"
                }`}
              >
                {branch.label}
                {branch.comingSoon ? " (Sắp ra mắt)" : ""}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="text-sm text-red-600 font-medium bg-red-50 border border-red-200 rounded-xl p-3">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

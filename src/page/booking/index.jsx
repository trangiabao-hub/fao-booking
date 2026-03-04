import React, { useMemo, useState, useEffect, useCallback } from "react";
import { format, isWeekend, addDays } from "date-fns";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import vi from "date-fns/locale/vi";

import {
  ArrowLeftIcon,
  CheckCircleIcon,
  DevicePhoneMobileIcon,
  UserIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  PrinterIcon,
} from "@heroicons/react/24/solid";
import api from "../../config/axios";
import FloatingContactButton from "../../components/FloatingContactButton";
import BookingProgress from "../../components/BookingProgress";
import BookingPrefsForm, {
  computeAvailabilityRange,
  getAvailabilityRangeError,
  getSixHourAutoReturnTime,
} from "../../components/BookingPrefsForm";
import {
  saveCustomerInfo,
  loadCustomerInfo,
  saveBookingPrefs,
  loadBookingPrefs,
} from "../../utils/storage";
import {
  BRANCHES,
  DURATION_OPTIONS,
  MORNING_PICKUP_TIME,
  SIX_HOUR_SECOND_PICKUP_TIME,
  SIX_HOUR_RETURN_TIME,
  DEFAULT_EVENING_SLOT,
  EVENING_SLOTS,
  SIX_HOUR_MAX_HOURS,
} from "../../data/bookingConstants";
import {
  normalizeDate,
  normalizePhone,
  combineDateWithTime,
  getDurationDays,
  getDefaultBranchId,
  getTimeRange,
  countWeekdaysBetweenAligned,
  getSlotButtonClasses,
  getPriceForDuration,
} from "../../utils/bookingHelpers";

/* ========= HẰNG SỐ & DỮ LIỆU ===== */

const TET_BASE_DATE = new Date(2026, 1, 12); // Mùng 1 Tết
const TET_START_OFFSET = -6; // 25 Tết
const TET_END_OFFSET = 9; // Mùng 10

// Vouchers
const VOUCHERS = [
  { id: "NONE", label: "Không áp dụng", rate: 0 },
  { id: "WEEKDAY20", label: "Weekday -20%", rate: 0.2 },
];

const FALLBACK_IMG = "https://placehold.co/640x360/fdf2f8/ec4899?text=No+Image";

/* ========= HELPERS ========= */

function inferBrand(name = "") {
  const n = name.toUpperCase();
  if (n.includes("FUJIFILM") || n.includes("FUJI")) return "fuji";
  if (n.includes("CANON")) return "canon";
  if (n.includes("SONY")) return "sony";
  if (n.includes("POCKET") || n.includes("GOPRO") || n.includes("DJI"))
    return "pocket";
  return "other";
}

function parseDeposit(desc) {
  if (!desc) return 2000000;
  const mTrieu = desc.match(/Cọc\s*([\d.,]+)\s*triệu/i);
  if (mTrieu) {
    const n = parseFloat(mTrieu[1].replace(",", "."));
    if (!isNaN(n)) return Math.round(n * 1_000_000);
  }
  const mVnd = desc.match(/Cọc\s*([\d.\s,]+)/i);
  if (mVnd) {
    const digits = mVnd[1].replace(/[^\d]/g, "");
    const n = parseInt(digits, 10);
    if (!isNaN(n) && n > 0) return n;
  }
  return 2000000;
}

const diffHours = (d1, d2) => (d2.getTime() - d1.getTime()) / (1000 * 60 * 60);

function safeDesc(s) {
  if (!s) return "Thanh toan don hang";
  const t = s.trim().replace(/\s+/g, " ");
  return t.length <= 25 ? t : t.slice(0, 24) + "…";
}

function formatDateTimeLocalForAPI(date) {
  if (!date) return null;
  return format(date, "yyyy-MM-dd'T'HH:mm:ss");
}


function normalizeDeviceName(name = "") {
  return name.replace(/\s*\(\d+\)\s*$/, "").trim();
}

function getTetDayLabel(date) {
  if (!date) return null;
  const d = normalizeDate(date);
  const base = normalizeDate(TET_BASE_DATE);
  const diff = Math.round((d - base) / (1000 * 60 * 60 * 24));
  if (diff < TET_START_OFFSET || diff > TET_END_OFFSET) return null;
  if (diff >= 0) return `Mùng ${diff + 1}`;
  return `${31 + diff} Tết`;
}

function getDayPartLabel(date) {
  const hour = date.getHours();
  if (hour < 12) return "Sáng";
  if (hour < 18) return "Chiều";
  return "Tối";
}

function formatTimeLabel(date) {
  const h = format(date, "HH");
  const m = format(date, "mm");
  return m === "00" ? `${h}h` : `${h}:${m}`;
}

function formatWeekdayShort(date) {
  const dow = date.getDay();
  if (dow === 0) return "CN";
  return `Thứ ${dow + 1}`;
}

function formatBookingSummaryDate(date) {
  const tetLabel = getTetDayLabel(date);
  if (!tetLabel) {
    return format(date, "dd/MM HH:mm", { locale: vi });
  }
  const timeLabel = formatTimeLabel(date);
  const dayPart = getDayPartLabel(date);
  const weekday = formatWeekdayShort(date);
  return `${timeLabel} • ${dayPart} • ${tetLabel} • ${weekday} (${format(
    date,
    "dd/MM"
  )})`;
}


/** Format số tiền VND để in hợp đồng */
function formatVnd(amount) {
  if (amount == null || isNaN(amount)) return "0";
  return Math.round(amount).toLocaleString("vi-VN");
}

function escapeHtmlContract(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Mở cửa sổ in hợp đồng thuê máy với dữ liệu đã điền.
 * @param {{ device: { displayName: string, deposit: number }, total: number, t1: Date, t2: Date }} data
 */
function printContract({ device, total, t1, t2 }) {
  if (!device || !t1 || !t2) return;
  const machineName = escapeHtmlContract(device.displayName || "—");
  const machineValue = escapeHtmlContract(formatVnd(device.deposit)) + " VND";
  const rentalPrice = escapeHtmlContract(formatVnd(total)) + " VND";
  const fromTime = format(t1, "HH");
  const fromDate = format(t1, "dd/MM/yyyy");
  const toTime = format(t2, "HH");
  const toDate = format(t2, "dd/MM/yyyy");
  const timeRange = `Từ ${fromTime} Giờ, Ngày ${fromDate} Đến ${toTime} Giờ, Ngày ${toDate}`;

  const html = `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><title>Hợp đồng thuê máy</title>
<style>body{font-family:"Times New Roman",Times,serif;font-size:14px;line-height:1.6;padding:24px;max-width:600px;margin:0 auto;}
h2{text-align:center;font-size:18px;margin-bottom:24px;}
.clause{margin:14px 0;}.clause-num{font-weight:bold;}
.fill{text-decoration:underline;text-underline-offset:2px;}
@media print{body{padding:16px;}}</style>
</head>
<body>
<h2>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<br>Độc lập - Tự do - Hạnh phúc</h2>
<h2>HỢP ĐỒNG THUÊ MÁY</h2>
<div class="clause"><span class="clause-num">1.</span> Dòng Máy Tên: <span class="fill">${machineName}</span></div>
<div class="clause"><span class="clause-num">2.</span> Giá Trị Máy: <span class="fill">${machineValue}</span></div>
<div class="clause"><span class="clause-num">3.</span> Giá Thuê: <span class="fill">${rentalPrice}</span></div>
<div class="clause"><span class="clause-num">5.</span> Thời Hạn Thuê: <span class="fill">${timeRange}</span></div>
<script>window.onload=function(){window.focus();window.print();};window.onafterprint=function(){window.close();};</script>
</body>
</html>`;

  try {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank", "noopener,noreferrer");
    URL.revokeObjectURL(url);
    if (!w) alert("Vui lòng cho phép popup để in hợp đồng.");
  } catch (e) {
    console.error("In hợp đồng:", e);
  }
}

/* ===== Hook tính giá ===== */
function useBookingPricing(
  device,
  startDate,
  timeFrom,
  endDate,
  timeTo,
  voucherId,
  durationId
) {
  return useMemo(() => {
    if (!device || !startDate || !endDate || !timeFrom || !timeTo)
      return {
        days: 0,
        subTotal: 0,
        discount: 0,
        total: 0,
        t1: null,
        t2: null,
        isSixHours: false,
      };

    const t1 = combineDateWithTime(startDate, timeFrom);
    const t2 = combineDateWithTime(endDate, timeTo);

    if (!t1 || !t2 || t2 <= t1) {
      return {
        days: 0,
        subTotal: 0,
        discount: 0,
        total: 0,
        t1,
        t2,
        isSixHours: false,
      };
    }

    const hours = diffHours(t1, t2);
    const sameDay = startDate.toDateString() === endDate.toDateString();

    let days = 0;
    let subTotal = 0;
    let isSixHours = false;

    if (durationId === "SIX_HOURS") {
      if (hours > 0 && hours <= SIX_HOUR_MAX_HOURS + 0.05) {
        isSixHours = true;
        days = 0.5;
        subTotal = device.priceSixHours || device.priceOneDay || 0;
      }
    } else if (sameDay && hours <= 6.05) {
      isSixHours = true;
      days = 0.5;
      subTotal = device.priceSixHours || device.priceOneDay || 0;
    } else {
      const rawDays = Math.ceil(hours / 24);
      days = rawDays <= 0 ? 1 : rawDays;

      if (days === 1) subTotal = device.priceOneDay || 0;
      else if (days === 2) subTotal = device.priceTwoDay || 0;
      else if (days === 3) subTotal = device.priceThreeDay || 0;
      else {
        subTotal =
          (device.priceThreeDay || 0) + (days - 3) * (device.priceNextDay || 0);
      }
    }

    const voucher = VOUCHERS.find((v) => v.id === voucherId);
    let discount = 0;

    if (voucher?.id === "WEEKDAY20") {
      if (isSixHours && sameDay) {
        if (!isWeekend(t1)) {
          discount = Math.round(subTotal * voucher.rate);
        }
      } else {
        const { days: dCount, weekdays } = countWeekdaysBetweenAligned(t1, t2);
        const ratio = dCount > 0 ? weekdays / dCount : 0;
        discount = Math.round(subTotal * voucher.rate * ratio);
      }
    }

    const total = Math.max(0, subTotal - discount);

    return { days, subTotal, discount, total, t1, t2, isSixHours };
  }, [device, startDate, timeFrom, endDate, timeTo, voucherId, durationId]);
}

/* ===================== UI Components ===================== */

const InputField = ({
  icon,
  value,
  onChange,
  placeholder,
  inputMode,
  error,
  helpText,
}) => {
  return (
    <div>
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#E85C9C]">
          {icon}
        </div>
        <input
          value={value}
          onChange={onChange}
          className={`w-full rounded-xl border-2 ${
            error ? "border-red-400" : "border-[#eee]"
          } focus:border-[#FF9FCA] focus:outline-none focus:ring-2 focus:ring-[#FF9FCA]/20 pl-11 pr-4 py-3 text-[#222] font-medium placeholder:text-[#aaa] bg-white`}
          placeholder={placeholder}
          inputMode={inputMode}
        />
      </div>
      {error && helpText && (
        <div className="text-xs text-red-500 mt-1.5 ml-1 font-medium">
          {helpText}
        </div>
      )}
    </div>
  );
};

function Summary({
  device,
  branchId,
  t1,
  t2,
  days,
  subTotal,
  discount,
  total,
  customer,
  isSixHours,
}) {
  if (!device || !t1 || !t2) return null;

  const branchData = BRANCHES.find((b) => b.id === branchId);
  const branchLabel = branchData?.label || "Chưa chọn chi nhánh";
  const branchAddress = branchData?.address || "";

  return (
    <div className="space-y-3">
      {/* Device Section */}
      <div className="flex gap-4 items-center p-3 bg-gradient-to-r from-[#FFE4F0] to-[#FFF5F8] rounded-xl border border-[#FF9FCA]">
        <div className="text-2xl">🎯</div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-[#E85C9C] font-black uppercase tracking-wider mb-0.5">
            Thiết bị
          </div>
          <div className="font-black text-[#222] truncate text-sm uppercase">
            {device?.displayName || "—"}
          </div>
          <div className="text-xs text-[#888] font-medium">
            {isSixHours
              ? "Gói 6 tiếng"
              : days === 1
              ? "1 ngày"
              : `${days} ngày`}{" "}
            • Cọc {Math.round(device?.deposit / 1000000)}tr
          </div>
        </div>
        <div className="w-12 h-12 rounded-full border-2 border-white shadow-lg overflow-hidden bg-white shrink-0">
          <img
            src={device?.img}
            alt={device?.displayName}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Branch Section */}
      <div className="flex gap-4 items-center p-3 bg-white rounded-xl border border-[#eee]">
        <div className="text-2xl">📍</div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-[#999] font-bold uppercase tracking-wider mb-0.5">
            Chi nhánh
          </div>
          <div className="font-black text-[#222] text-sm">{branchLabel}</div>
          <div className="text-xs text-[#888] font-medium">{branchAddress}</div>
        </div>
      </div>

      {/* Time Section */}
      <div className="flex gap-4 items-center p-3 bg-[#222] rounded-xl">
        <div className="text-2xl">📅</div>
        <div className="flex-1">
          <div className="text-[10px] text-[#FF9FCA] font-bold uppercase tracking-wider mb-1">
            Thời gian
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-[#888]">Nhận:</span>
              <span className="font-black text-white ml-1">
                {formatBookingSummaryDate(t1)}
              </span>
            </div>
            <div>
              <span className="text-[#888]">Trả:</span>
              <span className="font-black text-white ml-1">
                {formatBookingSummaryDate(t2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="p-4 bg-[#FFFBF5] rounded-xl border-2 border-[#FFE4F0]">
        <div className="flex justify-between items-center text-sm mb-2">
          <span className="text-[#888] font-medium">Tiền thuê</span>
          <span className="font-bold text-[#555]">
            {Math.round(subTotal / 1000)}k
          </span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between items-center text-sm mb-2">
            <span className="text-green-600 font-bold">
              🎉 Giảm giá Weekday
            </span>
            <span className="font-bold text-green-600">
              -{Math.round(discount / 1000)}k
            </span>
          </div>
        )}
        <div className="border-t border-dashed border-[#FFE4F0] my-3"></div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-black text-[#222] uppercase tracking-wider">
            💰 Tổng tiền
          </span>
          <span className="text-2xl font-black text-[#E85C9C]">
            {Math.round(total / 1000)}k
          </span>
        </div>
      </div>

      {/* Customer Info Preview */}
      {(customer.fullName || customer.phone) && (
        <div className="flex gap-4 items-center p-3 bg-green-50 rounded-xl border border-green-200">
          <div className="text-2xl">👤</div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-green-600 font-bold uppercase tracking-wider mb-0.5">
              Khách hàng
            </div>
            <div className="font-black text-[#222] text-sm">
              {customer.fullName || "—"}
            </div>
            <div className="text-xs text-[#888] font-medium">
              {normalizePhone(customer.phone) || "—"}
              {customer.ig && ` • IG: ${customer.ig}`}
            </div>
          </div>
          <CheckCircleIcon className="w-6 h-6 text-green-500" />
        </div>
      )}
    </div>
  );
}

/* Alternative Device Suggestion */
function AlternativeDevices({ currentDevice, allDevices, onSelect }) {
  const alternatives = useMemo(() => {
    if (!currentDevice || !allDevices || allDevices.length === 0) return [];

    const currentBrand = inferBrand(currentDevice.name);

    // Find similar devices (same brand, different device, available)
    const similar = allDevices
      .filter((d) => {
        const dBrand = inferBrand(d.name);
        const dName = normalizeDeviceName(d.name);
        const currentName = normalizeDeviceName(currentDevice.name);
        return dBrand === currentBrand && dName !== currentName;
      })
      .slice(0, 3);

    return similar;
  }, [currentDevice, allDevices]);

  if (alternatives.length === 0) return null;

  return (
    <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
      <div className="flex items-center gap-2 text-amber-800 mb-3">
        <SparklesIcon className="w-5 h-5" />
        <span className="font-semibold text-sm">Gợi ý máy tương tự</span>
      </div>
      <div className="space-y-2">
        {alternatives.map((device) => (
          <button
            key={device.id}
            onClick={() => onSelect(device)}
            className="w-full flex items-center gap-3 p-2 bg-white rounded-lg border border-amber-100 hover:border-pink-400 transition-colors text-left"
          >
            <img
              src={device.images?.[0] || FALLBACK_IMG}
              alt={device.name}
              className="w-12 h-12 rounded-lg object-cover"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-800 truncate">
                {normalizeDeviceName(device.name)}
              </div>
              <div className="text-xs text-pink-600">
                {device.priceOneDay?.toLocaleString("vi-VN")} đ/ngày
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ===================== BOOKING PAGE ===================== */

export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialPrefs = useMemo(() => {
    const prefs = loadBookingPrefs();
    const branchId = BRANCHES.some((b) => b.id === prefs?.branchId)
      ? prefs.branchId
      : getDefaultBranchId();
    const safeBranchId =
      BRANCHES.find((b) => b.id === branchId && !b.disabled)?.id ||
      getDefaultBranchId();
    
    return { 
      branchId: safeBranchId, 
      durationId: prefs?.durationId || "ONE_DAY",
      date: prefs?.date ? normalizeDate(new Date(prefs.date)) : normalizeDate(new Date()),
      endDate: prefs?.endDate ? normalizeDate(new Date(prefs.endDate)) : addDays(normalizeDate(new Date()), 1),
      timeFrom: prefs?.timeFrom || MORNING_PICKUP_TIME,
      timeTo: prefs?.timeTo || SIX_HOUR_RETURN_TIME,
      pickupType: prefs?.pickupType || "MORNING",
      pickupSlot: prefs?.pickupSlot || DEFAULT_EVENING_SLOT
    };
  }, []);

  // Get device from URL params
  const urlDeviceId = searchParams.get("deviceId");
  const urlDeviceName = searchParams.get("deviceName");

  const [allDevices, setAllDevices] = useState([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);
  const [devicesError, setDevicesError] = useState("");

  const [selectedDeviceId, setSelectedDeviceId] = useState(
    urlDeviceId ? parseInt(urlDeviceId) : null
  );

  const [selectedDate, setSelectedDate] = useState(initialPrefs.date);
  const [durationOptionId, setDurationOptionId] = useState(initialPrefs.durationId);
  const [pickupType, setPickupType] = useState(initialPrefs.pickupType);
  const [pickupSlot, setPickupSlot] = useState(initialPrefs.pickupSlot);
  const [sixHourTimeFrom, setSixHourTimeFrom] = useState(initialPrefs.timeFrom);
  const [sixHourTimeTo, setSixHourTimeTo] = useState(initialPrefs.timeTo);
  const [selectedBranchId, setSelectedBranchId] = useState(initialPrefs.branchId);
  const [endDateState, setEndDateState] = useState(initialPrefs.endDate);
  const [availabilityByBranch, setAvailabilityByBranch] = useState({});

  // Initialize customer from localStorage
  const [customer, setCustomer] = useState(() => {
    const saved = loadCustomerInfo();
    return (
      saved || {
        fullName: "",
        phone: "",
        ig: "",
        fb: "",
      }
    );
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  // Calculate current step for progress indicator
  const currentStep = useMemo(() => {
    if (!selectedDate || !selectedBranchId || !durationOptionId) return 1;
    if (!customer.fullName || !customer.phone) return 2;
    return 3;
  }, [
    selectedDate,
    selectedBranchId,
    durationOptionId,
    customer.fullName,
    customer.phone,
  ]);

  // Save customer info when it changes
  useEffect(() => {
    if (customer.fullName && customer.phone) {
      saveCustomerInfo(customer);
    }
  }, [customer]);

  // Save booking prefs when they change
  useEffect(() => {
    saveBookingPrefs({
      branchId: selectedBranchId,
      durationId: durationOptionId,
      date: selectedDate?.toISOString(),
      endDate: endDateState?.toISOString(),
      timeFrom: sixHourTimeFrom,
      timeTo: sixHourTimeTo,
      pickupType,
      pickupSlot,
    });
  }, [
    selectedBranchId,
    durationOptionId,
    selectedDate,
    endDateState,
    sixHourTimeFrom,
    sixHourTimeTo,
    pickupType,
    pickupSlot,
  ]);

  useEffect(() => {
    if (durationOptionId === "SIX_HOURS") {
      setSixHourTimeFrom(MORNING_PICKUP_TIME);
      setSixHourTimeTo(getSixHourAutoReturnTime(MORNING_PICKUP_TIME));
    } else {
      setPickupType("MORNING");
      setPickupSlot(DEFAULT_EVENING_SLOT);
      setSixHourTimeFrom(MORNING_PICKUP_TIME);
      setSixHourTimeTo(MORNING_PICKUP_TIME);
      if (!endDateState || endDateState <= selectedDate) {
        setEndDateState(addDays(selectedDate || new Date(), 1));
      }
    }
  }, [durationOptionId]);

  /* ==== Fetch devices ==== */
  const fetchAllDevices = useCallback(async () => {
    setIsLoadingDevices(true);
    setDevicesError("");
    try {
      const response = await api.get("/v1/devices");
      setAllDevices(response.data || []);
    } catch (error) {
      console.error("Failed to fetch devices:", error);
      setDevicesError("Không thể tải danh sách thiết bị. Vui lòng thử lại.");
      setAllDevices([]);
    } finally {
      setIsLoadingDevices(false);
    }
  }, []);

  useEffect(() => {
    fetchAllDevices();
  }, [fetchAllDevices]);

  const DERIVED = useMemo(() => {
    if (!allDevices) return [];
    const seen = new Set();
    const result = [];
    for (const it of allDevices) {
      const normalized = normalizeDeviceName(it.name);
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      result.push({
        ...it,
        brand: inferBrand(it.name),
        img: it.images?.[0] || FALLBACK_IMG,
        pricePerDay: it.priceOneDay || 0,
        deposit: parseDeposit(it.description),
        displayName: normalized,
      });
    }
    return result;
  }, [allDevices]);

  // Set selected device from URL param or first device
  useEffect(() => {
    if (urlDeviceId && DERIVED.length > 0) {
      const device = DERIVED.find((d) => d.id === parseInt(urlDeviceId));
      if (device) {
        setSelectedDeviceId(device.id);
      } else if (!selectedDeviceId && DERIVED.length > 0) {
        setSelectedDeviceId(DERIVED[0].id);
      }
    } else if (!selectedDeviceId && DERIVED.length > 0) {
      setSelectedDeviceId(DERIVED[0].id);
    }
  }, [DERIVED, urlDeviceId, selectedDeviceId]);

  const selectedDevice = useMemo(
    () => DERIVED.find((i) => i.id === selectedDeviceId) || null,
    [DERIVED, selectedDeviceId]
  );

  // Compute availability range using the same shared logic
  const prefsForRange = useMemo(() => ({
    date: selectedDate,
    endDate: endDateState,
    timeFrom: sixHourTimeFrom,
    timeTo: sixHourTimeTo,
    durationType: durationOptionId,
    pickupType,
    pickupSlot,
  }), [selectedDate, endDateState, sixHourTimeFrom, sixHourTimeTo, durationOptionId, pickupType, pickupSlot]);

  const { fromDateTime: t1, toDateTime: t2 } = useMemo(
    () => computeAvailabilityRange(prefsForRange),
    [prefsForRange],
  );

  const startDate = t1 ? normalizeDate(t1) : null;
  const endDate = t2 ? normalizeDate(t2) : null;
  const timeFrom = t1 ? format(t1, "HH:mm") : null;
  const timeTo = t2 ? format(t2, "HH:mm") : null;

  const timeSelectionError = useMemo(() => {
    return getAvailabilityRangeError(prefsForRange, t1, t2);
  }, [prefsForRange, t1, t2]);

  /* ==== Pricing ==== */
  const { days, subTotal, discount, total, isSixHours } =
    useBookingPricing(
      selectedDevice,
      startDate,
      timeFrom,
      endDate,
      timeTo,
      voucherId,
      durationOptionId
    );

  const durationDays = useMemo(() => {
    if (durationOptionId === "SIX_HOURS") return 0.5;
    return getDurationDays(durationOptionId);
  }, [durationOptionId]);


  /* ==== Validate info ==== */
  const { validInfo, errors } = useMemo(() => {
    const err = {};
    const nameOk = customer.fullName?.trim().length >= 2;
    if (!nameOk && customer.fullName) err.fullName = true;

    const phone = normalizePhone(customer.phone);
    const phoneOk = /^0\d{9}$/.test(phone);
    if (!phoneOk && customer.phone) err.phone = true;

    return {
      validInfo:
        customer.fullName?.trim().length >= 2 &&
        /^0\d{9}$/.test(normalizePhone(customer.phone)),
      errors: err,
    };
  }, [customer]);

  /* ==== Availability theo chi nhánh ==== */
  useEffect(() => {
    if (!selectedDevice || !startDate || !endDate || !timeFrom || !timeTo) {
      setAvailabilityByBranch({});
      return;
    }

    const fromDateTime = combineDateWithTime(startDate, timeFrom);
    const toDateTime = combineDateWithTime(endDate, timeTo);

    if (!fromDateTime || !toDateTime || toDateTime <= fromDateTime) {
      setAvailabilityByBranch({});
      return;
    }

    let cancelled = false;

    const fetchForBranch = async (branchId) => {
      setAvailabilityByBranch((prev) => ({
        ...prev,
        [branchId]: { ...(prev[branchId] || {}), loading: true, error: null },
      }));

      try {
        const params = {
          startDate: formatDateTimeLocalForAPI(fromDateTime),
          endDate: formatDateTimeLocalForAPI(toDateTime),
          branchId,
        };
        const resp = await api.get("v1/devices/booking", { params });
        if (cancelled) return;

        const data = resp.data || [];
        const deviceBusy = data.some(
          (d) =>
            d.id === selectedDevice.id &&
            Array.isArray(d.bookingDtos) &&
            d.bookingDtos.length > 0
        );

        setAvailabilityByBranch((prev) => ({
          ...prev,
          [branchId]: { loading: false, error: null, soldOut: deviceBusy },
        }));
      } catch (err) {
        console.error("Failed to fetch bookings:", err);
        if (cancelled) return;
        setAvailabilityByBranch((prev) => ({
          ...prev,
          [branchId]: {
            loading: false,
            error: "Không thể kiểm tra.",
            soldOut: false,
          },
        }));
      }
    };

    BRANCHES.filter((b) => !b.disabled).forEach((b) => fetchForBranch(b.id));

    return () => {
      cancelled = true;
    };
  }, [selectedDevice, startDate, endDate, timeFrom, timeTo]);

  /* ==== Check if any branch has sold out ==== */
  const isSoldOutAllBranches = useMemo(() => {
    return BRANCHES.every((b) => {
      const av = availabilityByBranch[b.id];
      return av?.soldOut === true;
    });
  }, [availabilityByBranch]);

  /* ==== Submit conditions ==== */
  const canSubmit = useMemo(() => {
    if (!selectedDevice) return false;
    if (!selectedBranchId) return false;
    if (!t1 || !t2 || total <= 0) return false;
    if (timeSelectionError) return false;
    if (!validInfo) return false;

    const av = availabilityByBranch[selectedBranchId];
    if (!av || av.loading || av.soldOut) return false;

    return true;
  }, [
    selectedDevice,
    selectedBranchId,
    t1,
    t2,
    total,
    timeSelectionError,
    validInfo,
    availabilityByBranch,
  ]);

  /* ==== Submit payment ==== */
  const submitPayment = async () => {
    if (!canSubmit || !selectedDevice || !t1 || !t2) return;

    setIsSubmitting(true);
    setPaymentError("");
    try {
      const phone = normalizePhone(customer.phone);
      const registerRes = await api.post("/accounts", {
        fullName: customer.fullName?.trim(),
        phone,
        ig: customer.ig?.trim() || null,
        fb: customer.fb?.trim() || null,
      });
      const account = registerRes.data;
      const customerId = account?.id;
      if (!customerId) throw new Error("Không lấy được customerId.");

      const branchLabel =
        BRANCHES.find((b) => b.id === selectedBranchId)?.label ||
        selectedBranchId;

      const fmt = (d) => (d ? format(d, "yyyy-MM-dd'T'HH:mm:ss") : null);
      const note = `Khách ${customer.fullName} ${phone} ${branchLabel}`.slice(0, 80);
      const bookingRequest = {
        customerId,
        deviceId: selectedDevice.id,
        bookingFrom: fmt(t1),
        bookingTo: fmt(t2),
        total,
        note,
        dayOfRent: days,
        originalPrice: subTotal,
        noteVoucher: voucherId || "NONE",
      };

      const rawDesc = `Thue ${selectedDevice.displayName}`;
      const returnUrl = `${window.location.origin}/payment-status`;
      const payload = {
        amount: total,
        description: safeDesc(rawDesc),
        bookingRequest,
        returnSuccessUrl: returnUrl,
        returnFailUrl: returnUrl,
      };

      const response = await api.post("/create-payment-link", payload);
      if (response.data && response.data.checkoutUrl) {
        window.location.href = response.data.checkoutUrl;
      } else {
        throw new Error("Không nhận được link thanh toán từ server.");
      }
    } catch (error) {
      console.error("Failed to create payment link:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Không thể tạo yêu cầu thanh toán. Vui lòng thử lại.";
      setPaymentError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectAlternative = (device) => {
    setSelectedDeviceId(device.id);
    navigate(
      `/booking?deviceId=${device.id}&deviceName=${encodeURIComponent(
        normalizeDeviceName(device.name)
      )}`,
      { replace: true }
    );
  };

  const showMiniSummary =
    selectedDevice && t1 && t2 && total > 0 && selectedBranchId;

  /* ==== JSX ==== */
  return (
    <div className="min-h-dvh bg-[#FEF5ED] text-[#333]">
      {/* HEADER */}
      <header className="bg-[#FFFBF5] sticky top-0 z-30 border-b border-[#FFE4F0]">
        <div className="max-w-md mx-auto h-14 flex items-center px-4">
          <Link
            to="/catalog"
            className="w-8 h-8 flex items-center justify-center text-[#555] hover:bg-[#FF9FCA]/20 rounded-full transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <div className="flex-1 text-center">
            <div className="text-sm font-black line-clamp-1 text-[#222] uppercase tracking-wide">
              {selectedDevice
                ? selectedDevice.displayName
                : urlDeviceName || "Chọn máy"}
            </div>
            <div className="text-[10px] text-[#E85C9C] font-bold uppercase tracking-wider">
              Đặt lịch thuê
            </div>
          </div>
          <Link
            to="/catalog"
            className="text-xs text-[#E85C9C] font-bold hover:underline uppercase tracking-wide"
          >
            Đổi máy
          </Link>
        </div>
      </header>

      {/* Progress Stepper */}
      <BookingProgress currentStep={currentStep} />

      {/* Thanh chọn ngày */}
      <DateStrip
        selectedDate={selectedDate}
        onSelect={(d) => setSelectedDate(normalizeDate(d))}
      />

      {/* CONTENT */}
      <div className="max-w-md mx-auto pb-32 pt-3 px-0">
        {isLoadingDevices ? (
          <div className="py-10 text-center text-sm text-[#999] font-medium">
            Đang tải thông tin máy...
          </div>
        ) : devicesError ? (
          <div className="py-10 text-center px-4">
            <p className="text-sm text-red-500 mb-3">{devicesError}</p>
            <button
              onClick={fetchAllDevices}
              className="px-4 py-2 rounded-xl border-2 border-pink-500 text-pink-700 text-sm font-semibold hover:bg-pink-50 active:scale-95 transition"
            >
              Thử lại
            </button>
          </div>
        ) : !selectedDevice ? (
          <div className="py-10 text-center px-4">
            <p className="text-sm text-slate-500 mb-4">Chưa chọn máy</p>
            <Link
              to="/catalog"
              className="px-6 py-3 bg-pink-500 text-white rounded-full font-semibold hover:bg-pink-600 transition-colors"
            >
              Chọn máy ngay
            </Link>
          </div>
        ) : (
          <>
            {/* Device Preview Card */}
            <div className="mx-4 mb-4 bg-[#FFFBF5] rounded-2xl shadow-md overflow-hidden border border-[#FFE4F0]">
              <div className="flex gap-4 p-4">
                <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white shrink-0">
                  <img
                    src={selectedDevice.img}
                    alt={selectedDevice.displayName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h2 className="font-black text-[#222] mb-1 uppercase tracking-wide text-sm">
                    {selectedDevice.displayName}
                  </h2>
                  <div className="text-xl font-black text-[#E85C9C]">
                    {Math.round(selectedDevice.priceOneDay / 1000)}k
                    <span className="text-xs font-medium text-[#999] ml-1">
                      /ngày (weekday)
                    </span>
                  </div>
                  <div className="text-xs text-[#888] mt-1 font-medium">
                    Cọc: {Math.round(selectedDevice.deposit / 1000000)}tr
                  </div>
                </div>
              </div>
            </div>

            {/* Sold Out Warning */}
            {isSoldOutAllBranches && (
              <div className="mx-4 mb-4 p-4 bg-red-50 rounded-xl border-2 border-red-200">
                <div className="flex items-center gap-2 text-red-700 mb-2">
                  <ExclamationTriangleIcon className="w-5 h-5" />
                  <span className="font-black uppercase tracking-wide text-sm">
                    Máy đã hết trong khung giờ này
                  </span>
                </div>
                <p className="text-sm text-red-600 font-medium">
                  Bạn có thể chọn ngày khác hoặc xem các máy tương tự bên dưới.
                </p>
                <AlternativeDevices
                  currentDevice={selectedDevice}
                  allDevices={allDevices}
                  onSelect={handleSelectAlternative}
                />
              </div>
            )}

            {/* Preferences Form (Branch, Duration, Date, Time) */}
            <div className="mx-4 mb-4">
              <div className="rounded-2xl border border-[#FFE4F0] bg-white p-4 shadow-md">
                <BookingPrefsForm
                  branchId={selectedBranchId}
                  date={selectedDate}
                  endDate={endDateState}
                  timeFrom={sixHourTimeFrom}
                  timeTo={sixHourTimeTo}
                  durationType={durationOptionId}
                  pickupType={pickupType}
                  pickupSlot={pickupSlot}
                  setBranchId={setSelectedBranchId}
                  setDate={setSelectedDate}
                  setEndDate={setEndDateState}
                  setTimeFrom={setSixHourTimeFrom}
                  setTimeTo={setSixHourTimeTo}
                  setDurationType={setDurationOptionId}
                  setPickupType={setPickupType}
                  setPickupSlot={setPickupSlot}
                  error={timeSelectionError || (availabilityByBranch[selectedBranchId]?.soldOut ? "⚠️ Máy đã hết trong khung giờ này." : "")}
                />
              </div>
            </div>

            {/* Info khách hàng */}
            <div className="mt-4 px-4">
              <div className="rounded-2xl border border-[#FFE4F0] bg-[#FFFBF5] shadow-md">
                <div className="px-5 py-4 border-b border-[#FFE4F0] text-sm font-black text-[#222] uppercase tracking-wider">
                  Thông tin liên lạc
                </div>
                <div className="p-5 space-y-4">
                  <InputField
                    icon={<UserIcon className="h-5 w-5" />}
                    value={customer.fullName}
                    onChange={(e) =>
                      setCustomer((c) => ({ ...c, fullName: e.target.value }))
                    }
                    placeholder="Nguyễn Thị Bông"
                    error={errors.fullName}
                    helpText="Họ tên cần có ít nhất 2 ký tự."
                  />
                  <InputField
                    icon={<DevicePhoneMobileIcon className="h-5 w-5" />}
                    value={customer.phone}
                    onChange={(e) =>
                      setCustomer((c) => ({ ...c, phone: e.target.value }))
                    }
                    placeholder="0901234567"
                    inputMode="tel"
                    error={errors.phone}
                    helpText="SĐT hợp lệ có 10 số, bắt đầu bằng 0."
                  />
                  <InputField
                    icon={<span className="font-bold text-sm">IG</span>}
                    value={customer.ig}
                    onChange={(e) =>
                      setCustomer((c) => ({ ...c, ig: e.target.value }))
                    }
                    placeholder="username_ig (không bắt buộc)"
                  />
                </div>
              </div>
            </div>

            {/* Tóm tắt đơn */}
            <div className="mt-4 px-4">
              <div className="rounded-2xl border border-pink-100 bg-white shadow-md shadow-pink-500/5">
                <div className="px-5 py-4 border-b border-pink-100 text-base font-semibold text-pink-800">
                  Tóm tắt đơn
                </div>
                <div className="p-5">
                  <Summary
                    device={selectedDevice}
                    branchId={selectedBranchId}
                    t1={t1}
                    t2={t2}
                    days={days}
                    subTotal={subTotal}
                    discount={discount}
                    total={total}
                    customer={customer}
                    isSixHours={isSixHours}
                  />
                  {selectedDevice && t1 && t2 && total > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        printContract({
                          device: selectedDevice,
                          total,
                          t1,
                          t2,
                        })
                      }
                      className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-[#FF9FCA] bg-[#FFF5F8] text-[#222] font-bold uppercase tracking-wider hover:bg-[#FFE4F0] transition-colors"
                    >
                      <PrinterIcon className="h-5 w-5 text-[#E85C9C]" />
                      In hợp đồng
                    </button>
                  )}
                  {paymentError && (
                    <div className="mt-4 p-3 rounded-xl bg-red-50 text-sm text-red-600">
                      {paymentError}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* BOTTOM BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <div className="mx-auto max-w-md">
          <div className="bg-[#FFFBF5]/95 backdrop-blur-lg border-t border-[#FFE4F0] rounded-t-3xl p-4 shadow-2xl">
            {showMiniSummary && (
              <div className="flex items-baseline justify-between mb-3 text-xs">
                <span className="text-[#555] truncate max-w-[65%] font-medium">
                  {selectedDevice.displayName} •{" "}
                  {isSixHours
                    ? "6 tiếng"
                    : days === 1
                    ? "1 ngày"
                    : `${days} ngày`}
                </span>
                <span className="font-black text-[#E85C9C]">
                  {Math.round(total / 1000)}k
                </span>
              </div>
            )}

            <button
              onClick={submitPayment}
              disabled={!canSubmit || isSubmitting}
              className="w-full px-4 py-3.5 rounded-xl bg-[#222] text-[#FF9FCA] font-black uppercase tracking-wider disabled:bg-[#ccc] disabled:text-[#999] disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:bg-[#333] transition-all active:scale-95"
            >
              {isSubmitting ? (
                "Đang xử lý..."
              ) : (
                <>
                  {canSubmit
                    ? `Thanh toán ${Math.round(total / 1000)}k`
                    : "Chọn gói thuê & điền thông tin"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Floating Contact */}
      <FloatingContactButton />
    </div>
  );
}

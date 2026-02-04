import React, { useMemo, useState, useEffect, useCallback } from "react";
import { format, isWeekend, addDays } from "date-fns";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import vi from "date-fns/locale/vi";

import {
  ArrowLeftIcon,
  CheckCircleIcon,
  CreditCardIcon,
  DevicePhoneMobileIcon,
  UserIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
} from "@heroicons/react/24/solid";
import api from "../../config/axios";
import FloatingContactButton from "../../components/FloatingContactButton";
import BookingProgress from "../../components/BookingProgress";
import {
  saveCustomerInfo,
  loadCustomerInfo,
  saveBookingPrefs,
  loadBookingPrefs,
} from "../../utils/storage";

/* ========= HẰNG SỐ & DỮ LIỆU ===== */

// Chi nhánh
const BRANCHES = [
  {
    id: "PHU_NHUAN",
    label: "FAO Phú Nhuận",
    distanceText: "3.2km",
    address: "330/22 Phan Đình Phùng, P.1",
  },
  {
    id: "Q9",
    label: "FAO Q9 (Vinhomes)",
    distanceText: "18.4km",
    address: "Vinhomes Grand Park, Q9",
  },
];

// Gói thời gian
const DURATION_OPTIONS = [
  { id: "SIX_HOURS", label: "6 tiếng", days: 0.5 },
  { id: "ONE_DAY", label: "1 ngày", days: 1 },
  { id: "TWO_DAYS", label: "2 ngày", days: 2 },
  { id: "THREE_DAYS", label: "3 ngày", days: 3 },
];

// Vouchers
const VOUCHERS = [
  { id: "NONE", label: "Không áp dụng", rate: 0 },
  { id: "WEEKDAY20", label: "Weekday -20%", rate: 0.2 },
];

const FALLBACK_IMG = "https://placehold.co/640x360/fdf2f8/ec4899?text=No+Image";

/* ========= HELPERS ========= */

function normalizeDate(date) {
  if (!date) return null;
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

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

const diffHours = (d1, d2) => (d2.getTime() - d1.getTime()) / (1000 * 60 * 60);

function countWeekdaysBetweenAligned(t1, t2) {
  let days = 0,
    weekdays = 0;
  let cur = new Date(t1.getTime());
  cur.setHours(0, 0, 0, 0);
  const end = new Date(t2.getTime());
  end.setHours(0, 0, 0, 0);
  while (cur < end) {
    days += 1;
    if (!isWeekend(cur)) weekdays += 1;
    cur = addDays(cur, 1);
  }
  return { days, weekdays };
}

function safeDesc(s) {
  if (!s) return "Thanh toan don hang";
  const t = s.trim().replace(/\s+/g, " ");
  return t.length <= 25 ? t : t.slice(0, 24) + "…";
}

function normalizePhone(p) {
  if (!p) return "";
  let s = p.replace(/[^\d]/g, "");
  if (s.startsWith("84")) s = "0" + s.slice(2);
  return s;
}

function formatDateTimeLocalForAPI(date) {
  if (!date) return null;
  return format(date, "yyyy-MM-dd'T'HH:mm:ss");
}

function getPriceForDuration(device, durationId) {
  if (!device) return 0;
  switch (durationId) {
    case "SIX_HOURS":
      return (
        device.priceSixHours ||
        (device.priceOneDay ? Math.round(device.priceOneDay / 2) : 0)
      );
    case "ONE_DAY":
      return device.priceOneDay || 0;
    case "TWO_DAYS":
      return device.priceTwoDay || 0;
    case "THREE_DAYS":
      return device.priceThreeDay || 0;
    default:
      return 0;
  }
}

function getTimeRangeForDuration(selectedDate, durationId) {
  if (!selectedDate) {
    return { startDate: null, endDate: null, timeFrom: null, timeTo: null };
  }
  const startDate = normalizeDate(selectedDate);
  let endDate = normalizeDate(selectedDate);
  let timeFrom = "09:00";
  let timeTo = "20:30";

  switch (durationId) {
    case "SIX_HOURS":
      timeFrom = "09:00";
      timeTo = "15:00";
      endDate = startDate;
      break;
    case "ONE_DAY":
      endDate = startDate;
      break;
    case "TWO_DAYS":
      endDate = addDays(startDate, 1);
      break;
    case "THREE_DAYS":
      endDate = addDays(startDate, 2);
      break;
    default:
      break;
  }

  return { startDate, endDate, timeFrom, timeTo };
}

function normalizeDeviceName(name = "") {
  return name.replace(/\s*\(\d+\)\s*$/, "").trim();
}

/* ===== Hook tính giá ===== */
function useBookingPricing(
  device,
  startDate,
  timeFrom,
  endDate,
  timeTo,
  voucherId
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

    const t1 = combineDateWithTimeString(startDate, timeFrom);
    const t2 = combineDateWithTimeString(endDate, timeTo);

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

    if (sameDay && hours <= 6.05) {
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
  }, [device, startDate, timeFrom, endDate, timeTo, voucherId]);
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
                {format(t1, "dd/MM HH:mm", { locale: vi })}
              </span>
            </div>
            <div>
              <span className="text-[#888]">Trả:</span>
              <span className="font-black text-white ml-1">
                {format(t2, "dd/MM HH:mm", { locale: vi })}
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

/* Thanh chọn ngày kiểu CGV */
function DateStrip({ selectedDate, onSelect }) {
  const days = useMemo(() => {
    const arr = [];
    const today = normalizeDate(new Date());
    for (let i = 0; i < 14; i++) {
      arr.push(addDays(today, i));
    }
    return arr;
  }, []);

  const isSameDay = (d1, d2) => d1 && d2 && d1.getTime() === d2.getTime();

  const getLabel = (day, index) => {
    if (index === 0) return "Hôm nay";
    if (index === 1) return "Ngày mai";
    const dow = day.getDay();
    if (dow === 0) return "CN";
    return `T${dow + 1}`;
  };

  return (
    <div className="bg-[#222] text-white border-b border-[#333]">
      <div className="max-w-md mx-auto px-2 py-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {days.map((day, idx) => {
            const active = isSameDay(day, selectedDate);
            const isWeekendDay = isWeekend(day);
            return (
              <button
                key={day.toISOString()}
                onClick={() => onSelect(day)}
                className={`flex-shrink-0 w-12 text-center rounded-xl py-2 transition-all border-2 ${
                  active
                    ? "bg-[#FF9FCA] text-[#222] border-[#FF9FCA] shadow-lg shadow-[#FF9FCA]/30"
                    : isWeekendDay
                    ? "bg-[#333] border-[#444] text-[#FF9FCA]"
                    : "bg-[#2a2a2a] border-[#333] hover:border-[#FF9FCA]"
                }`}
              >
                <div className="text-[10px] mb-0.5 font-bold">
                  {getLabel(day, idx)}
                </div>
                <div
                  className={`text-sm font-black ${
                    active ? "text-[#222]" : ""
                  }`}
                >
                  {format(day, "dd")}
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-2 text-xs text-center text-[#FF9FCA] font-bold uppercase tracking-wider">
          {selectedDate &&
            format(selectedDate, "EEEE, dd 'tháng' MM, yyyy", { locale: vi })}
        </div>
      </div>
    </div>
  );
}

/* Panel chi nhánh kiểu CGV */
function BranchPanel({
  branch,
  expanded,
  onToggle,
  device,
  selectedBranchId,
  selectedDurationId,
  onSelectDuration,
  availability,
}) {
  const isSelectedBranch = selectedBranchId === branch.id;
  const soldOut = availability?.soldOut;
  const loading = availability?.loading;
  const error = availability?.error;

  return (
    <div className="border-b border-[#eee]">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between bg-[#FFFBF5] hover:bg-[#FFF5F8] transition-colors"
      >
        <div className="text-left">
          <div className="text-[#E85C9C] font-black text-sm uppercase tracking-wide">
            {branch.label}
          </div>
          <div className="text-[11px] text-[#888] font-medium">
            {branch.address}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {soldOut && (
            <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
              Hết chỗ
            </span>
          )}
          <span
            className={`transform transition-transform ${
              expanded ? "rotate-180" : "rotate-0"
            } text-[#999]`}
          >
            ▾
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 bg-[#FFFBF5]">
          {loading && (
            <div className="text-[11px] text-[#999] mb-2 font-medium">
              Đang kiểm tra...
            </div>
          )}
          {error && (
            <div className="text-[11px] text-amber-700 mb-2 font-medium bg-amber-50 p-2 rounded-lg">
              {error} Vẫn có thể đặt và shop sẽ liên hệ xác nhận.
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {DURATION_OPTIONS.map((opt) => {
              const price = getPriceForDuration(device, opt.id);
              const disabled = !device || price <= 0 || soldOut || loading;
              const active = isSelectedBranch && selectedDurationId === opt.id;

              return (
                <button
                  key={opt.id}
                  disabled={disabled}
                  onClick={() => onSelectDuration(branch.id, opt.id)}
                  className={`min-w-[88px] px-3 py-2 rounded-xl border-2 text-sm text-center transition-all ${
                    disabled
                      ? "border-[#eee] text-[#ccc] bg-[#f5f5f5] cursor-not-allowed"
                      : active
                      ? "border-[#222] bg-[#222] text-[#FF9FCA] shadow-lg"
                      : "border-[#ddd] bg-white text-[#555] hover:border-[#FF9FCA] hover:text-[#E85C9C]"
                  }`}
                >
                  <div className="text-sm font-black">{opt.label}</div>
                  {price > 0 && (
                    <div
                      className={`text-[10px] mt-0.5 font-bold ${
                        active ? "text-[#FF9FCA]" : "text-[#E85C9C]"
                      }`}
                    >
                      {Math.round(price / 1000)}k
                    </div>
                  )}
                </button>
              );
            })}
          </div>
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
      : BRANCHES[0].id;
    const durationId = DURATION_OPTIONS.some((d) => d.id === prefs?.durationId)
      ? prefs.durationId
      : "ONE_DAY";
    return { branchId, durationId };
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

  const [selectedDate, setSelectedDate] = useState(() =>
    normalizeDate(new Date())
  );
  const [durationOptionId, setDurationOptionId] = useState(
    initialPrefs.durationId
  );
  const [selectedBranchId, setSelectedBranchId] = useState(
    initialPrefs.branchId
  );
  const [expandedBranchId, setExpandedBranchId] = useState(
    initialPrefs.branchId
  );

  const [availabilityByBranch, setAvailabilityByBranch] = useState({});

  const [voucherId] = useState("NONE");

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
    if (selectedBranchId && durationOptionId) {
      saveBookingPrefs({
        branchId: selectedBranchId,
        durationId: durationOptionId,
      });
    }
  }, [selectedBranchId, durationOptionId]);

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

  /* ==== Thời gian theo gói ==== */
  const { startDate, endDate, timeFrom, timeTo } = useMemo(
    () => getTimeRangeForDuration(selectedDate, durationOptionId),
    [selectedDate, durationOptionId]
  );

  /* ==== Pricing ==== */
  const { days, subTotal, discount, total, t1, t2, isSixHours } =
    useBookingPricing(
      selectedDevice,
      startDate,
      timeFrom,
      endDate,
      timeTo,
      voucherId
    );

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

    const fromDateTime = combineDateWithTimeString(startDate, timeFrom);
    const toDateTime = combineDateWithTimeString(endDate, timeTo);

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

    BRANCHES.forEach((b) => fetchForBranch(b.id));

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

      const bookingRequest = {
        customerId,
        deviceId: selectedDevice.id,
        bookingFrom: t1.toISOString(),
        bookingTo: t2.toISOString(),
        total: total,
        note: `Khách: ${customer.fullName} - ${phone}${
          customer.ig ? " - IG:" + customer.ig : ""
        }${
          customer.fb ? " - FB:" + customer.fb : ""
        } - Chi nhánh: ${branchLabel}`,
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

            {/* Chi nhánh + gói */}
            <div className="bg-[#FFFBF5]">
              {BRANCHES.map((branch) => (
                <BranchPanel
                  key={branch.id}
                  branch={branch}
                  expanded={expandedBranchId === branch.id}
                  onToggle={() =>
                    setExpandedBranchId((prev) =>
                      prev === branch.id ? null : branch.id
                    )
                  }
                  device={selectedDevice}
                  selectedBranchId={selectedBranchId}
                  selectedDurationId={durationOptionId}
                  onSelectDuration={(bId, durationId) => {
                    setSelectedBranchId(bId);
                    setDurationOptionId(durationId);
                  }}
                  availability={availabilityByBranch[branch.id]}
                />
              ))}
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
                  <CreditCardIcon className="h-5 w-5" />
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

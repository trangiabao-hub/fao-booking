import React, { useMemo, useState, useEffect, useCallback } from "react";
import { format, isWeekend, addDays } from "date-fns";
import vi from "date-fns/locale/vi";

import {
  ArrowLeftIcon,
  Bars3Icon,
  CheckCircleIcon,
  CreditCardIcon,
  DevicePhoneMobileIcon,
  UserIcon,
} from "@heroicons/react/24/solid";
import api from "../../config/axios";

/* ========= HẰNG SỐ & DỮ LIỆU ===== */

// Chi nhánh (có thêm distanceText cho giống CGV – bạn chỉnh lại số km nếu muốn)
const BRANCHES = [
  { id: "PHU_NHUAN", label: "FAO Phú Nhuận", distanceText: "3.2km" },
  { id: "Q9", label: "FAO Q9 (Vinhomes)", distanceText: "18.4km" },
];

// Gói thời gian (hiển thị như giờ chiếu)
const DURATION_OPTIONS = [
  { id: "SIX_HOURS", label: "6 tiếng" },
  { id: "ONE_DAY", label: "1 ngày" },
  { id: "TWO_DAYS", label: "2 ngày" },
  { id: "THREE_DAYS", label: "3 ngày" },
];

// Vouchers (logic cũ, vẫn dùng để tính giá; UI voucher bạn có thể thêm sau nếu cần)
const VOUCHERS = [
  { id: "NONE", label: "Không áp dụng", rate: 0 },
  { id: "WEEKDAY20", label: "Weekday -20%", rate: 0.2 },
];

const FALLBACK_IMG = "https://placehold.co/640x360/png?text=No+Image";

/* ========= HELPERS ========= */

function normalizeDate(date) {
  if (!date) return null;
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function inferBrand(name = "") {
  const n = name.toUpperCase();
  if (n.includes("FUJIFILM")) return "fuji";
  if (n.includes("CANON") || n.startsWith("LENS CANON")) return "canon";
  if (n.includes("SONY")) return "sony";
  if (n.includes("POCKET") || n.includes("GOPRO") || n.includes("DJI"))
    return "pocket";
  if (n.includes("IPHONE") || n.includes("SAMSUNG")) return "phone";
  return null;
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

// keep local datetime string without timezone
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
    return {
      startDate: null,
      endDate: null,
      timeFrom: null,
      timeTo: null,
    };
  }
  const startDate = normalizeDate(selectedDate);
  let endDate = normalizeDate(selectedDate);
  let timeFrom = "09:00";
  let timeTo = "20:30";

  switch (durationId) {
    case "SIX_HOURS":
      timeFrom = "09:00";
      timeTo = "15:00"; // 6 tiếng
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

/* ===== Hook tính giá (giữ y chang logic cũ) ===== */
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
      // Gói 6 tiếng
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
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pink-400">
          {icon}
        </div>
        <input
          value={value}
          onChange={onChange}
          className={`w-full rounded-xl border-2 ${
            error ? "border-red-400" : "border-pink-200"
          } focus:border-pink-500 focus:ring-pink-500 pl-11 pr-4 py-3 text-pink-900 placeholder:text-slate-400`}
          placeholder={placeholder}
          inputMode={inputMode}
        />
      </div>
      {error && helpText && (
        <div className="text-xs text-red-500 mt-1.5 ml-1">{helpText}</div>
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

  const branchLabel =
    BRANCHES.find((b) => b.id === branchId)?.label || "Chưa chọn chi nhánh";

  const renderInfoRow = (label, value) => (
    <div className="flex justify-between items-center text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800 text-right ml-4">
        {value}
      </span>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <img
          src={device?.img}
          alt={device?.displayName}
          className="w-20 h-20 rounded-xl object-cover shadow-md shadow-pink-200/50"
        />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-pink-900 truncate">
            {device?.displayName || "—"}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Cọc {Number(device?.deposit || 0).toLocaleString("vi-VN")} đ
          </div>
        </div>
      </div>

      <div className="p-4 bg-pink-50/70 rounded-xl space-y-2">
        {renderInfoRow("Chi nhánh", branchLabel)}
        {renderInfoRow("Ngày nhận", format(t1, "dd/MM, EEEE", { locale: vi }))}
        {renderInfoRow("Ngày trả", format(t2, "dd/MM, EEEE", { locale: vi }))}
        {renderInfoRow(
          "Gói thuê",
          isSixHours ? "Gói 6 tiếng" : days === 1 ? "1 ngày" : `${days} ngày`
        )}
        {renderInfoRow(
          "Giờ",
          `${format(t1, "HH:mm", { locale: vi })} - ${format(t2, "HH:mm", {
            locale: vi,
          })}`
        )}
      </div>

      <div className="border-t border-dashed border-pink-200 my-4"></div>

      <div className="space-y-2">
        {renderInfoRow(
          "Tạm tính",
          `${Number(subTotal).toLocaleString("vi-VN")} đ`
        )}
        {renderInfoRow(
          "Giảm giá",
          `- ${Number(discount).toLocaleString("vi-VN")} đ`
        )}
      </div>

      <div className="!mt-4 p-4 bg-pink-100 rounded-xl flex justify-between items-center">
        <span className="text-base font-semibold text-pink-800">
          Thành tiền
        </span>
        <span className="text-xl font-bold text-pink-700">
          {Number(total).toLocaleString("vi-VN")} đ
        </span>
      </div>

      <div className="!mt-4 pt-4 border-t border-pink-200 text-sm text-slate-600 space-y-1">
        <p>
          <b>Khách hàng:</b> {customer.fullName || "—"}
        </p>
        <p>
          <b>Số điện thoại:</b> {normalizePhone(customer.phone) || "—"}
        </p>
        {customer.ig && (
          <p>
            <b>Instagram:</b> {customer.ig}
          </p>
        )}
      </div>
    </div>
  );
}

/* Thanh chọn ngày kiểu CGV */
function DateStrip({ selectedDate, onSelect }) {
  const days = useMemo(() => {
    const arr = [];
    const today = normalizeDate(new Date());
    for (let i = 0; i < 7; i++) {
      arr.push(addDays(today, i));
    }
    return arr;
  }, []);

  const isSameDay = (d1, d2) => d1 && d2 && d1.getTime() === d2.getTime();

  const getLabel = (day, index) => {
    if (index === 0) return "Hôm nay";
    const dow = day.getDay(); // 0-6
    if (dow === 0) return "CN";
    return `T${dow + 1}`;
  };

  return (
    <div className="bg-slate-900 text-white">
      <div className="max-w-md mx-auto px-2 py-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {days.map((day, idx) => {
            const active = isSameDay(day, selectedDate);
            return (
              <button
                key={day.toISOString()}
                onClick={() => onSelect(day)}
                className={`flex-shrink-0 w-12 text-center rounded-full py-1 ${
                  active ? "bg-red-500" : "bg-slate-800"
                }`}
              >
                <div className="text-[10px] mb-0.5">{getLabel(day, idx)}</div>
                <div className="text-sm font-semibold">{format(day, "dd")}</div>
              </button>
            );
          })}
        </div>
        <div className="mt-2 text-xs text-center text-slate-300">
          {selectedDate &&
            format(selectedDate, "EEEE, dd 'tháng' MM, yyyy", { locale: vi })}
        </div>
      </div>
    </div>
  );
}

/* Panel chi nhánh kiểu CGV: tiêu đề chi nhánh + list 6 tiếng / 1/2/3 ngày */
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
    <div className="border-b border-slate-100">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between bg-white"
      >
        <div className="text-left">
          <div className="text-red-600 font-semibold text-sm">
            {branch.label}
          </div>
          <div className="text-[11px] text-slate-500">
            {branch.distanceText}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {soldOut && (
            <span className="text-[11px] text-red-500">
              Hết chỗ trong khung này
            </span>
          )}
          <span
            className={`transform transition-transform ${
              expanded ? "rotate-180" : "rotate-0"
            } text-slate-500`}
          >
            ▾
          </span>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 bg-slate-50">
          {loading && (
            <div className="text-[11px] text-slate-500 mb-2">
              Đang kiểm tra tình trạng máy...
            </div>
          )}
          {error && (
            <div className="text-[11px] text-amber-700 mb-2">
              {error} Tụi mình vẫn cho phép đặt và sẽ gọi xác nhận lại.
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
                  className={`min-w-[88px] px-3 py-2 rounded-md border text-sm text-center transition ${
                    disabled
                      ? "border-slate-200 text-slate-400 bg-slate-100 cursor-not-allowed"
                      : active
                      ? "border-red-600 bg-red-600 text-white shadow-md shadow-red-400/30"
                      : "border-slate-300 bg-white text-slate-800 hover:border-red-500 hover:text-red-600"
                  }`}
                >
                  <div className="text-sm font-semibold">{opt.label}</div>
                  {price > 0 && (
                    <div className="text-[11px] mt-0.5">
                      {price.toLocaleString("vi-VN")} đ
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

/* ===================== BOOKING PAGE (CGV STYLE) ===================== */

export default function BookingPage() {
  const [allDevices, setAllDevices] = useState([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);
  const [devicesError, setDevicesError] = useState("");

  const [selectedDeviceId, setSelectedDeviceId] = useState(null);

  const [selectedDate, setSelectedDate] = useState(() =>
    normalizeDate(new Date())
  );
  const [durationOptionId, setDurationOptionId] = useState("ONE_DAY");
  const [selectedBranchId, setSelectedBranchId] = useState(BRANCHES[0].id);
  const [expandedBranchId, setExpandedBranchId] = useState(BRANCHES[0].id);

  const [availabilityByBranch, setAvailabilityByBranch] = useState({});

  const [voucherId] = useState("NONE"); // giữ để logic pricing hoạt động

  const [customer, setCustomer] = useState({
    fullName: "",
    phone: "",
    ig: "",
    fb: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  /* ==== Fetch devices ==== */

  const fetchAllDevices = useCallback(async () => {
    setIsLoadingDevices(true);
    setDevicesError("");
    try {
      const response = await api.get("/v1/devices");
      setAllDevices(response.data || []);
    } catch (error) {
      console.error("Failed to fetch devices:", error);
      setDevicesError(
        "Không thể tải danh sách thiết bị. Vui lòng kiểm tra kết nối và thử lại."
      );
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
    function normalizeName(name = "") {
      return name.replace(/\s*\(\d+\)\s*$/, "").trim();
    }
    const seen = new Set();
    const result = [];
    for (const it of allDevices) {
      const normalized = normalizeName(it.name);
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

  useEffect(() => {
    if (!selectedDeviceId && DERIVED.length > 0) {
      setSelectedDeviceId(DERIVED[0].id);
    }
  }, [DERIVED, selectedDeviceId]);

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

  /* ==== Availability theo chi nhánh + gói (theo time range) ==== */

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
        [branchId]: {
          ...(prev[branchId] || {}),
          loading: true,
          error: null,
        },
      }));

      try {
        const params = {
          startDate: formatDateTimeLocalForAPI(fromDateTime),
          endDate: formatDateTimeLocalForAPI(toDateTime),
          branchId,
        };
        const resp = await api.get("v1/devices/booking", {
          params,
        });
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
          [branchId]: {
            loading: false,
            error: null,
            soldOut: deviceBusy,
          },
        }));
      } catch (err) {
        console.error("Failed to fetch bookings:", err);
        if (cancelled) return;
        setAvailabilityByBranch((prev) => ({
          ...prev,
          [branchId]: {
            loading: false,
            error: "Không thể tải dữ liệu đặt máy. Vui lòng thử lại.",
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

  const showMiniSummary =
    selectedDevice && t1 && t2 && total > 0 && selectedBranchId;

  /* ==== JSX ==== */

  return (
    <div className="min-h-dvh bg-slate-100 text-slate-900">
      {/* HEADER kiểu CGV */}
      <header className="bg-white sticky top-0 z-30 shadow-sm">
        <div className="max-w-md mx-auto h-12 flex items-center px-4">
          <button
            onClick={() => window.history.back()}
            className="w-8 h-8 flex items-center justify-center text-slate-700"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div className="flex-1 text-center text-sm font-semibold line-clamp-1">
            {selectedDevice ? selectedDevice.displayName : "Đang tải máy..."}
          </div>
          <button className="w-8 h-8 flex items-center justify-center text-slate-700">
            <Bars3Icon className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Thanh chọn ngày kiểu CGV */}
      <DateStrip
        selectedDate={selectedDate}
        onSelect={(d) => setSelectedDate(normalizeDate(d))}
      />

      {/* CONTENT */}
      <div className="max-w-md mx-auto pb-32 pt-3 px-0">
        {isLoadingDevices ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Đang tải danh sách máy ảnh...
          </div>
        ) : devicesError ? (
          <div className="py-10 text-center px-4">
            <p className="text-sm text-red-500 mb-3">{devicesError}</p>
            <button
              onClick={fetchAllDevices}
              className="px-4 py-2 rounded-xl border-2 border-pink-500 text-pink-700 text-sm font-semibold hover:bg-pink-50 active:scale-95 transition"
            >
              Thử tải lại
            </button>
          </div>
        ) : !selectedDevice ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Không tìm thấy máy phù hợp để đặt.
          </div>
        ) : (
          <>
            {/* Danh sách chi nhánh + gói (giống CGV hiển thị rạp + suất chiếu) */}
            <div className="bg-white">
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
              <div className="rounded-2xl border border-pink-100 bg-white shadow-md shadow-pink-500/5">
                <div className="px-5 py-4 border-b border-pink-100 text-base font-semibold text-pink-800">
                  Thông tin liên lạc
                </div>
                <div className="p-5 space-y-4">
                  <InputField
                    icon={<UserIcon className="h-5 w-5" />}
                    value={customer.fullName}
                    onChange={(e) =>
                      setCustomer((c) => ({
                        ...c,
                        fullName: e.target.value,
                      }))
                    }
                    placeholder="Nguyễn Thị Bông"
                    error={errors.fullName}
                    helpText="Họ tên cần có ít nhất 2 ký tự."
                  />
                  <InputField
                    icon={<DevicePhoneMobileIcon className="h-5 w-5" />}
                    value={customer.phone}
                    onChange={(e) =>
                      setCustomer((c) => ({
                        ...c,
                        phone: e.target.value,
                      }))
                    }
                    placeholder="0901234567"
                    inputMode="tel"
                    error={errors.phone}
                    helpText="SĐT hợp lệ của Việt Nam có 10 số, bắt đầu bằng 0."
                  />
                  <InputField
                    icon={<span className="font-bold text-sm">IG</span>}
                    value={customer.ig}
                    onChange={(e) =>
                      setCustomer((c) => ({
                        ...c,
                        ig: e.target.value,
                      }))
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

      {/* BOTTOM BAR: mini summary + nút Thanh toán */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <div className="mx-auto max-w-md">
          <div className="bg-white/90 backdrop-blur-lg border-t border-pink-200 rounded-t-3xl p-4 shadow-2xl shadow-pink-300/20">
            {showMiniSummary && (
              <div className="flex items-baseline justify-between mb-3 text-xs">
                <span className="text-slate-600 truncate max-w-[65%]">
                  {selectedDevice.displayName} •{" "}
                  {isSixHours
                    ? "Gói 6 tiếng"
                    : days === 1
                    ? "1 ngày"
                    : `${days} ngày`}
                </span>
                <span className="font-semibold text-pink-700">
                  {total.toLocaleString("vi-VN")} đ
                </span>
              </div>
            )}

            <button
              onClick={submitPayment}
              disabled={!canSubmit || isSubmitting}
              className="w-full px-4 py-3.5 rounded-xl bg-pink-600 text-white font-semibold disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-pink-500/30 hover:bg-pink-700 transition-all active:scale-95"
            >
              {isSubmitting ? (
                "Đang xử lý..."
              ) : (
                <>
                  <CreditCardIcon className="h-5 w-5" />{" "}
                  {canSubmit
                    ? `Thanh toán (${total.toLocaleString("vi-VN")} đ)`
                    : "Chọn chi nhánh, gói thuê & điền thông tin"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

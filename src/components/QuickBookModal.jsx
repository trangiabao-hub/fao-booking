import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useLayoutEffect,
} from "react";
import { format, addDays, isWeekend } from "date-fns";
import vi from "date-fns/locale/vi";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  MapPin,
  Clock,
  CreditCard,
  User,
  Phone,
  Check,
  Sparkles,
} from "lucide-react";
import api from "../config/axios";
import {
  loadBookingPrefs,
  loadCustomerInfo,
  saveCustomerInfo,
} from "../utils/storage";

const BRANCHES = [
  { id: "PHU_NHUAN", label: "FAO Phú Nhuận", address: "330/22 PĐP, P.1" },
  { id: "Q9", label: "FAO Q9 (Vinhomes)", address: "Vinhomes Grand Park" },
];

const DURATION_OPTIONS = [
  { id: "SIX_HOURS", label: "6 tiếng", priceKey: "priceSixHours" },
  { id: "ONE_DAY", label: "1 ngày", priceKey: "priceOneDay" },
  { id: "TWO_DAYS", label: "2 ngày", priceKey: "priceTwoDay" },
  { id: "THREE_DAYS", label: "3 ngày", priceKey: "priceThreeDay" },
];

function normalizeDate(date) {
  if (!date) return null;
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function normalizePhone(p) {
  if (!p) return "";
  let s = p.replace(/[^\d]/g, "");
  if (s.startsWith("84")) s = "0" + s.slice(2);
  return s;
}

function getTimeRange(selectedDate, durationId) {
  const startDate = normalizeDate(selectedDate);
  let endDate = startDate;
  let timeFrom = "09:00";
  let timeTo = "20:30";

  switch (durationId) {
    case "SIX_HOURS":
      timeTo = "15:00";
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

function combineDateWithTime(dateOnly, timeStr) {
  if (!dateOnly || !timeStr) return null;
  const [h, m] = timeStr.split(":").map(Number);
  const d = new Date(dateOnly);
  d.setHours(h, m, 0, 0);
  return d;
}

function formatPriceK(price) {
  if (!price || price <= 0) return "0k";
  return `${Math.round(price / 1000)}k`;
}

function countWeekdaysBetweenAligned(t1, t2) {
  let days = 0;
  let weekdays = 0;
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

function computeDiscountedPrice(price, startDate, endDate) {
  if (!price || price <= 0 || !startDate || !endDate) return price || 0;
  const sameDay = startDate.toDateString() === endDate.toDateString();
  if (sameDay) {
    return isWeekend(startDate) ? price : Math.round(price * 0.8);
  }
  const { days, weekdays } = countWeekdaysBetweenAligned(startDate, endDate);
  if (days <= 0) return price;
  const ratio = weekdays / days;
  const discount = Math.round(price * 0.2 * ratio);
  return Math.max(0, price - discount);
}

export default function QuickBookModal({ device, isOpen, onClose }) {
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

  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState(() =>
    normalizeDate(new Date())
  );
  const [selectedBranch, setSelectedBranch] = useState(initialPrefs.branchId);
  const [selectedDuration, setSelectedDuration] = useState(
    initialPrefs.durationId
  );
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [customer, setCustomer] = useState(
    () => loadCustomerInfo() || { fullName: "", phone: "", ig: "" }
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Reset when modal opens
  useLayoutEffect(() => {
    if (isOpen) {
      setStep(1);
      setError("");
      const prefs = loadBookingPrefs();
      if (prefs?.branchId && BRANCHES.some((b) => b.id === prefs.branchId)) {
        setSelectedBranch((prev) =>
          prev === prefs.branchId ? prev : prefs.branchId
        );
      }
      if (
        prefs?.durationId &&
        DURATION_OPTIONS.some((d) => d.id === prefs.durationId)
      ) {
        setSelectedDuration((prev) =>
          prev === prefs.durationId ? prev : prefs.durationId
        );
      }
    }
  }, [isOpen]);

  // Generate next 14 days
  const days = useMemo(() => {
    const arr = [];
    const today = normalizeDate(new Date());
    for (let i = 0; i < 14; i++) {
      arr.push(addDays(today, i));
    }
    return arr;
  }, []);

  // Calculate price
  const price = useMemo(() => {
    if (!device) return 0;
    const opt = DURATION_OPTIONS.find((o) => o.id === selectedDuration);
    return device[opt?.priceKey] || device.priceOneDay || 0;
  }, [device, selectedDuration]);

  // Time range
  const { startDate, endDate, timeFrom, timeTo } = useMemo(
    () => getTimeRange(selectedDate, selectedDuration),
    [selectedDate, selectedDuration]
  );

  const discountedTotal = useMemo(
    () => computeDiscountedPrice(price, startDate, endDate),
    [price, startDate, endDate]
  );
  const discountedLabel = formatPriceK(discountedTotal);

  const t1 = combineDateWithTime(startDate, timeFrom);
  const t2 = combineDateWithTime(endDate, timeTo);

  // Check availability
  const checkAvailability = useCallback(async () => {
    if (!device || !t1 || !t2) return;
    setIsCheckingAvailability(true);
    try {
      const params = {
        startDate: t1.toISOString(),
        endDate: t2.toISOString(),
        branchId: selectedBranch,
      };
      const resp = await api.get("v1/devices/booking", { params });
      const data = resp.data || [];
      const busy = data.some(
        (d) => d.id === device.id && d.bookingDtos?.length > 0
      );
      setIsAvailable(!busy);
    } catch (err) {
      console.error("Availability check failed:", err);
      setIsAvailable(true);
    } finally {
      setIsCheckingAvailability(false);
    }
  }, [device, t1, t2, selectedBranch]);

  useEffect(() => {
    if (isOpen && device) {
      checkAvailability();
    }
  }, [
    isOpen,
    device,
    selectedDate,
    selectedDuration,
    selectedBranch,
    checkAvailability,
  ]);

  // Validate customer info
  const isCustomerValid = useMemo(() => {
    const phone = normalizePhone(customer.phone);
    return customer.fullName?.trim().length >= 2 && /^0\d{9}$/.test(phone);
  }, [customer]);

  // Submit booking
  const handleSubmit = async () => {
    if (!device || !t1 || !t2 || !isCustomerValid) return;

    setIsSubmitting(true);
    setError("");

    try {
      saveCustomerInfo(customer);

      const phone = normalizePhone(customer.phone);
      const registerRes = await api.post("/accounts", {
        fullName: customer.fullName.trim(),
        phone,
        ig: customer.ig?.trim() || null,
      });
      const customerId = registerRes.data?.id;
      if (!customerId) throw new Error("Không lấy được customerId");

      const branchLabel =
        BRANCHES.find((b) => b.id === selectedBranch)?.label || selectedBranch;

      const bookingRequest = {
        customerId,
        deviceId: device.id,
        bookingFrom: t1.toISOString(),
        bookingTo: t2.toISOString(),
        total: discountedTotal,
        note: `Quick Book: ${customer.fullName} - ${phone} - Chi nhánh: ${branchLabel}`,
      };

      const payload = {
        amount: discountedTotal,
        description: `Thue ${device.name || device.displayName}`.slice(0, 25),
        bookingRequest,
        returnSuccessUrl: `${window.location.origin}/payment-status`,
        returnFailUrl: `${window.location.origin}/payment-status`,
      };

      const response = await api.post("/create-payment-link", payload);
      if (response.data?.checkoutUrl) {
        window.location.href = response.data.checkoutUrl;
      } else {
        throw new Error("Không nhận được link thanh toán");
      }
    } catch (err) {
      console.error("Quick book failed:", err);
      setError(err.response?.data?.message || err.message || "Có lỗi xảy ra");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !device) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#FFFBF5] w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#FFE4F0]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full border-2 border-white shadow-lg overflow-hidden bg-white">
                <img
                  src={device.img || device.images?.[0]}
                  alt={device.displayName || device.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="font-black text-[#222] text-sm line-clamp-1 uppercase">
                  {device.displayName || device.name}
                </div>
                <div className="text-xs font-bold text-[#E85C9C]">
                  {discountedLabel}{" "}
                  <span className="text-[#999] font-normal">(giá weekday)</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#FF9FCA]/20 rounded-full transition-colors"
            >
              <X size={20} className="text-[#555]" />
            </button>
          </div>

          {/* Progress */}
          <div className="px-4 py-3 bg-[#222] border-b border-[#333]">
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                      step >= s
                        ? "bg-[#FF9FCA] text-[#222]"
                        : "bg-[#333] border border-[#555] text-[#777]"
                    }`}
                  >
                    {step > s ? <Check size={14} strokeWidth={3} /> : s}
                  </div>
                  {s < 3 && (
                    <div
                      className={`w-8 h-0.5 ${
                        step > s ? "bg-[#FF9FCA]" : "bg-[#444]"
                      }`}
                    />
                  )}
                </div>
              ))}
              <span className="ml-2 text-xs text-[#FF9FCA] font-bold uppercase tracking-wider">
                {step === 1
                  ? "Chọn ngày"
                  : step === 2
                  ? "Thông tin"
                  : "Xác nhận"}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {step === 1 && (
              <div className="space-y-5">
                {/* Date Selection */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-black text-[#222] mb-3 uppercase tracking-wider">
                    <Calendar size={16} className="text-[#E85C9C]" />
                    Chọn ngày
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {days.map((day, idx) => {
                      const isSelected =
                        day.getTime() === selectedDate?.getTime();
                      const isWeekendDay = isWeekend(day);
                      return (
                        <button
                          key={day.toISOString()}
                          onClick={() => setSelectedDate(day)}
                          className={`flex-shrink-0 w-14 text-center py-2 px-1 rounded-xl transition-all border-2 ${
                            isSelected
                              ? "bg-[#222] text-[#FF9FCA] border-[#222] shadow-lg"
                              : isWeekendDay
                              ? "bg-[#FFE4F0] text-[#E85C9C] border-[#FFE4F0]"
                              : "bg-white text-[#555] border-[#eee] hover:border-[#FF9FCA]"
                          }`}
                        >
                          <div className="text-[10px] mb-0.5 font-bold">
                            {idx === 0
                              ? "Hôm nay"
                              : idx === 1
                              ? "Ngày mai"
                              : format(day, "EEE", { locale: vi })}
                          </div>
                          <div className="font-black">{format(day, "dd")}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Duration Selection */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-black text-[#222] mb-3 uppercase tracking-wider">
                    <Clock size={16} className="text-[#E85C9C]" />
                    Gói thuê
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {DURATION_OPTIONS.map((opt) => {
                      const optPrice = device[opt.priceKey] || 0;
                      const isSelected = opt.id === selectedDuration;
                      const { startDate: optStartDate, endDate: optEndDate } =
                        getTimeRange(selectedDate, opt.id);
                      const optDiscounted = formatPriceK(
                        computeDiscountedPrice(
                          optPrice,
                          optStartDate,
                          optEndDate
                        )
                      );
                      return (
                        <button
                          key={opt.id}
                          disabled={!optPrice}
                          onClick={() => setSelectedDuration(opt.id)}
                          className={`p-3 rounded-xl text-left transition-all border-2 ${
                            !optPrice
                              ? "bg-[#f5f5f5] text-[#bbb] border-[#eee] cursor-not-allowed"
                              : isSelected
                              ? "bg-[#222] text-[#FF9FCA] border-[#222] shadow-lg"
                              : "bg-white text-[#555] border-[#eee] hover:border-[#FF9FCA]"
                          }`}
                        >
                          <div className="font-black text-sm">{opt.label}</div>
                          {optPrice > 0 && (
                            <div
                              className={`text-xs font-bold ${
                                isSelected ? "text-[#FF9FCA]" : "text-[#E85C9C]"
                              }`}
                            >
                              {optDiscounted}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Branch Selection */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-black text-[#222] mb-3 uppercase tracking-wider">
                    <MapPin size={16} className="text-[#E85C9C]" />
                    Chi nhánh
                  </label>
                  <div className="space-y-2">
                    {BRANCHES.map((branch) => {
                      const isSelected = branch.id === selectedBranch;
                      return (
                        <button
                          key={branch.id}
                          onClick={() => setSelectedBranch(branch.id)}
                          className={`w-full p-3 rounded-xl text-left transition-all border-2 ${
                            isSelected
                              ? "bg-[#222] text-white border-[#222]"
                              : "bg-white text-[#555] border-[#eee] hover:border-[#FF9FCA]"
                          }`}
                        >
                          <div className="font-black text-sm">
                            {branch.label}
                          </div>
                          <div
                            className={`text-xs ${
                              isSelected ? "text-[#FF9FCA]" : "text-[#999]"
                            }`}
                          >
                            {branch.address}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Availability Check */}
                <div className="min-h-[44px]">
                  {isCheckingAvailability ? (
                    <div className="text-center py-2 text-sm text-[#777] font-medium">
                      Đang kiểm tra tình trạng máy...
                    </div>
                  ) : !isAvailable ? (
                    <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm font-bold border border-red-200">
                      ⚠️ Máy đã được đặt trong khung giờ này. Vui lòng chọn ngày
                      khác.
                    </div>
                  ) : (
                    <div className="text-center py-2 text-sm text-transparent select-none">
                      Đang kiểm tra tình trạng máy...
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-black text-[#222] mb-2 uppercase tracking-wider">
                    <User size={16} className="text-[#E85C9C]" />
                    Họ tên
                  </label>
                  <input
                    value={customer.fullName}
                    onChange={(e) =>
                      setCustomer((c) => ({ ...c, fullName: e.target.value }))
                    }
                    placeholder="Nguyễn Thị Bông"
                    className="w-full px-4 py-3 rounded-xl border-2 border-[#eee] focus:border-[#FF9FCA] focus:outline-none bg-white font-medium text-[#333]"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-black text-[#222] mb-2 uppercase tracking-wider">
                    <Phone size={16} className="text-[#E85C9C]" />
                    Số điện thoại
                  </label>
                  <input
                    value={customer.phone}
                    onChange={(e) =>
                      setCustomer((c) => ({ ...c, phone: e.target.value }))
                    }
                    placeholder="0901234567"
                    inputMode="tel"
                    className="w-full px-4 py-3 rounded-xl border-2 border-[#eee] focus:border-[#FF9FCA] focus:outline-none bg-white font-medium text-[#333]"
                  />
                </div>
                <div>
                  <label className="text-sm font-black text-[#222] mb-2 block uppercase tracking-wider">
                    Instagram (không bắt buộc)
                  </label>
                  <input
                    value={customer.ig}
                    onChange={(e) =>
                      setCustomer((c) => ({ ...c, ig: e.target.value }))
                    }
                    placeholder="@username"
                    className="w-full px-4 py-3 rounded-xl border-2 border-[#eee] focus:border-[#FF9FCA] focus:outline-none bg-white font-medium text-[#333]"
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <div className="p-4 bg-gradient-to-r from-[#FFE4F0] to-[#FFF5F8] rounded-xl border border-[#FF9FCA]">
                  <div className="text-xs text-[#E85C9C] font-black uppercase tracking-wider mb-1">
                    Thiết bị
                  </div>
                  <div className="font-black text-[#222] uppercase">
                    {device.displayName || device.name}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-white rounded-xl border border-[#eee]">
                    <div className="text-xs text-[#999] font-bold mb-1">
                      Ngày nhận
                    </div>
                    <div className="font-black text-sm text-[#222]">
                      {t1 && format(t1, "dd/MM HH:mm", { locale: vi })}
                    </div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-[#eee]">
                    <div className="text-xs text-[#999] font-bold mb-1">
                      Ngày trả
                    </div>
                    <div className="font-black text-sm text-[#222]">
                      {t2 && format(t2, "dd/MM HH:mm", { locale: vi })}
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-[#eee]">
                  <div className="text-xs text-[#999] font-bold mb-1">
                    Chi nhánh
                  </div>
                  <div className="font-black text-sm text-[#222]">
                    {BRANCHES.find((b) => b.id === selectedBranch)?.label}
                  </div>
                </div>
                <div className="p-3 bg-green-50 rounded-xl border border-green-200">
                  <div className="text-xs text-green-600 font-bold mb-1">
                    Khách hàng
                  </div>
                  <div className="font-black text-sm text-[#222]">
                    {customer.fullName}
                  </div>
                  <div className="text-xs text-[#777]">
                    {normalizePhone(customer.phone)}
                  </div>
                </div>
                <div className="p-4 bg-[#222] rounded-xl">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-white uppercase tracking-wider">
                      Tổng tiền
                    </span>
                    <span className="text-2xl font-black text-[#FF9FCA]">
                      {discountedLabel}
                    </span>
                  </div>
                </div>
                {error && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm font-bold border border-red-200">
                    {error}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[#FFE4F0] bg-white">
            <div className="flex gap-3">
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="flex-1 py-3 rounded-xl border-2 border-[#222] text-[#222] font-black uppercase tracking-wider hover:bg-[#f5f5f5] transition-colors"
                >
                  Quay lại
                </button>
              )}
              {step < 3 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={
                    (step === 1 && (!isAvailable || isCheckingAvailability)) ||
                    (step === 2 && !isCustomerValid)
                  }
                  className="flex-1 py-3 rounded-xl bg-[#222] text-[#FF9FCA] font-black uppercase tracking-wider hover:bg-[#333] transition-colors disabled:bg-[#ccc] disabled:text-[#999]"
                >
                  Tiếp tục
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!isCustomerValid || isSubmitting}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#E85C9C] to-[#FF9FCA] text-white font-black uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    "Đang xử lý..."
                  ) : (
                    <>
                      <CreditCard size={18} />
                      Thanh toán {discountedLabel}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

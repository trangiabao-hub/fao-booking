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
  saveBookingPrefs,
} from "../utils/storage";
import {
  BRANCHES,
  DURATION_OPTIONS,
  MORNING_PICKUP_TIME,
  SIX_HOUR_RETURN_TIME,
  DEFAULT_EVENING_SLOT,
} from "../data/bookingConstants";
import {
  normalizeDate,
  normalizePhone,
  getDefaultBranchId,
  formatPriceK,
  computeDiscountedPrice,
  computeDiscountBreakdown,
} from "../utils/bookingHelpers";
import { calculateRentalInfo } from "../utils/pricing";
import BookingPrefsForm, {
  computeAvailabilityRange,
  getAvailabilityRangeError,
  getSixHourAutoReturnTime,
  formatPickupReturnSummary,
} from "./BookingPrefsForm";

export default function QuickBookModal({
  device,
  isOpen,
  onClose,
  initialPrefs,
  pricing,
}) {
  const hasInitialPrefs = !!initialPrefs;

  // Load initial state from storage or defaults
  const getInitialPrefs = useCallback(() => {
    const prefs = loadBookingPrefs();
    const branchId =
      BRANCHES.find((b) => b.id === prefs?.branchId && !b.disabled)?.id ||
      getDefaultBranchId();
    const durationId = DURATION_OPTIONS.some((d) => d.id === prefs?.durationId)
      ? prefs.durationId
      : "ONE_DAY";
    return {
      branchId,
      durationId,
      date: prefs?.date
        ? normalizeDate(new Date(prefs.date))
        : normalizeDate(new Date()),
      endDate: prefs?.endDate
        ? normalizeDate(new Date(prefs.endDate))
        : addDays(normalizeDate(new Date()), 1),
      timeFrom: prefs?.timeFrom || MORNING_PICKUP_TIME,
      timeTo: prefs?.timeTo || SIX_HOUR_RETURN_TIME,
      pickupType: prefs?.pickupType || "MORNING",
      pickupSlot: prefs?.pickupSlot || DEFAULT_EVENING_SLOT,
    };
  }, []);

  const initialValues = useMemo(() => getInitialPrefs(), [getInitialPrefs]);

  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState(initialValues.date);
  const [selectedBranch, setSelectedBranch] = useState(initialValues.branchId);
  const [selectedDuration, setSelectedDuration] = useState(
    initialValues.durationId,
  );
  const [pickupType, setPickupType] = useState(initialValues.pickupType);
  const [pickupSlot, setPickupSlot] = useState(initialValues.pickupSlot);
  const [sixHourTimeFrom, setSixHourTimeFrom] = useState(
    initialValues.timeFrom,
  );
  const [sixHourTimeTo, setSixHourTimeTo] = useState(initialValues.timeTo);
  const [endDateState, setEndDateState] = useState(initialValues.endDate);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

  const [isAvailable, setIsAvailable] = useState(true);
  const [customer, setCustomer] = useState(
    () => loadCustomerInfo() || { fullName: "", phone: "", ig: "" },
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Sync state when modal opens
  useLayoutEffect(() => {
    if (isOpen) {
      setError("");
      if (hasInitialPrefs && initialPrefs) {
        const p = initialPrefs;
        setStep(p.step || 1);
        if (p.branchId) setSelectedBranch(p.branchId);
        if (p.durationType) setSelectedDuration(p.durationType);
        if (p.date) setSelectedDate(normalizeDate(p.date));
        if (p.endDate) setEndDateState(normalizeDate(p.endDate));
        if (p.timeFrom) setSixHourTimeFrom(p.timeFrom);
        if (p.timeTo) setSixHourTimeTo(p.timeTo);
        if (p.pickupType) setPickupType(p.pickupType);
        if (p.pickupSlot) setPickupSlot(p.pickupSlot);
      } else {
        const p = getInitialPrefs();
        setStep(1);
        setSelectedBranch(p.branchId);
        setSelectedDuration(p.durationId);
        setSelectedDate(p.date);
        setEndDateState(p.endDate);
        setSixHourTimeFrom(p.timeFrom);
        setSixHourTimeTo(p.timeTo);
        setPickupType(p.pickupType);
        setPickupSlot(p.pickupSlot);
      }
    }
  }, [isOpen, hasInitialPrefs, initialPrefs, getInitialPrefs]);

  // Auto-save search prefs
  useEffect(() => {
    if (!hasInitialPrefs && isOpen) {
      saveBookingPrefs({
        branchId: selectedBranch,
        durationId: selectedDuration,
        date: selectedDate?.toISOString(),
        endDate: endDateState?.toISOString(),
        timeFrom: sixHourTimeFrom,
        timeTo: sixHourTimeTo,
        pickupType,
        pickupSlot,
      });
    }
  }, [
    selectedBranch,
    selectedDuration,
    selectedDate,
    endDateState,
    sixHourTimeFrom,
    sixHourTimeTo,
    pickupType,
    pickupSlot,
    isOpen,
    hasInitialPrefs,
  ]);

  // Compute time range via BookingPrefsForm's model
  const prefsForRange = useMemo(
    () => ({
      date: selectedDate,
      endDate: endDateState,
      timeFrom: sixHourTimeFrom,
      timeTo: sixHourTimeTo,
      durationType: selectedDuration,
      pickupType,
      pickupSlot,
    }),
    [
      selectedDate,
      endDateState,
      sixHourTimeFrom,
      sixHourTimeTo,
      selectedDuration,
      pickupType,
      pickupSlot,
    ],
  );

  const { fromDateTime: t1, toDateTime: t2 } = useMemo(
    () => computeAvailabilityRange(prefsForRange),
    [prefsForRange],
  );

  // Base price từ khoảng thời gian thực tế (t1, t2) - đồng bộ manage
  const rentalInfo = useMemo(() => {
    if (!device || !t1 || !t2) return { price: 0, chargeableDays: 0 };
    return calculateRentalInfo([t1, t2], device);
  }, [device, t1, t2]);

  const price = rentalInfo.price;
  const chargeableDays = rentalInfo.chargeableDays;

  const discountedTotal = useMemo(() => {
    if (hasInitialPrefs && pricing?.discounted != null)
      return pricing.discounted;
    return computeDiscountedPrice(price, t1, t2);
  }, [hasInitialPrefs, pricing?.discounted, price, t1, t2]);
  const discountedLabel = formatPriceK(discountedTotal);

  // Chi tiết công thức giá để hiển thị ở bước XÁC NHẬN
  const priceBreakdown = useMemo(() => {
    const oneDayPrice = device?.priceOneDay || 0;
    const days = chargeableDays >= 1 ? chargeableDays : chargeableDays || 0.5;
    const daysForRetail = days >= 1 ? days : 1;
    const retailPrice = Math.round(oneDayPrice * daysForRetail); // Thuê lẻ = giá 1 ngày × số ngày
    const packagePrice = price;
    const savingVsRetail = Math.max(0, retailPrice - packagePrice);

    let base = null;
    if (
      hasInitialPrefs &&
      pricing?.original != null &&
      pricing?.discounted != null
    ) {
      const discount = Math.max(0, pricing.original - pricing.discounted);
      base = {
        original: pricing.original,
        discount,
        discounted: pricing.discounted,
        discountLabel: discount > 0 ? "Khuyến mãi" : null,
      };
    } else if (t1 && t2 && price > 0) {
      base = computeDiscountBreakdown(price, t1, t2);
    }
    if (!base) return null;

    return {
      ...base,
      retailPrice: retailPrice > 0 ? retailPrice : null,
      savingVsRetail: savingVsRetail > 0 ? savingVsRetail : 0,
      days,
      oneDayPrice,
    };
  }, [
    hasInitialPrefs,
    pricing?.original,
    pricing?.discounted,
    price,
    t1,
    t2,
    device?.priceOneDay,
    chargeableDays,
  ]);

  const durationDays = chargeableDays;

  const timeSelectionError = useMemo(() => {
    return getAvailabilityRangeError(prefsForRange, t1, t2);
  }, [prefsForRange, t1, t2]);

  // Check availability
  const checkAvailability = useCallback(async () => {
    if (!device || !t1 || !t2 || timeSelectionError) return;
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
        (d) => d.id === device.id && d.bookingDtos?.length > 0,
      );
      setIsAvailable(!busy);
    } catch (err) {
      console.error("Availability check failed:", err);
      setIsAvailable(true);
    } finally {
      setIsCheckingAvailability(false);
    }
  }, [device, t1, t2, selectedBranch, timeSelectionError]);

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
    initialPrefs,
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

      // Payload đồng bộ manage - gọn để tránh vượt giới hạn DB
      const fmt = (d) => (d ? format(d, "yyyy-MM-dd'T'HH:mm:ss") : null);
      const note = `${customer.fullName} ${phone} ${branchLabel}`.slice(0, 80);
      const bookingRequest = {
        customerId,
        deviceId: device.id,
        bookingFrom: fmt(t1),
        bookingTo: fmt(t2),
        total: discountedTotal,
        note,
        dayOfRent: chargeableDays,
        originalPrice: price,
        noteVoucher: "NONE",
      };

      const payload = {
        amount: discountedTotal,
        description: `Thue ${(device.name || device.displayName || "").slice(0, 15)}`,
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
                  <span className="text-[#999] font-normal uppercase text-[10px] ml-1">
                    ({durationDays < 1 ? "Gói 6h" : `${durationDays} ngày`})
                  </span>
                </div>
                {t1 && t2 && (
                  <div className="text-[10px] text-[#888] font-bold mt-0.5 uppercase tracking-wide">
                    {format(t1, "dd/MM HH:mm", { locale: vi })} -{" "}
                    {format(t2, "dd/MM HH:mm", { locale: vi })}
                  </div>
                )}
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
              <span className="ml-2 text-xs text-[#FF9FCA] font-black uppercase tracking-[0.15em]">
                BƯỚC {step}:{" "}
                {step === 1
                  ? "CHỌN NGÀY"
                  : step === 2
                    ? "THÔNG TIN"
                    : "XÁC NHẬN"}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 overflow-y-auto p-4">
            {step === 1 && (
              <div>
                <BookingPrefsForm
                  branchId={selectedBranch}
                  date={selectedDate}
                  endDate={endDateState}
                  timeFrom={sixHourTimeFrom}
                  timeTo={sixHourTimeTo}
                  durationType={selectedDuration}
                  pickupType={pickupType}
                  pickupSlot={pickupSlot}
                  setBranchId={setSelectedBranch}
                  setDate={setSelectedDate}
                  setEndDate={setEndDateState}
                  setTimeFrom={setSixHourTimeFrom}
                  setTimeTo={setSixHourTimeTo}
                  setDurationType={setSelectedDuration}
                  setPickupType={setPickupType}
                  setPickupSlot={setPickupSlot}
                  error={
                    timeSelectionError ||
                    (!isAvailable
                      ? "⚠️ Máy đã được đặt trong khung giờ này. Vui lòng chọn ngày khác."
                      : "")
                  }
                />

                {/* Availability Check */}
                <div className="min-h-[44px] mt-3">
                  {isCheckingAvailability && (
                    <div className="text-center py-2 text-sm text-[#777] font-medium">
                      Đang kiểm tra tình trạng máy...
                    </div>
                  )}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-[11px] font-black text-[#666] mb-2 uppercase tracking-[0.2em] px-1">
                    <User size={14} className="text-[#E85C9C]" />
                    Họ và tên
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
                  <label className="flex items-center gap-2 text-[11px] font-black text-[#666] mb-2 uppercase tracking-[0.2em] px-1">
                    <Phone size={14} className="text-[#E85C9C]" />
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
                  <label className="text-[11px] font-black text-[#666] mb-2 block uppercase tracking-[0.2em] px-1">
                    Instagram / Facebook
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
                <div className="p-3 bg-white rounded-xl border border-[#eee]">
                  <div className="text-xs text-[#999] font-bold mb-1">
                    Thời gian
                  </div>
                  <div className="text-sm text-[#222] space-y-0.5">
                    {t1 && (
                      <div>Nhận: {formatPickupReturnSummary(t1)}</div>
                    )}
                    {t2 && (
                      <div>Trả: {formatPickupReturnSummary(t2)}</div>
                    )}
                    {chargeableDays > 0 && (
                      <div className="font-bold text-[#E85C9C] mt-1">
                        Tổng cộng: {chargeableDays < 1 ? "Gói 6h" : `${chargeableDays} ngày`}.
                      </div>
                    )}
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
                    {customer.fullName?.trim() || "Chưa chọn khách hàng"}
                  </div>
                  {customer.phone && (
                    <div className="text-xs text-[#777]">
                      {normalizePhone(customer.phone)}
                    </div>
                  )}
                </div>
                <div className="p-4 bg-[#222] rounded-xl space-y-2">
                  <div className="text-[10px] text-[#FF9FCA]/80 font-bold uppercase tracking-wider mb-2">
                    Tổng giá
                  </div>
                  {priceBreakdown && (
                    <>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-[#ccc]">✨ Giá gốc</span>
                        <span className="font-bold text-white">
                          {(priceBreakdown.original || 0).toLocaleString("vi-VN")}đ
                        </span>
                      </div>
                      {priceBreakdown.discount > 0 &&
                        priceBreakdown.discountLabel && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-[#FF9FCA]">
                              🔥 {priceBreakdown.discountLabel}
                            </span>
                            <span className="font-bold text-[#FF9FCA]">
                              (-{(priceBreakdown.discount || 0).toLocaleString("vi-VN")}đ)
                            </span>
                          </div>
                        )}
                      <div className="border-t border-[#444] pt-2 mt-2 flex justify-between items-center">
                        <span className="font-black text-white uppercase tracking-wider">
                          ✅ Chỉ còn
                        </span>
                        <span className="text-2xl font-black text-[#FF9FCA]">
                          {(priceBreakdown.discounted || 0).toLocaleString("vi-VN")}đ
                        </span>
                      </div>
                      {priceBreakdown.discount > 0 && (
                        <div className="text-center text-emerald-400 text-sm font-bold pt-1">
                          💥 Tiết kiệm ngay {(priceBreakdown.discount || 0).toLocaleString("vi-VN")}đ!
                        </div>
                      )}
                    </>
                  )}
                  {!priceBreakdown && (
                    <div className="flex justify-between items-center">
                      <span className="font-black text-white uppercase tracking-wider">
                        ✅ Chỉ còn
                      </span>
                      <span className="text-2xl font-black text-[#FF9FCA]">
                        {(discountedTotal || 0).toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="text-xs text-emerald-700 font-bold mb-0.5">
                    🎁 Đặc biệt: Chương trình "Cọc 0 đồng"
                  </div>
                  <div className="text-xs text-emerald-800/90">
                    ✅ Chỉ cần CCCD bản gốc (Shop chỉ chụp lại, không giữ máy) hoặc VNeID định danh mức 2.
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
            <div
              className={`grid gap-3 ${
                step > 1 ? "grid-cols-2" : "grid-cols-1"
              }`}
            >
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="min-w-0 py-3 rounded-xl border-2 border-[#222] text-[#222] font-black uppercase tracking-wider hover:bg-[#f5f5f5] transition-colors"
                >
                  Quay lại
                </button>
              )}
              {step < 3 ? (
                <button
                  onClick={() => setStep(step + 1)}
                  disabled={
                    (step === 1 &&
                      (!isAvailable ||
                        isCheckingAvailability ||
                        !!timeSelectionError)) ||
                    (step === 2 && !isCustomerValid)
                  }
                  className="min-w-0 py-3 rounded-xl bg-[#222] text-[#FF9FCA] font-black uppercase tracking-wider hover:bg-[#333] transition-colors disabled:bg-[#ccc] disabled:text-[#999]"
                >
                  Tiếp tục
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!isCustomerValid || isSubmitting}
                  className="min-w-0 py-3 rounded-xl bg-gradient-to-r from-[#E85C9C] to-[#FF9FCA] text-white font-black uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? "Đang xử lý..." : <>Thanh toán</>}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

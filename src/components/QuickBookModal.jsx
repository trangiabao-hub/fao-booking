import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useLayoutEffect,
  useRef,
} from "react";
import { format, addDays } from "date-fns";
import vi from "date-fns/locale/vi";
import { motion, AnimatePresence } from "framer-motion";
import { signInWithPopup } from "firebase/auth";
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
  loadCustomerSession,
  saveRecentOrder,
  saveCustomerSession,
  clearCustomerSession,
  saveCustomerInfo,
  saveBookingPrefs,
} from "../utils/storage";
import { auth, googleProvider } from "../config/firebase";
import { resolveGoogleSignInError } from "../utils/googleSignInEnvironment";
import EmbeddedBrowserGoogleHint from "./EmbeddedBrowserGoogleHint";
import {
  BRANCHES,
  DURATION_OPTIONS,
  MORNING_PICKUP_TIME,
  SIX_HOUR_RETURN_TIME,
  DEFAULT_EVENING_SLOT,
} from "../data/bookingConstants";
import { filterBookingsOverlappingSlot } from "../utils/bookingOverlap";
import {
  normalizeDate,
  normalizePhone,
  getDefaultBranchId,
  formatPriceK,
  formatPriceBreakdown,
  formatDateForAPIPayload,
  computeDiscountedPrice,
  computeDiscountBreakdown,
} from "../utils/bookingHelpers";

/** Đồng bộ fao-booking với trang /booking và fao (noteVoucher). */
function buildQuickBookNoteVoucher({
  isFirstOrderVoucherSelected,
  price,
  t1,
  t2,
  pointToUse,
}) {
  const parts = [];
  if (isFirstOrderVoucherSelected) {
    parts.push("FIRST_ORDER_30_MAX200K");
  } else if (price > 0 && t1 && t2) {
    const b = computeDiscountBreakdown(price, t1, t2);
    if (b && b.discount > 0) {
      parts.push("WEEKDAY_20_PCT");
    }
  }
  if (pointToUse > 0) {
    parts.push(`POINT_${pointToUse}`);
  }
  return parts.length > 0 ? parts.join(" | ") : "NONE";
}
import {
  computeEarnedPoints,
  computeTotalSpentFromBookings,
  memberTierKeyFromTotalSpent,
  pointsPerEarnBlock,
} from "../utils/loyaltyEarn";
import { calculateRentalInfo, roundDownToThousand } from "../utils/pricing";
import { getFaoStandardRentalContractUrl } from "../config/externalUrls";
import { getStrictestReleaseDate } from "../utils/deviceReleaseDate";
import { formatTimeVi } from "../utils/formatTimeVi";
import BookingPrefsForm, {
  computeAvailabilityRange,
  getAvailabilityRangeError,
  formatPickupReturnSummary,
} from "./BookingPrefsForm";

const FIRST_ORDER_DISCOUNT_RATE = 0.3;
const FIRST_ORDER_DISCOUNT_CAP = 200000;

/** Giống catalog: local datetime không hậu tố Z — backend parse LocalDateTime. */
function formatLocalDateTimeForDeviceApi(date) {
  if (!date) return null;
  return format(date, "yyyy-MM-dd'T'HH:mm:ss");
}

function isValidEmail(email) {
  const s = (email || "").trim();
  if (!s) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isUrlForPlatform(link, platform) {
  const raw = (link || "").trim();
  if (!raw) return false;
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    if (platform === "instagram") {
      return host === "instagram.com" || host === "www.instagram.com";
    }
    return (
      host === "facebook.com" ||
      host === "www.facebook.com" ||
      host === "m.facebook.com" ||
      host === "fb.com" ||
      host === "www.fb.com"
    );
  } catch {
    return false;
  }
}

/** Nhận diện IG/FB từ URL để auto chọn radio (paste, load từ lưu / tài khoản). */
function detectSocialPlatformFromLink(link) {
  if (isUrlForPlatform(link, "instagram")) return "instagram";
  if (isUrlForPlatform(link, "facebook")) return "facebook";
  return null;
}

function isSavedSocialValid(saved) {
  const ig = (saved?.ig || "").trim();
  const fb = (saved?.fb || "").trim();
  if (!ig && !fb) return false;
  if (ig && isUrlForPlatform(ig, "instagram")) return true;
  if (fb && isUrlForPlatform(fb, "facebook")) return true;
  return false;
}

function buildCustomerInfoSnapshot(customer, socialPlatform) {
  const socialLink = (customer.ig || "").trim();
  return {
    fullName: (customer.fullName || "").trim(),
    phone: normalizePhone(customer.phone),
    gmail: (customer.gmail || "").trim(),
    ig: socialPlatform === "instagram" ? socialLink : "",
    fb: socialPlatform === "facebook" ? socialLink : "",
  };
}

function isCustomerInfoSnapshotDifferent(saved, snap) {
  if (!saved) return true;
  return (
    (saved.fullName || "").trim() !== snap.fullName ||
    normalizePhone(saved.phone || "") !== snap.phone ||
    (saved.gmail || "").trim() !== snap.gmail ||
    (saved.ig || "").trim() !== snap.ig ||
    (saved.fb || "").trim() !== snap.fb
  );
}

function normalizeValidPhoneOrEmpty(rawPhone) {
  const normalized = normalizePhone(rawPhone || "");
  return /^0\d{9}$/.test(normalized) ? normalized : "";
}

function normalizeDeviceName(name = "") {
  return String(name).replace(/\s*\(\d+\)\s*$/, "").trim();
}

function getModelIdentity(device) {
  const modelKey = String(device?.modelKey || "").trim();
  if (modelKey) return modelKey.toLowerCase();
  return normalizeDeviceName(device?.name || device?.displayName || "").toLowerCase();
}

function getDeviceNameIndexForPick(name = "") {
  const match = String(name).match(/\((\d+)\)\s*$/);
  if (!match) return Number.POSITIVE_INFINITY;
  return Number(match[1]);
}

function sortDevicesSameModelPick(devices) {
  return [...devices].sort((a, b) => {
    const indexA = getDeviceNameIndexForPick(a.name);
    const indexB = getDeviceNameIndexForPick(b.name);
    if (indexA !== indexB) return indexA - indexB;
    const orderA = a.orderNumber ?? Number.POSITIVE_INFINITY;
    const orderB = b.orderNumber ?? Number.POSITIVE_INFINITY;
    if (orderA !== orderB) return orderA - orderB;
    return String(a.id).localeCompare(String(b.id));
  });
}

function getOrderCodeFromPaymentResponse(data) {
  if (data?.orderCode) return data.orderCode;
  try {
    const paymentUrl = data?.deepLink || data?.checkoutUrl;
    if (!paymentUrl) return null;
    const url = new URL(paymentUrl);
    return url.searchParams.get("orderCode");
  } catch {
    return null;
  }
}

function extractApiErrorMessage(error, fallback = "Có lỗi xảy ra") {
  const data = error?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (data?.message) return data.message;
  if (data?.error) return data.error;
  return error?.message || fallback;
}

async function resolveGuestCustomerId(customer) {
  const payload = {
    fullName: customer.fullName || null,
    phone: customer.phone || null,
    email: customer.gmail || null,
    ig: customer.ig || null,
    fb: customer.fb || null,
  };
  const response = await api.post("/accounts/resolve", payload);
  const customerId = response?.data?.id;
  if (!customerId) {
    throw new Error("Không lấy được customerId");
  }
  return customerId;
}

/** Đồng bộ hồ sơ lên server — chỉ khi đã đăng nhập Google. */
async function syncCustomerProfileToServer(checkoutMode, hasGoogleSession, snap) {
  if (checkoutMode !== "GOOGLE" || !hasGoogleSession) return;
  const me = await api.get("/account");
  if (!me?.data?.id) return;
  await api.put("/customer/profile", {
    fullName: snap.fullName,
    phone: snap.phone,
    email: snap.gmail || me?.data?.email,
    ig: snap.ig || null,
    fb: snap.fb || null,
  });
}

function allocateDiscountByRatio(amounts, discount) {
  const safeAmounts = Array.isArray(amounts)
    ? amounts.map((v) => Math.max(0, Math.round(Number(v) || 0)))
    : [];
  const total = safeAmounts.reduce((sum, value) => sum + value, 0);
  const targetDiscount = Math.max(
    0,
    Math.min(Math.round(discount || 0), total),
  );
  if (!safeAmounts.length || targetDiscount <= 0 || total <= 0) {
    return safeAmounts.map(() => 0);
  }

  const distributed = safeAmounts.map((amount) =>
    Math.floor((targetDiscount * amount) / total),
  );
  let remaining =
    targetDiscount - distributed.reduce((sum, value) => sum + value, 0);

  const order = safeAmounts
    .map((amount, idx) => ({ idx, amount }))
    .sort((a, b) => b.amount - a.amount);

  let pointer = 0;
  while (remaining > 0 && order.length > 0) {
    const i = order[pointer % order.length].idx;
    if (distributed[i] < safeAmounts[i]) {
      distributed[i] += 1;
      remaining -= 1;
    }
    pointer += 1;
  }
  return distributed;
}

export default function QuickBookModal({
  device,
  devices = [],
  modelGroupDevices = [],
  isOpen,
  onClose,
  initialPrefs,
  pricing,
}) {
  const hasInitialPrefs = !!initialPrefs;
  const baseDevicesForProps = useMemo(
    () => (devices?.length ? devices : device ? [device] : []),
    [devices, device],
  );
  const canPickSameModelQuantity =
    modelGroupDevices.length > 1 && baseDevicesForProps.length === 1;
  const isTrueMultiModelSelection = baseDevicesForProps.length > 1;

  const [sameModelQuantity, setSameModelQuantity] = useState(1);
  const [bookingRowsForModel, setBookingRowsForModel] = useState([]);

  useEffect(() => {
    if (!isOpen) {
      setSameModelQuantity(1);
      setBookingRowsForModel([]);
    }
  }, [isOpen]);

  const effectiveDevices = useMemo(() => {
    if (!canPickSameModelQuantity) return baseDevicesForProps;
    const rep = baseDevicesForProps[0];
    if (!bookingRowsForModel.length) return [rep];
    const isBusy = (d) =>
      Array.isArray(d?.bookingDtos) && d.bookingDtos.length > 0;
    const free = bookingRowsForModel.filter((d) => !isBusy(d));
    const picked = free.slice(0, sameModelQuantity);
    if (picked.length >= sameModelQuantity && sameModelQuantity > 0) {
      return picked;
    }
    return [rep];
  }, [
    canPickSameModelQuantity,
    baseDevicesForProps,
    bookingRowsForModel,
    sameModelQuantity,
  ]);

  const sameModelFreeCount = useMemo(() => {
    if (!bookingRowsForModel.length) return null;
    const isBusy = (d) =>
      Array.isArray(d?.bookingDtos) && d.bookingDtos.length > 0;
    return bookingRowsForModel.filter((d) => !isBusy(d)).length;
  }, [bookingRowsForModel]);

  const sameModelAvailabilityReady =
    !canPickSameModelQuantity || bookingRowsForModel.length > 0;

  const sameModelMaxPick = sameModelFreeCount ?? modelGroupDevices.length;

  useEffect(() => {
    if (!canPickSameModelQuantity || sameModelFreeCount == null) return;
    if (sameModelQuantity > sameModelFreeCount) {
      setSameModelQuantity(Math.max(1, sameModelFreeCount));
    }
  }, [canPickSameModelQuantity, sameModelFreeCount, sameModelQuantity]);

  const isMulti = effectiveDevices.length > 1;

  const strictestDeviceRelease = useMemo(
    () => getStrictestReleaseDate(effectiveDevices),
    [effectiveDevices],
  );
  const strictestReleaseMs = strictestDeviceRelease?.getTime() ?? null;

  useEffect(() => {
    if (!isOpen) return;
    const today = normalizeDate(new Date());
    const release =
      strictestReleaseMs != null
        ? normalizeDate(new Date(strictestReleaseMs))
        : null;
    const minP =
      release && release.getTime() > today.getTime() ? release : today;
    setSelectedDate((prev) => {
      const nextD = !prev || prev < minP ? minP : prev;
      setEndDateState((prevEnd) => {
        if (!prevEnd || prevEnd <= nextD) return addDays(nextD, 1);
        const minEnd = addDays(nextD, 1);
        return prevEnd < minEnd ? minEnd : prevEnd;
      });
      return nextD;
    });
  }, [isOpen, strictestReleaseMs]);

  const paymentDeviceKey = useMemo(
    () => effectiveDevices.map((d) => String(d.id)).sort().join(","),
    [effectiveDevices],
  );

  useEffect(() => {
    cccdConfirmedRef.current = false;
    setAgreeCccdPerDevice(false);
  }, [paymentDeviceKey]);

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
  const [customer, setCustomer] = useState(() => {
    const saved = loadCustomerInfo();
    return {
      fullName: saved?.fullName || "",
      phone: normalizeValidPhoneOrEmpty(saved?.phone),
      gmail: saved?.gmail || "",
      ig: saved?.ig || saved?.fb || "",
    };
  });
  const [socialPlatform, setSocialPlatform] = useState(() => {
    const saved = loadCustomerInfo();
    const link = (saved?.ig || saved?.fb || "").trim();
    const detected = detectSocialPlatformFromLink(link);
    if (detected) return detected;
    const hasFb = !!(saved?.fb || "").trim();
    const hasIg = !!(saved?.ig || "").trim();
    if (hasFb && !hasIg) return "facebook";
    return "instagram";
  });
  const [checkoutMode, setCheckoutMode] = useState("GOOGLE");
  const [hasGoogleSession, setHasGoogleSession] = useState(
    () => !!loadCustomerSession()?.token,
  );
  const [memberBookingsCount, setMemberBookingsCount] = useState(0);
  const [memberTotalSpent, setMemberTotalSpent] = useState(0);
  const [memberPoint, setMemberPoint] = useState(0);
  const [pointToUse, setPointToUse] = useState(0);
  const [isMemberDataLoading, setIsMemberDataLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [agreeNoResellOrPawn, setAgreeNoResellOrPawn] = useState(false);
  const [agreeConfirmPickupReturnTime, setAgreeConfirmPickupReturnTime] =
    useState(false);
  const [agreeCccdPerDevice, setAgreeCccdPerDevice] = useState(false);
  const [agreementErrors, setAgreementErrors] = useState({
    noResellOrPawn: false,
    confirmPickupReturnTime: false,
    cccdPerDevice: false,
  });
  const agreementSectionRef = useRef(null);
  const cccdConfirmedRef = useRef(false);
  const faoStandardContractUrl = useMemo(
    () => getFaoStandardRentalContractUrl(),
    [],
  );
  /** Tránh reset step khi parent re-render: initialPrefs là object mới mỗi lần render. */
  const quickBookWasOpenRef = useRef(false);
  const [showCccdConfirmDialog, setShowCccdConfirmDialog] = useState(false);
  // showGuestCheckout removed — both options always visible now

  // Chỉ áp initial prefs / reset form khi vừa mở modal (không chạy lại trong lúc đang mở)
  useLayoutEffect(() => {
    if (!isOpen) {
      quickBookWasOpenRef.current = false;
      setShowCccdConfirmDialog(false);
      cccdConfirmedRef.current = false;
      return;
    }

    const alreadyOpen = quickBookWasOpenRef.current;
    quickBookWasOpenRef.current = true;
    if (alreadyOpen) {
      return;
    }

    setError("");
    setCheckoutMode("GOOGLE");
    setPointToUse(0);
    setAgreeNoResellOrPawn(false);
    setAgreeConfirmPickupReturnTime(false);
    setAgreeCccdPerDevice(false);
    setAgreementErrors({
      noResellOrPawn: false,
      confirmPickupReturnTime: false,
      cccdPerDevice: false,
    });
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
  const rentalInfoPerDevice = useMemo(() => {
    if (!t1 || !t2) return [];
    return effectiveDevices.map((d) => {
      const info = calculateRentalInfo([t1, t2], d);
      return {
        device: d,
        ...info,
        price: roundDownToThousand(info.price || 0),
      };
    });
  }, [effectiveDevices, t1, t2]);

  const rentalInfo = rentalInfoPerDevice[0] || { price: 0, chargeableDays: 0 };
  const price = rentalInfoPerDevice.reduce(
    (sum, r) => sum + (r?.price || 0),
    0,
  );
  const chargeableDays = rentalInfo.chargeableDays;

  const discountedTotal = useMemo(() => {
    if (isMulti) {
      return rentalInfoPerDevice.reduce((sum, r) => {
        const p = r?.price || 0;
        return sum + computeDiscountedPrice(p, t1, t2);
      }, 0);
    }
    if (hasInitialPrefs && pricing?.discounted != null)
      return pricing.discounted;
    return computeDiscountedPrice(price, t1, t2);
  }, [
    isMulti,
    hasInitialPrefs,
    pricing?.discounted,
    price,
    t1,
    t2,
    rentalInfoPerDevice,
  ]);

  // Chi tiết công thức giá để hiển thị ở bước XÁC NHẬN
  const priceBreakdown = useMemo(() => {
    const primaryDevice = effectiveDevices[0];
    const oneDayPrice = primaryDevice?.priceOneDay || 0;
    const days = chargeableDays >= 1 ? chargeableDays : chargeableDays || 0.5;
    const daysForRetail = days >= 1 ? days : 1;
    const retailPrice = isMulti
      ? rentalInfoPerDevice.reduce(
          (s, r) =>
            s + Math.round((r?.device?.priceOneDay || 0) * daysForRetail),
          0,
        )
      : Math.round(oneDayPrice * daysForRetail);
    const packagePrice = price;
    const savingVsRetail = Math.max(0, retailPrice - packagePrice);

    let base = null;
    if (
      !isMulti &&
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
    isMulti,
    hasInitialPrefs,
    pricing?.original,
    pricing?.discounted,
    price,
    t1,
    t2,
    effectiveDevices,
    rentalInfoPerDevice,
    chargeableDays,
  ]);

  const durationDays = chargeableDays;

  const timeSelectionError = useMemo(() => {
    return getAvailabilityRangeError(prefsForRange, t1, t2);
  }, [prefsForRange, t1, t2]);

  const step1AvailabilityMessage = useMemo(() => {
    if (timeSelectionError) return "";
    if (isAvailable) return "";
    if (
      canPickSameModelQuantity &&
      sameModelFreeCount != null &&
      sameModelQuantity > sameModelFreeCount
    ) {
      return `⚠️ Chỉ còn ${sameModelFreeCount} máy trống cho mẫu này. Giảm số lượng hoặc đổi khung giờ.`;
    }
    return "⚠️ Máy đã được đặt trong khung giờ này. Vui lòng chọn ngày khác.";
  }, [
    timeSelectionError,
    isAvailable,
    canPickSameModelQuantity,
    sameModelFreeCount,
    sameModelQuantity,
  ]);

  // Check availability
  const checkAvailability = useCallback(async () => {
    if (baseDevicesForProps.length === 0 || !t1 || !t2 || timeSelectionError)
      return;
    setIsCheckingAvailability(true);
    try {
      const filterRowBySlot = (row) => ({
        ...row,
        bookingDtos: filterBookingsOverlappingSlot(
          Array.isArray(row?.bookingDtos) ? row.bookingDtos : [],
          t1,
          t2,
        ),
      });
      if (canPickSameModelQuantity) {
        const rep = baseDevicesForProps[0];
        const fromStr = formatLocalDateTimeForDeviceApi(t1);
        const lookupTo =
          selectedDuration === "ONE_DAY" ? addDays(t2, 1) : t2;
        const toStr = formatLocalDateTimeForDeviceApi(lookupTo);
        if (!fromStr || !toStr) return;
        const resp = await api.get("v1/devices/booking", {
          params: {
            startDate: fromStr.slice(0, 10),
            endDate: toStr.slice(0, 10),
            branchId: selectedBranch,
          },
        });
        const data = (resp.data || []).map(filterRowBySlot);
        const selectedModelIdentity = getModelIdentity(rep);
        const isBusy = (d) =>
          Array.isArray(d?.bookingDtos) && d.bookingDtos.length > 0;
        const sameFromApi = sortDevicesSameModelPick(
          data.filter((d) => getModelIdentity(d) === selectedModelIdentity),
        );
        let merged = sameFromApi.map((apiRow) => {
          const full = modelGroupDevices.find(
            (m) => String(m.id) === String(apiRow.id),
          );
          return {
            ...(full || {}),
            ...apiRow,
            modelKey: rep.modelKey ?? full?.modelKey ?? apiRow.modelKey,
            bookingDtos: Array.isArray(apiRow.bookingDtos)
              ? apiRow.bookingDtos
              : [],
          };
        });
        if (!merged.length && modelGroupDevices.length) {
          merged = modelGroupDevices.map((row) => ({ ...row }));
        }
        setBookingRowsForModel(merged);
        const freeCount = merged.filter((d) => !isBusy(d)).length;
        setIsAvailable(
          freeCount >= sameModelQuantity && sameModelQuantity >= 1,
        );
        return;
      }

      if (isTrueMultiModelSelection) {
        const fromStr = formatLocalDateTimeForDeviceApi(t1);
        const lookupTo =
          selectedDuration === "ONE_DAY" ? addDays(t2, 1) : t2;
        const toStr = formatLocalDateTimeForDeviceApi(lookupTo);
        if (!fromStr || !toStr) return;
        const resp = await api.get("v1/devices/booking", {
          params: {
            startDate: fromStr.slice(0, 10),
            endDate: toStr.slice(0, 10),
            branchId: selectedBranch,
          },
        });
        const data = (resp.data || []).map(filterRowBySlot);
        const isBusy = (d) =>
          Array.isArray(d?.bookingDtos) && d.bookingDtos.length > 0;
        const allAvailable = baseDevicesForProps.every((dev) => {
          const row = data.find((r) => String(r.id) === String(dev.id));
          if (!row) return false;
          return !isBusy(row);
        });
        setIsAvailable(allAvailable);
        return;
      }

      const device = baseDevicesForProps[0];
      const fromStr = formatLocalDateTimeForDeviceApi(t1);
      const lookupTo =
        selectedDuration === "ONE_DAY" ? addDays(t2, 1) : t2;
      const toStr = formatLocalDateTimeForDeviceApi(lookupTo);
      if (!fromStr || !toStr) return;
      const resp = await api.get("v1/devices/booking", {
        params: {
          startDate: fromStr.slice(0, 10),
          endDate: toStr.slice(0, 10),
          branchId: selectedBranch,
        },
      });
      const data = (resp.data || []).map(filterRowBySlot);
      const selectedModelIdentity = getModelIdentity(device);
      const isBusy = (d) =>
        Array.isArray(d?.bookingDtos) && d.bookingDtos.length > 0;
      const sameModelDevices = data.filter(
        (d) => getModelIdentity(d) === selectedModelIdentity,
      );
      const soldOut =
        sameModelDevices.length > 0
          ? sameModelDevices.every(isBusy)
          : data.some((d) => d.id === device.id && isBusy(d));
      setIsAvailable(!soldOut);
    } catch (err) {
      console.error("Availability check failed:", err);
      if (canPickSameModelQuantity && modelGroupDevices.length) {
        setBookingRowsForModel(modelGroupDevices.map((r) => ({ ...r })));
        const isBusy = (d) =>
          Array.isArray(d?.bookingDtos) && d.bookingDtos.length > 0;
        const freeCount = modelGroupDevices.filter((d) => !isBusy(d)).length;
        setIsAvailable(freeCount >= sameModelQuantity);
      } else {
        setIsAvailable(true);
      }
    } finally {
      setIsCheckingAvailability(false);
    }
  }, [
    baseDevicesForProps,
    canPickSameModelQuantity,
    isTrueMultiModelSelection,
    modelGroupDevices,
    sameModelQuantity,
    t1,
    t2,
    selectedBranch,
    selectedDuration,
    timeSelectionError,
  ]);

  useEffect(() => {
    if (isOpen && baseDevicesForProps.length > 0) {
      checkAvailability();
    }
  }, [
    isOpen,
    baseDevicesForProps,
    sameModelQuantity,
    selectedDate,
    selectedDuration,
    selectedBranch,
    checkAvailability,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    const session = loadCustomerSession();
    if (!session?.token) {
      setHasGoogleSession(false);
      setMemberBookingsCount(0);
      setMemberTotalSpent(0);
      setMemberPoint(0);
      setIsMemberDataLoading(false);
      return;
    }
    let mounted = true;
    setIsMemberDataLoading(true);
    Promise.all([api.get("/account"), api.get("/v1/bookings/me")])
      .then(([accountRes, bookingsRes]) => {
        if (!mounted) return;
        const account = accountRes?.data || {};
        const saved = loadCustomerInfo() || {};
        const bookings = Array.isArray(bookingsRes?.data)
          ? bookingsRes.data
          : [];
        setCheckoutMode("GOOGLE");
        setHasGoogleSession(true);
        setMemberBookingsCount(bookings.length);
        setMemberTotalSpent(computeTotalSpentFromBookings(bookings));
        setMemberPoint(Math.max(0, Number(account.point) || 0));
        const nextCustomer = {
          fullName: account.fullName || saved.fullName || "",
          phone:
            normalizeValidPhoneOrEmpty(account.phone) ||
            normalizeValidPhoneOrEmpty(saved.phone) ||
            "",
          gmail: account.email || saved.gmail || "",
          ig: account.ig || account.fb || saved.ig || saved.fb || "",
        };
        setCustomer((c) => ({ ...c, ...nextCustomer }));
        saveCustomerInfo(nextCustomer);
      })
      .catch(() => {
        clearCustomerSession();
        setHasGoogleSession(false);
        setMemberBookingsCount(0);
        setMemberTotalSpent(0);
        setMemberPoint(0);
      })
      .finally(() => {
        if (mounted) setIsMemberDataLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [isOpen]);

  // Refresh voucher eligibility when user reaches step 2/3
  useEffect(() => {
    if (!isOpen || !hasGoogleSession || (step !== 2 && step !== 3)) return;
    let mounted = true;
    setIsMemberDataLoading(true);
    Promise.all([api.get("/account"), api.get("/v1/bookings/me")])
      .then(([accountRes, bookingsRes]) => {
        if (!mounted) return;
        const account = accountRes?.data || {};
        const bookings = Array.isArray(bookingsRes?.data)
          ? bookingsRes.data
          : [];
        setMemberBookingsCount(bookings.length);
        setMemberTotalSpent(computeTotalSpentFromBookings(bookings));
        setMemberPoint(Math.max(0, Number(account.point) || 0));
      })
      .catch(() => {
        if (!mounted) return;
        setIsMemberDataLoading(false);
      })
      .finally(() => {
        if (mounted) setIsMemberDataLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, hasGoogleSession, step]);

  useEffect(() => {
    if (hasGoogleSession && checkoutMode !== "GOOGLE") {
      setCheckoutMode("GOOGLE");
    }
  }, [hasGoogleSession, checkoutMode]);

  useLayoutEffect(() => {
    const detected = detectSocialPlatformFromLink(customer.ig);
    if (detected) setSocialPlatform(detected);
  }, [customer.ig]);

  // Validate customer info
  const socialLinkError = useMemo(() => {
    const raw = (customer.ig || "").trim();
    if (!raw) return "Vui lòng nhập link.";
    if (!isUrlForPlatform(raw, socialPlatform)) {
      return socialPlatform === "instagram"
        ? "Link phải là URL Instagram hợp lệ (https://instagram.com/...)."
        : "Link phải là URL Facebook hợp lệ (https://facebook.com/...).";
    }
    return "";
  }, [customer.ig, socialPlatform]);
  const fullNameError = useMemo(() => {
    return customer.fullName?.trim().length >= 2
      ? ""
      : "Họ tên cần ít nhất 2 ký tự.";
  }, [customer.fullName]);
  const phoneError = useMemo(() => {
    const normalized = normalizePhone(customer.phone);
    return /^0\d{9}$/.test(normalized)
      ? ""
      : "SĐT cần đúng 10 số và bắt đầu bằng 0.";
  }, [customer.phone]);
  const gmailError = useMemo(() => {
    if (checkoutMode !== "GOOGLE") return "";
    if (!hasGoogleSession) return "Vui lòng đăng nhập Google để tiếp tục.";
    return isValidEmail(customer.gmail)
      ? ""
      : "Vui lòng nhập email hợp lệ.";
  }, [checkoutMode, customer.gmail, hasGoogleSession]);
  const isCustomerValid = useMemo(() => {
    return (
      !fullNameError &&
      !phoneError &&
      !gmailError &&
      !socialLinkError
    );
  }, [fullNameError, phoneError, gmailError, socialLinkError]);
  const isFirstOrderPromoEligible = useMemo(() => {
    return (
      checkoutMode === "GOOGLE" &&
      hasGoogleSession &&
      !isMemberDataLoading &&
      memberBookingsCount === 0
    );
  }, [
    checkoutMode,
    hasGoogleSession,
    isMemberDataLoading,
    memberBookingsCount,
  ]);
  const firstOrderDiscount = useMemo(() => {
    if (!isFirstOrderPromoEligible) return 0;
    return Math.min(
      Math.round((price || 0) * FIRST_ORDER_DISCOUNT_RATE),
      FIRST_ORDER_DISCOUNT_CAP,
    );
  }, [isFirstOrderPromoEligible, price]);
  const firstOrderPreviewDiscount = useMemo(
    () =>
      Math.min(
        Math.round((price || 0) * FIRST_ORDER_DISCOUNT_RATE),
        FIRST_ORDER_DISCOUNT_CAP,
      ),
    [price],
  );
  const basePromotionDiscount = useMemo(
    () => Math.max(0, Math.round((price || 0) - (discountedTotal || 0))),
    [price, discountedTotal],
  );
  const isFirstOrderVoucherSelected = useMemo(
    () => firstOrderDiscount > basePromotionDiscount,
    [firstOrderDiscount, basePromotionDiscount],
  );
  const firstOrderAdditionalDiscount = useMemo(
    () =>
      isFirstOrderVoucherSelected
        ? Math.max(0, firstOrderDiscount - basePromotionDiscount)
        : 0,
    [isFirstOrderVoucherSelected, firstOrderDiscount, basePromotionDiscount],
  );
  const payableBeforePoint = useMemo(() => {
    const totalAfterSingleDiscount = isFirstOrderVoucherSelected
      ? (price || 0) - firstOrderDiscount
      : (price || 0) - basePromotionDiscount;
    return Math.max(0, Math.round(totalAfterSingleDiscount));
  }, [
    isFirstOrderVoucherSelected,
    price,
    firstOrderDiscount,
    basePromotionDiscount,
  ]);
  const maxPointToUse = useMemo(() => {
    if (!hasGoogleSession) return 0;
    return Math.max(
      0,
      Math.min(Math.floor(payableBeforePoint / 1000), Math.floor(memberPoint)),
    );
  }, [hasGoogleSession, payableBeforePoint, memberPoint]);
  const suggestedHalfPoints = useMemo(
    () =>
      Math.max(
        0,
        Math.floor(Math.min(maxPointToUse, memberPoint * 0.5)),
      ),
    [maxPointToUse, memberPoint],
  );
  useEffect(() => {
    setPointToUse((prev) => Math.max(0, Math.min(prev, maxPointToUse)));
  }, [maxPointToUse]);
  const pointDiscountAmount = useMemo(
    () => Math.max(0, Math.min(pointToUse, maxPointToUse)) * 1000,
    [pointToUse, maxPointToUse],
  );
  const payableTotal = useMemo(
    () => Math.max(0, payableBeforePoint - pointDiscountAmount),
    [payableBeforePoint, pointDiscountAmount],
  );
  const earnedPointPreview = useMemo(() => {
    const tierKey = hasGoogleSession
      ? memberTierKeyFromTotalSpent(memberTotalSpent)
      : "member";
    return computeEarnedPoints(payableTotal, tierKey);
  }, [payableTotal, hasGoogleSession, memberTotalSpent]);
  const earnedPointRulePreview = useMemo(() => {
    if (!hasGoogleSession) return "50.000đ = 3 điểm";
    const n = pointsPerEarnBlock(
      memberTierKeyFromTotalSpent(memberTotalSpent),
    );
    return `50.000đ = ${n} điểm theo hạng`;
  }, [hasGoogleSession, memberTotalSpent]);
  const discountedLabel = formatPriceK(payableTotal);
  const selectedDiscountAmount = isFirstOrderVoucherSelected
    ? firstOrderDiscount
    : basePromotionDiscount;
  const selectedDiscountLabel =
    isFirstOrderVoucherSelected && selectedDiscountAmount > 0
      ? "Voucher đơn đầu -30% (tối đa 200k)"
      : priceBreakdown?.discountLabel || "Khuyến mãi";
  const isLoggedInUser = hasGoogleSession;
  const shouldShowContactForm =
    checkoutMode === "GUEST" || (checkoutMode === "GOOGLE" && hasGoogleSession);
  const savedCustomer = useMemo(() => loadCustomerInfo(), []);
  const canUseSavedCustomer = useMemo(() => {
    const phone = normalizePhone(savedCustomer?.phone || "");
    return (
      !!savedCustomer?.fullName &&
      /^0\d{9}$/.test(phone) &&
      isValidEmail(savedCustomer?.gmail || "") &&
      isSavedSocialValid(savedCustomer)
    );
  }, [savedCustomer]);

  // Submit booking
  const handleSubmit = async () => {
    if (effectiveDevices.length === 0 || !t1 || !t2 || !isCustomerValid) return;

    const nextAgreementErrors = {
      noResellOrPawn: !agreeNoResellOrPawn,
      confirmPickupReturnTime: !agreeConfirmPickupReturnTime,
      cccdPerDevice:
        effectiveDevices.length >= 2 && !agreeCccdPerDevice,
    };
    if (
      nextAgreementErrors.noResellOrPawn ||
      nextAgreementErrors.confirmPickupReturnTime ||
      nextAgreementErrors.cccdPerDevice
    ) {
      setAgreementErrors(nextAgreementErrors);
      setError("Vui lòng xác nhận đủ các cam kết trước khi thanh toán.");
      window.requestAnimationFrame(() => {
        agreementSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
      return;
    }

    setAgreementErrors({
      noResellOrPawn: false,
      confirmPickupReturnTime: false,
      cccdPerDevice: false,
    });

    if (effectiveDevices.length > 2 && !cccdConfirmedRef.current) {
      setShowCccdConfirmDialog(true);
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const socialLink = (customer.ig || "").trim();
      const normalizedCustomer = {
        fullName: (customer.fullName || "").trim(),
        phone: normalizePhone(customer.phone),
        gmail: (customer.gmail || "").trim(),
        ig: socialPlatform === "instagram" ? socialLink : "",
        fb: socialPlatform === "facebook" ? socialLink : "",
      };
      saveCustomerInfo(normalizedCustomer);

      const phone = normalizedCustomer.phone;
      let customerId = null;
      if (checkoutMode === "GOOGLE") {
        const me = await api.get("/account");
        const currentAccountId = me?.data?.id;
        if (!currentAccountId) {
          throw new Error("Không lấy được tài khoản Google hiện tại");
        }
        try {
          await api.put("/customer/profile", {
            fullName: normalizedCustomer.fullName,
            phone,
            email: normalizedCustomer.gmail || me?.data?.email,
            ig: normalizedCustomer.ig || null,
            fb: normalizedCustomer.fb || null,
          });
        } catch (profileErr) {
          // Profile sync is best-effort; do not block payment flow.
          console.warn(
            "Không thể cập nhật hồ sơ customer, tiếp tục thanh toán.",
            profileErr,
          );
        }
        customerId = currentAccountId;
      } else {
        customerId = await resolveGuestCustomerId({
          ...normalizedCustomer,
          phone,
        });
      }
      if (!customerId) throw new Error("Không lấy được customerId");

      const branchLabel =
        BRANCHES.find((b) => b.id === selectedBranch)?.label || selectedBranch;
      const fmt = (d) => formatDateForAPIPayload(d);
      const note =
        `${normalizedCustomer.fullName} ${phone} ${branchLabel}`.slice(0, 80);

      const noteVoucherForRequests = buildQuickBookNoteVoucher({
        isFirstOrderVoucherSelected,
        price,
        t1,
        t2,
        pointToUse,
      });

      if (isMulti) {
        const perDeviceAmounts = rentalInfoPerDevice.map((r) =>
          Math.round(computeDiscountedPrice(r?.price || 0, t1, t2)),
        );
        const distributedVoucher = isFirstOrderVoucherSelected
          ? allocateDiscountByRatio(
              perDeviceAmounts,
              firstOrderAdditionalDiscount,
            )
          : perDeviceAmounts.map(() => 0);
        const perDeviceAfterVoucher = perDeviceAmounts.map((baseAmount, idx) =>
          Math.max(0, baseAmount - (distributedVoucher[idx] || 0)),
        );
        const distributedPointDiscount =
          pointDiscountAmount > 0
            ? allocateDiscountByRatio(
                perDeviceAfterVoucher,
                pointDiscountAmount,
              )
            : perDeviceAfterVoucher.map(() => 0);
        const bookingRequests = rentalInfoPerDevice.map((r, idx) => {
          const dev = r.device;
          const devPrice = Math.round(r?.price || 0);
          const baseDiscounted = Math.round(
            computeDiscountedPrice(devPrice, t1, t2),
          );
          const voucherDiscount = distributedVoucher[idx] || 0;
          const pointDiscount = distributedPointDiscount[idx] || 0;
          const finalAmount = Math.max(
            0,
            baseDiscounted - voucherDiscount - pointDiscount,
          );
          return {
            customerId,
            deviceId: dev.id,
            bookingFrom: fmt(t1),
            bookingTo: fmt(t2),
            total: finalAmount,
            note,
            dayOfRent: chargeableDays,
            originalPrice: devPrice,
            noteVoucher: noteVoucherForRequests,
            usedPoint: pointToUse,
            ...(selectedBranch === "Q9" ? { location: "Thủ Đức" } : {}),
          };
        });

        const payload = {
          amount: payableTotal,
          description: `Thue ${effectiveDevices.length} may`,
          bookingRequests,
          returnSuccessUrl: `${window.location.origin}/payment-status`,
          returnFailUrl: `${window.location.origin}/payment-status`,
        };

        const response = await api.post("/create-payment-link", payload);
        const orderCode = getOrderCodeFromPaymentResponse(response.data);
        if (orderCode) {
          saveRecentOrder({ orderCode });
        }
        const paymentUrl =
          response.data?.deepLink || response.data?.checkoutUrl;
        if (paymentUrl) {
          window.location.href = paymentUrl;
        } else {
          throw new Error("Không nhận được link thanh toán");
        }
      } else {
        const dev = effectiveDevices[0];
        const bookingRequest = {
          customerId,
          deviceId: dev.id,
          bookingFrom: fmt(t1),
          bookingTo: fmt(t2),
          total: payableTotal,
          note,
          dayOfRent: chargeableDays,
          originalPrice: price,
          noteVoucher: noteVoucherForRequests,
          usedPoint: pointToUse,
          ...(selectedBranch === "Q9" ? { location: "Thủ Đức" } : {}),
        };

        const payload = {
          amount: payableTotal,
          description: `Thue ${(dev.name || dev.displayName || "").slice(0, 15)}`,
          bookingRequest,
          returnSuccessUrl: `${window.location.origin}/payment-status`,
          returnFailUrl: `${window.location.origin}/payment-status`,
        };

        const response = await api.post("/create-payment-link", payload);
        const orderCode = getOrderCodeFromPaymentResponse(response.data);
        if (orderCode) {
          saveRecentOrder({ orderCode });
        }
        const paymentUrl =
          response.data?.deepLink || response.data?.checkoutUrl;
        if (paymentUrl) {
          window.location.href = paymentUrl;
        } else {
          throw new Error("Không nhận được link thanh toán");
        }
      }
    } catch (err) {
      console.error("Quick book failed:", err);
      setError(extractApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setIsMemberDataLoading(true);
    setError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const googleUser = result.user;
      const res = await api.post("/login-gg", {
        email: googleUser?.email,
        name: googleUser?.displayName,
        avatar: googleUser?.photoURL,
      });
      const data = res?.data || {};
      if (!data?.token) throw new Error("Đăng nhập Google thất bại");
      saveCustomerSession({ token: data.token });
      setCheckoutMode("GOOGLE");
      setHasGoogleSession(true);
      const [accountRes, bookingsRes] = await Promise.all([
        api.get("/account"),
        api.get("/v1/bookings/me"),
      ]);
      const account = accountRes?.data || {};
      const bookings = Array.isArray(bookingsRes?.data) ? bookingsRes.data : [];
      setMemberBookingsCount(bookings.length);
      setMemberPoint(Math.max(0, Number(account.point) || 0));
      setCustomer((c) => ({
        ...c,
        fullName: account.fullName || data.fullName || c.fullName,
        phone: normalizeValidPhoneOrEmpty(account.phone) || c.phone,
        gmail: account.email || data.email || c.gmail,
        ig: account.ig || account.fb || c.ig,
      }));
    } catch (err) {
      setError(
        resolveGoogleSignInError(err, "Không thể đăng nhập Google"),
      );
    } finally {
      setIsGoogleLoading(false);
      setIsMemberDataLoading(false);
    }
  };

  if (!isOpen || effectiveDevices.length === 0) return null;

  const handleCccdDialogConfirm = () => {
    cccdConfirmedRef.current = true;
    setShowCccdConfirmDialog(false);
    void handleSubmit();
  };

  return (
    <>
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[120] flex items-end sm:items-center justify-center p-3 sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#FFFBF5] w-full max-w-md md:max-w-2xl rounded-3xl max-h-[94dvh] sm:max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 sm:p-4 border-b border-[#FFE4F0]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full border-2 border-white shadow-lg overflow-hidden bg-white shrink-0">
                <img
                  src={
                    effectiveDevices[0]?.img || effectiveDevices[0]?.images?.[0]
                  }
                  alt={
                    effectiveDevices[0]?.displayName ||
                    effectiveDevices[0]?.name
                  }
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="font-black text-[#222] text-sm line-clamp-1 uppercase">
                  {isMulti
                    ? `${effectiveDevices.length} máy`
                    : effectiveDevices[0]?.displayName ||
                      effectiveDevices[0]?.name}
                </div>
                <div className="text-xs font-bold text-[#E85C9C]">
                  {discountedLabel}{" "}
                  <span className="text-[#999] font-normal uppercase text-[10px] ml-1">
                    ({durationDays < 1 ? "Gói 6h" : `${durationDays} ngày`})
                  </span>
                </div>
                {t1 && t2 && (
                  <div className="text-[10px] text-[#888] font-bold mt-0.5 uppercase tracking-wide">
                    {format(t1, "dd/MM", { locale: vi })} {formatTimeVi(t1)} —{" "}
                    {format(t2, "dd/MM", { locale: vi })} {formatTimeVi(t2)}
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
          <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-5">
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
                  minPickupDate={strictestDeviceRelease}
                  error={timeSelectionError || step1AvailabilityMessage}
                />

                {canPickSameModelQuantity && (
                  <div className="mt-3 rounded-xl border border-[#FAD6E8] bg-[#FFF8FB] p-3 sm:p-3.5">
                    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#C94B86] mb-2">
                      Số lượng (cùng mẫu máy)
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={sameModelQuantity <= 1 || isCheckingAvailability}
                          onClick={() =>
                            setSameModelQuantity((q) => Math.max(1, q - 1))
                          }
                          className="w-10 h-10 rounded-lg border-2 border-[#222] text-[#222] font-black text-lg leading-none hover:bg-[#222]/5 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          −
                        </button>
                        <span className="min-w-[2rem] text-center text-lg font-black text-[#222]">
                          {sameModelQuantity}
                        </span>
                        <span
                          className="inline-flex rounded-lg"
                          title={
                            isCheckingAvailability
                              ? "Đang kiểm tra số máy còn trống..."
                              : sameModelQuantity >= sameModelMaxPick
                                ? "Không đủ số lượng máy để thêm"
                                : undefined
                          }
                        >
                          <button
                            type="button"
                            disabled={
                              sameModelQuantity >= sameModelMaxPick ||
                              isCheckingAvailability
                            }
                            onClick={() =>
                              setSameModelQuantity((q) =>
                                Math.min(sameModelMaxPick, q + 1),
                              )
                            }
                            className={`w-10 h-10 rounded-lg border-2 border-[#222] text-[#222] font-black text-lg leading-none hover:bg-[#222]/5 disabled:opacity-40 disabled:cursor-not-allowed ${
                              sameModelQuantity >= sameModelMaxPick ||
                              isCheckingAvailability
                                ? "pointer-events-none"
                                : ""
                            }`}
                            aria-label={
                              isCheckingAvailability
                                ? "Đang kiểm tra số máy còn trống"
                                : sameModelQuantity >= sameModelMaxPick
                                  ? "Không đủ số lượng máy để thêm"
                                  : "Tăng số lượng"
                            }
                          >
                            +
                          </button>
                        </span>
                      </div>
                      <p className="text-xs font-medium text-[#555] max-w-[14rem] sm:max-w-none sm:text-right">
                        {sameModelFreeCount != null
                          ? `Còn ${sameModelFreeCount} máy trống trong khung giờ này.`
                          : "Đang kiểm tra số máy còn trống..."}
                      </p>
                    </div>
                  </div>
                )}

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
              <div className="space-y-3 sm:space-y-4">
                {isLoggedInUser ? (
                  <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-emerald-50/50 p-3 sm:p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                      Tài khoản đã đăng nhập
                    </div>
                    <div className="mt-1 text-base font-black text-[#222]">
                      Đặt đơn bằng tài khoản của bạn
                    </div>
                    <div className="mt-1 text-xs text-[#5f7c6f] font-medium">
                      Thông tin đã được điền tự động. Bạn có thể chỉnh sửa và hệ
                      thống sẽ cập nhật khi tạo đơn.
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[#FFD7EA] bg-gradient-to-r from-[#FFF7FB] via-white to-[#FFFDFE] p-3 sm:p-4">
                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#E85C9C]">
                      Chọn hình thức đặt
                    </div>
                    <div className="mt-1 text-base font-black text-[#222]">
                      Chọn cách đặt phù hợp
                    </div>
                    <div className="mt-1 text-xs text-[#8a6a79] font-medium">
                      Mỗi hình thức có mức giảm khác nhau, xem trực tiếp trên
                      từng tab
                    </div>
                  </div>
                )}

                {/* 2 big tabs */}
                {!isLoggedInUser && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setCheckoutMode("GOOGLE")}
                      className={`rounded-2xl border-2 px-3 py-3 sm:px-4 sm:py-4 text-left transition-all ${
                        checkoutMode === "GOOGLE"
                          ? "border-[#E85C9C] bg-gradient-to-br from-[#2B1D26] to-[#1D1D1F] shadow-[0_10px_28px_rgba(232,92,156,0.22)]"
                          : "border-[#eee] bg-white hover:border-[#FF9FCA] hover:shadow-[0_8px_20px_rgba(255,159,202,0.14)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                            checkoutMode === "GOOGLE"
                              ? "bg-[#FF9FCA]/20 text-[#FFD9EA]"
                              : "bg-[#FFF0F7] text-[#E85C9C]"
                          }`}
                        >
                          Google
                        </span>

                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          <span
                            className={`rounded-full px-3 py-1.5 text-[11px] sm:text-xs font-black ring-2 ${
                              checkoutMode === "GOOGLE"
                                ? "bg-gradient-to-r from-[#FF77B8] to-[#FFB6D9] text-[#1f1f1f] ring-[#FFD3E8]"
                                : "bg-[#FFEAF4] text-[#C93B82] ring-[#FFD7EA]"
                            }`}
                          >
                            Giảm ngay
                            <span className="ml-1 text-sm sm:text-base font-extrabold">
                              {formatPriceK(firstOrderPreviewDiscount)}
                            </span>
                          </span>
                          <div
                            className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                              checkoutMode === "GOOGLE"
                                ? "border-[#FF9FCA] bg-[#FF9FCA]"
                                : "border-[#d7d7d7]"
                            }`}
                          >
                            {checkoutMode === "GOOGLE" && (
                              <Check
                                size={11}
                                className="text-[#222]"
                                strokeWidth={3}
                              />
                            )}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`mt-3 sm:mt-4 text-base font-black uppercase tracking-wide ${
                          checkoutMode === "GOOGLE"
                            ? "text-[#FF9FCA]"
                            : "text-[#222]"
                        }`}
                      >
                        Đăng nhập
                      </div>

                      <div
                        className={`mt-1 text-sm font-bold leading-snug ${
                          checkoutMode === "GOOGLE"
                            ? "text-white"
                            : "text-[#444]"
                        }`}
                      >
                        Ưu đãi tốt hơn khi đăng nhập
                      </div>

                      <div
                        className={`mt-2 sm:mt-3 text-xs leading-relaxed ${
                          checkoutMode === "GOOGLE"
                            ? "text-[#F4DCE8]"
                            : "text-[#777]"
                        }`}
                      >
                        Áp dụng ưu đãi tài khoản Google khi đủ điều kiện
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCheckoutMode("GUEST")}
                      className={`rounded-2xl border-2 px-3 py-3 sm:px-4 sm:py-4 text-left transition-all ${
                        checkoutMode === "GUEST"
                          ? "border-[#E85C9C] bg-gradient-to-br from-[#2B1D26] to-[#1D1D1F] shadow-[0_10px_28px_rgba(232,92,156,0.22)]"
                          : "border-[#eee] bg-white hover:border-[#FF9FCA] hover:shadow-[0_8px_20px_rgba(255,159,202,0.14)]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                            checkoutMode === "GUEST"
                              ? "bg-[#FF9FCA]/20 text-[#FFD9EA]"
                              : "bg-[#FFF0F7] text-[#E85C9C]"
                          }`}
                        >
                          Guest
                        </span>

                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          <span
                            className={`rounded-full px-3 py-1.5 text-[11px] sm:text-xs font-black ring-2 ${
                              checkoutMode === "GUEST"
                                ? "bg-gradient-to-r from-[#FF77B8] to-[#FFB6D9] text-[#1f1f1f] ring-[#FFD3E8]"
                                : "bg-[#FFEAF4] text-[#C93B82] ring-[#FFD7EA]"
                            }`}
                          >
                            Giảm ngay
                            <span className="ml-1 text-sm sm:text-base font-extrabold">
                              {formatPriceK(basePromotionDiscount)}
                            </span>
                          </span>
                          <div
                            className={`h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                              checkoutMode === "GUEST"
                                ? "border-[#FF9FCA] bg-[#FF9FCA]"
                                : "border-[#d7d7d7]"
                            }`}
                          >
                            {checkoutMode === "GUEST" && (
                              <Check
                                size={11}
                                className="text-[#222]"
                                strokeWidth={3}
                              />
                            )}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`mt-3 sm:mt-4 text-base font-black uppercase tracking-wide ${
                          checkoutMode === "GUEST"
                            ? "text-[#FF9FCA]"
                            : "text-[#222]"
                        }`}
                      >
                        Vãng lai
                      </div>

                      <div
                        className={`mt-1 text-sm font-bold leading-snug ${
                          checkoutMode === "GUEST"
                            ? "text-white"
                            : "text-[#444]"
                        }`}
                      >
                        Đặt nhanh không cần đăng nhập
                      </div>

                      <div
                        className={`mt-2 sm:mt-3 text-xs leading-relaxed ${
                          checkoutMode === "GUEST"
                            ? "text-[#F4DCE8]"
                            : "text-[#777]"
                        }`}
                      >
                        Áp dụng khuyến mãi mặc định của shop
                      </div>
                    </button>
                  </div>
                )}

                {/* Google: login or status */}
                {checkoutMode === "GOOGLE" && !hasGoogleSession && (
                  <div className="space-y-3">
                    <EmbeddedBrowserGoogleHint />
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isGoogleLoading}
                      className="w-full rounded-2xl border-2 border-[#FF9FCA] bg-gradient-to-r from-[#FFF0F8] via-white to-[#FFF7FB] px-3 sm:px-4 py-3 text-sm font-black text-[#E85C9C] hover:brightness-[0.98] disabled:opacity-50 transition-colors"
                    >
                      {isGoogleLoading ? (
                        "Đang đăng nhập..."
                      ) : (
                        <>
                          Đăng nhập Google mở ưu đãi đến{" "}
                          <span className="text-base sm:text-lg text-[#D61F7A]">
                            {formatPriceK(firstOrderPreviewDiscount)}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {checkoutMode === "GOOGLE" &&
                  hasGoogleSession &&
                  (isMemberDataLoading || isFirstOrderPromoEligible) && (
                    <div
                      className={`rounded-2xl border px-3 py-3 text-sm font-medium ${
                        isMemberDataLoading
                          ? "border-slate-200 bg-slate-50 text-slate-500"
                          : isFirstOrderPromoEligible
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {isMemberDataLoading
                        ? "Đang kiểm tra ưu đãi tài khoản..."
                        : isFirstOrderPromoEligible
                          ? `🎉 Tài khoản đủ điều kiện ưu đãi đơn đầu • Ước tính giảm ${firstOrderPreviewDiscount.toLocaleString("vi-VN")}đ`
                          : ""}
                    </div>
                  )}

                {/* Saved info */}
                {canUseSavedCustomer &&
                  shouldShowContactForm &&
                  !isLoggedInUser && (
                    <button
                      type="button"
                      onClick={() =>
                        setCustomer((c) => ({
                          ...c,
                          fullName: savedCustomer.fullName || "",
                          phone: normalizeValidPhoneOrEmpty(
                            savedCustomer.phone,
                          ),
                          gmail: savedCustomer.gmail || "",
                          ig: savedCustomer.ig || savedCustomer.fb || "",
                        }))
                      }
                      className="w-full rounded-2xl border-2 border-dashed border-[#FF9FCA]/50 bg-[#FFF9FC] px-3 py-2.5 text-sm font-bold text-[#E85C9C] hover:bg-[#FFF0F7] transition-colors"
                    >
                      Dùng thông tin đã lưu
                      {savedCustomer.fullName
                        ? ` • ${savedCustomer.fullName}`
                        : ""}
                    </button>
                  )}

                {/* Contact form */}
                {shouldShowContactForm && (
                  <div className="rounded-2xl border border-[#FFE4F0] bg-white p-3 sm:p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-[#666]">
                          Thông tin người thuê
                        </div>
                        <div className="mt-1 text-[11px] text-[#888]">
                          Điền nhanh để shop xác nhận đơn
                        </div>
                      </div>

                      {checkoutMode === "GOOGLE" && hasGoogleSession && (
                        <div className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                          Đã xác thực
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="flex items-center gap-2 text-[11px] font-black text-[#666] mb-1.5 uppercase tracking-[0.2em] px-1">
                            <User size={13} className="text-[#E85C9C]" />
                            Họ và tên
                          </label>
                          <input
                            value={customer.fullName}
                            onChange={(e) =>
                              setCustomer((c) => ({
                                ...c,
                                fullName: e.target.value,
                              }))
                            }
                            placeholder="Nguyễn Thị Bông"
                            className={`w-full px-3 py-2.5 rounded-xl border-2 focus:outline-none bg-white font-medium text-sm text-[#333] ${
                              fullNameError
                                ? "border-red-300 focus:border-red-400"
                                : "border-[#eee] focus:border-[#FF9FCA]"
                            }`}
                          />
                          {fullNameError && (
                            <p className="mt-1 text-xs text-red-600 font-medium">
                              {fullNameError}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="flex items-center gap-2 text-[11px] font-black text-[#666] mb-1.5 uppercase tracking-[0.2em] px-1">
                            <Phone size={13} className="text-[#E85C9C]" />
                            Số điện thoại
                          </label>
                          <input
                            value={customer.phone}
                            onChange={(e) =>
                              setCustomer((c) => ({
                                ...c,
                                phone: e.target.value,
                              }))
                            }
                            placeholder="0901234567"
                            inputMode="tel"
                            className={`w-full px-3 py-2.5 rounded-xl border-2 focus:outline-none bg-white font-medium text-sm text-[#333] ${
                              phoneError
                                ? "border-red-300 focus:border-red-400"
                                : "border-[#eee] focus:border-[#FF9FCA]"
                            }`}
                          />
                          {phoneError && (
                            <p className="mt-1 text-xs text-red-600 font-medium">
                              {phoneError}
                            </p>
                          )}
                        </div>
                      </div>

                      {checkoutMode === "GOOGLE" && (
                        <div>
                          <label className="text-[11px] font-black text-[#666] mb-1.5 block uppercase tracking-[0.2em] px-1">
                            Email liên kết
                          </label>
                          <div className="flex items-center justify-between gap-3 rounded-xl border border-[#eee] bg-[#fafafa] px-3 py-2.5">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-[#444]">
                                {customer.gmail || "email@example.com"}
                              </div>
                              <div className="text-[10px] text-[#999]">
                                Email xác thực từ đăng nhập Google
                              </div>
                            </div>
                            <div className="shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700">
                              Verified
                            </div>
                          </div>
                          {gmailError && (
                            <p className="mt-1 text-xs text-red-600 font-medium">
                              {gmailError}
                            </p>
                          )}
                        </div>
                      )}

                      <div>
                        <label className="text-[11px] font-black text-[#666] mb-1.5 block uppercase tracking-[0.2em] px-1">
                          Instagram / Facebook
                        </label>
                        <div className="flex flex-wrap gap-4 mb-2 px-1">
                          <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-[#444]">
                            <input
                              type="radio"
                              name="socialPlatform"
                              checked={socialPlatform === "instagram"}
                              onChange={() => setSocialPlatform("instagram")}
                              className="h-4 w-4 accent-[#E85C9C] shrink-0"
                            />
                            Instagram
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-[#444]">
                            <input
                              type="radio"
                              name="socialPlatform"
                              checked={socialPlatform === "facebook"}
                              onChange={() => setSocialPlatform("facebook")}
                              className="h-4 w-4 accent-[#E85C9C] shrink-0"
                            />
                            Facebook
                          </label>
                        </div>
                        <label className="text-[10px] font-bold text-[#888] mb-1 block uppercase tracking-wider px-1">
                          Link{" "}
                          <span className="text-red-500 normal-case font-semibold">
                            (bắt buộc)
                          </span>
                        </label>
                        <input
                          value={customer.ig}
                          onChange={(e) =>
                            setCustomer((c) => ({ ...c, ig: e.target.value }))
                          }
                          placeholder={
                            socialPlatform === "instagram"
                              ? "https://instagram.com/username"
                              : "https://facebook.com/username"
                          }
                          className={`w-full px-3 py-2.5 rounded-xl border-2 focus:outline-none bg-white font-medium text-sm text-[#333] ${
                            socialLinkError
                              ? "border-red-300 focus:border-red-400"
                              : "border-[#eee] focus:border-[#FF9FCA]"
                          }`}
                        />
                        {socialLinkError && (
                          <p className="mt-1 text-xs text-red-600 font-medium">
                            {socialLinkError}
                          </p>
                        )}
                        {!socialLinkError && (
                          <p className="mt-1 text-[11px] text-[#999] px-1">
                            Dán link đầy đủ (https://...) đúng với nền tảng đã
                            chọn.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3 sm:space-y-3.5">
                <div className="rounded-xl border border-[#F5D7E6] bg-[#FFFAFC] px-3.5 py-2.5 sm:px-4 sm:py-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#C94B86]">
                    Bước cuối · Xác nhận & thanh toán
                  </div>
                  <p className="mt-1.5 text-[12px] text-stone-600 leading-relaxed">
                    Kiểm tra máy và giá, dùng điểm nếu cần, tick cam kết rồi
                    thanh toán.
                  </p>
                </div>

                {/* 1) Thiết bị — ưu tiên trên cùng */}
                <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-[#F0E8EC] space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#C94B86]">
                      Thông tin máy
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="rounded-lg border border-[#F5D7E6] bg-[#FFF8FB] px-2.5 py-1.5 text-[11px] font-bold text-[#E85C9C] hover:bg-[#FFF0F6] transition-colors shrink-0"
                    >
                      Sửa máy / lịch
                    </button>
                  </div>
                  <div className="p-3 sm:p-3.5 bg-[#FFF8FB] rounded-xl border border-[#FAD6E8]">
                    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#C94B86] mb-2">
                      Thiết bị {isMulti && `(${effectiveDevices.length} máy)`}
                    </div>
                    {isMulti ? (
                      <div className="space-y-2">
                        {rentalInfoPerDevice.map((r) => {
                          const dev = r.device;
                          const days = r.chargeableDays ?? chargeableDays;
                          const fullDays = Math.floor(days);
                          const basePrice = r.price || 0;
                          const breakdown =
                            fullDays > 3
                              ? formatPriceBreakdown(dev, fullDays)
                              : null;
                          const daysLabel =
                            days >= 1 ? `${Math.round(days)} ngày` : "Gói 6h";
                          return (
                            <div
                              key={dev.id}
                              className="border-b border-[#FFE4F0] pb-2 last:border-0 last:pb-0"
                            >
                              <div className="flex justify-between items-start gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-stone-900 text-[13px] leading-snug">
                                    {dev.displayName || dev.name}
                                  </div>
                                  <p className="text-[12px] text-stone-500 mt-1 leading-relaxed">
                                    {breakdown ||
                                      `${daysLabel} ${formatPriceK(basePrice)}`}
                                  </p>
                                </div>
                                <span className="font-black text-[#E85C9C] shrink-0 text-[13px] tabular-nums">
                                  {formatPriceK(basePrice)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-black text-stone-900 uppercase text-[13px] leading-snug">
                            {effectiveDevices[0]?.displayName ||
                              effectiveDevices[0]?.name}
                          </div>
                          {(() => {
                            const r0 = rentalInfoPerDevice[0];
                            const fullDays = Math.floor(chargeableDays);
                            const breakdown =
                              fullDays > 3 && r0?.device
                                ? formatPriceBreakdown(r0.device, fullDays)
                                : null;
                            const base0 = r0?.price || 0;
                            const daysLabel =
                              chargeableDays >= 1
                                ? `${Math.round(chargeableDays)} ngày`
                                : "Gói 6h";
                            return (
                              <p className="text-[12px] text-stone-500 mt-1 leading-relaxed">
                                {breakdown ||
                                  `${daysLabel} ${formatPriceK(base0)}`}
                              </p>
                            );
                          })()}
                        </div>
                        <span className="font-black text-[#E85C9C] shrink-0 text-[13px] tabular-nums">
                          {formatPriceK(rentalInfoPerDevice[0]?.price || 0)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2) Giá + điểm */}
                <div className="rounded-xl border border-[#EDD5E3] bg-gradient-to-b from-white via-[#FFFCFD] to-[#FFF7FA] p-3.5 sm:p-4 space-y-3 sm:space-y-3.5 shadow-[0_6px_24px_rgba(232,92,156,0.07)]">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#C94B86]">
                    Thanh toán hôm nay
                  </div>
                  {priceBreakdown && (
                    <div className="space-y-2 pt-0.5">
                      <div className="flex justify-between items-baseline gap-3 text-[13px] leading-snug">
                        <span className="text-stone-500">✨ Giá gốc</span>
                        <span className="font-bold text-stone-900 tabular-nums shrink-0">
                          {(priceBreakdown.original || 0).toLocaleString(
                            "vi-VN",
                          )}
                          đ
                        </span>
                      </div>
                      {selectedDiscountAmount > 0 && (
                        <div className="flex justify-between items-baseline gap-3 text-[13px] leading-snug">
                          <span
                            className={
                              isFirstOrderVoucherSelected
                                ? "text-emerald-700"
                                : "text-[#E85C9C]"
                            }
                          >
                            {isFirstOrderVoucherSelected ? "🎉" : "🔥"}{" "}
                            {selectedDiscountLabel}
                          </span>
                          <span
                            className={
                              isFirstOrderVoucherSelected
                                ? "font-bold text-emerald-700 tabular-nums shrink-0"
                                : "font-bold text-[#E85C9C] tabular-nums shrink-0"
                            }
                          >
                            (−{selectedDiscountAmount.toLocaleString("vi-VN")}đ)
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {isLoggedInUser && (
                    <div className="rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-white px-3.5 py-3 sm:px-4 sm:py-3.5 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-900/70">
                            Ví điểm của bạn
                          </div>
                          <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                            <span className="text-[1.625rem] sm:text-[1.75rem] font-black tabular-nums text-amber-950 leading-none tracking-tight">
                              {memberPoint.toLocaleString("vi-VN")}
                            </span>
                            <span className="text-[13px] font-bold text-amber-900/80">
                              điểm
                            </span>
                            <span className="text-[11px] text-amber-800/50">
                              · 1 điểm = 1.000đ
                            </span>
                          </div>
                          <p className="mt-2 text-[11px] text-amber-900/45 leading-relaxed max-w-[18rem]">
                            Điểm giữ lâu dài — chỉ trừ khi bạn muốn giảm bill
                            hôm nay.
                          </p>
                        </div>
                        {pointDiscountAmount > 0 && (
                          <div className="text-right shrink-0 rounded-lg bg-white border border-amber-100/90 px-2.5 py-1.5">
                            <div className="text-[9px] font-bold uppercase tracking-[0.08em] text-amber-800/55">
                              Trừ hôm nay
                            </div>
                            <div className="text-[13px] font-black text-amber-950 tabular-nums mt-0.5">
                              −{pointDiscountAmount.toLocaleString("vi-VN")}đ
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-0.5">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-stone-500 mb-2">
                          Trừ cho đơn này
                        </div>
                        <div className="flex flex-wrap items-center gap-2.5">
                          <div className="inline-flex rounded-full border border-amber-200/90 bg-white p-0.5 shadow-sm">
                            <button
                              type="button"
                              onClick={() => setPointToUse(0)}
                              className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${
                                pointToUse === 0
                                  ? "bg-amber-100 text-amber-950 shadow-sm ring-1 ring-amber-200/90"
                                  : "text-amber-900/50 hover:bg-amber-50/90"
                              }`}
                            >
                              Không trừ
                            </button>
                            <button
                              type="button"
                              disabled={suggestedHalfPoints <= 0}
                              onClick={() => setPointToUse(suggestedHalfPoints)}
                              className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-all disabled:opacity-35 disabled:pointer-events-none ${
                                maxPointToUse > 0 &&
                                suggestedHalfPoints > 0 &&
                                pointToUse === suggestedHalfPoints
                                  ? "bg-amber-100 text-amber-950 shadow-sm ring-1 ring-amber-200/90"
                                  : "text-amber-900/50 hover:bg-amber-50/90"
                              }`}
                            >
                              Một nửa
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              max={maxPointToUse}
                              value={pointToUse}
                              onChange={(e) => {
                                const next = Number(e.target.value);
                                if (!Number.isFinite(next)) {
                                  setPointToUse(0);
                                  return;
                                }
                                setPointToUse(
                                  Math.max(
                                    0,
                                    Math.min(
                                      Math.floor(next),
                                      maxPointToUse,
                                    ),
                                  ),
                                );
                              }}
                              className="w-13 rounded-lg border border-amber-200 bg-white py-1.5 px-1 text-center text-[13px] font-bold text-stone-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#E85C9C]/25"
                            />
                            <span className="text-[11px] text-amber-900/55 font-medium">
                              điểm
                            </span>
                            <span className="text-[10px] text-stone-400 tabular-nums">
                              / {maxPointToUse.toLocaleString("vi-VN")} tối đa
                            </span>
                          </div>
                        </div>
                        {maxPointToUse > 0 && (
                          <button
                            type="button"
                            onClick={() => setPointToUse(maxPointToUse)}
                            className={`mt-2 text-left text-[11px] font-medium leading-relaxed transition-colors ${
                              pointToUse === maxPointToUse
                                ? "text-amber-900/75"
                                : "text-stone-400 hover:text-[#C94B86]"
                            }`}
                          >
                            {pointToUse === maxPointToUse
                              ? "Đang trừ tối đa theo bill. Giảm số điểm nếu muốn giữ lại cho đơn sau."
                              : `Chỉ khi cần: trừ tối đa ${maxPointToUse.toLocaleString("vi-VN")} điểm (−${(maxPointToUse * 1000).toLocaleString("vi-VN")}đ)`}
                          </button>
                        )}
                      </div>

                      {maxPointToUse === 0 && memberPoint > 0 && (
                        <p className="text-[11px] text-amber-900/45 leading-relaxed">
                          Đơn này chưa thể trừ thêm điểm (bill sau giảm quá
                          nhỏ).
                        </p>
                      )}
                      <p className="text-[11px] text-emerald-800/90 leading-relaxed pt-2 border-t border-amber-100">
                        🎁 Dự kiến +
                        {earnedPointPreview.toLocaleString("vi-VN")} điểm ·{" "}
                        {earnedPointRulePreview}
                      </p>
                    </div>
                  )}

                  <div className="border-t border-[#EDD5E3] pt-3 mt-0.5 flex justify-between items-baseline gap-3">
                    <span className="font-black text-stone-800 uppercase tracking-[0.1em] text-[11px] sm:text-xs">
                      Chỉ còn
                    </span>
                    <span className="text-xl sm:text-[1.65rem] font-black text-[#E85C9C] shrink-0 tabular-nums leading-none tracking-tight">
                      {payableTotal.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                  {(selectedDiscountAmount > 0 || pointDiscountAmount > 0) && (
                    <div className="text-center text-[12px] sm:text-[13px] font-bold text-emerald-700 pt-0.5">
                      💥 Tiết kiệm{" "}
                      {(
                        selectedDiscountAmount + pointDiscountAmount
                      ).toLocaleString("vi-VN")}
                      đ
                    </div>
                  )}
                </div>

                {/* 3) Thời gian · chi nhánh · khách */}
                <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-[#F0E8EC] space-y-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#C94B86]">
                    Chi tiết đặt
                  </div>
                  <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
                    <div className="p-3 rounded-xl border border-stone-100 bg-stone-50/70">
                      <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-stone-500 mb-1.5">
                        Thời gian
                      </div>
                      <div className="text-[13px] text-stone-800 space-y-1 leading-relaxed">
                        {t1 && (
                          <div>
                            <span className="text-stone-500">Nhận:</span>{" "}
                            {formatPickupReturnSummary(t1)}
                          </div>
                        )}
                        {t2 && (
                          <div>
                            <span className="text-stone-500">Trả:</span>{" "}
                            {formatPickupReturnSummary(t2)}
                          </div>
                        )}
                        {chargeableDays > 0 && (
                          <div className="font-bold text-[#E85C9C] text-[12px] pt-0.5">
                            {chargeableDays < 1
                              ? "Gói 6 giờ"
                              : `${chargeableDays} ngày thuê`}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl border border-stone-100 bg-stone-50/70">
                      <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-stone-500 mb-1.5">
                        Chi nhánh
                      </div>
                      <div className="font-bold text-[13px] text-stone-900 leading-snug">
                        {BRANCHES.find((b) => b.id === selectedBranch)?.label}
                      </div>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-[#E8F5E9] bg-emerald-50/60">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-800/90">
                        Khách hàng
                      </span>
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="rounded-lg border border-emerald-200/90 bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-50 transition-colors"
                      >
                        Sửa
                      </button>
                    </div>
                    <div className="font-bold text-[13px] text-stone-900 mt-1.5 leading-snug">
                      {customer.fullName?.trim() || "—"}
                    </div>
                    {customer.phone && (
                      <div className="text-[12px] text-stone-600 tabular-nums mt-0.5">
                        {normalizePhone(customer.phone)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3.5 sm:p-4 bg-emerald-50/90 rounded-xl border border-emerald-200/80">
                  <div className="text-[11px] text-emerald-900 font-bold leading-snug mb-1">
                    Đặc biệt: Cọc 0 đồng
                  </div>
                  <div className="text-[12px] text-emerald-900/85 leading-relaxed">
                    Chỉ cần CCCD bản gốc (shop chụp lại, không giữ máy) hoặc
                    VNeID định danh mức 2.
                  </div>
                </div>
                <div
                  ref={agreementSectionRef}
                  className="p-3.5 sm:p-4 bg-white rounded-xl border border-[#F0E8EC] space-y-2.5"
                >
                  <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[#C94B86]">
                    Cam kết trước khi thanh toán
                  </div>
                  <label
                    className={`flex items-start gap-3 rounded-xl border p-3 text-[13px] leading-relaxed transition-colors ${
                      agreementErrors.noResellOrPawn
                        ? "border-red-300 bg-red-50 text-red-800"
                        : "border-stone-100 bg-stone-50/80 text-stone-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={agreeNoResellOrPawn}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setAgreeNoResellOrPawn(checked);
                        setAgreementErrors((prev) => ({
                          ...prev,
                          noResellOrPawn: !checked && prev.noResellOrPawn,
                        }));
                      }}
                      className="mt-1 h-4 w-4 shrink-0 accent-[#E85C9C]"
                    />
                    <span>
                      Cam kết không sử dụng máy dưới các mục đích như cầm, bán
                      hoặc cho thuê lại. Nếu phát hiện vi phạm, tôi đồng ý bồi
                      thường chi phí theo đúng nội dung đã nêu trong hợp đồng.{" "}
                      <a
                        href={faoStandardContractUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold underline"
                        title="Mẫu hợp đồng chuẩn (cùng domain trang hiện tại)"
                      >
                        Xem hợp đồng chuẩn
                      </a>{" "}
                      (kèm{" "}
                      <a
                        href={`${faoStandardContractUrl}#dieu-4`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold underline"
                      >
                        Điều 4 — bồi thường
                      </a>
                      ).
                    </span>
                  </label>
                  <label
                    className={`flex items-start gap-3 rounded-xl border p-3 text-[13px] leading-relaxed transition-colors ${
                      agreementErrors.confirmPickupReturnTime
                        ? "border-red-300 bg-red-50 text-red-800"
                        : "border-stone-100 bg-stone-50/80 text-stone-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={agreeConfirmPickupReturnTime}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setAgreeConfirmPickupReturnTime(checked);
                        setAgreementErrors((prev) => ({
                          ...prev,
                          confirmPickupReturnTime:
                            !checked && prev.confirmPickupReturnTime,
                        }));
                      }}
                      className="mt-1 h-4 w-4 shrink-0 accent-[#E85C9C]"
                    />
                    <span>
                      Xác nhận đã đúng giờ nhận/trả. Nếu cần thay đổi, tôi sẽ
                      nhắn trực tiếp cho page.
                    </span>
                  </label>
                  {effectiveDevices.length >= 2 && (
                    <label
                      className={`flex items-start gap-3 rounded-xl border p-3 text-[13px] leading-relaxed transition-colors ${
                        agreementErrors.cccdPerDevice
                          ? "border-red-300 bg-red-50 text-red-800"
                          : "border-stone-100 bg-stone-50/80 text-stone-700"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={agreeCccdPerDevice}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setAgreeCccdPerDevice(checked);
                          setAgreementErrors((prev) => ({
                            ...prev,
                            cccdPerDevice:
                              !checked && prev.cccdPerDevice,
                          }));
                        }}
                        className="mt-1 h-4 w-4 shrink-0 accent-[#E85C9C]"
                      />
                      <span>
                        Tôi sẽ cung cấp{" "}
                        <strong className="text-stone-900">
                          {effectiveDevices.length} CCCD
                        </strong>{" "}
                        cho shop (mỗi máy tương đương 1 CCCD).
                      </span>
                    </label>
                  )}
                </div>
                {error && (
                  <div className="p-3.5 bg-red-50 text-red-800 rounded-xl text-[13px] font-semibold leading-relaxed border border-red-200/90">
                    {error}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 sm:p-4 border-t border-[#FFE4F0] bg-white">
            <div
              className={`grid gap-3 ${
                step > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
              }`}
            >
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="min-w-0 py-3 rounded-xl border-2 border-[#222] text-[#222] text-sm sm:text-base font-black uppercase tracking-wider hover:bg-[#f5f5f5] transition-colors order-2 sm:order-1"
                >
                  Quay lại
                </button>
              )}
              {step < 3 ? (
                <button
                  onClick={async () => {
                    if (step === 2 && isCustomerValid) {
                      const snap = buildCustomerInfoSnapshot(
                        customer,
                        socialPlatform,
                      );
                      if (isCustomerInfoSnapshotDifferent(loadCustomerInfo(), snap)) {
                        saveCustomerInfo(snap);
                      }
                      try {
                        await syncCustomerProfileToServer(
                          checkoutMode,
                          hasGoogleSession,
                          snap,
                        );
                      } catch (e) {
                        console.warn(
                          "Không thể đồng bộ hồ sơ lên server.",
                          e,
                        );
                      }
                    }
                    setStep(step + 1);
                  }}
                  disabled={
                    (step === 1 &&
                      (!isAvailable ||
                        isCheckingAvailability ||
                        !!timeSelectionError ||
                        !sameModelAvailabilityReady)) ||
                    (step === 2 && !isCustomerValid)
                  }
                  className="min-w-0 py-3 rounded-xl bg-[#222] text-[#FF9FCA] text-sm sm:text-base font-black uppercase tracking-wider hover:bg-[#333] transition-colors disabled:bg-[#ccc] disabled:text-[#999] order-1 sm:order-2"
                >
                  {step === 2
                    ? `Tiếp tục • còn ${Math.round(payableTotal / 1000)}k`
                    : "Tiếp tục"}
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!isCustomerValid || isSubmitting}
                  className="min-w-0 py-3 rounded-xl bg-gradient-to-r from-[#E85C9C] to-[#FF9FCA] text-white text-sm sm:text-base font-black uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 order-1 sm:order-2"
                >
                  {isSubmitting ? (
                    "Đang xử lý..."
                  ) : (
                    <>Thanh toán • {payableTotal.toLocaleString("vi-VN")}đ</>
                  )}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>

    <AnimatePresence>
      {showCccdConfirmDialog && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[125] bg-black/55 backdrop-blur-[2px]"
            onClick={() => setShowCccdConfirmDialog(false)}
            aria-hidden
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cccd-confirm-title"
            aria-describedby="cccd-confirm-desc"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="fixed left-3 right-3 top-1/2 z-[126] mx-auto max-w-md -translate-y-1/2 rounded-2xl border-2 border-[#FAD6E8] bg-[#FFFBF5] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="cccd-confirm-title"
              className="text-base font-black uppercase tracking-tight text-[#222] mb-2"
            >
              Xác nhận CCCD / giấy tờ
            </h3>
            <p
              id="cccd-confirm-desc"
              className="text-[13px] text-[#444] leading-relaxed mb-4"
            >
              Đơn của bạn gồm{" "}
              <strong className="text-[#222]">{effectiveDevices.length} máy</strong>{" "}
              (trên 2 máy). Khi nhận máy, bạn{" "}
              <strong className="text-[#222]">
                cần cung cấp số lượng CCCD (căn cước công dân) tương ứng với số
                máy thuê
              </strong>
              — mỗi máy một giấy tờ chính chủ (hoặc VNeID định danh mức 2 theo
              quy định cửa hàng). Bạn xác nhận đã hiểu và đồng ý tiếp tục thanh
              toán?
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setShowCccdConfirmDialog(false)}
                className="flex-1 min-h-[44px] rounded-xl border-2 border-[#222] text-[#222] text-sm font-black uppercase tracking-wider hover:bg-[#f5f5f5] transition-colors"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={handleCccdDialogConfirm}
                disabled={isSubmitting}
                className="flex-1 min-h-[44px] rounded-xl bg-gradient-to-r from-[#E85C9C] to-[#FF9FCA] text-white text-sm font-black uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Đồng ý & thanh toán
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </>
  );
}

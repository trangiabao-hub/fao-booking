import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useLayoutEffect,
  useRef,
} from "react";
import { format, addDays, isValid } from "date-fns";
import vi from "date-fns/locale/vi";
import { motion, AnimatePresence } from "framer-motion";
import { signInWithPopup } from "firebase/auth";
import {
  X,
  Clock,
  User,
  Phone,
  Check,
  ChevronRight,
  Tag,
  Gift,
  Loader2,
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
  isBranchBookable,
} from "../data/bookingConstants";
import { apiLocationFromBranchId } from "../utils/deviceBranch";
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
  computeQ9BranchFlatDiscountVnd,
  computeQ9BranchDiscountBreakdown,
  isQ9MayPromoEligible,
  Q9_BRANCH_VOUCHER_ID,
} from "../utils/bookingHelpers";
import {
  computeEarnedPoints,
  computeTotalSpentFromBookings,
  memberTierKeyFromTotalSpent,
  pointsPerEarnBlock,
} from "../utils/loyaltyEarn";
import { calculateRentalInfo, roundDownToThousand } from "../utils/pricing";
import { getStrictestReleaseDate } from "../utils/deviceReleaseDate";
import { formatTimeVi } from "../utils/formatTimeVi";
import { buildBookingDepositCommitmentLines } from "../utils/bookingDepositPolicy";
import BookingPrefsForm, {
  computeAvailabilityRange,
  getAvailabilityRangeError,
} from "./BookingPrefsForm";

/** Đồng bộ fao-booking với trang /booking (noteVoucher). */
function buildQuickBookNoteVoucher({
  price,
  t1,
  t2,
  pointToUse,
  selectedBranch,
}) {
  const parts = [];
  if (
    selectedBranch === "Q9" &&
    price > 0 &&
    isValid(t1) &&
    isValid(t2) &&
    isQ9MayPromoEligible(t1, t2)
  ) {
    parts.push(Q9_BRANCH_VOUCHER_ID);
  } else if (price > 0 && isValid(t1) && isValid(t2)) {
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

const AFTERNOON_PICKUP_TIME = "15:00";

/** Tạm thời tắt Instagram trong quick book — chỉ nhận link Facebook. */
const QUICK_BOOK_IG_TEMPORARILY_DISABLED = true;

function pickStoredSocialLink(source) {
  const ig = (source?.ig || "").trim();
  const fb = (source?.fb || "").trim();
  if (QUICK_BOOK_IG_TEMPORARILY_DISABLED) return fb;
  return ig || fb;
}

/** Giống catalog: local datetime không hậu tố Z — backend parse LocalDateTime. */
function formatLocalDateTimeForDeviceApi(date) {
  if (!date || !isValid(date)) return null;
  return format(date, "yyyy-MM-dd'T'HH:mm:ss");
}

/** Invalid Date là truthy — luôn kiểm tra isValid trước khi format/submit. */
function isValidDateRange(t1, t2) {
  return Boolean(t1 && t2 && isValid(t1) && isValid(t2));
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

function inferOneDayPickupType(timeFrom) {
  if (timeFrom === MORNING_PICKUP_TIME) return "MORNING";
  if (timeFrom === AFTERNOON_PICKUP_TIME) return "AFTERNOON";
  return "EVENING";
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

function formatChargeableDaysLabel(days) {
  if (!days || days < 1) return "Gói 6h";
  const normalized = Number(days);
  return Number.isInteger(normalized)
    ? `${normalized} ngày`
    : `${normalized.toFixed(1)} ngày`;
}

const QUICK_BOOK_STEPS = [
  { id: 1, label: "Lịch thuê" },
  { id: 2, label: "Thông tin" },
  { id: 3, label: "Thanh toán" },
];

function StepProgressBar({ step }) {
  return (
    <div className="shrink-0 border-b border-[#f0f0f0] bg-white px-4 py-2.5">
      <div className="flex gap-1">
        {QUICK_BOOK_STEPS.map((s) => (
          <div
            key={s.id}
            className={`h-[3px] flex-1 rounded-full transition-colors duration-300 ${
              step >= s.id ? "bg-[#E85C9C]" : "bg-[#ebebeb]"
            }`}
          />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] font-semibold text-[#888]">
        {QUICK_BOOK_STEPS.map((s) => (
          <span
            key={s.id}
            className={step >= s.id ? "text-[#E85C9C]" : undefined}
          >
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function AvailabilityStatus({ isChecking }) {
  if (!isChecking) return null;
  return (
    <div className="mt-3 flex items-center gap-2.5 rounded-lg border border-[#f0f0f0] bg-[#fafafa] px-3 py-2.5">
      <Loader2 size={16} className="shrink-0 animate-spin text-[#E85C9C]" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="h-2.5 w-3/5 animate-pulse rounded bg-[#eee]" />
        <div className="h-2 w-2/5 animate-pulse rounded bg-[#f3f3f3]" />
      </div>
    </div>
  );
}

function CheckoutRow({ label, value, hint, action, onPress }) {
  const interactive = typeof onPress === "function";
  const Wrapper = interactive ? "button" : "div";
  return (
    <Wrapper
      type={interactive ? "button" : undefined}
      onClick={onPress}
      className={`flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left ${
        interactive
          ? "transition-colors hover:bg-[#fafafa] active:bg-[#f5f5f5]"
          : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium text-[#999]">{label}</div>
        <div className="mt-0.5 text-[13px] font-semibold text-[#222] leading-snug break-words">
          {value}
        </div>
        {hint ? (
          <div className="mt-0.5 text-[11px] text-[#888] leading-relaxed line-clamp-2">
            {hint}
          </div>
        ) : null}
      </div>
      {action ? (
        <div className="shrink-0">{action}</div>
      ) : interactive ? (
        <ChevronRight size={16} className="shrink-0 text-[#ccc]" />
      ) : null}
    </Wrapper>
  );
}

function CheckoutModeSegment({ checkoutMode, setCheckoutMode, discountLabel }) {
  const options = [
    {
      id: "GOOGLE",
      title: "Đăng nhập Google",
      subtitle: "Dùng điểm thành viên",
    },
    {
      id: "GUEST",
      title: "Khách vãng lai",
      subtitle: "Đặt nhanh, không cần tài khoản",
    },
  ];
  return (
    <div className="rounded-xl border border-[#f0f0f0] bg-[#fafafa] p-1">
      <div className="grid grid-cols-2 gap-1">
        {options.map((opt) => {
          const active = checkoutMode === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setCheckoutMode(opt.id)}
              className={`rounded-lg px-2.5 py-2.5 text-left transition-all active:scale-[0.98] ${
                active
                  ? "bg-white shadow-sm ring-1 ring-[#E85C9C]/25"
                  : "hover:bg-white/70"
              }`}
            >
              <div className="flex items-start justify-between gap-1">
                <span
                  className={`text-[13px] font-bold leading-tight ${
                    active ? "text-[#E85C9C]" : "text-[#333]"
                  }`}
                >
                  {opt.title}
                </span>
                {active ? (
                  <Check size={14} className="shrink-0 text-[#E85C9C]" strokeWidth={2.5} />
                ) : null}
              </div>
              <p className="mt-0.5 text-[10px] font-medium text-[#888] leading-snug">
                {opt.subtitle}
              </p>
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex items-center gap-1.5 px-1 pb-0.5">
        <Tag size={12} className="shrink-0 text-[#E85C9C]" />
        <span className="text-[11px] font-semibold text-[#666]">
          Giảm ngay{" "}
          <span className="font-bold text-[#E85C9C]">{discountLabel}</span>
          {" "}cho cả hai hình thức
        </span>
      </div>
    </div>
  );
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

  const depositCommitmentLines = useMemo(
    () => buildBookingDepositCommitmentLines(effectiveDevices),
    [effectiveDevices],
  );

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
    const pickDay = prefs?.date
      ? normalizeDate(new Date(prefs.date))
      : normalizeDate(new Date());
    const branchId =
      BRANCHES.find(
        (b) => b.id === prefs?.branchId && isBranchBookable(b, pickDay),
      )?.id || getDefaultBranchId();
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
      ig: pickStoredSocialLink(saved),
    };
  });
  const [socialPlatform, setSocialPlatform] = useState(() => {
    if (QUICK_BOOK_IG_TEMPORARILY_DISABLED) return "facebook";
    const saved = loadCustomerInfo();
    const link = (saved?.ig || saved?.fb || "").trim();
    const detected = detectSocialPlatformFromLink(link);
    if (detected) return detected;
    const hasFb = !!(saved?.fb || "").trim();
    const hasIg = !!(saved?.ig || "").trim();
    if (hasFb && !hasIg) return "facebook";
    return "instagram";
  });
  const effectiveSocialPlatform = QUICK_BOOK_IG_TEMPORARILY_DISABLED
    ? "facebook"
    : socialPlatform;
  const [checkoutMode, setCheckoutMode] = useState("GOOGLE");
  const [hasGoogleSession, setHasGoogleSession] = useState(
    () => !!loadCustomerSession()?.token,
  );
  const [_memberBookingsCount, setMemberBookingsCount] = useState(0);
  const [memberTotalSpent, setMemberTotalSpent] = useState(0);
  const [memberPoint, setMemberPoint] = useState(0);
  const [pointToUse, setPointToUse] = useState(0);
  const [isMemberDataLoading, setIsMemberDataLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [agreeNoScamElsewhere, setAgreeNoScamElsewhere] = useState(false);
  const [agreePickupInPersonAtBranch, setAgreePickupInPersonAtBranch] =
    useState(false);
  const [agreeCccdPerDevice, setAgreeCccdPerDevice] = useState(false);
  const [agreeDepositAndPolicies, setAgreeDepositAndPolicies] =
    useState(false);
  const [agreementErrors, setAgreementErrors] = useState({
    noScamElsewhere: false,
    pickupInPersonAtBranch: false,
    depositAndPolicies: false,
    cccdPerDevice: false,
  });
  const [showPriceDetail, setShowPriceDetail] = useState(false);
  const [showPointCustom, setShowPointCustom] = useState(false);
  const agreementSectionRef = useRef(null);
  const cccdConfirmedRef = useRef(false);
  const selectedBranchPickupAddress = useMemo(() => {
    const b = BRANCHES.find((x) => x.id === selectedBranch);
    return (b?.address || "").trim();
  }, [selectedBranch]);

  useEffect(() => {
    setAgreePickupInPersonAtBranch(false);
  }, [selectedBranch]);
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
    setAgreeNoScamElsewhere(false);
    setAgreePickupInPersonAtBranch(false);
    setAgreeCccdPerDevice(false);
    setAgreeDepositAndPolicies(false);
    setAgreementErrors({
      noScamElsewhere: false,
      pickupInPersonAtBranch: false,
      depositAndPolicies: false,
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

  // Defensive normalize: ONE_DAY must return at the same clock time as pickup.
  // This also protects flows that jump straight to step 2 (bypassing BookingPrefsForm step 1).
  useEffect(() => {
    if (!isOpen || selectedDuration !== "ONE_DAY" || !sixHourTimeFrom) return;

    if (sixHourTimeTo !== sixHourTimeFrom) {
      setSixHourTimeTo(sixHourTimeFrom);
    }

    const expectedPickupType = inferOneDayPickupType(sixHourTimeFrom);
    if (pickupType !== expectedPickupType) {
      setPickupType(expectedPickupType);
    }

    const expectedPickupSlot =
      expectedPickupType === "EVENING" || expectedPickupType === "AFTERNOON"
        ? sixHourTimeFrom
        : DEFAULT_EVENING_SLOT;
    if (pickupSlot !== expectedPickupSlot) {
      setPickupSlot(expectedPickupSlot);
    }
  }, [
    isOpen,
    selectedDuration,
    sixHourTimeFrom,
    sixHourTimeTo,
    pickupType,
    pickupSlot,
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
    if (!isValidDateRange(t1, t2)) return [];
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

  /** Giá catalog chỉ dùng khi lịch/gói chưa đổi — tránh giữ giá 1 ngày sau khi sửa 3 ngày ở step 1. */
  const catalogPricingStillValid = useMemo(() => {
    if (
      !hasInitialPrefs ||
      pricing?.discounted == null ||
      pricing?.original == null
    ) {
      return false;
    }
    return price > 0 && price === pricing.original;
  }, [hasInitialPrefs, pricing?.discounted, pricing?.original, price]);

  const discountedTotal = useMemo(() => {
    if (
      selectedBranch === "Q9" &&
      price > 0 &&
      isValid(t1) &&
      isValid(t2) &&
      isQ9MayPromoEligible(t1, t2)
    ) {
      return Math.max(0, price - computeQ9BranchFlatDiscountVnd(price));
    }
    if (isMulti) {
      return rentalInfoPerDevice.reduce((sum, r) => {
        const p = r?.price || 0;
        return sum + computeDiscountedPrice(p, t1, t2);
      }, 0);
    }
    if (catalogPricingStillValid) return pricing.discounted;
    return computeDiscountedPrice(price, t1, t2);
  }, [
    selectedBranch,
    isMulti,
    catalogPricingStillValid,
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
    if (selectedBranch === "Q9" && price > 0 && isValidDateRange(t1, t2)) {
      base = computeQ9BranchDiscountBreakdown(price, t1, t2);
    } else if (catalogPricingStillValid) {
      const discount = Math.max(0, pricing.original - pricing.discounted);
      base = {
        original: pricing.original,
        discount,
        discounted: pricing.discounted,
        discountLabel: discount > 0 ? "Khuyến mãi" : null,
      };
    } else if (isValidDateRange(t1, t2) && price > 0) {
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
    catalogPricingStillValid,
    pricing?.original,
    pricing?.discounted,
    price,
    t1,
    t2,
    effectiveDevices,
    rentalInfoPerDevice,
    chargeableDays,
    selectedBranch,
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
    if (
      baseDevicesForProps.length === 0 ||
      !isValidDateRange(t1, t2) ||
      timeSelectionError
    )
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

  // initialPrefs có thể nhảy thẳng bước 2 — kéo về bước 1 khi slot đã kín.
  useEffect(() => {
    if (!isOpen || isAvailable || isCheckingAvailability) return;
    if (step > 1) {
      setStep(1);
      setError(
        step1AvailabilityMessage ||
          "⚠️ Máy đã được đặt trong khung giờ này. Vui lòng chọn ngày khác.",
      );
    }
  }, [
    isOpen,
    isAvailable,
    isCheckingAvailability,
    step,
    step1AvailabilityMessage,
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
          ig: pickStoredSocialLink({
            ig: account.ig || saved.ig,
            fb: account.fb || saved.fb,
          }),
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
    if (QUICK_BOOK_IG_TEMPORARILY_DISABLED) {
      setSocialPlatform("facebook");
      return;
    }
    const detected = detectSocialPlatformFromLink(customer.ig);
    if (detected) setSocialPlatform(detected);
  }, [customer.ig]);

  // Validate customer info
  const socialLinkError = useMemo(() => {
    const raw = (customer.ig || "").trim();
    if (!raw) return "Vui lòng nhập link.";
    if (!isUrlForPlatform(raw, effectiveSocialPlatform)) {
      return effectiveSocialPlatform === "instagram"
        ? "Link phải là URL Instagram hợp lệ (https://instagram.com/...)."
        : "Link phải là URL Facebook hợp lệ (https://facebook.com/...).";
    }
    return "";
  }, [customer.ig, effectiveSocialPlatform]);
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
  const firstOrderDiscount = useMemo(() => {
    return 0;
  }, []);
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
  const pointPresets = useMemo(() => {
    if (maxPointToUse <= 0) return [];
    const list = [{ label: "Không dùng", value: 0 }];
    if (suggestedHalfPoints > 0 && suggestedHalfPoints < maxPointToUse) {
      list.push({ label: "Một nửa", value: suggestedHalfPoints });
    }
    list.push({ label: "Tối đa", value: maxPointToUse });
    return list;
  }, [maxPointToUse, suggestedHalfPoints]);
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
  const checkoutDeviceNames = useMemo(
    () =>
      rentalInfoPerDevice
        .map((r) => r.device?.displayName || r.device?.name)
        .filter(Boolean),
    [rentalInfoPerDevice],
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
  const selectedDiscountAmount = basePromotionDiscount;
  const selectedDiscountLabel = priceBreakdown?.discountLabel || "Khuyến mãi";
  const totalSavingsAmount = selectedDiscountAmount + pointDiscountAmount;
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
      (QUICK_BOOK_IG_TEMPORARILY_DISABLED
        ? !!(savedCustomer?.fb || "").trim() &&
          isUrlForPlatform(savedCustomer.fb, "facebook")
        : isSavedSocialValid(savedCustomer))
    );
  }, [savedCustomer]);

  // Submit booking
  const handleSubmit = async () => {
    if (
      effectiveDevices.length === 0 ||
      !isValidDateRange(t1, t2) ||
      !isCustomerValid
    )
      return;

    if (!isAvailable || isCheckingAvailability) {
      setError(
        step1AvailabilityMessage ||
          "⚠️ Máy đã được đặt trong khung giờ này. Vui lòng chọn ngày khác.",
      );
      setStep(1);
      return;
    }

    const nextAgreementErrors = {
      noScamElsewhere: !agreeNoScamElsewhere,
      pickupInPersonAtBranch: !agreePickupInPersonAtBranch,
      depositAndPolicies: !agreeDepositAndPolicies,
      cccdPerDevice:
        effectiveDevices.length >= 2 && !agreeCccdPerDevice,
    };
    if (
      nextAgreementErrors.noScamElsewhere ||
      nextAgreementErrors.pickupInPersonAtBranch ||
      nextAgreementErrors.depositAndPolicies ||
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
      noScamElsewhere: false,
      pickupInPersonAtBranch: false,
      depositAndPolicies: false,
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
        ig: effectiveSocialPlatform === "instagram" ? socialLink : "",
        fb: effectiveSocialPlatform === "facebook" ? socialLink : "",
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
        price,
        t1,
        t2,
        pointToUse,
        selectedBranch,
      });

      if (isMulti) {
        const rawAmounts = rentalInfoPerDevice.map((r) =>
          Math.round(r?.price || 0),
        );
        const totalRaw = rawAmounts.reduce((a, b) => a + b, 0);
        const q9MayPromo =
          selectedBranch === "Q9" &&
          isValid(t1) &&
          isValid(t2) &&
          isQ9MayPromoEligible(t1, t2);
        const totalQ9Off = q9MayPromo
          ? computeQ9BranchFlatDiscountVnd(totalRaw)
          : 0;
        const perDeviceAmounts = q9MayPromo
          ? rawAmounts
          : rentalInfoPerDevice.map((r) =>
              Math.round(computeDiscountedPrice(r?.price || 0, t1, t2)),
            );
        const distributedVoucher = q9MayPromo
          ? allocateDiscountByRatio(rawAmounts, totalQ9Off)
          : isFirstOrderVoucherSelected
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
          const baseDiscounted = q9MayPromo
            ? devPrice
            : Math.round(computeDiscountedPrice(devPrice, t1, t2));
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
            location: apiLocationFromBranchId(selectedBranch),
            depositApplicable: true,
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
          location: apiLocationFromBranchId(selectedBranch),
          depositApplicable: true,
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
        ig: pickStoredSocialLink({
          ig: account.ig || c.ig,
          fb: account.fb,
        }),
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
        className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 sm:items-center sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 340 }}
          onClick={(e) => e.stopPropagation()}
          className="flex max-h-[94dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-[0_-8px_40px_rgba(0,0,0,0.12)] sm:max-h-[90vh] sm:max-w-lg sm:rounded-2xl sm:shadow-2xl md:max-w-2xl"
        >
          {/* Drag handle — TikTok Shop / Shopee bottom sheet cue */}
          <div className="flex shrink-0 justify-center pt-2 sm:hidden" aria-hidden>
            <div className="h-1 w-10 rounded-full bg-[#ddd]" />
          </div>

          {/* Product header — Shopee cart row */}
          <div className="flex shrink-0 items-start gap-3 border-b border-[#f0f0f0] px-4 py-3">
            <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg border border-[#f0f0f0] bg-[#fafafa]">
              <img
                src={
                  effectiveDevices[0]?.img || effectiveDevices[0]?.images?.[0]
                }
                alt={
                  effectiveDevices[0]?.displayName ||
                  effectiveDevices[0]?.name
                }
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="line-clamp-2 text-[14px] font-semibold leading-snug text-[#222]">
                {isMulti
                  ? `${effectiveDevices.length} máy cho thuê`
                  : effectiveDevices[0]?.displayName ||
                    effectiveDevices[0]?.name}
              </div>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-[18px] font-bold tabular-nums text-[#E85C9C]">
                  {payableTotal.toLocaleString("vi-VN")}đ
                </span>
                {totalSavingsAmount > 0 && (
                  <span className="rounded bg-[#fff0f5] px-1.5 py-px text-[10px] font-bold text-[#E85C9C]">
                    Tiết kiệm {totalSavingsAmount.toLocaleString("vi-VN")}đ
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] text-[#888]">
                <span className="rounded bg-[#f5f5f5] px-1.5 py-px font-medium text-[#666]">
                  {durationDays < 1 ? "Gói 6h" : `${durationDays} ngày`}
                </span>
                {isValid(t1) && isValid(t2) && (
                  <>
                    <span className="text-[#ddd]">|</span>
                    <Clock size={11} className="shrink-0" />
                    <span>
                      {format(t1, "dd/MM", { locale: vi })} {formatTimeVi(t1)}
                      {" → "}
                      {format(t2, "dd/MM", { locale: vi })} {formatTimeVi(t2)}
                    </span>
                  </>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="-mr-1 shrink-0 rounded-full p-2 text-[#888] transition-colors hover:bg-[#f5f5f5] active:scale-95"
            >
              <X size={20} />
            </button>
          </div>

          <StepProgressBar step={step} />

          {/* Content */}
          <div className="min-h-0 flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-4 py-3 sm:py-4">
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
                  variant="gate"
                />
                <AvailabilityStatus isChecking={isCheckingAvailability} />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <div className="flex items-start gap-2.5 rounded-lg border border-[#ffe4ef] bg-[#fff8fb] px-3 py-2.5">
                  <Gift size={16} className="mt-0.5 shrink-0 text-[#E85C9C]" />
                  <p className="text-[12px] leading-relaxed text-[#555]">
                    <strong className="font-semibold text-[#333]">Tặng 2 ảnh photobooth</strong>{" "}
                    khi trả máy. In thêm 10.000đ/strip.
                  </p>
                </div>

                {isLoggedInUser ? (
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2.5">
                    <div className="text-[13px] font-semibold text-[#222]">
                      Xin chào, {customer.fullName?.trim() || "bạn"}!
                    </div>
                    <div className="mt-0.5 text-[11px] text-emerald-800/80">
                      Thông tin đã điền sẵn. Chỉnh sửa nếu cần trước khi thanh toán.
                    </div>
                  </div>
                ) : (
                  <CheckoutModeSegment
                    checkoutMode={checkoutMode}
                    setCheckoutMode={setCheckoutMode}
                    discountLabel={formatPriceK(basePromotionDiscount)}
                  />
                )}

                {/* Google: login or status */}
                {checkoutMode === "GOOGLE" && !hasGoogleSession && (
                  <div className="space-y-2.5">
                    <EmbeddedBrowserGoogleHint />
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isGoogleLoading}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#f0f0f0] bg-white px-4 py-3 text-[13px] font-semibold text-[#333] shadow-sm transition-all hover:border-[#E85C9C]/40 hover:bg-[#fff8fb] active:scale-[0.99] disabled:opacity-50"
                    >
                      {isGoogleLoading ? (
                        <>
                          <Loader2 size={16} className="animate-spin text-[#E85C9C]" />
                          Đang đăng nhập...
                        </>
                      ) : (
                        "Đăng nhập Google để dùng điểm thành viên"
                      )}
                    </button>
                  </div>
                )}

                {checkoutMode === "GOOGLE" &&
                  hasGoogleSession &&
                  isMemberDataLoading && (
                    <div className="flex items-center gap-2 rounded-lg border border-[#f0f0f0] bg-[#fafafa] px-3 py-2.5 text-[12px] font-medium text-[#888]">
                      <Loader2 size={14} className="animate-spin text-[#E85C9C]" />
                      Đang tải dữ liệu thành viên...
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
                          ig: pickStoredSocialLink(savedCustomer),
                        }))
                      }
                      className="w-full rounded-lg border border-dashed border-[#E85C9C]/40 bg-[#fff8fb] px-3 py-2.5 text-[12px] font-semibold text-[#E85C9C] transition-colors hover:bg-[#fff0f6] active:scale-[0.99]"
                    >
                      Dùng thông tin đã lưu
                      {savedCustomer.fullName
                        ? ` • ${savedCustomer.fullName}`
                        : ""}
                    </button>
                  )}

                {/* Contact form */}
                {shouldShowContactForm && (
                  <div className="overflow-hidden rounded-xl border border-[#f0f0f0] bg-white">
                    <div className="border-b border-[#f5f5f5] px-3.5 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[13px] font-semibold text-[#222]">
                          Thông tin người thuê
                        </div>
                        {checkoutMode === "GOOGLE" && hasGoogleSession && (
                          <span className="rounded bg-emerald-50 px-1.5 py-px text-[10px] font-semibold text-emerald-700">
                            Đã xác thực
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-[#999]">
                        Shop dùng thông tin này để xác nhận đơn
                      </p>
                    </div>

                    <div className="space-y-3 p-3.5">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 flex items-center gap-1.5 px-0.5 text-[11px] font-semibold text-[#666]">
                            <User size={12} className="text-[#E85C9C]" />
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
                            className={`w-full rounded-lg border bg-white px-3 py-2.5 text-[13px] font-medium text-[#333] focus:outline-none ${
                              fullNameError
                                ? "border-red-300 focus:border-red-400"
                                : "border-[#eee] focus:border-[#E85C9C]"
                            }`}
                          />
                          {fullNameError && (
                            <p className="mt-1 text-xs text-red-600 font-medium">
                              {fullNameError}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="mb-1.5 flex items-center gap-1.5 px-0.5 text-[11px] font-semibold text-[#666]">
                            <Phone size={12} className="text-[#E85C9C]" />
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
                            className={`w-full rounded-lg border bg-white px-3 py-2.5 text-[13px] font-medium text-[#333] focus:outline-none ${
                              phoneError
                                ? "border-red-300 focus:border-red-400"
                                : "border-[#eee] focus:border-[#E85C9C]"
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
                          <label className="mb-1.5 block px-0.5 text-[11px] font-semibold text-[#666]">
                            Email liên kết
                          </label>
                          <div className="flex items-center justify-between gap-3 rounded-lg border border-[#eee] bg-[#fafafa] px-3 py-2.5">
                            <div className="min-w-0">
                              <div className="truncate text-[13px] font-semibold text-[#444]">
                                {customer.gmail || "email@example.com"}
                              </div>
                              <div className="text-[10px] text-[#999]">
                                Từ đăng nhập Google
                              </div>
                            </div>
                            <div className="shrink-0 rounded bg-emerald-100 px-1.5 py-px text-[10px] font-semibold text-emerald-700">
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
                        <label className="mb-1.5 block px-0.5 text-[11px] font-semibold text-[#666]">
                          {QUICK_BOOK_IG_TEMPORARILY_DISABLED
                            ? "Facebook"
                            : "Instagram / Facebook"}
                          <span className="ml-1 font-normal text-red-500">*</span>
                        </label>
                        {QUICK_BOOK_IG_TEMPORARILY_DISABLED ? (
                          <p className="mb-2 px-1 text-[11px] text-[#888] font-medium">
                            Instagram tạm thời không khả dụng. Vui lòng nhập
                            link Facebook.
                          </p>
                        ) : (
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
                        )}
                        <label className="mb-1 block px-0.5 text-[10px] font-medium text-[#999]">
                          Link profile
                        </label>
                        <input
                          value={customer.ig}
                          onChange={(e) =>
                            setCustomer((c) => ({ ...c, ig: e.target.value }))
                          }
                          placeholder="https://facebook.com/username"
                          className={`w-full rounded-lg border bg-white px-3 py-2.5 text-[13px] font-medium text-[#333] focus:outline-none ${
                            socialLinkError
                              ? "border-red-300 focus:border-red-400"
                              : "border-[#eee] focus:border-[#E85C9C]"
                          }`}
                        />
                        {socialLinkError && (
                          <p className="mt-1 text-xs text-red-600 font-medium">
                            {socialLinkError}
                          </p>
                        )}
                        {!socialLinkError && (
                          <p className="mt-1 text-[11px] text-[#999] px-1">
                            {QUICK_BOOK_IG_TEMPORARILY_DISABLED
                              ? "Dán link Facebook đầy đủ (https://...)."
                              : "Dán link đầy đủ (https://...) đúng với nền tảng đã chọn."}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                {/* Price block — Shopee order summary */}
                <div className="overflow-hidden rounded-xl border border-[#f0f0f0] bg-white">
                  <div className="border-b border-[#f5f5f5] px-3.5 py-3">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-medium text-[#999]">
                          Tổng thanh toán
                        </div>
                        <div className="mt-0.5 text-[22px] font-bold tabular-nums leading-none text-[#E85C9C]">
                          {payableTotal.toLocaleString("vi-VN")}đ
                        </div>
                      </div>
                      {totalSavingsAmount > 0 && (
                        <span className="shrink-0 rounded bg-[#fff0f5] px-2 py-1 text-[11px] font-semibold tabular-nums text-[#E85C9C]">
                          −{totalSavingsAmount.toLocaleString("vi-VN")}đ
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPriceDetail((v) => !v)}
                      className="mt-2 flex items-center gap-0.5 text-[11px] font-semibold text-[#999] transition-colors hover:text-[#E85C9C]"
                    >
                      {showPriceDetail ? "Ẩn chi tiết" : "Xem chi tiết giá"}
                      <ChevronRight
                        size={14}
                        className={`transition-transform ${showPriceDetail ? "rotate-90" : ""}`}
                      />
                    </button>
                  </div>
                  {showPriceDetail && (
                    <div className="space-y-1.5 px-3.5 py-2.5 text-[12px] leading-snug">
                      {rentalInfoPerDevice.map((r) => {
                        const dev = r.device;
                        const days = r.chargeableDays ?? chargeableDays;
                        const fullDays = Math.floor(days);
                        const breakdown =
                          fullDays > 3 ? formatPriceBreakdown(dev, fullDays) : null;
                        return (
                          <div
                            key={dev.id}
                            className="flex justify-between gap-3 text-stone-500"
                          >
                            <span className="min-w-0">
                              {dev.displayName || dev.name}
                              <span className="text-stone-400">
                                {" · "}
                                {breakdown || formatChargeableDaysLabel(days)}
                              </span>
                            </span>
                            <span className="shrink-0 font-bold text-stone-800 tabular-nums">
                              {formatPriceK(r.price || 0)}
                            </span>
                          </div>
                        );
                      })}
                      {priceBreakdown && (
                        <div className="flex justify-between gap-3 border-t border-[#F5EBF0] pt-1.5">
                          <span className="text-stone-500">Tạm tính</span>
                          <span className="font-bold text-stone-800 tabular-nums">
                            {(priceBreakdown.original || 0).toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                      )}
                      {selectedDiscountAmount > 0 && (
                        <div className="flex justify-between gap-3">
                          <span className="text-emerald-700">
                            {selectedDiscountLabel}
                          </span>
                          <span className="font-bold text-emerald-700 tabular-nums">
                            −{selectedDiscountAmount.toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                      )}
                      {pointDiscountAmount > 0 && (
                        <div className="flex justify-between gap-3">
                          <span className="text-emerald-700">
                            Trừ {pointToUse.toLocaleString("vi-VN")} điểm
                          </span>
                          <span className="font-bold text-emerald-700 tabular-nums">
                            −{pointDiscountAmount.toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Order rows — Shopee address/order style */}
                <div className="overflow-hidden rounded-xl border border-[#f0f0f0] bg-white divide-y divide-[#f5f5f5]">
                  <CheckoutRow
                    label="Máy thuê"
                    value={
                      isMulti
                        ? `${effectiveDevices.length} máy`
                        : effectiveDevices[0]?.displayName ||
                          effectiveDevices[0]?.name
                    }
                    hint={isMulti ? checkoutDeviceNames.join(" · ") : null}
                    action={
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="rounded-md border border-[#eee] bg-white px-2 py-1 text-[11px] font-semibold text-[#666] transition-colors hover:border-[#E85C9C]/40 hover:text-[#E85C9C]"
                      >
                        Sửa
                      </button>
                    }
                  />
                  {isValid(t1) && isValid(t2) && (
                    <CheckoutRow
                      label="Thời gian nhận / trả"
                      value={`${format(t1, "HH:mm dd/MM")} → ${format(t2, "HH:mm dd/MM")}`}
                      hint={`${
                        chargeableDays < 1
                          ? "Gói 6 giờ"
                          : `${formatChargeableDaysLabel(chargeableDays)} thuê`
                      } · ${
                        BRANCHES.find((b) => b.id === selectedBranch)?.label ||
                        "cửa hàng"
                      }`}
                    />
                  )}
                  <CheckoutRow
                    label="Khách hàng"
                    value={customer.fullName?.trim() || "-"}
                    hint={
                      customer.phone ? normalizePhone(customer.phone) : null
                    }
                    action={
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="rounded-md border border-[#eee] bg-white px-2 py-1 text-[11px] font-semibold text-[#666] transition-colors hover:border-[#E85C9C]/40 hover:text-[#E85C9C]"
                      >
                        Sửa
                      </button>
                    }
                  />
                </div>

                {/* 3) Điểm thành viên */}
                {isLoggedInUser && (
                  <div className="rounded-xl border border-amber-100 bg-amber-50/40 px-3.5 py-3 space-y-2.5">
                    {maxPointToUse > 0 ? (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-[12px] font-bold text-amber-950">
                            Dùng điểm
                            <span className="font-medium text-amber-900/55">
                              {" · "}có {memberPoint.toLocaleString("vi-VN")}{" "}
                              điểm
                            </span>
                          </span>
                          <span
                            className={
                              pointDiscountAmount > 0
                                ? "shrink-0 text-[12px] font-black text-amber-950 tabular-nums"
                                : "shrink-0 text-[11px] text-amber-900/45"
                            }
                          >
                            {pointDiscountAmount > 0
                              ? `−${pointDiscountAmount.toLocaleString("vi-VN")}đ`
                              : "1 điểm = 1.000đ"}
                          </span>
                        </div>
                        <div className="flex gap-1.5">
                          {pointPresets.map((preset) => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => {
                                setPointToUse(preset.value);
                                setShowPointCustom(false);
                              }}
                              className={`flex-1 rounded-xl border px-2 py-1.5 text-[11px] font-bold transition-colors ${
                                pointToUse === preset.value
                                  ? "border-amber-400 bg-amber-100 text-amber-950"
                                  : "border-amber-200/80 bg-white text-amber-900/60 hover:bg-amber-50"
                              }`}
                            >
                              {preset.label}
                              {preset.value > 0 && (
                                <span className="block text-[10px] font-semibold opacity-60 tabular-nums">
                                  −{(preset.value * 1000).toLocaleString("vi-VN")}đ
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                        {showPointCustom ||
                        (pointToUse > 0 &&
                          !pointPresets.some((p) => p.value === pointToUse)) ? (
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
                                    Math.min(Math.floor(next), maxPointToUse),
                                  ),
                                );
                              }}
                              className="w-20 rounded-lg border border-amber-200 bg-white py-1.5 px-2 text-center text-[13px] font-bold text-stone-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-[#E85C9C]/25"
                            />
                            <span className="text-[11px] text-amber-900/55">
                              điểm · tối đa{" "}
                              {maxPointToUse.toLocaleString("vi-VN")}
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowPointCustom(true)}
                            className="text-[11px] font-bold text-amber-900/45 hover:text-[#C94B86] transition-colors"
                          >
                            Nhập số điểm khác
                          </button>
                        )}
                      </>
                    ) : (
                      memberPoint > 0 && (
                        <p className="text-[11.5px] text-amber-900/55 leading-relaxed">
                          Bạn có {memberPoint.toLocaleString("vi-VN")} điểm.
                          Đơn này chưa trừ được, để dành cho đơn sau nhé.
                        </p>
                      )
                    )}
                    <p className="text-[11px] text-emerald-800/90 leading-relaxed">
                      Đơn này tích thêm +
                      {earnedPointPreview.toLocaleString("vi-VN")} điểm ·{" "}
                      {earnedPointRulePreview}
                    </p>
                  </div>
                )}

                <div className="rounded-lg border border-[#f0f0f0] bg-[#fafafa] px-3.5 py-2.5">
                  <div className="text-[12px] text-[#666] leading-relaxed">
                    Cọc xử lý <strong className="text-[#333]">tại cửa hàng</strong> theo bốn điều cam kết bên dưới.
                  </div>
                </div>
                <div
                  ref={agreementSectionRef}
                  className="rounded-xl border border-[#f0f0f0] bg-white p-3.5 space-y-2"
                >
                  <div className="text-[12px] font-semibold text-[#333]">
                    Cam kết trước khi thanh toán
                  </div>
                  <label
                    className={`flex items-start gap-3 rounded-lg border p-3 text-[12px] leading-relaxed transition-colors ${
                      agreementErrors.noScamElsewhere
                        ? "border-amber-400 bg-amber-50 text-amber-950"
                        : "border-amber-200 bg-amber-50/60 text-amber-950"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={agreeNoScamElsewhere}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setAgreeNoScamElsewhere(checked);
                        setAgreementErrors((prev) => ({
                          ...prev,
                          noScamElsewhere: !checked && prev.noScamElsewhere,
                        }));
                      }}
                      className="mt-1 h-4 w-4 shrink-0 accent-amber-700"
                    />
                    <span>
                      Tôi cam kết <strong>KHÔNG</strong> đang lừa đảo / quỵt
                      máy / chiếm đoạt thiết bị tại bất kỳ shop cho thuê nào
                      khác. Nếu shop phát hiện (qua mạng lưới shop cho thuê,
                      nhóm cộng đồng, hoặc tin báo từ nạn nhân), FAO có quyền{" "}
                      <strong className="uppercase">
                        huỷ đơn ngay lập tức
                      </strong>{" "}
                      và{" "}
                      <strong className="uppercase">không hoàn tiền</strong>{" "}
                      cọc / tiền thuê đã thanh toán; đồng thời chia sẻ{" "}
                      <strong>CCCD – SĐT – Facebook</strong> của tôi vào{" "}
                      <strong className="uppercase">
                        danh sách đen liên shop
                      </strong>{" "}
                      và{" "}
                      <strong className="uppercase">
                        trình báo cơ quan công an
                      </strong>{" "}
                      theo Điều 174 BLHS (tội Lừa đảo chiếm đoạt tài sản).
                    </span>
                  </label>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#f0f0f0] bg-[#fafafa] p-3 text-[12px] leading-relaxed text-[#555] transition-colors hover:border-[#E85C9C]/30">
                    <input
                      type="checkbox"
                      checked={agreeDepositAndPolicies}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setAgreeDepositAndPolicies(checked);
                        setAgreementErrors((prev) => ({
                          ...prev,
                          depositAndPolicies:
                            !checked && prev.depositAndPolicies,
                        }));
                      }}
                      className="mt-1 h-4 w-4 shrink-0 accent-[#E85C9C]"
                    />
                    <span className="space-y-2">
                      {depositCommitmentLines.map((line) => (
                        <span key={line} className="block">
                          {line}
                        </span>
                      ))}
                    </span>
                  </label>
                  {effectiveDevices.length >= 2 && (
                    <label
                      className={`flex items-start gap-3 rounded-xl border p-3 text-[13px] leading-relaxed transition-colors ${
                        agreementErrors.cccdPerDevice
                          ? "border-amber-300 bg-amber-50 text-amber-950"
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
                            cccdPerDevice: !checked && prev.cccdPerDevice,
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
                  <label
                    className={`flex items-start gap-3 rounded-xl border p-3 text-[13px] leading-relaxed transition-colors ${
                      agreementErrors.pickupInPersonAtBranch
                        ? "border-amber-300 bg-amber-50 text-amber-950"
                        : "border-stone-100 bg-stone-50/80 text-stone-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={agreePickupInPersonAtBranch}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setAgreePickupInPersonAtBranch(checked);
                        setAgreementErrors((prev) => ({
                          ...prev,
                          pickupInPersonAtBranch:
                            !checked && prev.pickupInPersonAtBranch,
                        }));
                      }}
                      className="mt-1 h-4 w-4 shrink-0 accent-[#E85C9C]"
                    />
                    <span>
                      Tôi sẽ nhận máy trực tiếp tại{" "}
                      <strong className="text-stone-900">
                        {selectedBranchPickupAddress ||
                          "địa chỉ cửa hàng chi nhánh đã chọn"}
                      </strong>
                      .
                    </span>
                  </label>
                </div>
                {error && (
                  <div className="p-3.5 bg-red-50 text-red-800 rounded-xl text-[13px] font-semibold leading-relaxed border border-red-200/90">
                    {error}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer — Shopee/TikTok sticky checkout bar */}
          <div className="shrink-0 border-t border-[#f0f0f0] bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-medium text-[#999]">
                  {step === 3 ? "Thanh toán" : "Tạm tính"}
                </div>
                <div className="text-[18px] font-bold tabular-nums leading-tight text-[#E85C9C]">
                  {payableTotal.toLocaleString("vi-VN")}đ
                </div>
                {totalSavingsAmount > 0 && step < 3 && (
                  <div className="text-[10px] font-medium text-[#E85C9C]/80">
                    Tiết kiệm {totalSavingsAmount.toLocaleString("vi-VN")}đ
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    className="min-h-[44px] rounded-lg border border-[#ddd] px-4 text-[13px] font-semibold text-[#555] transition-colors hover:bg-[#fafafa] active:scale-[0.98]"
                  >
                    Quay lại
                  </button>
                )}
                {step < 3 ? (
                  <button
                    type="button"
                    onClick={async () => {
                      if (step === 2 && isCustomerValid) {
                        const snap = buildCustomerInfoSnapshot(
                          customer,
                          effectiveSocialPlatform,
                        );
                        if (
                          isCustomerInfoSnapshotDifferent(
                            loadCustomerInfo(),
                            snap,
                          )
                        ) {
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
                      (step === 2 &&
                        (!isCustomerValid ||
                          !isAvailable ||
                          isCheckingAvailability)) ||
                      (step === 3 &&
                        (!isAvailable || isCheckingAvailability))
                    }
                    className="min-h-[44px] min-w-[120px] rounded-lg bg-[#E85C9C] px-5 text-[14px] font-bold text-white shadow-sm transition-all hover:bg-[#d94d8a] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#ddd] disabled:text-[#999] disabled:shadow-none"
                  >
                    {step === 1 ? "Tiếp tục" : "Xác nhận"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={
                      !isCustomerValid ||
                      isSubmitting ||
                      !isAvailable ||
                      isCheckingAvailability
                    }
                    className="flex min-h-[44px] min-w-[140px] items-center justify-center gap-2 rounded-lg bg-[#E85C9C] px-5 text-[14px] font-bold text-white shadow-sm transition-all hover:bg-[#d94d8a] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#ddd] disabled:text-[#999]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Đang xử lý
                      </>
                    ) : isCheckingAvailability ? (
                      "Đang kiểm tra"
                    ) : (
                      "Thanh toán"
                    )}
                  </button>
                )}
              </div>
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
            className="fixed left-3 right-3 top-1/2 z-[126] mx-auto max-w-md -translate-y-1/2 rounded-2xl border border-[#f0f0f0] bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="cccd-confirm-title"
              className="text-base font-bold text-[#222] mb-2"
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
              . Mỗi máy một giấy tờ chính chủ (hoặc VNeID định danh mức 2 theo
              quy định cửa hàng). Bạn xác nhận đã hiểu và đồng ý tiếp tục thanh
              toán?
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setShowCccdConfirmDialog(false)}
                className="flex-1 min-h-[44px] rounded-lg border border-[#ddd] text-[13px] font-semibold text-[#555] transition-colors hover:bg-[#fafafa]"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={handleCccdDialogConfirm}
                disabled={isSubmitting}
                className="flex-1 min-h-[44px] rounded-lg bg-[#E85C9C] text-[13px] font-bold text-white transition-all hover:bg-[#d94d8a] disabled:opacity-50"
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

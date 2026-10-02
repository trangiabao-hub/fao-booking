import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useLayoutEffect,
  useRef,
} from "react";
import { format, addDays, isValid } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { signInWithPopup } from "firebase/auth";
import {
  X,
  Clock,
  User,
  Phone,
  Mail,
  Check,
  ChevronLeft,
  ChevronRight,
  Gift,
  Loader2,
  Aperture,
  BatteryCharging,
  Package,
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
import {
  GOOGLE_LOGIN_EMBEDDED_BROWSER_HINT_VI,
  isLikelyEmbeddedBrowser,
  resolveGoogleSignInError,
} from "../utils/googleSignInEnvironment";
import EmbeddedBrowserGoogleHint from "./EmbeddedBrowserGoogleHint";
import GoogleSignInButton from "./GoogleSignInButton";
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
} from "../utils/loyaltyEarn";
import {
  calculateRentalInfo,
  computeShopPartnerBreakdown,
  roundDownToThousand,
} from "../utils/pricing";
import { useShopMembership } from "../hooks/useShopMembership";
import { getStrictestReleaseDate } from "../utils/deviceReleaseDate";
import {
  formatPickupMomentVi,
  formatPickupReturnRangeVi,
  formatReturnMomentVi,
} from "../utils/catalogDatetime";
import {
  DEPOSIT_POLICY_NOTES,
  formatCompactVnd,
  formatDepositNoteLine,
  getDepositMethodOptions,
  getDepositMethodSummaryLabel,
} from "../utils/bookingDepositPolicy";
import BookingPrefsForm, {
  computeAvailabilityRange,
  getAvailabilityRangeError,
} from "./BookingPrefsForm";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import RentalRulesModal from "./RentalRulesModal";
import PhotoboothGiftBlock from "./PhotoboothGiftBlock";

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

function pickStoredSocialLink(source) {
  const ig = (source?.ig || "").trim();
  const fb = (source?.fb || "").trim();
  if (isUrlForPlatform(ig, "instagram")) return ig;
  if (isUrlForPlatform(fb, "facebook")) return fb;
  if (isUrlForPlatform(ig, "facebook")) return ig;
  if (isUrlForPlatform(fb, "instagram")) return fb;
  return ig || fb;
}

function isFilledName(name) {
  return (name || "").trim().length >= 2;
}

function isFilledPhone(phone) {
  return /^0\d{9}$/.test(normalizePhone(phone));
}

function isFilledSocial(link) {
  return (
    isUrlForPlatform(link, "instagram") || isUrlForPlatform(link, "facebook")
  );
}

/** Chỉ lấp ô trống / sai — không đè thông tin khách đang nhập. */
function mergeCustomerFromAccount(current, account = {}, saved = {}) {
  const next = {
    fullName: isFilledName(current.fullName)
      ? current.fullName
      : account.fullName || saved.fullName || current.fullName || "",
    phone: isFilledPhone(current.phone)
      ? current.phone
      : normalizeValidPhoneOrEmpty(account.phone) ||
        normalizeValidPhoneOrEmpty(saved.phone) ||
        current.phone ||
        "",
    gmail: isValidEmail(current.gmail)
      ? current.gmail
      : account.email || saved.gmail || current.gmail || "",
    ig: isFilledSocial(current.ig)
      ? current.ig
      : pickStoredSocialLink({
          ig: account.ig || saved.ig,
          fb: account.fb || saved.fb,
        }) ||
        current.ig ||
        "",
  };
  if (
    next.fullName === (current.fullName || "") &&
    next.phone === (current.phone || "") &&
    next.gmail === (current.gmail || "") &&
    next.ig === (current.ig || "")
  ) {
    return current;
  }
  return { ...current, ...next };
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
  return isFilledSocial(pickStoredSocialLink(saved));
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

/** Pin / chân máy / lens lấy từ Device config (BE) — giá theo mốc thời lượng thuê. */
const DURATION_TIER_LABEL = {
  SixHours: "6 tiếng",
  OneDay: "1 ngày",
  TwoDay: "2 ngày",
  ThreeDay: "3 ngày",
};

const FREE_BATTERY_COUNT = 2;
const EXTRA_BATTERY_QTY_OPTIONS = [1, 2, 3];
/** Dùng khi model chưa có Device config hoặc config chưa nhập giá pin cho mốc đó. */
const DEFAULT_BATTERY_PRICE_PER_DAY = 50000;
const DURATION_TIER_DAYS = { SixHours: 1, OneDay: 1, TwoDay: 2, ThreeDay: 3 };

/** Nhiều ngày hơn mốc "3 ngày" vẫn dùng chung giá đó — không cộng dồn theo số ngày thực tế. */
function pickUpsellDurationTierKey(chargeableDays) {
  const days = Number(chargeableDays) || 0;
  if (days < 1) return "SixHours";
  if (days <= 1) return "OneDay";
  if (days <= 2) return "TwoDay";
  return "ThreeDay";
}

function StepProgressBar({ step }) {
  return (
    <ol
      aria-label="Các bước đặt máy"
      className="flex shrink-0 items-center gap-2 border-b border-[#f0eeec] bg-white px-4 py-2.5 sm:px-5"
    >
      {QUICK_BOOK_STEPS.map((s, i) => {
        const done = step > s.id;
        const current = step === s.id;
        return (
          <li
            key={s.id}
            aria-current={current ? "step" : undefined}
            className={`flex min-w-0 items-center gap-2 ${
              i < QUICK_BOOK_STEPS.length - 1 ? "flex-1" : ""
            }`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums transition-colors ${
                current
                  ? "bg-[#E85C9C] text-white"
                  : done
                    ? "bg-[#222] text-white"
                    : "bg-[#f0eeec] text-[#a3a09d]"
              }`}
            >
              {done ? <Check size={12} strokeWidth={3} /> : s.id}
            </span>
            <span
              className={`min-w-0 truncate text-[12px] font-semibold ${
                current ? "text-[#1f1f1f]" : done ? "text-[#555]" : "text-[#a3a09d]"
              }`}
            >
              {s.label}
            </span>
            {i < QUICK_BOOK_STEPS.length - 1 ? (
              <span
                aria-hidden
                className={`h-[2px] min-w-3 flex-1 rounded-full ${
                  done ? "bg-[#222]" : "bg-[#f0eeec]"
                }`}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
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

/** iOS Safari tự zoom khi focus input có font < 16px, nên mobile giữ text-base. */
function contactFieldClass(hasError) {
  return `min-h-[46px] w-full rounded-xl border px-3.5 py-2.5 text-base font-medium text-[#1f1f1f] placeholder:text-[#b5b0ab] transition-colors focus:outline-none sm:text-[14px] ${
    hasError
      ? "border-red-400 bg-red-50 focus:border-red-500"
      : "border-[#ebe8e5] bg-white focus:border-[#E85C9C] focus:ring-2 focus:ring-[#E85C9C]/15"
  }`;
}

function agreementRowClass(checked, hasError, tone = "default") {
  const base =
    "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-[12.5px] leading-relaxed transition-colors";
  if (hasError) return `${base} border-red-300 bg-red-50/70 text-[#3a3532]`;
  if (checked) return `${base} border-[#E85C9C]/35 bg-[#fff8fb] text-[#3a3532]`;
  if (tone === "warning") return `${base} border-amber-200 bg-amber-50/60 text-amber-950`;
  return `${base} border-[#ebe8e5] bg-white text-[#55504b] hover:border-[#d9d5d1]`;
}

const AGREEMENT_CHECKBOX_CLASS =
  "mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer accent-[#E85C9C]";

const CONTACT_LABEL_CLASS =
  "mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-[#55504b]";

function CheckoutRow({ label, value, hint, action, onPress }) {
  const interactive = typeof onPress === "function";
  const Wrapper = interactive ? "button" : "div";
  return (
    <Wrapper
      type={interactive ? "button" : undefined}
      onClick={onPress}
      className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left ${
        interactive
          ? "transition-colors hover:bg-[#fafafa] active:bg-[#f5f5f5]"
          : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[11.5px] font-medium text-[#a3a09d]">{label}</div>
        <div className="mt-0.5 text-[14px] font-semibold text-[#1f1f1f] leading-snug break-words">
          {value}
        </div>
        {hint ? (
          <div className="mt-0.5 text-[12px] text-[#8a8580] leading-relaxed line-clamp-2">
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

function CheckoutModeSegment({ checkoutMode, setCheckoutMode, earnPoints = 0 }) {
  const points = Math.max(0, Math.floor(Number(earnPoints) || 0));
  const earnVndLabel = `${(points * 1000).toLocaleString("vi-VN")}đ`;
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
    <div>
      <div
        role="radiogroup"
        aria-label="Cách đặt đơn"
        className="grid grid-cols-2 gap-1 rounded-xl bg-[#ebe8e5] p-1"
      >
        {options.map((opt) => {
          const active = checkoutMode === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setCheckoutMode(opt.id)}
              className={`rounded-lg px-3 py-2 text-left transition-all active:scale-[0.98] ${
                active
                  ? "bg-white shadow-[0_1px_3px_rgba(31,20,25,0.12)]"
                  : "hover:bg-white/50"
              }`}
            >
              <span
                className={`block text-[13px] font-bold leading-tight ${
                  active ? "text-[#1f1f1f]" : "text-[#77716c]"
                }`}
              >
                {opt.title}
              </span>
              <span
                className={`mt-0.5 block text-[11px] leading-snug ${
                  active ? "text-[#888]" : "text-[#a3a09d]"
                }`}
              >
                {opt.subtitle}
              </span>
            </button>
          );
        })}
      </div>
      {points > 0 ? (
        <p className="mt-2 px-1 text-[11.5px] leading-snug text-[#77716c]">
          Đăng nhập để được cộng{" "}
          <span className="font-bold text-[#E85C9C]">
            {points.toLocaleString("vi-VN")} điểm
          </span>{" "}
          (≈ {earnVndLabel}) cho đơn này.
        </p>
      ) : null}
    </div>
  );
}

function CheckoutSection({ title, subtitle, badge, children, error = false }) {
  return (
    <section
      className={`overflow-hidden rounded-2xl bg-white transition-shadow ${
        error ? "ring-2 ring-red-400" : "ring-1 ring-black/[0.06]"
      }`}
    >
      <div className="flex items-start gap-3 px-4 pt-3.5">
        <div className="min-w-0 flex-1">
          <h3 className="text-[14px] font-bold leading-tight text-[#1f1f1f]">
            {title}
          </h3>
          {subtitle ? (
            <p
              className={`mt-0.5 text-[12px] leading-snug ${
                error ? "font-medium text-red-600" : "text-[#8a8580]"
              }`}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>
      {children}
    </section>
  );
}

function ShopPartnerNotice({ shopName }) {
  return (
    <CheckoutSection
      title={`Đối tác · ${shopName}`}
      subtitle="Không cần cọc — đặt lịch giữ máy, thanh toán sau."
    >
      <ul className="space-y-1.5 px-4 pb-3.5 pt-3 text-[12.5px] leading-snug text-[#55504b]">
        <li>• Giá đối tác: T2–T6 giảm 25%, T7/CN giảm 5% (ngày lễ giữ giá gốc).</li>
        <li>• Lịch được giữ ngay sau khi đặt, đơn hiện ở mục “Chưa thanh toán”.</li>
        <li>• Thanh toán gộp nhiều đơn online trong trang Đơn của tôi.</li>
      </ul>
    </CheckoutSection>
  );
}

function DepositMethodPicker({
  devices,
  selectedId,
  onSelect,
  error,
}) {
  const options = getDepositMethodOptions(devices);
  return (
    <CheckoutSection
      title="Hình thức cọc"
      subtitle={
        error && !selectedId
          ? "Chọn 1 hình thức để tiếp tục."
          : "Chỉ chọn trước — cọc làm tại cửa hàng khi nhận máy."
      }
      error={error && !selectedId}
    >
      <div
        role="radiogroup"
        aria-label="Hình thức cọc"
        className="space-y-2 px-4 pb-3 pt-3"
      >
        {options.map((option) => {
          const active = selectedId === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSelect(option.id)}
              className={`w-full rounded-xl border px-3.5 py-3 text-left transition-all active:scale-[0.99] ${
                active
                  ? "border-[#E85C9C] bg-[#fff5f9] shadow-[0_0_0_1px_#E85C9C]"
                  : "border-[#ebe8e5] bg-white hover:border-[#d9d5d1]"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    active ? "border-[#E85C9C]" : "border-[#cfcac5]"
                  }`}
                >
                  {active ? (
                    <span className="h-2 w-2 rounded-full bg-[#E85C9C]" />
                  ) : null}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-1.5">
                    <span className="text-[14px] font-bold text-[#1f1f1f]">
                      {option.title}
                    </span>
                    <span className="text-[11px] font-semibold text-[#a3a09d]">
                      {option.code}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12.5px] font-medium text-[#555]">
                    {option.audience}
                  </p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#8a8580]">
                    {option.detail}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <ul className="mx-4 mb-4 space-y-1 rounded-xl bg-[#faf8f6] px-3.5 py-2.5">
        {DEPOSIT_POLICY_NOTES.map((line) => (
          <li
            key={line}
            className="flex gap-2 text-[11.5px] leading-relaxed text-[#77716c]"
          >
            <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#c4beb8]" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </CheckoutSection>
  );
}

function UpsellChoiceCard({ option, active, onSelect }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={() => onSelect(option.id)}
      className={`w-full px-3 py-2.5 text-left transition-all active:scale-[0.99] rounded-lg border ${
        active
          ? "border-[#E85C9C] bg-[#fff0f5]"
          : "border-[#f0f0f0] bg-white hover:bg-[#fafafa]"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
            active ? "border-[#E85C9C] bg-[#E85C9C]" : "border-[#ccc] bg-white"
          }`}
        >
          {active ? <Check size={10} className="text-white" strokeWidth={3} /> : null}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="text-[12.5px] font-bold text-[#222]">
              {option.label}
            </span>
            {option.recommended && (
              <span className="inline-flex items-center gap-0.5 rounded bg-[#E85C9C]/10 px-1.5 py-0.5 text-[9.5px] font-black uppercase tracking-wide text-[#E85C9C]">
                <Sparkles size={9} /> Gợi ý
              </span>
            )}
            {option.tag && !option.recommended && (
              <span className="rounded bg-[#f5f5f5] px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[#999]">
                {option.tag}
              </span>
            )}
          </div>
          {option.detail && (
            <p className="mt-0.5 text-[11px] leading-snug text-[#888]">
              {option.detail}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 text-[12.5px] font-black tabular-nums ${
            option.price > 0 ? "text-[#E85C9C]" : "text-[#aaa]"
          }`}
        >
          {option.priceText ||
            (option.price > 0
              ? `+${option.price.toLocaleString("vi-VN")}đ`
              : "Miễn phí")}
        </span>
      </div>
    </button>
  );
}

function UpsellAccessoriesSection({
  hasDeviceConfig,
  showBattery,
  lensOptions,
  lensId,
  onLensChange,
  batteryOptions,
  batteryQty,
  onBatteryQtyChange,
  tripodOptions,
  tripodId,
  onTripodChange,
  upsellTotal,
  onClearAll,
}) {
  const [expanded, setExpanded] = useState(false);
  const hasSelection = upsellTotal > 0;
  const showLens = hasDeviceConfig && lensOptions.length > 1;
  const showTripod = hasDeviceConfig && tripodOptions.length > 1;
  const selectedLens = lensOptions.find((o) => o.id === lensId && o.id !== "none");
  const selectedTripod = tripodOptions.find((o) => o.id === tripodId && o.id !== "none");
  const summaryRows = [
    showBattery && {
      key: "battery",
      icon: BatteryCharging,
      label: batteryQty > 0 ? `Pin +${batteryQty}` : "Pin",
      selected: batteryQty > 0,
    },
    showTripod && {
      key: "tripod",
      icon: Package,
      label: "Chân máy",
      selected: !!selectedTripod,
    },
    showLens && { key: "lens", icon: Aperture, label: "Lens", selected: !!selectedLens },
  ].filter(Boolean);

  return (
    <div
      className={`overflow-hidden rounded-2xl bg-white ring-1 transition-shadow ${
        hasSelection ? "ring-[#E85C9C]/40" : "ring-black/[0.06]"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="block w-full px-4 py-3.5 text-left transition-colors hover:bg-[#fafafa]"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#fff0f5] text-[#E85C9C]">
            <Sparkles size={14} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-bold leading-tight text-[#1f1f1f]">
              Thuê thêm phụ kiện
            </div>
            <p className="mt-0.5 text-[12px] leading-snug text-[#8a8580]">
              Không bắt buộc · chỉ chọn nếu cần
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-1">
            {hasSelection ? (
              <span className="text-[11.5px] font-bold tabular-nums text-[#E85C9C]">
                +{upsellTotal.toLocaleString("vi-VN")}đ
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-[#999]">
                {expanded ? "Thu gọn" : "Chọn"}
              </span>
            )}
            <ChevronRight
              size={15}
              className={`text-[#bbb] transition-transform ${expanded ? "rotate-90" : ""}`}
            />
          </span>
        </div>

        {!expanded && (
          <div className="mt-2.5 flex flex-wrap gap-1.5 pl-[38px]">
            {summaryRows.map((row) => {
              const Icon = row.icon;
              return (
                <span
                  key={row.key}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold ${
                    row.selected
                      ? "border-[#E85C9C]/50 bg-[#fff0f5] text-[#E85C9C]"
                      : "border-[#eee] bg-[#fafafa] text-[#555]"
                  }`}
                >
                  {row.selected ? (
                    <Check size={12} strokeWidth={3} />
                  ) : (
                    <Icon size={12} className="text-[#888]" />
                  )}
                  {row.label}
                </span>
              );
            })}
          </div>
        )}
      </button>

      {expanded && (
      <div className="space-y-4 border-t border-[#f5f5f5] p-3.5">
        {showBattery && (
        <div>
          <div className="mb-1.5 flex items-center gap-1.5">
            <BatteryCharging size={13} className="text-[#666]" />
            <span className="text-[11.5px] font-bold text-[#333]">Pin</span>
          </div>
          <div role="radiogroup" aria-label="Thuê thêm pin" className="grid grid-cols-4 gap-1.5">
            {batteryOptions.map((opt) => {
              const active = batteryQty === opt.qty;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onBatteryQtyChange(opt.qty)}
                  className={`rounded-lg border px-1 py-2 text-center transition-colors ${
                    active
                      ? "border-[#E85C9C] bg-[#fff0f5]"
                      : "border-[#f0f0f0] bg-white hover:bg-[#fafafa]"
                  }`}
                >
                  <span className="block text-[12.5px] font-black text-[#222]">
                    {opt.qty === 0 ? `${FREE_BATTERY_COUNT} pin` : `+${opt.qty} pin`}
                  </span>
                  <span
                    className={`mt-0.5 block text-[10px] font-semibold tabular-nums leading-tight ${
                      opt.qty === 0 ? "text-[#999]" : "text-[#E85C9C]"
                    }`}
                  >
                    {opt.qty === 0 ? "Kèm máy" : opt.priceText.replace(/^\+/, "")}
                  </span>
                  <span
                    className={`mt-1 block text-[10px] font-medium leading-tight ${
                      active ? "text-[#222]" : "text-[#999]"
                    }`}
                  >
                    Nhận {FREE_BATTERY_COUNT + opt.qty} pin
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        )}

        {showTripod && (
          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <Package size={13} className="text-[#666]" />
              <span className="text-[11.5px] font-bold text-[#333]">
                Thuê thêm chân máy
              </span>
            </div>
            <div role="radiogroup" aria-label="Thuê thêm chân máy" className="space-y-1.5">
              {tripodOptions.map((opt) => (
                <UpsellChoiceCard
                  key={opt.id}
                  option={opt}
                  active={tripodId === opt.id}
                  onSelect={onTripodChange}
                />
              ))}
            </div>
          </div>
        )}

        {showLens && (
          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <Aperture size={13} className="text-[#666]" />
              <span className="text-[11.5px] font-bold text-[#333]">
                Thuê thêm lens
              </span>
            </div>
            <div role="radiogroup" aria-label="Thuê thêm lens" className="space-y-1.5">
              {lensOptions.map((opt) => (
                <UpsellChoiceCard
                  key={opt.id}
                  option={opt}
                  active={lensId === opt.id}
                  onSelect={onLensChange}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-0.5">
          {hasSelection ? (
            <button
              type="button"
              onClick={onClearAll}
              className="text-[11px] font-semibold text-[#999] transition-colors hover:text-[#E85C9C]"
            >
              Bỏ chọn tất cả
            </button>
          ) : (
            <span className="text-[11px] text-[#aaa]">Không cần? Cứ bỏ qua</span>
          )}
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="rounded-md border border-[#eee] px-3 py-1 text-[11px] font-bold text-[#666] transition-colors hover:border-[#E85C9C]/40 hover:text-[#E85C9C]"
          >
            {hasSelection ? "Xong" : "Thu gọn"}
          </button>
        </div>
      </div>
      )}
    </div>
  );
}

function PointPickerModal({
  isOpen,
  onClose,
  memberPoint,
  maxPointToUse,
  presets,
  currentValue,
  payableBeforePoint,
  onApply,
}) {
  const [draft, setDraft] = useState(currentValue);

  useEffect(() => {
    if (isOpen) setDraft(currentValue);
  }, [isOpen, currentValue]);

  const clampedDraft = Math.max(0, Math.min(Math.floor(Number(draft) || 0), maxPointToUse));
  const remaining = Math.max(0, payableBeforePoint - clampedDraft * 1000);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[125] bg-black/55 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="point-picker-title"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="fixed left-3 right-3 top-1/2 z-[126] mx-auto max-w-sm -translate-y-1/2 rounded-2xl border border-[#f0f0f0] bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 id="point-picker-title" className="text-base font-bold text-[#222]">
                  Dùng điểm
                </h3>
                <p className="mt-0.5 text-[12px] text-[#888]">
                  Bạn có {memberPoint.toLocaleString("vi-VN")} điểm · 1 điểm = 1.000đ
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng"
                className="rounded-full p-1 text-[#999] transition-colors hover:bg-[#f5f5f5] hover:text-[#333]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {presets.map((preset) => {
                const active = clampedDraft === preset.value;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setDraft(preset.value)}
                    className={`rounded-xl border px-2 py-2.5 text-center transition-colors ${
                      active
                        ? "border-amber-400 bg-amber-50 text-amber-950"
                        : "border-[#eee] bg-white text-[#555] hover:bg-[#fafafa]"
                    }`}
                  >
                    <span className="block text-[12px] font-bold">{preset.label}</span>
                    <span className="mt-0.5 block text-[10.5px] font-semibold tabular-nums opacity-60">
                      {preset.value > 0
                        ? `−${(preset.value * 1000).toLocaleString("vi-VN")}đ`
                        : "Để dành"}
                    </span>
                  </button>
                );
              })}
            </div>

            <label className="mt-3 flex items-center gap-2 rounded-xl border border-[#eee] px-3 py-2">
              <span className="text-[12px] text-[#666]">Số điểm khác</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={maxPointToUse}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => setDraft(clampedDraft)}
                className="ml-auto w-24 rounded-lg border border-[#eee] bg-[#fafafa] px-2 py-1 text-right text-[13px] font-bold tabular-nums text-[#222] focus:outline-none focus:ring-2 focus:ring-[#E85C9C]/25"
              />
            </label>
            <p className="mt-1.5 text-[11px] text-[#aaa]">
              Đơn này dùng tối đa {maxPointToUse.toLocaleString("vi-VN")} điểm
            </p>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-[#fafafa] px-3 py-2.5">
              <span className="text-[12px] text-[#666]">Còn thanh toán</span>
              <span className="text-[16px] font-bold tabular-nums text-[#E85C9C]">
                {remaining.toLocaleString("vi-VN")}đ
              </span>
            </div>

            <button
              type="button"
              onClick={() => onApply(clampedDraft)}
              className="mt-3 min-h-[44px] w-full rounded-lg bg-[#E85C9C] text-[13px] font-bold text-white transition-colors hover:bg-[#d94d8a]"
            >
              {clampedDraft > 0
                ? `Dùng ${clampedDraft.toLocaleString("vi-VN")} điểm`
                : "Không dùng điểm"}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

const NO_DEVICES = [];

export default function QuickBookModal({
  device,
  devices = NO_DEVICES,
  modelGroupDevices = NO_DEVICES,
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
  // Parent dựng lại mảng này mỗi lần render (realtime refresh) — đọc qua ref để không kích hoạt check lịch lại.
  const modelGroupDevicesRef = useRef(modelGroupDevices);
  modelGroupDevicesRef.current = modelGroupDevices;
  const baseDevicesKey = baseDevicesForProps.map((d) => String(d?.id)).join(",");
  const baseDevicesRef = useRef(baseDevicesForProps);
  baseDevicesRef.current = baseDevicesForProps;

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

  const [upsellConfig, setUpsellConfig] = useState(null);
  const upsellModelKey = (effectiveDevices[0]?.modelKey || "").trim();

  useEffect(() => {
    if (!isOpen || !upsellModelKey) {
      setUpsellConfig(null);
      return;
    }
    let cancelled = false;
    api
      .get(`/v1/device-upsell-configs/for-model/${encodeURIComponent(upsellModelKey)}`)
      .then((res) => {
        if (!cancelled) setUpsellConfig(res.data || null);
      })
      .catch(() => {
        if (!cancelled) setUpsellConfig(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, upsellModelKey]);

  /** Reset lựa chọn phụ kiện khi đổi sang máy có config khác (id đổi) hoặc hết config. */
  useEffect(() => {
    setUpsellLensId("none");
    setUpsellTripodId("none");
    setUpsellBatteryQty(0);
  }, [upsellConfig?.id]);

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
  /** Mọi thiết bị (mọi chi nhánh) kèm booking trùng khung giờ — null khi chưa tra được. */
  const [slotBookingRows, setSlotBookingRows] = useState(null);
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
    const saved = loadCustomerInfo();
    const detected = detectSocialPlatformFromLink(pickStoredSocialLink(saved));
    if (detected) return detected;
    const hasFb = !!(saved?.fb || "").trim();
    const hasIg = !!(saved?.ig || "").trim();
    if (hasFb && !hasIg) return "facebook";
    return "instagram";
  });
  const [savedCustomer, setSavedCustomer] = useState(() => loadCustomerInfo());
  const memberHydratedRef = useRef(false);
  const effectiveSocialPlatform = socialPlatform;
  const [checkoutMode, setCheckoutMode] = useState("GOOGLE");
  const [hasGoogleSession, setHasGoogleSession] = useState(
    () => !!loadCustomerSession()?.token,
  );
  const [memberTotalSpent, setMemberTotalSpent] = useState(0);
  const [memberPoint, setMemberPoint] = useState(0);
  const [pointToUse, setPointToUse] = useState(0);
  const { shop: shopPartner } = useShopMembership(isOpen && hasGoogleSession);
  const isShopPartner = hasGoogleSession && !!shopPartner;
  const [isMemberDataLoading, setIsMemberDataLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [agreeNoScamElsewhere, setAgreeNoScamElsewhere] = useState(false);
  const [agreePickupInPersonAtBranch, setAgreePickupInPersonAtBranch] =
    useState(false);
  const [agreeCccdPerDevice, setAgreeCccdPerDevice] = useState(false);
  const [agreeRentalRules, setAgreeRentalRules] = useState(false);
  const [showRentalRulesModal, setShowRentalRulesModal] = useState(false);
  const [selectedDepositMethod, setSelectedDepositMethod] = useState(null);
  const [agreementErrors, setAgreementErrors] = useState({
    noScamElsewhere: false,
    pickupInPersonAtBranch: false,
    depositMethod: false,
    cccdPerDevice: false,
    rentalRules: false,
  });
  const [showPointPicker, setShowPointPicker] = useState(false);
  const [upsellLensId, setUpsellLensId] = useState("none");
  const [upsellBatteryQty, setUpsellBatteryQty] = useState(0);
  const [upsellTripodId, setUpsellTripodId] = useState("none");
  const agreementSectionRef = useRef(null);
  const depositSectionRef = useRef(null);
  const contentScrollRef = useRef(null);
  /** Bỏ qua scroll-lên-đầu khi đổi step để nhường cho scroll tới field đang lỗi. */
  const skipStepScrollTopRef = useRef(false);
  const googleLoginRef = useRef(null);
  const contactFormRef = useRef(null);
  const fullNameInputRef = useRef(null);
  const phoneInputRef = useRef(null);
  const gmailInputRef = useRef(null);
  const socialInputRef = useRef(null);
  const cccdConfirmedRef = useRef(false);
  const [showStep2Errors, setShowStep2Errors] = useState(false);
  const selectedBranchPickupAddress = useMemo(() => {
    const b = BRANCHES.find((x) => x.id === selectedBranch);
    return (b?.address || "").trim();
  }, [selectedBranch]);
  const selectedDepositLabel = getDepositMethodSummaryLabel(
    selectedDepositMethod,
    effectiveDevices,
  );

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
    setAgreeRentalRules(false);
    setShowRentalRulesModal(false);
    setSelectedDepositMethod(null);
    setShowStep2Errors(false);
    setUpsellLensId("none");
    setUpsellBatteryQty(0);
    setUpsellTripodId("none");
    setAgreementErrors({
      noScamElsewhere: false,
      pickupInPersonAtBranch: false,
      depositMethod: false,
      cccdPerDevice: false,
      rentalRules: false,
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
    if (isShopPartner) {
      return rentalInfoPerDevice.reduce((sum, r) => {
        const b = computeShopPartnerBreakdown(r?.price || 0, t1, t2);
        return sum + (b ? b.discounted : 0);
      }, 0);
    }
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
    isShopPartner,
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
    if (isShopPartner && price > 0 && isValidDateRange(t1, t2)) {
      const original = rentalInfoPerDevice.reduce(
        (s, r) => s + roundDownToThousand(r?.price || 0),
        0,
      );
      const discount = Math.max(0, original - discountedTotal);
      base = {
        original,
        discount,
        discounted: discountedTotal,
        discountLabel:
          discount > 0
            ? `Giá đối tác ${shopPartner.shopName} (T2–T6 −25%, T7/CN −5%)`
            : null,
      };
    } else if (selectedBranch === "Q9" && price > 0 && isValidDateRange(t1, t2)) {
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
    isShopPartner,
    shopPartner,
    discountedTotal,
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
  const availabilityRequestIdRef = useRef(0);
  const checkAvailability = useCallback(async () => {
    const baseDevicesForProps = baseDevicesRef.current;
    const modelGroupDevices = modelGroupDevicesRef.current;
    if (
      baseDevicesForProps.length === 0 ||
      !isValidDateRange(t1, t2) ||
      timeSelectionError
    )
      return;
    const requestId = ++availabilityRequestIdRef.current;
    const isStale = () => requestId !== availabilityRequestIdRef.current;
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
        if (isStale()) return;
        const data = (resp.data || []).map(filterRowBySlot);
        setSlotBookingRows(data);
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
        if (isStale()) return;
        const data = (resp.data || []).map(filterRowBySlot);
        setSlotBookingRows(data);
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
      if (isStale()) return;
      const data = (resp.data || []).map(filterRowBySlot);
      setSlotBookingRows(data);
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
      if (isStale()) return;
      console.error("Availability check failed:", err);
      setSlotBookingRows(null);
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
      if (!isStale()) setIsCheckingAvailability(false);
    }
  }, [
    canPickSameModelQuantity,
    isTrueMultiModelSelection,
    sameModelQuantity,
    t1,
    t2,
    selectedBranch,
    selectedDuration,
    timeSelectionError,
  ]);

  useEffect(() => {
    if (isOpen && baseDevicesKey) {
      checkAvailability();
    }
  }, [
    isOpen,
    baseDevicesKey,
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
    if (skipStepScrollTopRef.current) {
      skipStepScrollTopRef.current = false;
      return;
    }
    contentScrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [step]);

  useBodyScrollLock(isOpen && effectiveDevices.length > 0);

  const persistMergedCustomer = useCallback((next, fallbackPlatform) => {
    const detected = detectSocialPlatformFromLink(next.ig);
    const snap = buildCustomerInfoSnapshot(
      next,
      detected || fallbackPlatform || "instagram",
    );
    saveCustomerInfo(snap);
    setSavedCustomer(snap);
    return snap;
  }, []);

  const applyAccountToForm = useCallback(
    (account, extraSaved) => {
      const saved = extraSaved || loadCustomerInfo() || {};
      setCustomer((c) => {
        const next = mergeCustomerFromAccount(c, account, saved);
        if (next !== c) persistMergedCustomer(next);
        return next;
      });
      setMemberPoint(Math.max(0, Number(account.point) || 0));
    },
    [persistMergedCustomer],
  );

  useEffect(() => {
    if (!isOpen) {
      memberHydratedRef.current = false;
      return;
    }
    const saved = loadCustomerInfo() || {};
    setSavedCustomer(saved);
    setCustomer((c) => mergeCustomerFromAccount(c, {}, saved));
    const detected = detectSocialPlatformFromLink(pickStoredSocialLink(saved));
    if (detected) setSocialPlatform(detected);

    const session = loadCustomerSession();
    if (!session?.token) {
      setHasGoogleSession(false);
      setMemberTotalSpent(0);
      setMemberPoint(0);
      setIsMemberDataLoading(false);
      return;
    }
    if (memberHydratedRef.current) return;

    let mounted = true;
    const hasLocalProfile =
      isFilledName(saved.fullName) && isFilledPhone(saved.phone);
    if (!hasLocalProfile) setIsMemberDataLoading(true);
    Promise.all([api.get("/account"), api.get("/v1/bookings/me")])
      .then(([accountRes, bookingsRes]) => {
        if (!mounted) return;
        const account = accountRes?.data || {};
        const bookings = Array.isArray(bookingsRes?.data)
          ? bookingsRes.data
          : [];
        setCheckoutMode("GOOGLE");
        setHasGoogleSession(true);
        setMemberTotalSpent(computeTotalSpentFromBookings(bookings));
        applyAccountToForm(account, saved);
        memberHydratedRef.current = true;
      })
      .catch(() => {
        if (!mounted) return;
        clearCustomerSession();
        setHasGoogleSession(false);
        setMemberTotalSpent(0);
        setMemberPoint(0);
      })
      .finally(() => {
        if (mounted) setIsMemberDataLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [isOpen, applyAccountToForm]);

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
    if (checkoutMode === "GOOGLE" && !hasGoogleSession) {
      return "Vui lòng đăng nhập Google để tiếp tục.";
    }
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

  const showFullNameError = showStep2Errors && !!fullNameError;
  const showPhoneError = showStep2Errors && !!phoneError;
  const showGmailError = showStep2Errors && !!gmailError;
  const showSocialLinkError = showStep2Errors && !!socialLinkError;
  const showGoogleLoginError =
    showStep2Errors && checkoutMode === "GOOGLE" && !hasGoogleSession;

  const scrollToField = (ref) => {
    window.requestAnimationFrame(() => {
      const el = ref?.current;
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      if (typeof el.focus === "function") {
        el.focus({ preventScroll: true });
      }
    });
  };
  const basePromotionDiscount = useMemo(
    () => Math.max(0, Math.round((price || 0) - (discountedTotal || 0))),
    [price, discountedTotal],
  );
  const hasDeviceUpsellConfig = !!upsellConfig;
  const upsellDurationTierKey = useMemo(
    () => pickUpsellDurationTierKey(chargeableDays),
    [chargeableDays],
  );
  const upsellDurationTierLabel = DURATION_TIER_LABEL[upsellDurationTierKey];

  /** Chưa tra được lịch (null) thì không lọc, giống cách máy chính fallback về "còn trống". */
  const isUpsellModelFree = useCallback(
    (modelKey) => {
      if (!slotBookingRows) return true;
      const key = String(modelKey || "").trim().toLowerCase();
      return slotBookingRows.some(
        (row) =>
          String(row?.modelKey || "").trim().toLowerCase() === key &&
          row?.branch === selectedBranch &&
          !(Array.isArray(row?.bookingDtos) && row.bookingDtos.length > 0),
      );
    },
    [slotBookingRows, selectedBranch],
  );

  const upsellLensOptions = useMemo(() => {
    if (!upsellConfig) return [];
    const priceField = `price${upsellDurationTierKey}`;
    return [
      { id: "none", label: "Lens kit", price: 0 },
      ...(upsellConfig.lenses || []).filter((l) => isUpsellModelFree(l.modelKey)).map((l) => ({
        id: `lens-${l.modelKey}`,
        label: l.deviceName,
        price: Number(l[priceField]) || 0,
      })),
    ];
  }, [upsellConfig, upsellDurationTierKey, isUpsellModelFree]);

  const upsellTripodOptions = useMemo(() => {
    if (!upsellConfig) return [];
    const priceField = `price${upsellDurationTierKey}`;
    return [
      { id: "none", label: "Không thuê thêm chân máy", price: 0 },
      ...(upsellConfig.tripods || []).filter((t) => isUpsellModelFree(t.modelKey)).map((t) => ({
        id: `tripod-${t.modelKey}`,
        label: t.deviceName,
        price: Number(t[priceField]) || 0,
      })),
    ];
  }, [upsellConfig, upsellDurationTierKey, isUpsellModelFree]);

  useEffect(() => {
    if (!upsellLensOptions.some((o) => o.id === upsellLensId)) setUpsellLensId("none");
  }, [upsellLensOptions, upsellLensId]);

  useEffect(() => {
    if (!upsellTripodOptions.some((o) => o.id === upsellTripodId)) setUpsellTripodId("none");
  }, [upsellTripodOptions, upsellTripodId]);

  const upsellBatteryUnitPrice = useMemo(() => {
    const fromConfig = Number(upsellConfig?.[`batteryPrice${upsellDurationTierKey}`]) || 0;
    if (fromConfig > 0) return fromConfig;
    return DEFAULT_BATTERY_PRICE_PER_DAY * DURATION_TIER_DAYS[upsellDurationTierKey];
  }, [upsellConfig, upsellDurationTierKey]);

  const upsellBatteryOptions = useMemo(() => {
    const isSixHours = upsellDurationTierKey === "SixHours";
    const days = Number(chargeableDays) || 0;
    const periodLabel = isSixHours
      ? DURATION_TIER_LABEL.SixHours
      : `${days.toLocaleString("vi-VN")} ngày`;
    return [
      {
        id: "battery-0",
        qty: 0,
        label: `Mặc định ${FREE_BATTERY_COUNT} pin`,
        detail: "Đã kèm theo máy",
        price: 0,
      },
      ...EXTRA_BATTERY_QTY_OPTIONS.map((qty) => {
        const total = qty * upsellBatteryUnitPrice;
        const avg = isSixHours || days <= 0 ? total : Math.round(total / days / 1000) * 1000;
        return {
          id: `battery-${qty}`,
          qty,
          label: `+${qty} pin (tổng ${FREE_BATTERY_COUNT + qty} pin)`,
          detail: periodLabel,
          price: total,
          priceText: `+${avg.toLocaleString("vi-VN")}đ/${isSixHours ? "6 tiếng" : "ngày"}`,
        };
      }),
    ];
  }, [upsellBatteryUnitPrice, upsellDurationTierKey, chargeableDays]);

  const selectedLensUpsell = useMemo(
    () =>
      upsellLensOptions.find((o) => o.id === upsellLensId) ||
      upsellLensOptions[0] || { id: "none", label: "", price: 0 },
    [upsellLensOptions, upsellLensId],
  );
  const selectedTripodUpsell = useMemo(
    () =>
      upsellTripodOptions.find((o) => o.id === upsellTripodId) ||
      upsellTripodOptions[0] || { id: "none", label: "", price: 0 },
    [upsellTripodOptions, upsellTripodId],
  );
  // Đơn nhiều máy: BE đối chiếu amount với tổng total từng booking, chưa có chỗ gánh tiền phụ kiện.
  const upsellEnabled = !isMulti;
  const batteryUpsellEnabled =
    upsellEnabled && hasDeviceUpsellConfig && upsellConfig.batteryEnabled !== false;
  const hasAnyUpsellOption =
    batteryUpsellEnabled ||
    (hasDeviceUpsellConfig && (upsellLensOptions.length > 1 || upsellTripodOptions.length > 1));

  useEffect(() => {
    if (upsellEnabled) return;
    setUpsellLensId("none");
    setUpsellTripodId("none");
    setUpsellBatteryQty(0);
  }, [upsellEnabled]);

  useEffect(() => {
    if (!batteryUpsellEnabled) setUpsellBatteryQty(0);
  }, [batteryUpsellEnabled]);

  const upsellTotal = useMemo(() => {
    if (!upsellEnabled) return 0;
    return (
      (selectedLensUpsell?.price || 0) +
      (batteryUpsellEnabled ? upsellBatteryQty * upsellBatteryUnitPrice : 0) +
      (selectedTripodUpsell?.price || 0)
    );
  }, [
    upsellEnabled,
    batteryUpsellEnabled,
    selectedLensUpsell,
    upsellBatteryQty,
    upsellBatteryUnitPrice,
    selectedTripodUpsell,
  ]);
  const upsellSummaryLabel = useMemo(() => {
    if (!upsellEnabled) return [];
    const parts = [];
    if (selectedLensUpsell?.id !== "none") parts.push(selectedLensUpsell.label);
    if (batteryUpsellEnabled && upsellBatteryQty > 0) {
      parts.push(
        `Thêm ${upsellBatteryQty} pin, nhận ${FREE_BATTERY_COUNT + upsellBatteryQty} pin (${upsellDurationTierLabel})`,
      );
    }
    if (selectedTripodUpsell?.id !== "none") parts.push(selectedTripodUpsell.label);
    return parts;
  }, [
    upsellEnabled,
    batteryUpsellEnabled,
    selectedLensUpsell,
    upsellBatteryQty,
    upsellDurationTierLabel,
    selectedTripodUpsell,
  ]);
  const upsellNoteLines = useMemo(() => {
    if (!upsellEnabled) return [];
    const lines = [];
    if (batteryUpsellEnabled && upsellBatteryQty > 0) {
      lines.push(
        `+ ${upsellBatteryQty} pin (+${formatCompactVnd(upsellBatteryQty * upsellBatteryUnitPrice)})`,
      );
    }
    for (const opt of [selectedLensUpsell, selectedTripodUpsell]) {
      if (opt && opt.id !== "none") {
        lines.push(`+ ${opt.label} (+${formatCompactVnd(opt.price)})`);
      }
    }
    return lines;
  }, [
    upsellEnabled,
    batteryUpsellEnabled,
    upsellBatteryQty,
    upsellBatteryUnitPrice,
    selectedLensUpsell,
    selectedTripodUpsell,
  ]);
  const payableBeforePoint = useMemo(
    () =>
      Math.max(0, Math.round((price || 0) - basePromotionDiscount)) +
      upsellTotal,
    [price, basePromotionDiscount, upsellTotal],
  );
  const maxPointToUse = useMemo(() => {
    if (!hasGoogleSession || isShopPartner) return 0;
    return Math.max(
      0,
      Math.min(Math.floor(payableBeforePoint / 1000), Math.floor(memberPoint)),
    );
  }, [hasGoogleSession, isShopPartner, payableBeforePoint, memberPoint]);
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
  const selectedDiscountAmount = basePromotionDiscount;
  const selectedDiscountLabel = priceBreakdown?.discountLabel || "Khuyến mãi";
  const totalSavingsAmount = selectedDiscountAmount + pointDiscountAmount;
  const isLoggedInUser = hasGoogleSession;
  const shouldShowContactForm =
    checkoutMode === "GUEST" || (checkoutMode === "GOOGLE" && hasGoogleSession);
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

    const nextAgreementErrors = isShopPartner
      ? {
          noScamElsewhere: false,
          pickupInPersonAtBranch: false,
          depositMethod: false,
          cccdPerDevice: false,
          rentalRules: false,
        }
      : {
          noScamElsewhere: !agreeNoScamElsewhere,
          pickupInPersonAtBranch: !agreePickupInPersonAtBranch,
          depositMethod: !selectedDepositMethod,
          cccdPerDevice:
            effectiveDevices.length >= 2 && !agreeCccdPerDevice,
          rentalRules: !agreeRentalRules,
        };
    if (
      nextAgreementErrors.noScamElsewhere ||
      nextAgreementErrors.pickupInPersonAtBranch ||
      nextAgreementErrors.depositMethod ||
      nextAgreementErrors.cccdPerDevice ||
      nextAgreementErrors.rentalRules
    ) {
      setAgreementErrors(nextAgreementErrors);
      if (nextAgreementErrors.depositMethod) {
        setError("Vui lòng chọn 1 hình thức cọc trước khi thanh toán.");
        skipStepScrollTopRef.current = true;
        setStep(2);
        window.requestAnimationFrame(() => {
          depositSectionRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        });
        return;
      }
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
      depositMethod: false,
      cccdPerDevice: false,
      rentalRules: false,
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
      setSavedCustomer(normalizedCustomer);

      if (isShopPartner) {
        try {
          await api.put("/customer/profile", {
            fullName: normalizedCustomer.fullName,
            phone: normalizedCustomer.phone,
            email: normalizedCustomer.gmail || shopPartner.email,
            ig: normalizedCustomer.ig || null,
            fb: normalizedCustomer.fb || null,
          });
        } catch (profileErr) {
          console.warn("Không thể cập nhật hồ sơ shop, tiếp tục đặt lịch.", profileErr);
        }
        const fmtShop = (d) => formatDateForAPIPayload(d);
        const shopNote = upsellNoteLines.join("\n").slice(0, 250);
        const shopUpsell = isMulti ? 0 : upsellTotal;
        const bookingRequests = rentalInfoPerDevice.map((r, idx) => {
          const devPrice = roundDownToThousand(r?.price || 0);
          const b = computeShopPartnerBreakdown(devPrice, t1, t2);
          const extra = idx === 0 ? shopUpsell : 0;
          return {
            deviceId: r.device.id,
            bookingFrom: fmtShop(t1),
            bookingTo: fmtShop(t2),
            total: (b ? b.discounted : devPrice) + extra,
            originalPrice: devPrice + extra,
            note: shopNote,
            dayOfRent: chargeableDays,
            location: apiLocationFromBranchId(selectedBranch),
          };
        });
        await api.post("/v1/shop/bookings", { bookingRequests });
        window.location.href = "/my-bookings?shopBooked=1";
        return;
      }

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

      const fmt = (d) => formatDateForAPIPayload(d);
      const note = [
        formatDepositNoteLine(selectedDepositMethod, effectiveDevices),
        ...upsellNoteLines,
      ]
        .filter(Boolean)
        .join("\n")
        .slice(0, 250);

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
      if (isLikelyEmbeddedBrowser()) {
        setError(GOOGLE_LOGIN_EMBEDDED_BROWSER_HINT_VI);
        return;
      }
      const result = await signInWithPopup(auth, googleProvider);
      const googleUser = result.user;
      const res = await api.post("/login-gg", {
        email: googleUser?.email,
        name: googleUser?.displayName,
        avatar: googleUser?.photoURL,
        idToken: await googleUser.getIdToken(),
      });
      const data = res?.data || {};
      if (!data?.token) throw new Error("Đăng nhập Google thất bại");
      saveCustomerSession({ token: data.token });
      const [accountRes, bookingsRes] = await Promise.all([
        api.get("/account"),
        api.get("/v1/bookings/me"),
      ]);
      const account = accountRes?.data || {};
      const bookings = Array.isArray(bookingsRes?.data) ? bookingsRes.data : [];
      setMemberTotalSpent(computeTotalSpentFromBookings(bookings));
      applyAccountToForm(
        {
          ...account,
          fullName: account.fullName || data.fullName,
          email: account.email || data.email,
        },
        loadCustomerInfo() || {},
      );
      memberHydratedRef.current = true;
      setCheckoutMode("GOOGLE");
      setHasGoogleSession(true);
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

  const requiresCccdPerDevice = effectiveDevices.length >= 2;
  const agreementsRequiredCount = requiresCccdPerDevice ? 4 : 3;
  const agreementsCheckedCount =
    Number(agreeNoScamElsewhere) +
    Number(agreeRentalRules) +
    Number(agreePickupInPersonAtBranch) +
    (requiresCccdPerDevice ? Number(agreeCccdPerDevice) : 0);

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
          role="dialog"
          aria-modal="true"
          aria-labelledby="quick-book-title"
          className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-[20px] bg-white shadow-[0_-8px_40px_rgba(31,20,25,0.14)] sm:max-h-[88vh] sm:max-w-[560px] sm:rounded-2xl sm:shadow-[0_24px_64px_rgba(31,20,25,0.22)]"
        >
          <div className="flex shrink-0 justify-center pt-2 sm:hidden" aria-hidden>
            <div className="h-1 w-10 rounded-full bg-[#e2dfdc]" />
          </div>

          <div className="flex shrink-0 items-center gap-3 px-4 pb-3 pt-2 sm:px-5 sm:pt-4">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#f6f5f4] ring-1 ring-black/[0.05]">
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
            <div className="min-w-0 flex-1">
              <h2
                id="quick-book-title"
                className="line-clamp-1 text-[15px] font-bold leading-snug text-[#1f1f1f]"
              >
                {isMulti
                  ? `${effectiveDevices.length} máy cho thuê`
                  : effectiveDevices[0]?.displayName ||
                    effectiveDevices[0]?.name}
              </h2>
              <div className="mt-1 flex min-w-0 items-start gap-1.5 text-[12px] leading-snug text-[#77716c]">
                <span className="shrink-0 rounded-md bg-[#fff0f6] px-1.5 py-px text-[11px] font-bold text-[#E85C9C]">
                  {durationDays < 1 ? "6 tiếng" : `${durationDays} ngày`}
                </span>
                {isValid(t1) && isValid(t2) && (
                  <span className="min-w-0">
                    {formatPickupReturnRangeVi(t1, t2)}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="-mr-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#77716c] transition-colors hover:bg-[#f6f5f4] active:scale-95"
            >
              <X size={20} />
            </button>
          </div>

          <StepProgressBar step={step} />

          {/* Content */}
          <div
            ref={contentScrollRef}
            className="min-h-0 flex-1 min-w-0 overflow-y-auto overflow-x-hidden overscroll-contain bg-[#f6f5f4] px-3 py-3 sm:px-5 sm:py-4 [-webkit-overflow-scrolling:touch]"
          >
            {step === 1 && (
              <div className="rounded-2xl bg-white p-4 ring-1 ring-black/[0.06]">
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
                {!isLoggedInUser ? (
                  <CheckoutModeSegment
                    checkoutMode={checkoutMode}
                    setCheckoutMode={setCheckoutMode}
                    earnPoints={earnedPointPreview}
                  />
                ) : null}

                {/* Google: login or status */}
                {checkoutMode === "GOOGLE" && !hasGoogleSession && (
                  <div ref={googleLoginRef} className="space-y-2.5">
                    <EmbeddedBrowserGoogleHint />
                    <GoogleSignInButton
                      onClick={handleGoogleLogin}
                      loading={isGoogleLoading}
                      error={showGoogleLoginError}
                    />
                    {showGoogleLoginError ? (
                      <p className="text-xs font-medium text-red-600">
                        Vui lòng đăng nhập Google để tiếp tục.
                      </p>
                    ) : null}
                  </div>
                )}

                {checkoutMode === "GOOGLE" &&
                  hasGoogleSession &&
                  isMemberDataLoading && (
                    <div className="flex items-center gap-2 rounded-xl bg-white px-3.5 py-3 text-[12.5px] font-medium text-[#8a8580] ring-1 ring-black/[0.06]">
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
                      onClick={() => {
                        const latest = loadCustomerInfo() || savedCustomer;
                        const link = pickStoredSocialLink(latest);
                        const detected = detectSocialPlatformFromLink(link);
                        setCustomer((c) => ({
                          ...c,
                          fullName: latest.fullName || "",
                          phone: normalizeValidPhoneOrEmpty(latest.phone),
                          gmail: latest.gmail || "",
                          ig: link,
                        }));
                        if (detected) setSocialPlatform(detected);
                        setSavedCustomer(latest);
                      }}
                      className="min-h-[44px] w-full rounded-xl border border-dashed border-[#E85C9C]/40 bg-[#fff8fb] px-3.5 py-2.5 text-[13px] font-semibold text-[#E85C9C] transition-colors hover:bg-[#fff0f6] active:scale-[0.99]"
                    >
                      Dùng thông tin đã lưu
                      {savedCustomer.fullName
                        ? ` • ${savedCustomer.fullName}`
                        : ""}
                    </button>
                  )}

                {/* Contact form */}
                {shouldShowContactForm && (
                  <CheckoutSection
                    title="Thông tin người thuê"
                    subtitle={
                      isLoggedInUser
                        ? `Xin chào, ${customer.fullName?.trim() || "bạn"}. Thông tin đã điền sẵn, sửa nếu cần.`
                        : "Shop dùng thông tin này để xác nhận đơn."
                    }
                    badge={
                      checkoutMode === "GOOGLE" && hasGoogleSession ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          <Check size={11} strokeWidth={3} />
                          Đã xác thực
                        </span>
                      ) : null
                    }
                  >
                    <div ref={contactFormRef} className="space-y-3.5 px-4 pb-4 pt-3">
                      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-3">
                        <div>
                          <label className={CONTACT_LABEL_CLASS}>
                            <User size={13} className="text-[#a3a09d]" />
                            Họ và tên
                          </label>
                          <input
                            ref={fullNameInputRef}
                            value={customer.fullName}
                            onChange={(e) =>
                              setCustomer((c) => ({
                                ...c,
                                fullName: e.target.value,
                              }))
                            }
                            placeholder="Nguyễn Thị Bông"
                            autoComplete="name"
                            className={contactFieldClass(showFullNameError)}
                          />
                          {showFullNameError && (
                            <p className="mt-1 text-xs text-red-600 font-medium">
                              {fullNameError}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className={CONTACT_LABEL_CLASS}>
                            <Phone size={13} className="text-[#a3a09d]" />
                            Số điện thoại
                          </label>
                          <input
                            ref={phoneInputRef}
                            value={customer.phone}
                            onChange={(e) =>
                              setCustomer((c) => ({
                                ...c,
                                phone: e.target.value,
                              }))
                            }
                            placeholder="0901234567"
                            inputMode="tel"
                            autoComplete="tel"
                            className={contactFieldClass(showPhoneError)}
                          />
                          {showPhoneError && (
                            <p className="mt-1 text-xs text-red-600 font-medium">
                              {phoneError}
                            </p>
                          )}
                        </div>
                      </div>

                      {checkoutMode === "GOOGLE" && (
                        <div>
                          <label className={CONTACT_LABEL_CLASS}>
                            <Mail size={13} className="text-[#a3a09d]" />
                            Email
                          </label>
                          <div className="flex min-h-[46px] items-center justify-between gap-3 rounded-xl bg-[#f6f5f4] px-3.5 py-2.5">
                            <div className="min-w-0 truncate text-[14px] font-medium text-[#55504b]">
                              {customer.gmail || "email@example.com"}
                            </div>
                            <span className="shrink-0 text-[11px] font-medium text-[#a3a09d]">
                              Từ Google
                            </span>
                          </div>
                          {showGmailError && (
                            <p className="mt-1 text-xs text-red-600 font-medium">
                              {gmailError}
                            </p>
                          )}
                        </div>
                      )}

                      {checkoutMode === "GUEST" && (
                        <div>
                          <label className={CONTACT_LABEL_CLASS}>
                            <Mail size={13} className="text-[#a3a09d]" />
                            Email
                          </label>
                          <input
                            ref={gmailInputRef}
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            value={customer.gmail}
                            onChange={(e) =>
                              setCustomer((c) => ({
                                ...c,
                                gmail: e.target.value,
                              }))
                            }
                            placeholder="email@gmail.com"
                            className={contactFieldClass(showGmailError)}
                          />
                          {showGmailError ? (
                            <p className="mt-1 text-xs text-red-600 font-medium">
                              {gmailError}
                            </p>
                          ) : (
                            <p className="mt-1 text-[11.5px] text-[#a3a09d]">
                              Mã đơn sẽ được gửi về email này.
                            </p>
                          )}
                        </div>
                      )}

                      <div>
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <span className="text-[12px] font-semibold text-[#55504b]">
                            Link mạng xã hội
                          </span>
                          <div
                            role="radiogroup"
                            aria-label="Nền tảng mạng xã hội"
                            className="flex rounded-lg bg-[#f0eeec] p-0.5"
                          >
                            {[
                              { id: "instagram", label: "Instagram" },
                              { id: "facebook", label: "Facebook" },
                            ].map((platform) => {
                              const active = socialPlatform === platform.id;
                              return (
                                <button
                                  key={platform.id}
                                  type="button"
                                  role="radio"
                                  aria-checked={active}
                                  onClick={() => setSocialPlatform(platform.id)}
                                  className={`min-h-[32px] rounded-md px-2.5 text-[12px] font-semibold transition-all ${
                                    active
                                      ? "bg-white text-[#1f1f1f] shadow-[0_1px_2px_rgba(31,20,25,0.12)]"
                                      : "text-[#8a8580] hover:text-[#55504b]"
                                  }`}
                                >
                                  {platform.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <input
                          ref={socialInputRef}
                          value={customer.ig}
                          onChange={(e) =>
                            setCustomer((c) => ({ ...c, ig: e.target.value }))
                          }
                          inputMode="url"
                          autoCapitalize="none"
                          autoCorrect="off"
                          placeholder={
                            socialPlatform === "instagram"
                              ? "https://instagram.com/username"
                              : "https://facebook.com/username"
                          }
                          className={contactFieldClass(showSocialLinkError)}
                        />
                        {showSocialLinkError ? (
                          <p className="mt-1 text-xs text-red-600 font-medium">
                            {socialLinkError}
                          </p>
                        ) : (
                          <p className="mt-1 text-[11.5px] text-[#a3a09d]">
                            Dán link profile đầy đủ (https://...).
                          </p>
                        )}
                      </div>
                    </div>
                  </CheckoutSection>
                )}

                {isShopPartner ? (
                  <ShopPartnerNotice shopName={shopPartner.shopName} />
                ) : (
                <div ref={depositSectionRef}>
                  <DepositMethodPicker
                    devices={effectiveDevices}
                    selectedId={selectedDepositMethod}
                    onSelect={(id) => {
                      setSelectedDepositMethod(id);
                      setAgreementErrors((prev) => ({
                        ...prev,
                        depositMethod: false,
                      }));
                    }}
                    error={showStep2Errors && !selectedDepositMethod}
                  />
                </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/[0.06] divide-y divide-[#f3f1ef]">
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
                        className="-mr-1.5 min-h-[36px] rounded-lg px-2.5 text-[12.5px] font-semibold text-[#E85C9C] transition-colors hover:bg-[#fff0f6] active:scale-95"
                      >
                        Sửa
                      </button>
                    }
                  />
                  {isValid(t1) && isValid(t2) && (
                    <CheckoutRow
                      label="Thời gian nhận / trả"
                      value={
                        <span className="block space-y-0.5">
                          <span className="block">{formatPickupMomentVi(t1)}</span>
                          <span className="block">{formatReturnMomentVi(t2)}</span>
                        </span>
                      }
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
                  {isShopPartner ? (
                    <CheckoutRow
                      label="Thanh toán"
                      value="Đặt trước – thanh toán sau"
                      hint={`Không cọc · ${shopPartner.shopName}`}
                    />
                  ) : (
                  <CheckoutRow
                    label="Hình thức cọc"
                    value={selectedDepositLabel || "Chưa chọn"}
                    hint="Cọc xử lý tại cửa hàng khi nhận máy"
                    action={
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="-mr-1.5 min-h-[36px] rounded-lg px-2.5 text-[12.5px] font-semibold text-[#E85C9C] transition-colors hover:bg-[#fff0f6] active:scale-95"
                      >
                        Sửa
                      </button>
                    }
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
                        className="-mr-1.5 min-h-[36px] rounded-lg px-2.5 text-[12.5px] font-semibold text-[#E85C9C] transition-colors hover:bg-[#fff0f6] active:scale-95"
                      >
                        Sửa
                      </button>
                    }
                  />
                </div>

                {upsellEnabled && hasAnyUpsellOption && (
                  <UpsellAccessoriesSection
                    hasDeviceConfig={hasDeviceUpsellConfig}
                    showBattery={batteryUpsellEnabled}
                    lensOptions={upsellLensOptions}
                    lensId={upsellLensId}
                    onLensChange={setUpsellLensId}
                    batteryOptions={upsellBatteryOptions}
                    batteryQty={upsellBatteryQty}
                    onBatteryQtyChange={setUpsellBatteryQty}
                    tripodOptions={upsellTripodOptions}
                    tripodId={upsellTripodId}
                    onTripodChange={setUpsellTripodId}
                    upsellTotal={upsellTotal}
                    onClearAll={() => {
                      setUpsellLensId("none");
                      setUpsellTripodId("none");
                      setUpsellBatteryQty(0);
                    }}
                  />
                )}

                {isLoggedInUser && !isShopPartner && (
                  <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3.5 ring-1 ring-black/[0.06]">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                      <Gift size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12.5px] font-bold text-amber-950">
                        {pointDiscountAmount > 0 ? (
                          <>
                            Đang dùng {pointToUse.toLocaleString("vi-VN")} điểm{" "}
                            <span className="tabular-nums text-emerald-700">
                              −{pointDiscountAmount.toLocaleString("vi-VN")}đ
                            </span>
                          </>
                        ) : (
                          <>Bạn có {memberPoint.toLocaleString("vi-VN")} điểm</>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] leading-snug text-amber-900/60">
                        {maxPointToUse > 0 || memberPoint <= 0
                          ? `Đơn này tích thêm +${earnedPointPreview.toLocaleString("vi-VN")} điểm`
                          : "Chưa trừ được cho đơn này, để dành đơn sau"}
                      </p>
                    </div>
                    {maxPointToUse > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowPointPicker(true)}
                        className="min-h-[36px] shrink-0 rounded-lg border border-amber-300 bg-white px-3 text-[12px] font-bold text-amber-900 transition-colors hover:bg-amber-50 active:scale-95"
                      >
                        {pointDiscountAmount > 0 ? "Đổi" : "Dùng điểm"}
                      </button>
                    )}
                  </div>
                )}

                <div className="rounded-2xl bg-white px-4 py-3.5 ring-1 ring-black/[0.06]">
                  <h3 className="text-[14px] font-bold text-[#1f1f1f]">
                    Chi tiết giá
                  </h3>
                  <div className="mt-2.5 space-y-2 text-[13px] leading-snug">
                    {rentalInfoPerDevice.map((r) => {
                      const dev = r.device;
                      const days = r.chargeableDays ?? chargeableDays;
                      const fullDays = Math.floor(days);
                      const breakdown =
                        fullDays > 3 ? formatPriceBreakdown(dev, fullDays) : null;
                      return (
                        <div key={dev.id} className="flex justify-between gap-3">
                          <span className="min-w-0 text-[#55504b]">
                            {dev.displayName || dev.name}
                            <span className="block text-[11.5px] text-[#a3a09d]">
                              {breakdown || formatChargeableDaysLabel(days)}
                            </span>
                          </span>
                          <span className="shrink-0 font-semibold text-[#1f1f1f] tabular-nums">
                            {formatPriceK(r.price || 0)}
                          </span>
                        </div>
                      );
                    })}
                    {priceBreakdown && selectedDiscountAmount > 0 && (
                      <div className="flex justify-between gap-3 border-t border-[#f3f1ef] pt-2">
                        <span className="text-[#55504b]">Tạm tính</span>
                        <span className="font-semibold text-[#1f1f1f] tabular-nums">
                          {(priceBreakdown.original || 0).toLocaleString("vi-VN")}đ
                        </span>
                      </div>
                    )}
                    {selectedDiscountAmount > 0 && (
                      <div className="flex justify-between gap-3">
                        <span className="text-emerald-700">
                          {selectedDiscountLabel}
                        </span>
                        <span className="font-semibold text-emerald-700 tabular-nums">
                          −{selectedDiscountAmount.toLocaleString("vi-VN")}đ
                        </span>
                      </div>
                    )}
                    {upsellTotal > 0 && (
                      <div className="flex justify-between gap-3">
                        <span className="min-w-0 text-[#55504b]">
                          Phụ kiện thêm
                          <span className="block text-[11.5px] text-[#a3a09d]">
                            {upsellSummaryLabel.join(", ")}
                          </span>
                        </span>
                        <span className="shrink-0 font-semibold text-[#1f1f1f] tabular-nums">
                          +{upsellTotal.toLocaleString("vi-VN")}đ
                        </span>
                      </div>
                    )}
                    {pointDiscountAmount > 0 && (
                      <div className="flex justify-between gap-3">
                        <span className="text-emerald-700">
                          Trừ {pointToUse.toLocaleString("vi-VN")} điểm
                        </span>
                        <span className="font-semibold text-emerald-700 tabular-nums">
                          −{pointDiscountAmount.toLocaleString("vi-VN")}đ
                        </span>
                      </div>
                    )}
                    <div className="flex items-baseline justify-between gap-3 border-t border-dashed border-[#e2dfdc] pt-2.5">
                      <span className="font-semibold text-[#1f1f1f]">
                        Tổng thanh toán
                      </span>
                      <span className="text-[16px] font-bold text-[#E85C9C] tabular-nums">
                        {payableTotal.toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                  </div>
                </div>

                {!isShopPartner && (
                  <PhotoboothGiftBlock branchId={selectedBranch} variant="compact" />
                )}

                {!isShopPartner && (
                <div
                  ref={agreementSectionRef}
                  className="space-y-2 rounded-2xl bg-white px-4 py-3.5 ring-1 ring-black/[0.06]"
                >
                  <div className="flex items-baseline justify-between gap-3 pb-0.5">
                    <h3 className="text-[14px] font-bold text-[#1f1f1f]">
                      Xác nhận trước khi thanh toán
                    </h3>
                    <span
                      className={`shrink-0 text-[12px] font-semibold tabular-nums ${
                        agreementsCheckedCount === agreementsRequiredCount
                          ? "text-emerald-600"
                          : "text-[#a3a09d]"
                      }`}
                    >
                      {agreementsCheckedCount}/{agreementsRequiredCount}
                    </span>
                  </div>
                  <label
                    className={agreementRowClass(
                      agreeNoScamElsewhere,
                      agreementErrors.noScamElsewhere,
                      "warning",
                    )}
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
                      className={AGREEMENT_CHECKBOX_CLASS}
                    />
                    <span>
                      Tôi cam kết <strong>không</strong> đang lừa đảo / quỵt
                      máy / chiếm đoạt thiết bị tại bất kỳ shop cho thuê nào
                      khác. Nếu shop phát hiện (qua mạng lưới shop cho thuê,
                      nhóm cộng đồng, hoặc tin báo từ nạn nhân), FAO có quyền{" "}
                      <strong>huỷ đơn ngay lập tức</strong> và{" "}
                      <strong>không hoàn tiền</strong> cọc / tiền thuê đã
                      thanh toán; đồng thời chia sẻ{" "}
                      <strong>CCCD – SĐT – Facebook</strong> của tôi vào{" "}
                      <strong>danh sách đen liên shop</strong> và{" "}
                      <strong>trình báo cơ quan công an</strong> theo Điều 174
                      BLHS (tội Lừa đảo chiếm đoạt tài sản).
                    </span>
                  </label>
                  {requiresCccdPerDevice && (
                    <label
                      className={agreementRowClass(
                        agreeCccdPerDevice,
                        agreementErrors.cccdPerDevice,
                      )}
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
                        className={AGREEMENT_CHECKBOX_CLASS}
                      />
                      <span>
                        Thuê 2 máy trở lên: tôi sẽ đem{" "}
                        <strong className="text-[#1f1f1f]">
                          {Math.max(2, effectiveDevices.length)} CCCD
                        </strong>{" "}
                        và đến shop xác thực.
                      </span>
                    </label>
                  )}
                  <label
                    className={agreementRowClass(
                      agreeRentalRules,
                      agreementErrors.rentalRules,
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={agreeRentalRules}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setAgreeRentalRules(checked);
                        setAgreementErrors((prev) => ({
                          ...prev,
                          rentalRules: !checked && prev.rentalRules,
                        }));
                      }}
                      className={AGREEMENT_CHECKBOX_CLASS}
                    />
                    <span>
                      Tôi đã đọc kĩ{" "}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setShowRentalRulesModal(true);
                        }}
                        className="font-bold text-[#E85C9C] underline decoration-[#E85C9C]/40 underline-offset-2"
                      >
                        quy định thuê
                      </button>{" "}
                      bên shop, gồm điều kiện thuê, giờ trả máy và chính sách
                      huỷ / dời lịch.
                    </span>
                  </label>
                  <label
                    className={agreementRowClass(
                      agreePickupInPersonAtBranch,
                      agreementErrors.pickupInPersonAtBranch,
                    )}
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
                      className={AGREEMENT_CHECKBOX_CLASS}
                    />
                    <span>
                      Tôi sẽ nhận máy trực tiếp tại{" "}
                      <strong className="text-[#1f1f1f]">
                        {selectedBranchPickupAddress ||
                          "địa chỉ cửa hàng chi nhánh đã chọn"}
                      </strong>
                      .
                    </span>
                  </label>
                </div>
                )}
                {error && (
                  <div className="p-3.5 bg-red-50 text-red-800 rounded-xl text-[13px] font-semibold leading-relaxed border border-red-200/90">
                    {error}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-[#f0eeec] bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[11.5px] font-medium text-[#8a8580]">
                  {isShopPartner
                    ? `Giá đối tác · ${shopPartner.shopName}`
                    : step === 3
                      ? "Tổng thanh toán"
                      : "Tạm tính"}
                </div>
                <div className="text-[19px] font-bold tabular-nums leading-tight text-[#1f1f1f]">
                  {payableTotal.toLocaleString("vi-VN")}đ
                </div>
                {totalSavingsAmount > 0 && (
                  <div className="text-[11px] font-semibold text-emerald-600">
                    Tiết kiệm {totalSavingsAmount.toLocaleString("vi-VN")}đ
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={() => setStep(step - 1)}
                    aria-label="Quay lại"
                    className="flex min-h-[48px] min-w-[48px] items-center justify-center gap-1 rounded-xl border border-[#e2dfdc] text-[13px] font-semibold text-[#55504b] transition-colors hover:bg-[#f6f5f4] active:scale-[0.98] sm:px-4"
                  >
                    <ChevronLeft size={18} />
                    <span className="hidden sm:inline">Quay lại</span>
                  </button>
                )}
                {step < 3 ? (
                  <button
                    type="button"
                    onClick={async () => {
                      if (step === 2) {
                        setShowStep2Errors(true);
                        if (checkoutMode === "GOOGLE" && !hasGoogleSession) {
                          scrollToField(googleLoginRef);
                          return;
                        }
                        if (fullNameError) {
                          scrollToField(fullNameInputRef);
                          return;
                        }
                        if (phoneError) {
                          scrollToField(phoneInputRef);
                          return;
                        }
                        if (gmailError) {
                          scrollToField(
                            checkoutMode === "GUEST"
                              ? gmailInputRef
                              : contactFormRef,
                          );
                          return;
                        }
                        if (socialLinkError) {
                          scrollToField(socialInputRef);
                          return;
                        }
                        if (!isShopPartner && !selectedDepositMethod) {
                          setAgreementErrors((prev) => ({
                            ...prev,
                            depositMethod: true,
                          }));
                          scrollToField(depositSectionRef);
                          return;
                        }
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
                          setSavedCustomer(snap);
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
                      step === 1 &&
                      (!isAvailable ||
                        isCheckingAvailability ||
                        !!timeSelectionError ||
                        !sameModelAvailabilityReady)
                    }
                    className="flex min-h-[48px] min-w-[136px] items-center justify-center gap-1 rounded-xl bg-[#E85C9C] px-5 text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(232,92,156,0.28)] transition-all hover:bg-[#d94d8a] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#e2dfdc] disabled:text-[#a3a09d] disabled:shadow-none"
                  >
                    {step === 1 && isCheckingAvailability ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Đang kiểm tra
                      </>
                    ) : (
                      <>
                        Tiếp tục
                        <ChevronRight size={18} />
                      </>
                    )}
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
                    className="flex min-h-[48px] min-w-[148px] items-center justify-center gap-2 rounded-xl bg-[#E85C9C] px-5 text-[15px] font-bold text-white shadow-[0_6px_16px_rgba(232,92,156,0.28)] transition-all hover:bg-[#d94d8a] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#e2dfdc] disabled:text-[#a3a09d] disabled:shadow-none"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Đang xử lý
                      </>
                    ) : isCheckingAvailability ? (
                      "Đang kiểm tra"
                    ) : isShopPartner ? (
                      "Đặt lịch · trả sau"
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

    <PointPickerModal
      isOpen={showPointPicker}
      onClose={() => setShowPointPicker(false)}
      memberPoint={memberPoint}
      maxPointToUse={maxPointToUse}
      presets={pointPresets}
      currentValue={pointToUse}
      payableBeforePoint={payableBeforePoint}
      onApply={(value) => {
        setPointToUse(value);
        setShowPointPicker(false);
      }}
    />

    <RentalRulesModal
      isOpen={showRentalRulesModal}
      onClose={() => setShowRentalRulesModal(false)}
      onAcknowledge={() => {
        setAgreeRentalRules(true);
        setAgreementErrors((prev) => ({ ...prev, rentalRules: false }));
        setShowRentalRulesModal(false);
      }}
    />
    </>
  );
}

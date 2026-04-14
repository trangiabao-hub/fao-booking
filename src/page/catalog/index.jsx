import React, { useState, useEffect, useMemo, useCallback } from "react";
import { format, addDays } from "date-fns";
import vi from "date-fns/locale/vi";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import DatePicker, { registerLocale } from "react-datepicker";
import {
  MapPin,
  Phone,
  Star,
  Zap,
  ArrowRight,
  Sparkles,
  Search,
  X,
  SlidersHorizontal,
  Check,
} from "lucide-react";
import api from "../../config/axios";
import FloatingContactButton from "../../components/FloatingContactButton";
import QuickBookModal from "../../components/QuickBookModal";
import { trackCatalogBookClick } from "../../lib/bookingAnalytics";
import SlideNav from "../../components/SlideNav";
import BookingPrefsForm, {
  normalizeDate,
  getDefaultBranchId,
  computeAvailabilityRange,
  getAvailabilityRangeError,
} from "../../components/BookingPrefsForm";
import {
  computeDiscountBreakdown,
  calculateRentalInfo,
  roundDownToThousand,
} from "../../utils/pricing";
import { formatPriceK } from "../../utils/bookingHelpers";
import { formatTimeVi, formatTimeViFromString } from "../../utils/formatTimeVi";
import { saveBookingPrefs } from "../../utils/storage";
import useBookingSocket from "../../lib/useBookingSocket";
import "react-datepicker/dist/react-datepicker.css";

registerLocale("vi", vi);

const FALLBACK_IMG = "https://placehold.co/400x300/FFE4F0/E85C9C?text=📷";
const DEFAULT_TIME_FROM = "09:00";
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
  {
    id: "PHU_NHUAN",
    label: "FAO Phú Nhuận",
    address: "475 Huỳnh Văn Bánh, Phú Nhuận",
    mapUrl: "https://maps.app.goo.gl/CSeEPhMGUNZsYCNZ7",
  },
  { id: "Q9", label: "FAO Q9 (Vinhomes)", disabled: true, comingSoon: true },
];

// --- CSS NOISE TEXTURE (from Menu) ---
const NoiseOverlay = () => (
  <div
    className="fixed inset-0 pointer-events-none z-[60] opacity-[0.04] mix-blend-overlay"
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
    }}
  />
);

// Page Background (from Menu)
const PageBackground = () => (
  <div className="fixed inset-0 overflow-hidden -z-10 bg-[#FEF5ED]">
    <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-white to-transparent opacity-80" />
    <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-[#FFC2DF] rounded-full blur-[120px] opacity-30 mix-blend-multiply" />
    <div className="absolute bottom-[10%] left-[-10%] w-[400px] h-[400px] bg-[#FFF2CC] rounded-full blur-[100px] opacity-50 mix-blend-multiply" />
  </div>
);

// Pink Tape Marquee (from Menu)
const PinkTapeMarquee = () => (
  <div className="absolute top-0 -left-[5%] w-[110%] bg-[#FF9FCA] h-9 md:h-11 flex items-center overflow-hidden border-b-2 border-white z-40 shadow-sm transform rotate-[0.5deg]">
    <motion.div
      className="flex whitespace-nowrap text-[#333] font-black text-[11px] md:text-sm uppercase tracking-[0.2em] font-sans"
      animate={{ x: [0, -2000] }}
      transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
    >
      {[...Array(12)].map((_, i) => (
        <span key={i} className="mx-6 flex items-center gap-4">
          <Zap size={14} fill="white" className="text-white shrink-0" />
          Giảm 20% từ thứ 2 tới thứ 6
          <span className="w-1.5 h-1.5 rounded-full bg-white mx-1 shrink-0" />
          Thuê máy không cần cọc chỉ cần CCCD chính chủ hoặc VNID định danh mức
          2
        </span>
      ))}
    </motion.div>
  </div>
);

// Infer brand from device name
function inferBrand(name = "") {
  const n = name.toUpperCase();
  if (n.includes("FUJIFILM") || n.includes("FUJI")) return "fuji";
  if (n.includes("CANON")) return "canon";
  if (n.includes("SONY")) return "sony";
  if (
    n.includes("POCKET") ||
    n.includes("GOPRO") ||
    n.includes("DJI") ||
    n.includes("INSTA360")
  )
    return "pocket";
  return "other";
}

// Normalize device name
function normalizeDeviceName(name = "") {
  return name.replace(/\s*\(\d+\)\s*$/, "").trim();
}

function getDeviceNameIndex(name = "") {
  const match = String(name).match(/\((\d+)\)\s*$/);
  if (!match) return Number.POSITIVE_INFINITY;
  return Number(match[1]);
}

function parseSearchKeywords(query = "") {
  return query
    .split("+")
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeSearchText(text = "") {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

function compactSearchText(text = "") {
  return normalizeSearchText(text).replace(/\s+/g, "");
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

function formatDateTimeLocalForAPI(date) {
  if (!date) return null;
  return format(date, "yyyy-MM-dd'T'HH:mm:ss");
}

function parseLocalDateParam(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsedDate = new Date(year, month - 1, day);
  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return null;
  }
  return parsedDate;
}

function isValidTimeParam(value) {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(String(value || ""));
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

function formatPickupReturnSummary(date) {
  if (!date) return "";
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

// Price range definitions
const PRICE_RANGES = [
  { id: "all", label: "Tất cả", min: 0, max: Infinity },
  { id: "under200", label: "Dưới 200k", min: 0, max: 200000 },
  { id: "200to400", label: "200k - 400k", min: 200000, max: 400000 },
  { id: "400to600", label: "400k - 600k", min: 400000, max: 600000 },
  { id: "above600", label: "Trên 600k", min: 600000, max: Infinity },
];

// Built-in category tabs (always shown)
const BUILTIN_CATEGORIES = [
  { key: "all", label: "TẤT CẢ" },
  { key: "available", label: "MÁY TRỐNG" },
];

// removed variants to use inline animations to prevent Framer Motion opacity bugs

// Chic Card Component (matching Menu style)
function ChicCard({
  device,
  pricing,
  onQuickBook,
  onSuggestedQuickBook,
  isSelected,
  onToggleSelect,
  feedbackHref,
  cardAnchorId,
  isFocused,
  index = 0,
}) {
  const originalLabel = formatPriceK(pricing?.original || 0);
  const discountedLabel = formatPriceK(pricing?.discounted || 0);
  const billableDays = Math.max(1, pricing?.billableDays || 1);
  const savingAmount = (pricing?.original || 0) - (pricing?.discounted || 0);
  const savingLabel = savingAmount > 0 ? formatPriceK(savingAmount) : null;
  const discountedDisplayLabel =
    pricing?.durationType === "ONE_DAY"
      ? `${savingLabel ? "Chỉ còn " : ""}${discountedLabel} / ${billableDays} ngày`
      : savingLabel
        ? `Chỉ còn ${discountedLabel}`
        : discountedLabel;
  const isHot = device.bookingCount > 5 || device.priceOneDay >= 400000;
  const isAvailable = device.isAvailable !== false;
  const suggestedSlot = device.availabilitySuggestion || null;
  const hasSuggestedSlot = !isAvailable && !!suggestedSlot;

  const handleQuickBook = (e) => {
    e.stopPropagation();
    if (!isAvailable) return;
    onQuickBook(device);
  };

  const handleSuggestedQuickBook = (e) => {
    e.stopPropagation();
    if (!hasSuggestedSlot) return;
    onSuggestedQuickBook?.(device);
  };

  const handleToggleSelect = (e) => {
    e.stopPropagation();
    if (!isAvailable) return;
    onToggleSelect?.(device);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.2,
        ease: "easeOut",
        delay: Math.min(index * 0.03, 0.3),
      }}
      className={`relative group select-none h-full z-10 ${
        isAvailable || hasSuggestedSlot ? "" : "cursor-not-allowed"
      }`}
      id={cardAnchorId}
    >
      <div
        className={`bg-[#FFFBF5] rounded-xl overflow-hidden relative border-2 shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-all duration-200 flex flex-col h-full touch-manipulation ${
          isFocused
            ? "border-[#E85C9C] ring-2 ring-[#FFB6D7]/70"
            : "border-transparent"
        }`}
      >
        {/* PROMO BADGE - top right */}
        <div className="absolute top-0 right-0 bg-[#1a1a1a] text-white px-3 py-1.5 rounded-bl-xl z-30 shadow-md border-l-2 border-b-2 border-amber-400/90">
          <span className="text-[10px] md:text-[11px] font-black leading-none block">
            {savingLabel ? (
              <>
                Giảm trực tiếp{" "}
                <span className="text-amber-400">{savingLabel}</span>
              </>
            ) : (
              "-20% trong tuần"
            )}
          </span>
        </div>

        {/* HOT BADGE */}
        {isHot && (
          <div
            className={`absolute top-2 ${isAvailable && onToggleSelect ? "left-11" : "left-2"} z-20 flex flex-col items-center transform rotate-6 transition-all`}
          >
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-[9px] font-bold px-2 py-1 rounded border border-white shadow-sm uppercase">
              <Sparkles size={10} className="inline" /> HOT
            </div>
          </div>
        )}

        {/* IMAGE - full bleed top, fixed height đồng bộ */}
        <div className="w-full h-36 sm:h-40 lg:h-48 relative shrink-0 bg-[#FFE4F0]/50 overflow-hidden">
          {/* Checkbox chọn nhiều món - chỉ hiện khi máy available */}
          {isAvailable && onToggleSelect && (
            <button
              type="button"
              onClick={handleToggleSelect}
              className={`absolute top-2 left-2 z-20 w-8 h-8 rounded-lg flex items-center justify-center border-2 transition-all shadow-md ${
                isSelected
                  ? "bg-[#E85C9C] border-[#E85C9C] text-white"
                  : "bg-white/90 border-[#ddd] text-[#999] hover:border-[#E85C9C] hover:text-[#E85C9C]"
              }`}
              aria-label={isSelected ? "Bỏ chọn" : "Thêm vào đơn"}
            >
              {isSelected ? (
                <Check size={18} strokeWidth={3} />
              ) : (
                <span className="text-xs font-bold">+</span>
              )}
            </button>
          )}
          <img
            src={device.img || FALLBACK_IMG}
            alt={device.displayName}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
          {!isAvailable && (
            <div
              className={`absolute inset-0 z-10 flex items-center justify-center p-2 ${hasSuggestedSlot ? "bg-emerald-900/20" : "bg-black/40"}`}
            >
              {hasSuggestedSlot ? (
                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-3 shadow-xl transform -rotate-1 animate-in fade-in zoom-in duration-300">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-black text-emerald-700 uppercase tracking-wider">
                      Gợi ý dời lịch
                    </span>
                  </div>
                  <div className="text-[11px] font-bold text-emerald-900 leading-tight">
                    Máy sẽ trống nếu bạn đổi thành:
                    <div className="mt-1 text-[#E85C9C] bg-white px-2 py-1 rounded-md border border-emerald-100 shadow-sm inline-block">
                      {formatTimeVi(suggestedSlot.fromDateTime)}{" "}
                      {format(suggestedSlot.fromDateTime, "dd/MM")} —{" "}
                      {formatTimeVi(suggestedSlot.toDateTime)}{" "}
                      {format(suggestedSlot.toDateTime, "dd/MM")}
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg bg-black/50 border border-red-300/50"
                  style={{
                    transform: "rotate(-12deg)",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
                  }}
                >
                  <span
                    className="font-bold text-white text-xs md:text-sm uppercase tracking-tight text-center max-w-[110px] line-clamp-2"
                    style={{ textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}
                  >
                    {device.displayName}
                  </span>
                  <span
                    className="text-red-500 font-bold text-[9px] uppercase tracking-wider"
                    style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}
                  >
                    Không trống
                  </span>
                </div>
              )}
            </div>
          )}
          <div className="absolute bottom-1.5 right-1.5 text-amber-400/90 drop-shadow-md">
            <Star size={16} fill="currentColor" />
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-3 flex flex-col flex-grow">
          <h3 className="font-sans text-[#222] text-[13px] md:text-sm font-black uppercase tracking-tight leading-tight line-clamp-2 mb-2">
            {device.displayName}
          </h3>

          <div className="flex items-end gap-2 mt-auto pt-2 border-t border-pink-100">
            <div>
              <span className="text-xs md:text-sm text-gray-500 line-through block font-semibold">
                {originalLabel}
              </span>
              <span className="text-base md:text-lg font-black text-[#E85C9C] leading-none">
                {discountedDisplayLabel}
              </span>
            </div>
          </div>

          <button
            onClick={
              hasSuggestedSlot ? handleSuggestedQuickBook : handleQuickBook
            }
            disabled={!isAvailable && !hasSuggestedSlot}
            className={`w-full mt-3 py-2.5 text-[11px] font-bold rounded-lg uppercase tracking-wider transition-all ${
              isAvailable
                ? "bg-[#E85C9C] text-white hover:opacity-90 active:scale-[0.98] shadow-md"
                : hasSuggestedSlot
                  ? "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98] shadow-md"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {isAvailable
              ? "Đặt ngay"
              : hasSuggestedSlot
                ? "Dời theo gợi ý & đặt"
                : "Tạm hết máy"}
          </button>

          <Link
            to={feedbackHref || "/feedback"}
            onClick={(e) => e.stopPropagation()}
            className="w-full mt-2 py-2 text-center text-[11px] font-bold rounded-lg uppercase tracking-wider border border-[#FFD3E7] text-[#E85C9C] bg-[#FFF5FA] hover:bg-[#FFE9F4] transition-colors"
          >
            Xem feedback thực tế
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

// Stylish Tabs (from Menu) with scroll indicators
function StylishTabs({ activeTab, setActiveTab, categories }) {
  const scrollRef = React.useRef(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const checkScroll = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }, []);

  React.useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    // Re-check when categories change
    const timer = setTimeout(checkScroll, 100);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
      clearTimeout(timer);
    };
  }, [checkScroll, categories]);

  const scrollBy = (dir) => {
    scrollRef.current?.scrollBy({ left: dir * 200, behavior: "smooth" });
  };

  return (
    <div className="w-full mb-6 z-20 pt-2 relative">
      {/* Left fade + arrow */}
      {canScrollLeft && (
        <div
          className="absolute left-0 top-0 bottom-0 w-10 z-30 flex items-center justify-center cursor-pointer"
          style={{
            background: "linear-gradient(to right, #FEF5ED 60%, transparent)",
          }}
          onClick={() => scrollBy(-1)}
        >
          <span className="text-[#FF69B4] text-xl font-bold animate-pulse">
            ‹
          </span>
        </div>
      )}

      {/* Right fade + arrow */}
      {canScrollRight && (
        <div
          className="absolute right-0 top-0 bottom-0 w-10 z-30 flex items-center justify-center cursor-pointer"
          style={{
            background: "linear-gradient(to left, #FEF5ED 60%, transparent)",
          }}
          onClick={() => scrollBy(1)}
        >
          <span className="text-[#FF69B4] text-xl font-bold animate-pulse">
            ›
          </span>
        </div>
      )}

      {/* Scrollable tabs */}
      <div
        ref={scrollRef}
        className="overflow-x-auto no-scrollbar px-2 touch-pan-x"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        <div className="flex justify-start md:justify-center gap-3 min-w-max pb-2 px-2">
          {categories.map((cat) => {
            const isActive = activeTab === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveTab(cat.key)}
                className={`relative px-5 py-2.5 rounded-lg uppercase text-xs md:text-sm font-black tracking-widest transition-all duration-200 active:scale-95 touch-manipulation group ${
                  isActive
                    ? "text-[#FF9FCA] translate-y-[-1px]"
                    : "text-[#555] bg-white border border-transparent"
                }`}
              >
                {isActive && (
                  <div className="absolute inset-0 rounded-lg bg-[#222] border border-[#222] shadow-[3px_3px_0_#ddd] -z-10" />
                )}
                <span
                  className={`relative z-10 flex items-center gap-2 transition-all ${
                    isActive ? "text-[#FF9FCA]" : ""
                  }`}
                >
                  {cat.label}
                  {isActive && <Sparkles size={12} fill="currentColor" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Filter Modal (bottom sheet style)
function FilterModal({ isOpen, onClose, priceRange, setPriceRange }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="filter-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center pb-24 md:pb-28"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 400 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FFFBF5] w-full max-w-md rounded-t-3xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-[#222] uppercase tracking-wider">
                Lọc theo giá
              </h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-[#FF9FCA]/20 rounded-full transition-colors"
              >
                <X size={20} className="text-[#555]" />
              </button>
            </div>

            <div className="space-y-2">
              {PRICE_RANGES.map((range) => (
                <button
                  key={range.id}
                  onClick={() => {
                    setPriceRange(range.id);
                    onClose();
                  }}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all font-bold ${
                    priceRange === range.id
                      ? "bg-[#222] text-[#FF9FCA]"
                      : "bg-white text-[#555] hover:bg-[#FF9FCA]/20 border border-[#eee]"
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function AvailabilityGate({
  isOpen,
  onConfirm,
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
  setPickupType,
  setPickupSlot,
  setDurationType,
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

  const prefs = {
    date,
    endDate,
    timeFrom,
    timeTo,
    durationType,
    pickupType,
    pickupSlot,
    branchId,
  };
  const rangeError = getAvailabilityRangeError(prefs, fromDateTime, toDateTime);
  const isComplete = !rangeError;

  const handleBackdropClick = () => {
    // Chỉ cho phép đóng nếu đã chọn đầy đủ thông tin
    if (isComplete) onConfirm();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <MotionDiv
          key="availability-gate"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleBackdropClick}
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
        >
          <MotionDiv
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 400 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#FFFBF5] w-full max-w-md rounded-3xl mb-24 md:mb-28 max-h-[calc(100dvh-8.5rem)] md:max-h-[85vh] flex flex-col overflow-hidden min-w-0"
          >
            <div className="px-5 pt-5 pb-3 border-b border-[#FFE4F0] bg-[#FFFBF5]">
              <div className="mb-2">
                <h3 className="text-xl font-black text-[#222] uppercase tracking-wider">
                  Chọn giờ nhận / trả
                </h3>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 min-w-0">
              <BookingPrefsForm
                branchId={branchId}
                date={date}
                endDate={endDate}
                timeFrom={timeFrom}
                timeTo={timeTo}
                durationType={durationType}
                pickupType={pickupType}
                pickupSlot={pickupSlot}
                setBranchId={setBranchId}
                setDate={setDate}
                setEndDate={setEndDate}
                setTimeFrom={setTimeFrom}
                setTimeTo={setTimeTo}
                setDurationType={setDurationType}
                setPickupType={setPickupType}
                setPickupSlot={setPickupSlot}
                error={error}
              />
            </div>

            <div className="px-5 pt-3 pb-4 border-t border-[#FFE4F0] bg-[#FFFBF5]">
              <button
                onClick={onConfirm}
                disabled={!isComplete}
                className={`w-full py-3 rounded-xl font-black uppercase tracking-wider transition-all ${
                  isComplete
                    ? "bg-[#222] text-[#FF9FCA] hover:bg-[#333]"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-100"
                }`}
              >
                Giữ ưu đãi & xem máy còn trống
              </button>
              <div className="text-center text-sm text-[#888] mt-2">
                Bạn có thể đổi lại thời gian bất cứ lúc nào.
              </div>
            </div>
          </MotionDiv>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
}

// Conflict Modal - shown when someone books a device the user is selecting
function ConflictModal({ info, onDismiss }) {
  if (!info) return null;
  const { devices } = info;

  return (
    <AnimatePresence>
      <motion.div
        key="conflict-modal"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
        onClick={onDismiss}
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#FFFBF5] rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl"
        >
          <div className="bg-gradient-to-br from-red-50 to-[#FFE4F0] px-6 pt-8 pb-5 text-center">
            <div className="text-5xl mb-3">😔</div>
            <h3 className="text-xl font-black text-[#222] mb-1.5">Rất tiếc!</h3>
            <p className="text-sm text-[#666] leading-relaxed">
              {devices.length === 1
                ? "Máy bạn đang chọn vừa được người khác đặt trước rồi."
                : `${devices.length} máy bạn chọn vừa được người khác đặt trước.`}
            </p>
          </div>

          <div className="px-5 py-4 space-y-2">
            {devices.map((d) => (
              <div
                key={d.id || d.modelKey}
                className="flex items-center gap-3 bg-red-50/80 rounded-xl px-3.5 py-2.5 border border-red-100"
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#FFE4F0] shrink-0">
                  <img
                    src={d.img || d.images?.[0] || FALLBACK_IMG}
                    alt={d.displayName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-sm font-bold text-[#333] uppercase">
                  {d.displayName || d.name}
                </span>
              </div>
            ))}
          </div>

          <div className="px-5 pb-6">
            <p className="text-xs text-[#999] text-center mb-4">
              Bạn có thể chọn máy khác hoặc thử lại với thời gian khác nhé!
            </p>
            <button
              onClick={onDismiss}
              className="w-full py-3 rounded-xl bg-[#222] text-[#FF9FCA] font-black uppercase tracking-wider hover:bg-[#333] transition-colors active:scale-[0.98]"
            >
              Đã hiểu, chọn máy khác
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Main Component
export default function DeviceCatalogPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const lastFocusedRef = React.useRef("");

  const initialCategory = searchParams.get("category") || "all";
  const initialSearchQuery = searchParams.get("q") || "";
  const initialPriceRange = PRICE_RANGES.some(
    (range) => range.id === searchParams.get("price"),
  )
    ? searchParams.get("price")
    : "all";
  const initialDurationType = ["SIX_HOURS", "ONE_DAY"].includes(
    searchParams.get("durationType"),
  )
    ? searchParams.get("durationType")
    : null;
  const initialBranchId = searchParams.get("branchId");
  const initialDate = parseLocalDateParam(searchParams.get("date"));
  const initialEndDate = parseLocalDateParam(searchParams.get("endDate"));
  const initialTimeFrom = isValidTimeParam(searchParams.get("timeFrom"))
    ? searchParams.get("timeFrom")
    : null;
  const initialTimeTo = isValidTimeParam(searchParams.get("timeTo"))
    ? searchParams.get("timeTo")
    : null;
  const initialPickupType = ["MORNING", "EVENING", "AFTERNOON"].includes(
    searchParams.get("pickupType"),
  )
    ? searchParams.get("pickupType")
    : null;
  const initialPickupSlot = isValidTimeParam(searchParams.get("pickupSlot"))
    ? searchParams.get("pickupSlot")
    : null;
  const initialAvailabilityConfirmed = searchParams.get("availability") === "1";
  const focusModelParam = searchParams.get("focusModel") || "";

  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);

  // === API Categories state ===
  const [apiCategories, setApiCategories] = useState([]);
  const [priceRange, setPriceRange] = useState(initialPriceRange);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const [availabilityConfirmed, setAvailabilityConfirmed] = useState(
    initialAvailabilityConfirmed,
  );
  const [availabilityError, setAvailabilityError] = useState("");
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [busyDeviceIds, setBusyDeviceIds] = useState([]);
  const [availabilityPrefs, setAvailabilityPrefs] = useState(() => {
    const p =
      typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("fao_booking_prefs") || "null")
        : null;
    return {
      date: initialDate,
      endDate: initialEndDate,
      timeFrom: initialTimeFrom,
      timeTo: initialTimeTo,
      pickupType: initialPickupType,
      pickupSlot: initialPickupSlot,
      branchId: initialBranchId || p?.branchId || getDefaultBranchId(),
      durationType: initialDurationType || p?.durationType || "ONE_DAY",
    };
  });

  // Quick Book Modal State
  const [quickBookDevice, setQuickBookDevice] = useState(null);
  const [quickBookDevices, setQuickBookDevices] = useState([]); // Đơn nhiều món
  const [showQuickBookModal, setShowQuickBookModal] = useState(false);
  const [deviceBookingsById, setDeviceBookingsById] = useState({});

  // Chọn nhiều món - Set of device ids đã chọn
  const [selectedDeviceIds, setSelectedDeviceIds] = useState(new Set());

  const handleQuickBook = (device) => {
    if (device?.isAvailable === false) return;
    trackCatalogBookClick(device, "quick_single");
    setQuickBookDevice(device);
    setQuickBookDevices([device]);
    setShowQuickBookModal(true);
  };

  const handleSuggestedQuickBook = (device) => {
    const suggestion = device?.availabilitySuggestion;
    if (!suggestion) return;

    setAvailabilityPrefs((prev) => {
      const nextDate = normalizeDate(suggestion.fromDateTime);
      const nextEndDate = normalizeDate(suggestion.toDateTime);
      const nextPickupType =
        suggestion.timeFrom === MORNING_PICKUP_TIME
          ? "MORNING"
          : prev.durationType === "ONE_DAY" &&
              suggestion.timeFrom === SIX_HOUR_SECOND_PICKUP_TIME
            ? "AFTERNOON"
            : prev.durationType === "ONE_DAY" &&
                suggestion.timeFrom !== MORNING_PICKUP_TIME
              ? "EVENING"
              : "MORNING";

      return {
        ...prev,
        date: nextDate,
        endDate: nextEndDate,
        timeFrom: suggestion.timeFrom,
        timeTo: suggestion.timeTo,
        pickupType: nextPickupType,
        pickupSlot:
          prev.durationType === "ONE_DAY" &&
          (nextPickupType === "EVENING" || nextPickupType === "AFTERNOON")
            ? suggestion.timeFrom
            : DEFAULT_EVENING_SLOT,
      };
    });

    trackCatalogBookClick(device, "quick_suggested");
    setQuickBookDevice(device);
    setQuickBookDevices([device]);
    setShowQuickBookModal(true);
  };

  const handleQuickBookMulti = () => {
    const selected = filteredDevices.filter((d) => selectedDeviceIds.has(d.id));
    if (selected.length === 0) return;
    selected.forEach((d) => trackCatalogBookClick(d, "quick_multi"));
    setQuickBookDevice(null);
    setQuickBookDevices(selected);
    setShowQuickBookModal(true);
  };

  const handleToggleSelect = (device) => {
    setSelectedDeviceIds((prev) => {
      const next = new Set(prev);
      if (next.has(device.id)) next.delete(device.id);
      else next.add(device.id);
      return next;
    });
  };

  const handleCloseQuickBook = () => {
    setShowQuickBookModal(false);
    setQuickBookDevice(null);
    setQuickBookDevices([]);
    setSelectedDeviceIds(new Set());
  };

  // Auto-save prefs
  useEffect(() => {
    const data = {
      branchId: availabilityPrefs.branchId,
      durationId: availabilityPrefs.durationType,
      date: availabilityPrefs.date?.toISOString(),
      endDate: availabilityPrefs.endDate?.toISOString(),
      timeFrom: availabilityPrefs.timeFrom,
      timeTo: availabilityPrefs.timeTo,
      pickupType: availabilityPrefs.pickupType,
      pickupSlot: availabilityPrefs.pickupSlot,
      durationType: availabilityPrefs.durationType,
    };
    saveBookingPrefs(data);
  }, [availabilityPrefs]);

  const fetchDevices = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setIsLoading(true);
      setError("");
    }
    try {
      const [devicesRes, categoriesRes] = await Promise.all([
        api.get("/v1/devices"),
        api
          .get("/v1/device-categories/with-items", {
            params: { includeFeedbackImages: false },
          })
          .catch(() => ({ data: [] })),
      ]);
      setDevices(devicesRes.data || []);
      setApiCategories(categoriesRes.data || []);
      if (!silent) setError("");
    } catch (err) {
      console.error("Failed to fetch devices:", err);
      if (!silent) setError("Không thể tải danh sách máy. Vui lòng thử lại.");
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const [modelAvailabilitySuggestions, setModelAvailabilitySuggestions] =
    useState({});

  const fetchAvailability = useCallback(
    async ({ silent = false } = {}) => {
      if (!availabilityConfirmed) return;
      const { fromDateTime, toDateTime } =
        computeAvailabilityRange(availabilityPrefs);
      const rangeError = getAvailabilityRangeError(
        availabilityPrefs,
        fromDateTime,
        toDateTime,
      );
      if (rangeError) {
        if (!silent) setAvailabilityError(rangeError);
        return;
      }

      if (!silent) setAvailabilityError("");
      if (!silent) setAvailabilityLoading(true);
      const from = formatDateTimeLocalForAPI(fromDateTime);
      const exactTo = formatDateTimeLocalForAPI(toDateTime);
      const lookupToDateTime =
        availabilityPrefs.durationType === "ONE_DAY"
          ? addDays(toDateTime, 1)
          : toDateTime;
      const to = formatDateTimeLocalForAPI(lookupToDateTime);
      if (!from || !to || !exactTo) {
        if (!silent) setAvailabilityLoading(false);
        return;
      }
      try {
        const [bookingResp, suggestionResp] = await Promise.all([
          api.get("v1/devices/booking", {
            params: {
              startDate: from?.slice(0, 10),
              endDate: to?.slice(0, 10),
              branchId: availabilityPrefs.branchId,
            },
          }),
          api.get("v1/devices/model-availability-suggestions", {
            params: { from, to: exactTo },
          }),
        ]);
        const data = bookingResp.data || [];
        const busySet = new Set();
        const bookingMap = {};
        data.forEach((d) => {
          bookingMap[d.id] = Array.isArray(d.bookingDtos) ? d.bookingDtos : [];
          if (Array.isArray(d.bookingDtos) && d.bookingDtos.length > 0) {
            busySet.add(d.id);
          }
        });
        setBusyDeviceIds(Array.from(busySet));
        setDeviceBookingsById(bookingMap);
        setModelAvailabilitySuggestions(suggestionResp.data || {});
      } catch (err) {
        console.error("Failed to fetch availability:", err);
        if (!silent) {
          setBusyDeviceIds([]);
          setDeviceBookingsById({});
          setModelAvailabilitySuggestions({});
        }
      } finally {
        if (!silent) setAvailabilityLoading(false);
      }
    },
    [availabilityConfirmed, availabilityPrefs],
  );

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const handleRealtimeRefresh = useCallback(() => {
    fetchDevices({ silent: true });
    if (availabilityConfirmed) fetchAvailability({ silent: true });
  }, [fetchDevices, fetchAvailability, availabilityConfirmed]);

  const { isConnected: wsConnected, lastEvent: wsLastEvent } = useBookingSocket(
    {
      onRefresh: handleRealtimeRefresh,
      debounceMs: 1000,
      refreshOnTabFocus: true,
    },
  );

  // --- Conflict detection: detect when someone books a device the user is selecting ---
  const [conflictInfo, setConflictInfo] = useState(null);

  const quickBookDevicesRef = React.useRef(quickBookDevices);
  quickBookDevicesRef.current = quickBookDevices;
  const selectedDeviceIdsRef = React.useRef(selectedDeviceIds);
  selectedDeviceIdsRef.current = selectedDeviceIds;
  const showQuickBookModalRef = React.useRef(showQuickBookModal);
  showQuickBookModalRef.current = showQuickBookModal;

  useEffect(() => {
    if (!wsLastEvent) return;
    if (!["CREATE", "BATCH_CREATE"].includes(wsLastEvent.type)) return;

    const eventDeviceName = wsLastEvent.deviceName || "";
    if (!eventDeviceName) return;

    const isModalOpen = showQuickBookModalRef.current;
    const modalDevices = quickBookDevicesRef.current;
    const selectedIds = selectedDeviceIdsRef.current;

    if (!isModalOpen && selectedIds.size === 0) return;

    const eventNames = eventDeviceName
      .split(",")
      .map((n) => normalizeDeviceName(n.trim()).toLowerCase())
      .filter(Boolean);

    if (eventNames.length === 0) return;

    const activeDevices = [];
    if (isModalOpen && modalDevices.length > 0) {
      activeDevices.push(...modalDevices);
    }
    if (selectedIds.size > 0) {
      devices
        .filter((d) => selectedIds.has(d.id))
        .forEach((d) => {
          const normalized = normalizeDeviceName(d.name).toLowerCase();
          if (
            !activeDevices.some(
              (a) => (a.displayName || "").toLowerCase() === normalized,
            )
          ) {
            activeDevices.push({
              ...d,
              displayName: normalizeDeviceName(d.name),
            });
          }
        });
    }

    const conflicted = activeDevices.filter((d) => {
      const display = (d.displayName || d.name || "").toLowerCase();
      const hasRealtimeConflict = eventNames.some((en) => en === display);
      if (!hasRealtimeConflict) return false;

      const modelState = processedDevices.find(
        (p) =>
          normalizeDeviceName(p.displayName || p.name || "").toLowerCase() ===
          display,
      );
      // Only show conflict when this model is truly out of stock.
      return modelState?.isAvailable === false;
    });

    if (conflicted.length > 0) {
      setConflictInfo({ devices: conflicted });
    }
  }, [wsLastEvent, devices]);

  const handleConflictDismiss = useCallback(() => {
    setConflictInfo(null);
    setShowQuickBookModal(false);
    setQuickBookDevice(null);
    setQuickBookDevices([]);
    setSelectedDeviceIds(new Set());
  }, []);

  const availabilityRange = useMemo(
    () => computeAvailabilityRange(availabilityPrefs),
    [availabilityPrefs],
  );

  // Process devices: group by modelKey, keep 1 representative per model
  // isAvailable = theo modelAvailability (model-level) nếu đã confirm, else true
  const processedDevices = useMemo(() => {
    if (!devices || devices.length === 0) return [];
    const busySet = new Set(busyDeviceIds);

    const byModel = new Map(); // modelKey -> [{ device, isAvailable }, ...]
    for (const device of devices) {
      const deviceType = String(device.type || "").toUpperCase();
      if (deviceType !== "DEVICE") continue;
      const modelKey =
        (device.modelKey || "").trim() || normalizeDeviceName(device.name);
      const isAvailable = !busySet.has(device.id);
      const bookingDtos = deviceBookingsById[device.id] || [];
      if (!byModel.has(modelKey)) byModel.set(modelKey, []);
      byModel.get(modelKey).push({
        device: { ...device, bookingDtos },
        isAvailable,
      });
    }

    const result = [];
    for (const [modelKey, group] of byModel) {
      const totalAvailable = group.filter((g) => g.isAvailable).length;
      const totalBookingCount = group.reduce(
        (sum, g) => sum + (g.device.bookingDtos?.length || 0),
        0,
      );
      const modelAvailabilityInfo = modelAvailabilitySuggestions[modelKey];
      const hasModelAvailability =
        availabilityConfirmed &&
        Object.keys(modelAvailabilitySuggestions).length > 0;
      const isAvailable = hasModelAvailability
        ? modelAvailabilityInfo?.available === true
        : totalAvailable > 0;
      const availabilitySuggestion =
        availabilityConfirmed &&
        availabilityPrefs.durationType !== "SIX_HOURS" &&
        !isAvailable &&
        modelAvailabilityInfo?.suggestedFrom &&
        modelAvailabilityInfo?.suggestedTo
          ? {
              fromDateTime: new Date(modelAvailabilityInfo.suggestedFrom),
              toDateTime: new Date(modelAvailabilityInfo.suggestedTo),
              timeFrom: format(
                new Date(modelAvailabilityInfo.suggestedFrom),
                "HH:mm",
              ),
              timeTo: format(
                new Date(modelAvailabilityInfo.suggestedTo),
                "HH:mm",
              ),
              suggestedDeviceId: modelAvailabilityInfo.suggestedDeviceId,
            }
          : null;

      const sortedGroup = [...group].sort((a, b) => {
        const indexA = getDeviceNameIndex(a.device.name);
        const indexB = getDeviceNameIndex(b.device.name);
        if (indexA !== indexB) return indexA - indexB;

        const orderA = a.device.orderNumber ?? Number.POSITIVE_INFINITY;
        const orderB = b.device.orderNumber ?? Number.POSITIVE_INFINITY;
        if (orderA !== orderB) return orderA - orderB;

        return String(a.device.id).localeCompare(String(b.device.id));
      });

      const preferredDeviceId = modelAvailabilityInfo?.suggestedDeviceId;
      const rep =
        sortedGroup.find((g) => g.device.id === preferredDeviceId) ||
        sortedGroup.find((g) => g.isAvailable) ||
        sortedGroup[0];
      const { device } = rep;
      const normalizedName = normalizeDeviceName(device.name);
      const minOrderNumber = Math.min(
        ...group.map((g) => g.device.orderNumber ?? 999999),
      );

      result.push({
        ...device,
        orderNumber: minOrderNumber,
        modelKey,
        displayName: normalizedName,
        brand: inferBrand(device.name),
        img: device.images?.[0] || FALLBACK_IMG,
        unitCount: group.length,
        bookingCount: totalBookingCount,
        availableCount: totalAvailable,
        isAvailable,
        availabilitySuggestion,
        groupDeviceIds: new Set(group.map((g) => g.device.id)),
      });
    }

    return result;
  }, [
    devices,
    busyDeviceIds,
    modelAvailabilitySuggestions,
    availabilityConfirmed,
    deviceBookingsById,
  ]);

  const pricingContext = useMemo(() => {
    const { fromDateTime: from, toDateTime: to } =
      computeAvailabilityRange(availabilityPrefs);
    const { totalDays, weekdayDays } = countWeekdaysInRange(from, to);
    return {
      durationType: availabilityPrefs.durationType,
      fromDateTime: from,
      toDateTime: to,
      totalDays,
      weekdayDays,
    };
  }, [availabilityPrefs]);

  const getDevicePricing = useCallback(
    (device) => {
      const { durationType, fromDateTime, toDateTime } = pricingContext;
      const billableDays =
        durationType === "ONE_DAY"
          ? Math.max(1, pricingContext.totalDays || 1)
          : 0;

      const { price: rawPrice } = calculateRentalInfo(
        fromDateTime && toDateTime ? [fromDateTime, toDateTime] : [],
        device || {},
      );
      const original = roundDownToThousand(rawPrice || 0);

      if (original <= 0) {
        const oneDayPrice = roundDownToThousand(device?.priceOneDay || 0);
        return {
          original: oneDayPrice,
          discounted: oneDayPrice,
          durationType,
          billableDays,
        };
      }

      const b = computeDiscountBreakdown(original, fromDateTime, toDateTime);
      if (!b) {
        return {
          original,
          discounted: original,
          durationType,
          billableDays,
        };
      }
      return {
        original: b.original,
        discounted: b.discounted,
        durationType,
        billableDays,
      };
    },
    [pricingContext],
  );

  // Build merged categories: builtin + API dynamic categories
  const mergedCategories = useMemo(() => {
    const dynamic = apiCategories.map((cat) => {
      const items = cat.items || [];
      // Collect device IDs from category items for matching
      const deviceIds = new Set(
        items.map((item) => item.deviceId).filter(Boolean),
      );
      // Build deviceId → orderIndex map
      const deviceIdOrder = new Map(
        items.map((item) => [item.deviceId, item.orderIndex ?? 0]),
      );
      return {
        key: `cat_${cat.id}`,
        label: (cat.name || "").toUpperCase(),
        apiCategoryId: cat.id,
        deviceIds,
        deviceIdOrder,
      };
    });
    return [...BUILTIN_CATEGORIES, ...dynamic];
  }, [apiCategories]);

  // Device IDs allowed on tab "Tất cả" / "Máy trống" (category có bật showOnAllPage)
  const allowedOnAllDeviceIds = useMemo(() => {
    const set = new Set();
    for (const cat of apiCategories) {
      if (cat.showOnAllPage === false) continue;
      for (const item of cat.items || []) {
        if (item.deviceId != null) set.add(item.deviceId);
      }
    }
    return set;
  }, [apiCategories]);

  // Build global device order based on category priority + item priority
  const globalDeviceOrder = useMemo(() => {
    // Sort categories by their orderNumber (from backend)
    const sortedCats = [...apiCategories]
      .filter((cat) => cat.showOnAllPage !== false)
      .sort(
      (a, b) => (a.orderNumber ?? 0) - (b.orderNumber ?? 0),
    );
    const orderMap = new Map(); // deviceId -> { catOrder, itemOrder }

    sortedCats.forEach((cat, catIdx) => {
      const items = cat.items || [];
      // Sort items by orderIndex just in case
      const sortedItems = [...items].sort(
        (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0),
      );

      sortedItems.forEach((item) => {
        if (!item.deviceId) return;
        // Only take the first appearance to define global order
        if (!orderMap.has(item.deviceId)) {
          orderMap.set(item.deviceId, {
            catOrder: cat.orderNumber ?? catIdx,
            itemOrder: item.orderIndex ?? 0,
          });
        }
      });
    });
    return orderMap;
  }, [apiCategories]);

  // Filter devices based on search, category, price
  const filteredDevices = useMemo(() => {
    let filtered = [...processedDevices];

    // Filter by search query
    if (searchQuery.trim()) {
      const keywords = parseSearchKeywords(searchQuery);
      filtered = filtered.filter((d) => {
        const deviceName = normalizeSearchText(d.displayName);
        const compactDeviceName = compactSearchText(d.displayName);
        return keywords.some((keyword) => {
          const normalizedKeyword = normalizeSearchText(keyword);
          const compactKeyword = compactSearchText(keyword);
          return (
            deviceName.includes(normalizedKeyword) ||
            compactDeviceName.includes(compactKeyword)
          );
        });
      });
    }

    // Filter by category
    const activeCat = mergedCategories.find((c) => c.key === selectedCategory);
    if (selectedCategory === "available") {
      filtered = filtered.filter((d) => d.isAvailable);
    } else if (activeCat?.apiCategoryId) {
      // API category → match if ANY device in the model group belongs to category
      const catDeviceIds = activeCat.deviceIds;
      filtered = filtered.filter((d) => {
        for (const gid of d.groupDeviceIds) {
          if (catDeviceIds.has(gid)) return true;
        }
        return false;
      });
    }

    const restrictAllTabs =
      apiCategories.length > 0 &&
      (selectedCategory === "all" || selectedCategory === "available");
    if (restrictAllTabs) {
      filtered = filtered.filter((d) => {
        for (const gid of d.groupDeviceIds) {
          if (allowedOnAllDeviceIds.has(gid)) return true;
        }
        return false;
      });
    }

    // Filter by price range
    const range = PRICE_RANGES.find((r) => r.id === priceRange);
    if (range && priceRange !== "all") {
      filtered = filtered.filter(
        (d) => d.priceOneDay >= range.min && d.priceOneDay < range.max,
      );
    }

    // Sort priority: 0=máy trống, 1=có thể dời lịch, 2=không trống
    const availPriority = (d) => {
      if (d.isAvailable) return 0;
      if (d.availabilitySuggestion) return 1;
      return 2;
    };

    // Helper: get best (lowest) orderIndex for a model group
    const getCatOrder = (d) => {
      let bestCat = 999999;
      let bestItem = 999999;

      // If specific category selected, use its order
      if (activeCat?.deviceIdOrder) {
        for (const gid of d.groupDeviceIds) {
          const idx = activeCat.deviceIdOrder.get(gid);
          if (idx !== undefined && idx < bestItem) {
            bestItem = idx;
            bestCat = 0; // Priority within category
          }
        }
      } else {
        // Global view (All/Available) -> use precalculated global order
        for (const gid of d.groupDeviceIds) {
          const order = globalDeviceOrder.get(gid);
          if (order) {
            if (
              order.catOrder < bestCat ||
              (order.catOrder === bestCat && order.itemOrder < bestItem)
            ) {
              bestCat = order.catOrder;
              bestItem = order.itemOrder;
            }
          }
        }
      }

      return { cat: bestCat, item: bestItem };
    };

    // Tab Tất cả / Máy trống: giữ nguyên section — sort theo category trước, rồi mới trống/không trống
    // (tránh xáo trộn máy cùng category vì ưu tiên availability toàn trang).
    const groupByCategoryFirst =
      selectedCategory === "all" || selectedCategory === "available";

    filtered.sort((a, b) => {
      const orderA = getCatOrder(a);
      const orderB = getCatOrder(b);

      if (groupByCategoryFirst) {
        if (orderA.cat !== orderB.cat) return orderA.cat - orderB.cat;
        // Trong cùng category: trống → có thể dời lịch → không trống, rồi thứ tự trong category
        const availDiff = availPriority(a) - availPriority(b);
        if (availDiff !== 0) return availDiff;
        if (orderA.item !== orderB.item) return orderA.item - orderB.item;
        return (a.orderNumber ?? 999999) - (b.orderNumber ?? 999999);
      }

      const availDiff = availPriority(a) - availPriority(b);
      if (availDiff !== 0) return availDiff;
      if (orderA.cat !== orderB.cat) return orderA.cat - orderB.cat;
      if (orderA.item !== orderB.item) return orderA.item - orderB.item;
      return (a.orderNumber ?? 999999) - (b.orderNumber ?? 999999);
    });

    return filtered;
  }, [
    processedDevices,
    searchQuery,
    selectedCategory,
    priceRange,
    mergedCategories,
    globalDeviceOrder,
    allowedOnAllDeviceIds,
    apiCategories.length,
  ]);

  /** Tab Tất cả / Máy trống: nhóm máy theo category (cùng thứ tự ưu tiên với globalDeviceOrder). */
  const catalogSectionsAllOrAvailable = useMemo(() => {
    const useSections =
      (selectedCategory === "all" || selectedCategory === "available") &&
      apiCategories.length > 0;
    if (!useSections) return null;

    const sortedShowAllCats = [...apiCategories]
      .filter((c) => c.showOnAllPage !== false)
      .sort((a, b) => (a.orderNumber ?? 0) - (b.orderNumber ?? 0));

    const primarySectionForDevice = (d) => {
      for (const cat of sortedShowAllCats) {
        for (const item of cat.items || []) {
          if (item.deviceId != null && d.groupDeviceIds.has(item.deviceId)) {
            return {
              sectionKey: `cat-${cat.id}`,
              sectionTitle: (cat.name || "").trim() || "Danh mục",
            };
          }
        }
      }
      return { sectionKey: "other", sectionTitle: "Khác" };
    };

    const sections = [];
    let sectionKey = null;
    let sectionTitle = null;
    let bucket = [];

    const flush = () => {
      if (bucket.length === 0) return;
      sections.push({
        key: sectionKey,
        title: sectionTitle,
        devices: bucket,
      });
      bucket = [];
    };

    for (const d of filteredDevices) {
      const next = primarySectionForDevice(d);
      if (next.sectionKey !== sectionKey) {
        flush();
        sectionKey = next.sectionKey;
        sectionTitle = next.sectionTitle;
      }
      bucket.push(d);
    }
    flush();

    return sections;
  }, [filteredDevices, selectedCategory, apiCategories]);

  // Sync filters from URL -> state (support opening shared links with pre-filled filters)
  useEffect(() => {
    const nextCategory = searchParams.get("category") || "all";
    const nextSearchQuery = searchParams.get("q") || "";
    const nextPrice = searchParams.get("price");
    const nextPriceRange = PRICE_RANGES.some((range) => range.id === nextPrice)
      ? nextPrice
      : "all";

    setSelectedCategory((prev) =>
      prev === nextCategory ? prev : nextCategory,
    );
    setSearchQuery((prev) =>
      prev === nextSearchQuery ? prev : nextSearchQuery,
    );
    setPriceRange((prev) => (prev === nextPriceRange ? prev : nextPriceRange));

    const nextDurationType = ["SIX_HOURS", "ONE_DAY"].includes(
      searchParams.get("durationType"),
    )
      ? searchParams.get("durationType")
      : null;
    const nextBranchId = searchParams.get("branchId");
    const nextDate = parseLocalDateParam(searchParams.get("date"));
    const nextEndDate = parseLocalDateParam(searchParams.get("endDate"));
    const nextTimeFrom = isValidTimeParam(searchParams.get("timeFrom"))
      ? searchParams.get("timeFrom")
      : null;
    const nextTimeTo = isValidTimeParam(searchParams.get("timeTo"))
      ? searchParams.get("timeTo")
      : null;
    const nextPickupType = ["MORNING", "EVENING", "AFTERNOON"].includes(
      searchParams.get("pickupType"),
    )
      ? searchParams.get("pickupType")
      : null;
    const nextPickupSlot = isValidTimeParam(searchParams.get("pickupSlot"))
      ? searchParams.get("pickupSlot")
      : null;
    const hasAvailabilityFlag = searchParams.has("availability");

    setAvailabilityPrefs((prev) => {
      const nextPrefs = { ...prev };
      let changed = false;

      if (nextDurationType && prev.durationType !== nextDurationType) {
        nextPrefs.durationType = nextDurationType;
        changed = true;
      }
      if (nextBranchId && prev.branchId !== nextBranchId) {
        nextPrefs.branchId = nextBranchId;
        changed = true;
      }
      if (nextDate) {
        const prevDateMs = prev.date?.getTime() || 0;
        const nextDateMs = nextDate.getTime();
        if (prevDateMs !== nextDateMs) {
          nextPrefs.date = nextDate;
          changed = true;
        }
      }
      if (nextEndDate) {
        const prevEndDateMs = prev.endDate?.getTime() || 0;
        const nextEndDateMs = nextEndDate.getTime();
        if (prevEndDateMs !== nextEndDateMs) {
          nextPrefs.endDate = nextEndDate;
          changed = true;
        }
      }
      if (nextTimeFrom && prev.timeFrom !== nextTimeFrom) {
        nextPrefs.timeFrom = nextTimeFrom;
        changed = true;
      }
      if (nextTimeTo && prev.timeTo !== nextTimeTo) {
        nextPrefs.timeTo = nextTimeTo;
        changed = true;
      }
      if (nextPickupType && prev.pickupType !== nextPickupType) {
        nextPrefs.pickupType = nextPickupType;
        changed = true;
      }
      if (nextPickupSlot && prev.pickupSlot !== nextPickupSlot) {
        nextPrefs.pickupSlot = nextPickupSlot;
        changed = true;
      }

      return changed ? nextPrefs : prev;
    });

    if (hasAvailabilityFlag) {
      setAvailabilityConfirmed(searchParams.get("availability") === "1");
    }
  }, [searchParams]);

  // Sync state -> URL params whenever filters change
  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);

    if (selectedCategory && selectedCategory !== "all") {
      nextParams.set("category", selectedCategory);
    } else {
      nextParams.delete("category");
    }

    if (priceRange && priceRange !== "all") {
      nextParams.set("price", priceRange);
    } else {
      nextParams.delete("price");
    }

    const keyword = searchQuery.trim();
    if (keyword) {
      nextParams.set("q", keyword);
    } else {
      nextParams.delete("q");
    }

    if (availabilityPrefs.branchId) {
      nextParams.set("branchId", availabilityPrefs.branchId);
    } else {
      nextParams.delete("branchId");
    }

    if (availabilityPrefs.durationType) {
      nextParams.set("durationType", availabilityPrefs.durationType);
    } else {
      nextParams.delete("durationType");
    }

    if (availabilityPrefs.date) {
      nextParams.set("date", format(availabilityPrefs.date, "yyyy-MM-dd"));
    } else {
      nextParams.delete("date");
    }

    if (availabilityPrefs.endDate) {
      nextParams.set(
        "endDate",
        format(availabilityPrefs.endDate, "yyyy-MM-dd"),
      );
    } else {
      nextParams.delete("endDate");
    }

    if (availabilityPrefs.timeFrom) {
      nextParams.set("timeFrom", availabilityPrefs.timeFrom);
    } else {
      nextParams.delete("timeFrom");
    }

    if (availabilityPrefs.timeTo) {
      nextParams.set("timeTo", availabilityPrefs.timeTo);
    } else {
      nextParams.delete("timeTo");
    }

    if (availabilityPrefs.pickupType) {
      nextParams.set("pickupType", availabilityPrefs.pickupType);
    } else {
      nextParams.delete("pickupType");
    }

    if (availabilityPrefs.pickupSlot) {
      nextParams.set("pickupSlot", availabilityPrefs.pickupSlot);
    } else {
      nextParams.delete("pickupSlot");
    }

    nextParams.set("availability", availabilityConfirmed ? "1" : "0");

    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [
    selectedCategory,
    priceRange,
    searchQuery,
    availabilityPrefs,
    availabilityConfirmed,
    searchParams,
    setSearchParams,
  ]);

  // Handle device selection
  const handleConfirmAvailability = () => {
    const { fromDateTime, toDateTime } =
      computeAvailabilityRange(availabilityPrefs);
    const rangeError = getAvailabilityRangeError(
      availabilityPrefs,
      fromDateTime,
      toDateTime,
    );
    if (rangeError) {
      setAvailabilityError(rangeError);
      return;
    }
    setAvailabilityError("");
    setAvailabilityConfirmed(true);
  };

  const availabilityDisplay = useMemo(() => {
    const from = availabilityRange.fromDateTime;
    const to = availabilityRange.toDateTime;
    return {
      fromTime: from
        ? formatTimeVi(from)
        : availabilityPrefs.timeFrom
          ? formatTimeViFromString(availabilityPrefs.timeFrom)
          : "",
      fromDate: from ? format(from, "dd/MM") : "",
      toTime: to
        ? formatTimeVi(to)
        : availabilityPrefs.timeTo
          ? formatTimeViFromString(availabilityPrefs.timeTo)
          : "",
      toDate: to ? format(to, "dd/MM") : "",
    };
  }, [availabilityRange, availabilityPrefs]);

  const buildFeedbackHref = useCallback(
    (modelName, modelKey) => {
      const currentCatalogPath = `${location.pathname}${location.search}`;
      const params = new URLSearchParams();
      params.set("model", modelName || "");
      if (modelKey) params.set("modelKey", modelKey);
      if (selectedCategory && selectedCategory !== "all") {
        params.set("category", selectedCategory);
      }
      params.set("from", currentCatalogPath);
      return `/feedback?${params.toString()}`;
    },
    [location.pathname, location.search, selectedCategory],
  );

  useEffect(() => {
    if (!focusModelParam) return;
    const focusToken = compactSearchText(focusModelParam);
    if (!focusToken || lastFocusedRef.current === focusToken) return;

    const matched = filteredDevices.find(
      (device) => compactSearchText(device.displayName) === focusToken,
    );
    if (!matched) return;

    lastFocusedRef.current = focusToken;
    const elementId = `catalog-card-${focusToken}`;
    window.requestAnimationFrame(() => {
      document
        .getElementById(elementId)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, [focusModelParam, filteredDevices]);

  return (
    <div className="min-h-screen font-sans relative text-[#333] overflow-x-hidden flex flex-col pb-32 md:pb-36 selection:bg-[#FF9FCA] selection:text-white">
      <NoiseOverlay />
      <PageBackground />
      <PinkTapeMarquee />

      <div className="w-full max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto pt-16 px-4 z-20">
        {/* Header */}
        <div className="text-center mb-8 relative">
          <Link
            to="/"
            className="absolute left-0 top-2 p-2 hover:bg-white/50 rounded-full transition-colors"
          >
            <ArrowRight size={20} className="rotate-180 text-[#555]" />
          </Link>

          <h1
            className="text-3xl md:text-4xl font-black text-transparent uppercase tracking-[-0.03em] leading-[0.9] mb-2"
            style={{
              fontFamily: "Impact, sans-serif",
              WebkitTextStroke: "1px #E85C9C",
              textShadow: "3px 3px 0px rgba(255, 194, 223, 0.4)",
            }}
          >
            Thuê Máy Ảnh
          </h1>
          <p className="text-sm text-[#777] font-medium">
            Chọn máy yêu thích của bạn
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6 flex gap-2">
          <div className="flex-1 relative">
            <Search
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#999]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm máy ảnh... (vd: r50 + pocket 3)"
              className="w-full pl-11 pr-4 py-3 bg-white border-2 border-[#eee] rounded-xl text-sm text-[#333] placeholder:text-[#aaa] focus:outline-none focus:border-[#FF9FCA] transition-colors font-medium"
            />
          </div>
          <button
            onClick={() => setShowFilterModal(true)}
            className={`px-4 rounded-xl border-2 transition-all flex items-center gap-2 font-bold ${
              priceRange !== "all"
                ? "bg-[#222] text-[#FF9FCA] border-[#222]"
                : "bg-white text-[#555] border-[#eee] hover:border-[#FF9FCA]"
            }`}
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>

        {/* Availability Summary */}
        {availabilityConfirmed && (
          <div className="mb-4 overflow-hidden rounded-xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-pink-100/60">
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#FFF5F9] to-white border-b border-pink-100/50">
              <span className="text-sm font-black text-[#333] uppercase tracking-wide">
                {availabilityPrefs.durationType === "SIX_HOURS"
                  ? "Gói 6 tiếng"
                  : "Thuê theo ngày"}
              </span>
              <button
                onClick={() => setAvailabilityConfirmed(false)}
                className="text-xs font-bold text-[#E85C9C] hover:text-[#c9185b] px-3 py-1.5 rounded-lg hover:bg-[#E85C9C]/10 transition-all touch-manipulation"
              >
                Đổi giờ
              </button>
            </div>
            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-lg bg-gray-50/80 px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-0.5">
                  Nhận
                </p>
                <p className="text-sm font-black text-[#222]">
                  {availabilityDisplay.fromTime}
                </p>
                <p className="text-xs text-gray-500">
                  {availabilityDisplay.fromDate}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50/80 px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-0.5">
                  Trả
                </p>
                <p className="text-sm font-black text-[#222]">
                  {availabilityDisplay.toTime}
                </p>
                <p className="text-xs text-gray-500">
                  {availabilityDisplay.toDate}
                </p>
              </div>
              {(() => {
                const branch = BRANCHES.find(
                  (b) => b.id === availabilityPrefs.branchId,
                );
                return (
                  <div className="rounded-lg bg-[#FFF0F5] px-3 py-2.5 col-span-2 sm:col-span-1">
                    <p className="text-[10px] uppercase tracking-wider text-[#E85C9C]/80 font-semibold mb-0.5 flex items-center gap-1">
                      <MapPin size={10} />
                      Chi nhánh
                    </p>
                    <p className="text-sm font-black text-[#E85C9C]">
                      {branch?.label ?? ""}
                    </p>
                    {branch?.address && (
                      <a
                        href={branch.mapUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-[#777] hover:text-[#E85C9C] transition-colors mt-0.5 block leading-tight"
                      >
                        📍 {branch.address}
                      </a>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Category Tabs */}
        <StylishTabs
          activeTab={selectedCategory}
          setActiveTab={setSelectedCategory}
          categories={mergedCategories}
        />

        {/* Results Info */}
        <div className="mb-4 px-1 flex items-center justify-between">
          <p className="text-sm text-[#777] font-medium">
            Tìm thấy{" "}
            <span className="font-black text-[#E85C9C]">
              {filteredDevices.length}
            </span>{" "}
            máy
            {priceRange !== "all" && (
              <span className="ml-2 text-xs bg-[#222] text-[#FF9FCA] px-2 py-0.5 rounded-full font-bold">
                {PRICE_RANGES.find((r) => r.id === priceRange)?.label}
              </span>
            )}
          </p>
          <div
            className="flex items-center gap-1.5"
            title={wsConnected ? "Đang cập nhật trực tiếp" : "Đang kết nối..."}
          >
            {wsConnected ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">
                  Live
                </span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-gray-300" />
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Offline
                </span>
              </>
            )}
          </div>
        </div>

        {/* Device Grid */}
        <div className="min-h-[50vh]">
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl overflow-hidden shadow animate-pulse"
                >
                  <div className="aspect-square bg-[#FFE4F0]" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-[#FFE4F0] rounded w-3/4" />
                    <div className="h-5 bg-[#FFE4F0] rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📷</div>
              <p className="text-[#777] mb-4">{error}</p>
              <button
                onClick={fetchDevices}
                className="px-6 py-2 bg-[#222] text-[#FF9FCA] rounded-full font-bold hover:opacity-90 transition-opacity"
              >
                Thử lại
              </button>
            </div>
          ) : filteredDevices.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🔍</div>
              <p className="text-[#777]">Không tìm thấy máy phù hợp</p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  setPriceRange("all");
                }}
                className="mt-4 text-[#E85C9C] font-bold hover:underline"
              >
                Xóa bộ lọc
              </button>
            </div>
          ) : catalogSectionsAllOrAvailable ? (
            <motion.div
              key={selectedCategory}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-8 sm:gap-10"
            >
              {catalogSectionsAllOrAvailable.map((section) => (
                <section key={section.key} className="min-w-0">
                  <h3 className="mb-3 sm:mb-4 px-0.5 text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-[#222] border-b border-[#222]/10 pb-2">
                    {section.title}
                  </h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {section.devices.map((device, idx) => (
                      <ChicCard
                        key={
                          device.modelKey
                            ? `model-${device.modelKey}`
                            : `dev-${device.id}`
                        }
                        device={device}
                        pricing={getDevicePricing(device)}
                        onQuickBook={handleQuickBook}
                        onSuggestedQuickBook={handleSuggestedQuickBook}
                        isSelected={selectedDeviceIds.has(device.id)}
                        onToggleSelect={handleToggleSelect}
                        feedbackHref={buildFeedbackHref(
                          device.displayName,
                          device.modelKey,
                        )}
                        cardAnchorId={`catalog-card-${compactSearchText(device.displayName)}`}
                        isFocused={
                          !!focusModelParam &&
                          compactSearchText(device.displayName) ===
                            compactSearchText(focusModelParam)
                        }
                        index={idx}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key={selectedCategory}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
            >
              {filteredDevices.map((device, idx) => (
                <ChicCard
                  key={
                    device.modelKey
                      ? `model-${device.modelKey}`
                      : `dev-${device.id}`
                  }
                  device={device}
                  pricing={getDevicePricing(device)}
                  onQuickBook={handleQuickBook}
                  onSuggestedQuickBook={handleSuggestedQuickBook}
                  isSelected={selectedDeviceIds.has(device.id)}
                  onToggleSelect={handleToggleSelect}
                  feedbackHref={buildFeedbackHref(
                    device.displayName,
                    device.modelKey,
                  )}
                  cardAnchorId={`catalog-card-${compactSearchText(device.displayName)}`}
                  isFocused={
                    !!focusModelParam &&
                    compactSearchText(device.displayName) ===
                      compactSearchText(focusModelParam)
                  }
                  index={idx}
                />
              ))}
            </motion.div>
          )}
        </div>
        {availabilityConfirmed && availabilityLoading && (
          <div className="mt-3 text-center text-xs text-[#777] font-medium">
            Đang kiểm tra tình trạng máy...
          </div>
        )}
      </div>

      {/* Filter Modal */}
      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        priceRange={priceRange}
        setPriceRange={setPriceRange}
      />

      {/* Availability Gate */}
      <AvailabilityGate
        isOpen={!availabilityConfirmed}
        onConfirm={handleConfirmAvailability}
        branchId={availabilityPrefs.branchId}
        date={availabilityPrefs.date}
        endDate={availabilityPrefs.endDate}
        timeFrom={availabilityPrefs.timeFrom}
        timeTo={availabilityPrefs.timeTo}
        durationType={availabilityPrefs.durationType}
        pickupType={availabilityPrefs.pickupType}
        pickupSlot={availabilityPrefs.pickupSlot}
        setBranchId={(branchId) =>
          setAvailabilityPrefs((prev) => ({ ...prev, branchId }))
        }
        setDate={(date) =>
          setAvailabilityPrefs((prev) => {
            const nextEndDate =
              prev.durationType === "ONE_DAY"
                ? prev.endDate && date
                  ? prev.endDate.getTime() >= addDays(date, 1).getTime()
                    ? prev.endDate
                    : addDays(date, 1)
                  : addDays(date || new Date(), 1)
                : date;
            return { ...prev, date, endDate: nextEndDate };
          })
        }
        setEndDate={(endDate) =>
          setAvailabilityPrefs((prev) => ({ ...prev, endDate }))
        }
        setTimeFrom={(timeFrom) =>
          setAvailabilityPrefs((prev) => ({ ...prev, timeFrom }))
        }
        setTimeTo={(timeTo) =>
          setAvailabilityPrefs((prev) => ({ ...prev, timeTo }))
        }
        setPickupType={(pickupType) =>
          setAvailabilityPrefs((prev) => ({ ...prev, pickupType }))
        }
        setPickupSlot={(pickupSlot) =>
          setAvailabilityPrefs((prev) => ({ ...prev, pickupSlot }))
        }
        setDurationType={(durationType) =>
          setAvailabilityPrefs((prev) => ({
            ...prev,
            durationType,
            pickupType: null,
            pickupSlot: null,
            timeFrom: null,
            timeTo: null,
            // Re-calc endDate if ONE_DAY (at least have a date default if they already picked one)
            endDate:
              durationType === "ONE_DAY" && prev.date
                ? addDays(prev.date, 1)
                : prev.date,
          }))
        }
        error={availabilityError}
      />

      {/* Floating bar - Đặt nhiều món */}
      <AnimatePresence>
        {selectedDeviceIds.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-20 left-4 right-4 z-40 max-w-2xl lg:max-w-5xl xl:max-w-6xl mx-auto"
          >
            <div className="bg-[#222] text-white rounded-xl shadow-xl border-2 border-[#E85C9C] p-4 flex items-center justify-between gap-4">
              <span className="font-bold text-[#FF9FCA] uppercase tracking-wide">
                Đã chọn {selectedDeviceIds.size} món
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedDeviceIds(new Set())}
                  className="px-4 py-2 rounded-lg border border-[#FF9FCA] text-[#FF9FCA] font-bold text-sm uppercase hover:bg-[#FF9FCA]/20 transition-colors"
                >
                  Xóa
                </button>
                <button
                  onClick={handleQuickBookMulti}
                  className="px-6 py-2 rounded-lg bg-[#E85C9C] text-white font-black text-sm uppercase hover:opacity-90 transition-opacity"
                >
                  Đặt tất cả
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Book Modal - nhảy step 2 khi có prefs, cho back về step 1 */}
      <QuickBookModal
        device={quickBookDevices.length === 1 ? quickBookDevices[0] : null}
        devices={quickBookDevices}
        isOpen={showQuickBookModal}
        onClose={handleCloseQuickBook}
        initialPrefs={
          quickBookDevices.length > 0
            ? {
                step: availabilityConfirmed ? 2 : 1,
                branchId: availabilityPrefs.branchId,
                durationType: availabilityPrefs.durationType,
                date: availabilityPrefs.date,
                endDate: availabilityPrefs.endDate,
                timeFrom: availabilityPrefs.timeFrom,
                timeTo: availabilityPrefs.timeTo,
                pickupType: availabilityPrefs.pickupType,
                pickupSlot: availabilityPrefs.pickupSlot,
              }
            : null
        }
        pricing={
          quickBookDevices.length === 1
            ? getDevicePricing(quickBookDevices[0])
            : null
        }
      />

      {/* Conflict Modal - someone booked the device you're looking at */}
      <ConflictModal info={conflictInfo} onDismiss={handleConflictDismiss} />

      <SlideNav />

      {/* Floating Contact Button */}
      <FloatingContactButton />
    </div>
  );
}

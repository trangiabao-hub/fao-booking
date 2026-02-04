import React, { useState, useEffect, useMemo, useCallback } from "react";
import { format, addHours } from "date-fns";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import api from "../../config/axios";
import FloatingContactButton from "../../components/FloatingContactButton";
import QuickBookModal from "../../components/QuickBookModal";

const FALLBACK_IMG = "https://placehold.co/400x300/fdf2f8/ec4899?text=No+Image";
const DEFAULT_TIME_FROM = "09:00";
const DEFAULT_TIME_TO = "20:30";
const DEFAULT_MULTI_DAY_TIME_TO = "20:30";

const DURATION_TYPES = [
  { id: "SIX_HOURS", label: "6 tiếng" },
  { id: "ONE_DAY", label: "1 ngày" },
  { id: "MULTI_DAY", label: "Nhiều ngày" },
];

const BRANCHES = [
  { id: "PHU_NHUAN", label: "FAO Phú Nhuận" },
  { id: "Q9", label: "FAO Q9 (Vinhomes)" },
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
          Sinh viên cọc đồng giá 500k
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

function normalizeDate(date) {
  if (!date) return null;
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
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

function addHoursToTimeString(dateOnly, timeStr, hoursToAdd) {
  const base = combineDateWithTimeString(dateOnly, timeStr);
  if (!base) return null;
  return addHours(base, hoursToAdd);
}

// Get discount price (weekday -20%)
function getDiscountPrice(price) {
  if (!price || price <= 0) return { original: "0k", discounted: "0k" };
  const originalK = Math.round(price / 1000);
  const discountedK = Math.floor(originalK * 0.8);
  return { original: `${originalK}k`, discounted: `${discountedK}k` };
}

// Price range definitions
const PRICE_RANGES = [
  { id: "all", label: "Tất cả", min: 0, max: Infinity },
  { id: "under200", label: "Dưới 200k", min: 0, max: 200000 },
  { id: "200to400", label: "200k - 400k", min: 200000, max: 400000 },
  { id: "400to600", label: "400k - 600k", min: 400000, max: 600000 },
  { id: "above600", label: "Trên 600k", min: 600000, max: Infinity },
];

// Category tabs (matching Menu style)
const CATEGORIES = [
  { key: "all", label: "TẤT CẢ" },
  { key: "fuji", label: "FUJI" },
  { key: "canon", label: "CANON" },
  { key: "sony", label: "SONY" },
  { key: "pocket", label: "POCKET" },
];

// Animation variants (optimized - less animation = less jitter)
const gridVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      when: "beforeChildren",
    },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: "easeOut" },
  },
};

// Chic Card Component (matching Menu style)
function ChicCard({ device, onClick, onQuickBook }) {
  const { original, discounted } = getDiscountPrice(device.priceOneDay);
  const isHot = device.bookingCount > 5 || device.priceOneDay >= 400000;
  const isAvailable = device.isAvailable !== false;

  const handleQuickBook = (e) => {
    e.stopPropagation();
    if (!isAvailable) return;
    onQuickBook(device);
  };

  return (
    <motion.div
      variants={cardVariants}
      className={`relative group select-none h-full z-10 ${
        isAvailable ? "cursor-pointer" : "cursor-not-allowed opacity-60"
      }`}
      onClick={isAvailable ? onClick : undefined}
    >
      <div className="bg-[#FFFBF5] rounded-xl p-3 pt-10 pb-3 relative border-2 border-transparent hover:border-[#FF9FCA] shadow-[0_4px_10px_rgba(0,0,0,0.03)] active:scale-[0.98] transition-all duration-200 flex flex-col items-center h-full overflow-hidden cursor-pointer touch-manipulation">
        {!isAvailable && (
          <div className="absolute top-2 right-2 z-30 bg-red-100 text-red-700 text-[9px] font-black px-2 py-1 rounded-full uppercase">
            Hết chỗ
          </div>
        )}
        {/* SALE BADGE */}
        <div className="absolute top-0 left-0 bg-[#333] group-hover:bg-[#E85C9C] text-white px-3 py-1.5 rounded-br-xl z-20 shadow-sm transition-colors duration-300">
          <span className="text-[9px] md:text-[10px] font-black tracking-widest leading-none block">
            -20% trong tuần
          </span>
        </div>

        {/* HOT BADGE */}
        {isHot && (
          <div className="absolute top-2 right-2 z-20 flex flex-col items-center transform rotate-6">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-[9px] font-bold px-2 py-1 rounded border border-white shadow-[2px_2px_0_rgba(0,0,0,0.1)] uppercase text-center leading-[1.1]">
              <div className="flex items-center gap-1">
                <Sparkles size={10} />
                HOT
              </div>
            </div>
          </div>
        )}

        {/* IMAGE CONTAINER */}
        <div className="w-24 h-24 md:w-32 md:h-32 mb-4 relative shrink-0">
          <div className="w-full h-full rounded-full border-4 border-white shadow-[0_5px_20px_#ffe4f0] overflow-hidden relative bg-white">
            <img
              src={device.img || FALLBACK_IMG}
              alt={device.displayName}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="absolute -bottom-1 -right-1 text-yellow-400 drop-shadow-sm z-20">
            <Star size={20} fill="currentColor" />
          </div>
        </div>

        {/* INFO BODY */}
        <div className="text-center w-full flex flex-col flex-grow">
          <h3 className="font-sans text-[#222] text-sm md:text-base font-black uppercase tracking-tight mb-1 leading-tight line-clamp-2 min-h-[2.5rem]">
            {device.displayName}
          </h3>

          {device.priceSixHours > 0 && (
            <p className="text-[10px] md:text-xs text-gray-500 font-medium italic line-clamp-1 mb-2">
              6h: {Math.round(device.priceSixHours / 1000)}k
            </p>
          )}

          <div className="w-full h-px bg-gradient-to-r from-transparent via-[#FF9FCA] to-transparent opacity-50 mb-3" />

          <div className="mt-auto flex items-end justify-between w-full px-1 mb-3">
            <div className="flex flex-col items-start leading-none">
              <span className="text-[10px] text-gray-400 line-through decoration-rose-400 decoration-1 mb-0.5">
                {original}
              </span>
              <span
                className="text-lg md:text-xl font-black text-[#E85C9C]"
                style={{ textShadow: "1px 1px 0 #FFF" }}
              >
                {discounted}
              </span>
            </div>

            <div className="bg-[#222] text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md">
              <ArrowRight size={16} strokeWidth={3} />
            </div>
          </div>

          {/* Quick Book Button */}
          <button
            onClick={handleQuickBook}
            disabled={!isAvailable}
            className="w-full py-2 bg-gradient-to-r from-[#E85C9C] to-[#FF9FCA] text-white text-xs font-bold rounded-lg hover:opacity-90 transition-all active:scale-95 shadow-md uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🚀 Đặt nhanh
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Stylish Tabs (from Menu)
function StylishTabs({ activeTab, setActiveTab }) {
  return (
    <div className="w-full px-2 mb-6 z-20 overflow-x-auto no-scrollbar pt-2 touch-pan-x">
      <div className="flex justify-start md:justify-center gap-3 min-w-max pb-2 px-2">
        {CATEGORIES.map((cat) => {
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
                <div className="absolute inset-0 rounded-lg shadow-[3px_3px_0_#ddd] -z-10" />
              )}
              {isActive && (
                <motion.div
                  layoutId="activeTabChic"
                  className="absolute inset-0 bg-[#222] rounded-lg border border-[#222]"
                  transition={{ duration: 0.15, ease: "easeInOut" }}
                />
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
  );
}

// Filter Modal (bottom sheet style)
function FilterModal({ isOpen, onClose, priceRange, setPriceRange }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
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
  setBranchId,
  setDate,
  setEndDate,
  setTimeFrom,
  setTimeTo,
  setDurationType,
  error,
}) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="bg-[#FFFBF5] w-full max-w-md rounded-t-3xl p-6"
        >
          <h3 className="text-lg font-black text-[#222] uppercase tracking-wider mb-4">
            Chọn giờ nhận / trả
          </h3>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#777] mb-2 block">
                Gói thuê
              </label>
              <div className="grid grid-cols-3 gap-2">
                {DURATION_TYPES.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setDurationType(opt.id)}
                    className={`px-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all ${
                      durationType === opt.id
                        ? "bg-[#222] text-[#FF9FCA] border-[#222]"
                        : "bg-white text-[#555] border-[#eee] hover:border-[#FF9FCA]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#777] mb-1 block">
                Ngày nhận
              </label>
              <input
                type="date"
                value={date ? format(date, "yyyy-MM-dd") : ""}
                onChange={(e) => setDate(normalizeDate(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border-2 border-[#eee] bg-white text-sm font-medium focus:border-[#FF9FCA] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#777] mb-1 block">
                  Nhận
                </label>
                <input
                  type="time"
                  value={timeFrom}
                  onChange={(e) => setTimeFrom(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border-2 border-[#eee] bg-white text-sm font-medium focus:border-[#FF9FCA] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#777] mb-1 block">
                  Trả
                </label>
                {durationType === "SIX_HOURS" ? (
                  <div className="w-full px-4 py-3 rounded-xl border-2 border-[#eee] bg-[#f5f5f5] text-sm font-medium text-[#777]">
                    {timeTo}
                  </div>
                ) : (
                  <input
                    type="time"
                    value={timeTo}
                    onChange={(e) => setTimeTo(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-[#eee] bg-white text-sm font-medium focus:border-[#FF9FCA] focus:outline-none"
                  />
                )}
              </div>
            </div>

            {durationType === "MULTI_DAY" && (
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-[#777] mb-1 block">
                  Ngày trả
                </label>
                <input
                  type="date"
                  value={endDate ? format(endDate, "yyyy-MM-dd") : ""}
                  onChange={(e) => setEndDate(normalizeDate(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-[#eee] bg-white text-sm font-medium focus:border-[#FF9FCA] focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-[#777] mb-2 block">
                Chi nhánh
              </label>
              <div className="grid grid-cols-2 gap-2">
                {BRANCHES.map((branch) => (
                  <button
                    key={branch.id}
                    onClick={() => setBranchId(branch.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border-2 transition-all ${
                      branchId === branch.id
                        ? "bg-[#222] text-[#FF9FCA] border-[#222]"
                        : "bg-white text-[#555] border-[#eee] hover:border-[#FF9FCA]"
                    }`}
                  >
                    {branch.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 font-medium bg-red-50 border border-red-200 rounded-xl p-3">
                {error}
              </div>
            )}
          </div>

          <button
            onClick={onConfirm}
            className="mt-6 w-full py-3 bg-[#222] text-[#FF9FCA] rounded-xl font-black uppercase tracking-wider hover:bg-[#333] transition-all"
          >
            Xác nhận giờ nhận / trả
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Main Component
export default function DeviceCatalogPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialCategory = searchParams.get("category") || "all";

  const [devices, setDevices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [priceRange, setPriceRange] = useState("all");
  const [showFilterModal, setShowFilterModal] = useState(false);

  const [availabilityConfirmed, setAvailabilityConfirmed] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [busyDeviceIds, setBusyDeviceIds] = useState([]);
  const [availabilityPrefs, setAvailabilityPrefs] = useState(() => ({
    date: normalizeDate(new Date()),
    endDate: normalizeDate(new Date()),
    timeFrom: DEFAULT_TIME_FROM,
    timeTo: DEFAULT_TIME_TO,
    branchId: BRANCHES[0].id,
    durationType: "ONE_DAY",
  }));

  // Quick Book Modal State
  const [quickBookDevice, setQuickBookDevice] = useState(null);
  const [showQuickBookModal, setShowQuickBookModal] = useState(false);

  const handleQuickBook = (device) => {
    if (device?.isAvailable === false) return;
    setQuickBookDevice(device);
    setShowQuickBookModal(true);
  };

  const handleCloseQuickBook = () => {
    setShowQuickBookModal(false);
    setQuickBookDevice(null);
  };

  // Fetch devices
  const fetchDevices = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await api.get("/v1/devices");
      setDevices(response.data || []);
    } catch (err) {
      console.error("Failed to fetch devices:", err);
      setError("Không thể tải danh sách máy. Vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const fetchAvailability = useCallback(async () => {
    if (!availabilityConfirmed) return;
    const fromDateTime = combineDateWithTimeString(
      availabilityPrefs.date,
      availabilityPrefs.timeFrom
    );
    let toDateTime = null;
    if (availabilityPrefs.durationType === "SIX_HOURS") {
      toDateTime = addHoursToTimeString(
        availabilityPrefs.date,
        availabilityPrefs.timeFrom,
        6
      );
    } else if (availabilityPrefs.durationType === "ONE_DAY") {
      toDateTime = combineDateWithTimeString(
        availabilityPrefs.date,
        availabilityPrefs.timeTo
      );
    } else {
      toDateTime = combineDateWithTimeString(
        availabilityPrefs.endDate,
        availabilityPrefs.timeTo
      );
    }
    if (!fromDateTime || !toDateTime || toDateTime <= fromDateTime) {
      setAvailabilityError("Thời gian trả phải sau thời gian nhận.");
      return;
    }

    setAvailabilityError("");
    setAvailabilityLoading(true);
    try {
      const params = {
        startDate: formatDateTimeLocalForAPI(fromDateTime),
        endDate: formatDateTimeLocalForAPI(toDateTime),
        branchId: availabilityPrefs.branchId,
      };
      const resp = await api.get("v1/devices/booking", { params });
      const data = resp.data || [];
      const busySet = new Set();
      data.forEach((d) => {
        if (Array.isArray(d.bookingDtos) && d.bookingDtos.length > 0) {
          busySet.add(d.id);
        }
      });
      setBusyDeviceIds(Array.from(busySet));
    } catch (err) {
      console.error("Failed to fetch availability:", err);
      setBusyDeviceIds([]);
    } finally {
      setAvailabilityLoading(false);
    }
  }, [availabilityConfirmed, availabilityPrefs]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  // Process devices: deduplicate by model, add computed fields
  const processedDevices = useMemo(() => {
    if (!devices || devices.length === 0) return [];
    const busySet = new Set(busyDeviceIds);

    const seen = new Map();
    const result = [];

    for (const device of devices) {
      const normalizedName = normalizeDeviceName(device.name);
      const isAvailable = !busySet.has(device.id);

      if (seen.has(normalizedName)) {
        const existing = seen.get(normalizedName);
        existing.unitCount = (existing.unitCount || 1) + 1;
        if (isAvailable)
          existing.availableCount = (existing.availableCount || 0) + 1;
        existing.isAvailable = (existing.availableCount || 0) > 0;
        continue;
      }

      const processed = {
        ...device,
        displayName: normalizedName,
        brand: inferBrand(device.name),
        img: device.images?.[0] || FALLBACK_IMG,
        unitCount: 1,
        bookingCount: device.bookingDtos?.length || 0,
        availableCount: isAvailable ? 1 : 0,
        isAvailable,
      };

      seen.set(normalizedName, processed);
      result.push(processed);
    }

    return result;
  }, [devices]);

  // Filter devices based on search, category, price
  const filteredDevices = useMemo(() => {
    let filtered = [...processedDevices];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((d) =>
        d.displayName.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((d) => d.brand === selectedCategory);
    }

    // Filter by price range
    const range = PRICE_RANGES.find((r) => r.id === priceRange);
    if (range && priceRange !== "all") {
      filtered = filtered.filter(
        (d) => d.priceOneDay >= range.min && d.priceOneDay < range.max
      );
    }

    // Sort by price (ascending)
    filtered.sort((a, b) => (a.priceOneDay || 0) - (b.priceOneDay || 0));

    return filtered;
  }, [processedDevices, searchQuery, selectedCategory, priceRange]);

  // Handle device selection
  const handleSelectDevice = (device) => {
    if (device?.isAvailable === false) return;
    navigate(
      `/booking?deviceId=${device.id}&deviceName=${encodeURIComponent(
        device.displayName
      )}`
    );
  };

  const handleConfirmAvailability = () => {
    const fromDateTime = combineDateWithTimeString(
      availabilityPrefs.date,
      availabilityPrefs.timeFrom
    );
    let toDateTime = null;
    if (availabilityPrefs.durationType === "SIX_HOURS") {
      toDateTime = addHoursToTimeString(
        availabilityPrefs.date,
        availabilityPrefs.timeFrom,
        6
      );
    } else if (availabilityPrefs.durationType === "ONE_DAY") {
      toDateTime = combineDateWithTimeString(
        availabilityPrefs.date,
        availabilityPrefs.timeTo
      );
    } else {
      toDateTime = combineDateWithTimeString(
        availabilityPrefs.endDate,
        availabilityPrefs.timeTo
      );
    }
    if (!fromDateTime || !toDateTime || toDateTime <= fromDateTime) {
      setAvailabilityError("Thời gian trả phải sau thời gian nhận.");
      return;
    }
    setAvailabilityError("");
    setAvailabilityConfirmed(true);
  };

  const availabilityDisplayTimeTo = useMemo(() => {
    if (availabilityPrefs.durationType === "SIX_HOURS") {
      const end = addHoursToTimeString(
        availabilityPrefs.date,
        availabilityPrefs.timeFrom,
        6
      );
      return end ? format(end, "HH:mm") : availabilityPrefs.timeTo;
    }
    return availabilityPrefs.timeTo;
  }, [availabilityPrefs]);

  const availabilityDisplayDateTo = useMemo(() => {
    if (availabilityPrefs.durationType === "MULTI_DAY") {
      return availabilityPrefs.endDate
        ? format(availabilityPrefs.endDate, "dd/MM")
        : "";
    }
    return availabilityPrefs.date
      ? format(availabilityPrefs.date, "dd/MM")
      : "";
  }, [availabilityPrefs]);

  return (
    <div className="min-h-screen font-sans relative text-[#333] overflow-x-hidden flex flex-col pb-10 selection:bg-[#FF9FCA] selection:text-white">
      <NoiseOverlay />
      <PageBackground />
      <PinkTapeMarquee />

      <div className="w-full max-w-2xl mx-auto pt-16 px-4 z-20">
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
              placeholder="Tìm máy ảnh..."
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
          <div className="mb-4 px-3 py-3 bg-white/90 border border-[#FFE4F0] rounded-xl shadow-sm flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm md:text-base">
            <div className="text-[#222] font-black leading-relaxed">
              {availabilityPrefs.durationType === "SIX_HOURS"
                ? "Gói 6 tiếng"
                : availabilityPrefs.durationType === "ONE_DAY"
                ? "Gói 1 ngày"
                : "Gói nhiều ngày"}{" "}
              • Nhận{" "}
              <span className="font-bold text-[#222]">
                {availabilityPrefs.timeFrom}
              </span>{" "}
              <span className="font-bold text-[#999]">
                {" "}
                {availabilityPrefs.date
                  ? format(availabilityPrefs.date, "dd/MM")
                  : ""}
              </span>{" "}
              • Trả{" "}
              <span className="font-bold text-[#222]">
                {availabilityDisplayTimeTo}
              </span>{" "}
              <span className="font-bold text-[#999]">
                {" "}
                {availabilityDisplayDateTo}
              </span>{" "}
              •{" "}
              <span className="font-bold text-[#E85C9C]">
                {
                  BRANCHES.find((b) => b.id === availabilityPrefs.branchId)
                    ?.label
                }
              </span>
            </div>
            <button
              onClick={() => setAvailabilityConfirmed(false)}
              className="self-start sm:self-auto text-[#E85C9C] font-black text-xs md:text-sm hover:underline"
            >
              Đổi giờ
            </button>
          </div>
        )}

        {/* Category Tabs */}
        <StylishTabs
          activeTab={selectedCategory}
          setActiveTab={setSelectedCategory}
        />

        {/* Results Info */}
        <div className="mb-4 px-1">
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
        </div>

        {/* Device Grid */}
        <div className="min-h-[50vh]">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
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
          ) : (
            <motion.div
              variants={gridVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 gap-4 md:gap-6"
            >
              {filteredDevices.map((device) => (
                <ChicCard
                  key={device.id}
                  device={device}
                  onClick={() => handleSelectDevice(device)}
                  onQuickBook={handleQuickBook}
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

      {/* Footer */}
      <div className="mt-auto px-4 text-center z-50 pt-8">
        <div className="inline-block bg-[#FFFBF5]/95 border border-[#E85C9C]/20 px-4 py-3 md:px-8 md:py-4 rounded-full shadow-lg backdrop-blur-md w-full md:w-auto">
          <div className="flex flex-wrap md:flex-nowrap gap-x-4 gap-y-2 items-center justify-center text-[10px] md:text-xs font-bold text-[#555] uppercase tracking-wide">
            <a
              href="https://maps.google.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 hover:text-[#E85C9C]"
            >
              <MapPin size={14} className="text-[#E85C9C]" /> PN, Phan Đình
              Phùng
            </a>
            <div className="h-3 w-px bg-gray-300 hidden md:block" />
            <a
              href="https://maps.google.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 hover:text-[#E85C9C]"
            >
              <MapPin size={14} className="text-[#E85C9C]" /> Q9, Vinhome
            </a>
            <a
              href="tel:0901355198"
              className="flex items-center gap-2 bg-[#222] text-white px-5 py-2 rounded-full active:bg-[#E85C9C] ml-auto md:ml-2 w-full md:w-auto justify-center mt-2 md:mt-0 shadow-lg"
            >
              <Phone size={14} fill="currentColor" /> 0901 355 198
            </a>
          </div>
        </div>
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
        timeTo={availabilityDisplayTimeTo}
        durationType={availabilityPrefs.durationType}
        setBranchId={(branchId) =>
          setAvailabilityPrefs((prev) => ({ ...prev, branchId }))
        }
        setDate={(date) =>
          setAvailabilityPrefs((prev) => {
            const nextEndDate =
              prev.durationType === "MULTI_DAY" && prev.endDate && date
                ? prev.endDate.getTime() >= date.getTime()
                  ? prev.endDate
                  : date
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
        setDurationType={(durationType) =>
          setAvailabilityPrefs((prev) => {
            const nextEndDate =
              durationType === "MULTI_DAY"
                ? prev.endDate && prev.date
                  ? prev.endDate.getTime() >= prev.date.getTime()
                    ? prev.endDate
                    : prev.date
                  : prev.date
                : prev.date;
            return {
              ...prev,
              durationType,
              endDate: nextEndDate,
              timeTo:
                durationType === "SIX_HOURS"
                  ? prev.timeTo
                  : durationType === "ONE_DAY"
                  ? DEFAULT_TIME_TO
                  : DEFAULT_MULTI_DAY_TIME_TO,
            };
          })
        }
        error={availabilityError}
      />

      {/* Quick Book Modal */}
      <QuickBookModal
        device={quickBookDevice}
        isOpen={showQuickBookModal}
        onClose={handleCloseQuickBook}
      />

      {/* Floating Contact Button */}
      <FloatingContactButton />
    </div>
  );
}

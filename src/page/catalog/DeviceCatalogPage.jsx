import React, { useState, useEffect, useMemo, useCallback } from "react";
import { format, addDays, isValid } from "date-fns";
import vi from "date-fns/locale/vi";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import DatePicker, { registerLocale } from "react-datepicker";
import {
  MapPin,
  Phone,
  Zap,
  ArrowRight,
  Sparkles,
  Search,
  X,
  SlidersHorizontal,
  Check,
  ShoppingBag,
  Trash2,
  Minus,
  Plus,
  ChevronDown,
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
import { formatPriceK, computeQ9BranchFlatDiscountVnd } from "../../utils/bookingHelpers";
import { BRANCHES, isBranchBookable } from "../../data/bookingConstants";
import {
  devicesForBookingBranch,
  normalizeBookingBranchId,
  normalizeDeviceBranchId,
} from "../../utils/deviceBranch";
import { findClientCatalogAvailabilitySuggestion } from "../../utils/catalogAvailabilitySuggestion";
import { formatTimeVi, formatTimeViFromString } from "../../utils/formatTimeVi";
import {
  getStrictestReleaseDate,
  formatDateOnlyLocal,
  parseDeviceReleaseDate,
} from "../../utils/deviceReleaseDate";
import { saveBookingPrefs, loadCustomerSession, saveCustomerSession } from "../../utils/storage";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../../config/firebase";
import useBookingSocket from "../../lib/useBookingSocket";
import "react-datepicker/dist/react-datepicker.css";

import ChicCard from "../../components/catalog/ChicCard";
import StylishTabs from "../../components/catalog/StylishTabs";
import FilterModal from "../../components/catalog/FilterModal";
import AvailabilityGate from "../../components/catalog/AvailabilityGate";
import ConflictModal from "../../components/catalog/ConflictModal";
import { useCatalogDevices } from "../../hooks/useCatalogDevices";
import { useCartLines } from "../../hooks/useCartLines";
import { useAvailabilityCheck } from "../../hooks/useAvailabilityCheck";
import { useCatalogFilters } from "../../hooks/useCatalogFilters";
import {
  FALLBACK_IMG,
  MORNING_PICKUP_TIME,
  SIX_HOUR_SECOND_PICKUP_TIME,
  DEFAULT_EVENING_SLOT,
  PRICE_RANGES,
  BUILTIN_CATEGORIES,
  CATALOG_API_TIMEOUT_MS,
} from "../../constants/catalog";
import {
  filterAndSortCatalogRows,
  compactSearchText,
} from "../../utils/catalogFilters";
import {
  parseLocalDateParam,
  isValidTimeParam,
  countWeekdaysInRange,
} from "../../utils/catalogDatetime";
import {
  inferBrand,
  inferBrandHintFromCategoryLabel,
  normalizeDeviceName,
  addDeviceCategoryGroupKeys,
  categoryGroupKeysFromItemDeviceIds,
  processedRowMatchesCategoryGroupKeys,
  physicalDeviceMatchesCategoryGroupKeys,
  getDeviceNameIndex,
  normalizeCatalogDeviceId,
  categoryItemDeviceId,
  buildModelGroupDevicesForModal,
  getMaxQtyForCartLine,
  expandCartLinesToPhysicalDevices,
} from "../../utils/catalogCategory";

registerLocale("vi", vi);

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

  const {
    devices,
    apiCategories,
    isLoading,
    error,
    fetchDevices,
  } = useCatalogDevices();

  const {
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    priceRange,
    setPriceRange,
    showFilterModal,
    setShowFilterModal,
  } = useCatalogFilters({
    initialCategory,
    initialSearchQuery,
    initialPriceRange,
  });

  const [availabilityConfirmed, setAvailabilityConfirmed] = useState(
    initialAvailabilityConfirmed,
  );
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

  const {
    availabilityError,
    setAvailabilityError,
    availabilityLoading,
    busyDeviceIds,
    otherBranchesBusyIds,
    deviceBookingsById,
    deviceRawBookingsById,
    modelAvailabilitySuggestions,
    fetchAvailability,
  } = useAvailabilityCheck({
    availabilityConfirmed,
    availabilityPrefs,
  });

  /** id → device gốc từ API (toàn hệ thống) — khớp category theo đại diện + cùng model/tên. */
  const deviceByIdGlobal = useMemo(() => {
    const m = new Map();
    for (const device of devices) {
      m.set(String(device.id), device);
    }
    return m;
  }, [devices]);

  const devicesInBranch = useMemo(
    () => devicesForBookingBranch(devices, availabilityPrefs.branchId),
    [devices, availabilityPrefs.branchId],
  );

  const currentBranchCatalogShortLabel = useMemo(() => {
    const bid = availabilityPrefs.branchId;
    const b = BRANCHES.find(
      (x) =>
        normalizeBookingBranchId(x.id) === normalizeBookingBranchId(bid),
    );
    return (b?.label || "").replace(/^FAO\s*/i, "").trim() || "chi nhánh này";
  }, [availabilityPrefs.branchId]);

  // Quick Book Modal State
  const [quickBookDevice, setQuickBookDevice] = useState(null);
  const [quickBookDevices, setQuickBookDevices] = useState([]); // Đơn nhiều món
  const [showQuickBookModal, setShowQuickBookModal] = useState(false);
  /** Khi đặt nhanh máy chỉ có ở chi nhánh khách — preset chi nhánh trong modal (không đổi prefs chung). */
  const [quickBookBranchOverride, setQuickBookBranchOverride] = useState(null);
  /** Progressive disclosure: máy chỉ có / đặt tại chi nhánh khác — không trộn vào grid chính. */
  const [showAlternateBranchOptions, setShowAlternateBranchOptions] =
    useState(false);

  const {
    cartLines,
    setCartLines,
    showCartDrawer,
    setShowCartDrawer,
    cartQtyByModelKey,
    cartTotalQty,
    handleToggleSelect,
    handleCartIncrement,
    handleCartDecrement,
    handleCartRemoveLine,
  } = useCartLines();

  const [cartCheckoutError, setCartCheckoutError] = useState("");
  const [conflictInfo, setConflictInfo] = useState(null);

  // Notify Waitlist State
  const [isNotifyLoading, setIsNotifyLoading] = useState(false);
  const [notifySuccessModal, setNotifySuccessModal] = useState(false);

  const proceedWithWaitlist = useCallback(async (device, token) => {
    try {
      await api.post("/v1/notifications/subscribe", {
        deviceId: device.id,
        modelKey: device.modelKey,
        url: window.location.href,
      });
    } catch (err) {
      console.warn(
        "Ghi nhận đăng ký Notify lỗi do API chưa hoàn thiện, bỏ qua lỗi.",
        err,
      );
    }
    setNotifySuccessModal(true);
  }, []);

  const handleNotifyWaitlistClick = useCallback(
    async (device) => {
      const token = loadCustomerSession()?.token;
      if (!token) {
        try {
          setIsNotifyLoading(true);
          const result = await signInWithPopup(auth, googleProvider);
          const user = result.user;
          const response = await api.post("/login-gg", {
            email: user?.email,
            name: user?.displayName,
            avatar: user?.photoURL,
          });
          const newToken = response?.data?.token;
          if (!newToken) throw new Error("Không nhận được token.");
          saveCustomerSession({ token: newToken });
          await proceedWithWaitlist(device, newToken);
        } catch (err) {
          console.error("Lỗi đăng nhập Google hoặc API", err);
        } finally {
          setIsNotifyLoading(false);
        }
      } else {
        setIsNotifyLoading(true);
        try {
          await proceedWithWaitlist(device, token);
        } finally {
          setIsNotifyLoading(false);
        }
      }
    },
    [proceedWithWaitlist],
  );

  const handleAlternateBranchQuickBook = useCallback((device, branchId) => {
    if (!device || !branchId) return;
    trackCatalogBookClick(device, "quick_cross_branch");
    setAvailabilityPrefs((prev) => ({ ...prev, branchId }));
    setQuickBookBranchOverride(branchId);
    setQuickBookDevice(device);
    setQuickBookDevices([device]);
    setShowQuickBookModal(true);
  }, []);

  const handleQuickBook = useCallback((device) => {
    if (device?.isAvailable === false) return;
    trackCatalogBookClick(device, "quick_single");
    const branchOverride =
      device?.crossBranchOnly && device?.primaryBookBranchId
        ? device.primaryBookBranchId
        : null;
    if (branchOverride) {
      setAvailabilityPrefs((prev) => ({ ...prev, branchId: branchOverride }));
    }
    setQuickBookBranchOverride(branchOverride);
    setQuickBookDevice(device);
    setQuickBookDevices([device]);
    setShowQuickBookModal(true);
  }, []);

  const handleSuggestedQuickBook = useCallback((device, sixChoiceKey) => {
    const suggestion = device?.availabilitySuggestion;
    if (!suggestion) return;

    setQuickBookBranchOverride(null);

    setAvailabilityPrefs((prev) => {
      if (suggestion.switchToSixHours && suggestion.sixHourChoices?.length) {
        const choice = sixChoiceKey
          ? suggestion.sixHourChoices.find((c) => c.key === sixChoiceKey)
          : suggestion.sixHourChoices[0];
        if (!choice) return prev;
        const day = normalizeDate(choice.fromDateTime);
        const nextPickupType =
          choice.timeFrom === MORNING_PICKUP_TIME
            ? "MORNING"
            : choice.timeFrom === SIX_HOUR_SECOND_PICKUP_TIME
              ? "AFTERNOON"
              : "EVENING";
        return {
          ...prev,
          durationType: "SIX_HOURS",
          date: day,
          endDate: day,
          timeFrom: choice.timeFrom,
          timeTo: choice.timeTo,
          pickupType: nextPickupType,
          pickupSlot:
            nextPickupType === "EVENING" || nextPickupType === "AFTERNOON"
              ? choice.timeFrom
              : DEFAULT_EVENING_SLOT,
        };
      }

      if (
        suggestion.switchToSixHours &&
        !suggestion.sixHourChoices?.length &&
        suggestion.fromDateTime &&
        suggestion.toDateTime
      ) {
        const day = normalizeDate(suggestion.fromDateTime);
        const nextPickupType =
          suggestion.timeFrom === MORNING_PICKUP_TIME
            ? "MORNING"
            : suggestion.timeFrom === SIX_HOUR_SECOND_PICKUP_TIME
              ? "AFTERNOON"
              : "EVENING";
        return {
          ...prev,
          durationType: "SIX_HOURS",
          date: day,
          endDate: day,
          timeFrom: suggestion.timeFrom,
          timeTo: suggestion.timeTo,
          pickupType: nextPickupType,
          pickupSlot:
            nextPickupType === "EVENING" || nextPickupType === "AFTERNOON"
              ? suggestion.timeFrom
              : DEFAULT_EVENING_SLOT,
        };
      }

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

    trackCatalogBookClick(
      device,
      suggestion.switchToSixHours && suggestion.sixHourChoices?.length
        ? sixChoiceKey === "evening"
          ? "quick_suggested_six_evening"
          : "quick_suggested_six_morning"
        : "quick_suggested",
    );
    setQuickBookDevice(device);
    setQuickBookDevices([device]);
    setShowQuickBookModal(true);
  }, []);

  const handleCloseQuickBook = () => {
    setShowQuickBookModal(false);
    setQuickBookDevice(null);
    setQuickBookDevices([]);
    setQuickBookBranchOverride(null);
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

  const availabilityRange = useMemo(
    () => computeAvailabilityRange(availabilityPrefs),
    [availabilityPrefs],
  );

  /** Ví dụ: nhận 9h 24/3, trả 9h 25/4 — theo khung giờ đã xác nhận */
  const catalogPickupReturnSummaryVi = useMemo(() => {
    const from = availabilityRange?.fromDateTime;
    const to = availabilityRange?.toDateTime;
    if (
      !from ||
      !to ||
      !(from instanceof Date) ||
      !(to instanceof Date) ||
      Number.isNaN(from.getTime()) ||
      Number.isNaN(to.getTime())
    ) {
      return "";
    }
    const dm = (d) => `${d.getDate()}/${d.getMonth() + 1}`;
    return `nhận ${formatTimeVi(from)} ${dm(from)}, trả ${formatTimeVi(to)} ${dm(to)}`;
  }, [availabilityRange]);

  /** Một dòng ngắn cho copy “từ … đến …” (banner vàng) */
  const catalogPickupReturnRangeVi = useMemo(() => {
    const from = availabilityRange?.fromDateTime;
    const to = availabilityRange?.toDateTime;
    if (
      !from ||
      !to ||
      !(from instanceof Date) ||
      !(to instanceof Date) ||
      Number.isNaN(from.getTime()) ||
      Number.isNaN(to.getTime())
    ) {
      return "";
    }
    const dm = (d) => `${d.getDate()}/${d.getMonth() + 1}`;
    return `từ ${formatTimeVi(from)} ${dm(from)} đến ${formatTimeVi(to)} ${dm(to)}`;
  }, [availabilityRange]);

  // Process devices: group by modelKey, keep 1 representative per model
  // Trống trong khung giờ: theo máy vật lý tại chi nhánh đã chọn (booking API có branchId).
  // model-availability-suggestions không gắn chi nhánh — không dùng available:true của API để báo trống khi totalAvailable === 0.
  const processedDevicesLocalBranch = useMemo(() => {
    if (!devicesInBranch || devicesInBranch.length === 0) return [];
    const busySet = new Set(busyDeviceIds);

    const byModel = new Map(); // modelKey -> [{ device, isAvailable }, ...]
    for (const device of devicesInBranch) {
      const deviceType = String(device.type || "").toUpperCase();
      if (deviceType !== "DEVICE") continue;
      const modelKey =
        (device.modelKey || "").trim() || normalizeDeviceName(device.name);
      const idKey = String(device.id);
      const isAvailable = !busySet.has(idKey);
      const bookingDtos = deviceBookingsById[idKey] || [];
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
      const strictestRelease = getStrictestReleaseDate(
        group.map((g) => g.device),
      );

      let isAvailable = totalAvailable > 0;
      if (
        hasModelAvailability &&
        modelAvailabilityInfo &&
        modelAvailabilityInfo.available === false
      ) {
        isAvailable = false;
      }

      let blockedBeforeRelease = false;
      if (
        availabilityConfirmed &&
        isAvailable &&
        strictestRelease
      ) {
        const { fromDateTime, toDateTime } =
          computeAvailabilityRange(availabilityPrefs);
        const rangeError = getAvailabilityRangeError(
          availabilityPrefs,
          fromDateTime,
          toDateTime,
        );
        if (!rangeError && fromDateTime) {
          const pickupDay = normalizeDate(fromDateTime);
          if (pickupDay.getTime() < strictestRelease.getTime()) {
            isAvailable = false;
            blockedBeforeRelease = true;
          }
        }
      }

      const clientAvailabilitySuggestion =
        availabilityConfirmed &&
        !blockedBeforeRelease &&
        availabilityPrefs.durationType === "ONE_DAY" &&
        !isAvailable
          ? findClientCatalogAvailabilitySuggestion(
              group.map((g) => {
                const raw = deviceRawBookingsById[String(g.device.id)];
                const bookingDtos =
                  raw !== undefined ? raw : g.device.bookingDtos || [];
                return { ...g.device, bookingDtos };
              }),
              availabilityPrefs,
            )
          : null;

      const apiAvailabilitySuggestion =
        availabilityConfirmed &&
        !blockedBeforeRelease &&
        availabilityPrefs.durationType === "ONE_DAY" &&
        !isAvailable &&
        modelAvailabilityInfo?.suggestedFrom &&
        modelAvailabilityInfo?.suggestedTo
          ? (() => {
              const fromDt = new Date(modelAvailabilityInfo.suggestedFrom);
              const toDt = new Date(modelAvailabilityInfo.suggestedTo);
              if (!isValid(fromDt) || !isValid(toDt)) return null;
              return {
                fromDateTime: fromDt,
                toDateTime: toDt,
                timeFrom: format(fromDt, "HH:mm"),
                timeTo: format(toDt, "HH:mm"),
                suggestedDeviceId: modelAvailabilityInfo.suggestedDeviceId,
                switchToSixHours: false,
              };
            })()
          : null;

      const availabilitySuggestion =
        clientAvailabilitySuggestion || apiAvailabilitySuggestion;

      const sortedGroup = [...group].sort((a, b) => {
        const indexA = getDeviceNameIndex(a.device.name);
        const indexB = getDeviceNameIndex(b.device.name);
        if (indexA !== indexB) return indexA - indexB;

        const orderA = a.device.orderNumber ?? Number.POSITIVE_INFINITY;
        const orderB = b.device.orderNumber ?? Number.POSITIVE_INFINITY;
        if (orderA !== orderB) return orderA - orderB;

        return String(a.device.id).localeCompare(String(b.device.id));
      });

      const preferredDeviceId =
        availabilitySuggestion?.sixHourChoices?.[0]?.suggestedDeviceId ??
        availabilitySuggestion?.suggestedDeviceId ??
        modelAvailabilityInfo?.suggestedDeviceId;
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
        releaseDate: strictestRelease
          ? formatDateOnlyLocal(strictestRelease)
          : device.releaseDate,
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
        groupDeviceIds: new Set(
          group
            .map((g) => normalizeCatalogDeviceId(g.device.id))
            .filter(Boolean),
        ),
        blockedBeforeRelease,
      });
    }

    return result;
  }, [
    devicesInBranch,
    busyDeviceIds,
    modelAvailabilitySuggestions,
    availabilityConfirmed,
    availabilityPrefs,
    deviceBookingsById,
    deviceRawBookingsById,
  ]);

  /** Model chỉ có máy vật lý ở chi nhánh khác (không có tại chi nhánh đang xem catalog). */
  const crossBranchOnlyRows = useMemo(() => {
    if (!availabilityConfirmed || !devices?.length) return [];

    const currentBr = normalizeBookingBranchId(availabilityPrefs.branchId);
    const pickupDay = availabilityRange?.fromDateTime
      ? normalizeDate(availabilityRange.fromDateTime)
      : null;

    const modelsWithLocalPhysical = new Set();
    for (const device of devices) {
      if (String(device.type || "").toUpperCase() !== "DEVICE") continue;
      if (normalizeDeviceBranchId(device) !== currentBr) continue;
      const mk =
        (device.modelKey || "").trim() || normalizeDeviceName(device.name);
      modelsWithLocalPhysical.add(mk);
    }

    const remoteByModel = new Map();
    for (const device of devices) {
      if (String(device.type || "").toUpperCase() !== "DEVICE") continue;
      const br = normalizeDeviceBranchId(device);
      if (br === currentBr) continue;
      const mk =
        (device.modelKey || "").trim() || normalizeDeviceName(device.name);
      if (modelsWithLocalPhysical.has(mk)) continue;
      if (!remoteByModel.has(mk)) remoteByModel.set(mk, new Map());
      const bm = remoteByModel.get(mk);
      if (!bm.has(br)) bm.set(br, []);
      bm.get(br).push(device);
    }

    const branchOrder = BRANCHES.map((b) =>
      normalizeBookingBranchId(b.id),
    ).filter((bn) => bn !== currentBr);

    const result = [];

    for (const [mk, branchMap] of remoteByModel) {
      let chosenBranchNorm = null;
      let groupDevices = [];
      for (const bn of branchOrder) {
        const devs = branchMap.get(bn);
        if (devs?.length) {
          chosenBranchNorm = bn;
          groupDevices = devs;
          break;
        }
      }
      if (!chosenBranchNorm || groupDevices.length === 0) continue;

      const primaryBranchMeta = BRANCHES.find(
        (b) => normalizeBookingBranchId(b.id) === chosenBranchNorm,
      );
      const primaryBookBranchId = primaryBranchMeta?.id;
      if (!primaryBookBranchId) continue;

      if (
        !Object.prototype.hasOwnProperty.call(
          otherBranchesBusyIds,
          primaryBookBranchId,
        )
      ) {
        continue;
      }

      const busyArr = otherBranchesBusyIds[primaryBookBranchId];
      const busySet = new Set(Array.isArray(busyArr) ? busyArr : []);

      const branchClosed =
        pickupDay &&
        primaryBranchMeta &&
        !isBranchBookable(primaryBranchMeta, pickupDay);

      const group = groupDevices.map((device) => {
        const idKey = String(device.id);
        const isAvailable = !branchClosed && !busySet.has(idKey);
        return {
          device: { ...device, bookingDtos: [] },
          isAvailable,
        };
      });

      const totalAvailable = group.filter((g) => g.isAvailable).length;
      let isAvailable = totalAvailable > 0;

      const strictestRelease = getStrictestReleaseDate(
        group.map((g) => g.device),
      );

      let blockedBeforeRelease = false;
      if (availabilityConfirmed && isAvailable && strictestRelease) {
        const { fromDateTime, toDateTime } =
          computeAvailabilityRange(availabilityPrefs);
        const rangeError = getAvailabilityRangeError(
          availabilityPrefs,
          fromDateTime,
          toDateTime,
        );
        if (!rangeError && fromDateTime) {
          const pickupDayLocal = normalizeDate(fromDateTime);
          if (pickupDayLocal.getTime() < strictestRelease.getTime()) {
            isAvailable = false;
            blockedBeforeRelease = true;
          }
        }
      }

      const sortedGroup = [...group].sort((a, b) => {
        const indexA = getDeviceNameIndex(a.device.name);
        const indexB = getDeviceNameIndex(b.device.name);
        if (indexA !== indexB) return indexA - indexB;

        const orderA = a.device.orderNumber ?? Number.POSITIVE_INFINITY;
        const orderB = b.device.orderNumber ?? Number.POSITIVE_INFINITY;
        if (orderA !== orderB) return orderA - orderB;

        return String(a.device.id).localeCompare(String(b.device.id));
      });

      const rep =
        sortedGroup.find((g) => g.isAvailable) || sortedGroup[0];
      const { device } = rep;
      const normalizedName = normalizeDeviceName(device.name);
      const minOrderNumber = Math.min(
        ...group.map((g) => g.device.orderNumber ?? 999999),
      );

      result.push({
        ...device,
        releaseDate: strictestRelease
          ? formatDateOnlyLocal(strictestRelease)
          : device.releaseDate,
        orderNumber: minOrderNumber,
        modelKey: mk,
        displayName: normalizedName,
        brand: inferBrand(device.name),
        img: device.images?.[0] || FALLBACK_IMG,
        unitCount: group.length,
        bookingCount: 0,
        availableCount: totalAvailable,
        isAvailable,
        availabilitySuggestion: null,
        groupDeviceIds: new Set(
          group
            .map((g) => normalizeCatalogDeviceId(g.device.id))
            .filter(Boolean),
        ),
        blockedBeforeRelease,
        crossBranchOnly: true,
        primaryBookBranchId,
      });
    }

    return result;
  }, [
    availabilityConfirmed,
    devices,
    availabilityPrefs,
    otherBranchesBusyIds,
    availabilityRange,
  ]);

  const processedByModelKey = useMemo(() => {
    const m = new Map();
    for (const d of processedDevicesLocalBranch) m.set(d.modelKey, d);
    return m;
  }, [processedDevicesLocalBranch]);

  const handleSwitchToAlternateBranch = useCallback((branchId) => {
    setAvailabilityPrefs((prev) => ({ ...prev, branchId }));
  }, []);

  /** Gợi ý chi nhánh khác còn trống đúng khung giờ đang xem (vd PN hết → Q9 còn). */
  const crossBranchHintsByModelKey = useMemo(() => {
    const m = new Map();
    if (!availabilityConfirmed || devices.length === 0) return m;

    const currentBr = normalizeBookingBranchId(availabilityPrefs.branchId);
    const busyByBranch = new Map();
    busyByBranch.set(currentBr, new Set(busyDeviceIds));
    for (const [bid, arr] of Object.entries(otherBranchesBusyIds)) {
      if (!Array.isArray(arr)) continue;
      busyByBranch.set(normalizeBookingBranchId(bid), new Set(arr));
    }

    function physicalIdsForModel(branchNorm, modelKey) {
      const ids = [];
      for (const d of devices) {
        if (String(d.type || "").toUpperCase() !== "DEVICE") continue;
        if (normalizeDeviceBranchId(d) !== branchNorm) continue;
        const mk = (d.modelKey || "").trim() || normalizeDeviceName(d.name);
        if (mk !== modelKey) continue;
        ids.push(String(d.id));
      }
      return ids;
    }

    function branchHasFreeUnit(branchNorm, modelKey) {
      const ids = physicalIdsForModel(branchNorm, modelKey);
      if (ids.length === 0) return false;
      const busy = busyByBranch.get(branchNorm);
      if (!busy) return false;
      return ids.some((id) => !busy.has(id));
    }

    const pickupDay = availabilityRange?.fromDateTime
      ? normalizeDate(availabilityRange.fromDateTime)
      : null;

    for (const row of processedDevicesLocalBranch) {
      const mk = row.modelKey;
      const alternatives = [];
      for (const b of BRANCHES) {
        const bNorm = normalizeBookingBranchId(b.id);
        if (bNorm === currentBr) continue;
        if (
          !Object.prototype.hasOwnProperty.call(otherBranchesBusyIds, b.id)
        ) {
          continue;
        }
        if (!pickupDay || !isBranchBookable(b, pickupDay)) continue;
        if (!branchHasFreeUnit(bNorm, mk)) continue;
        alternatives.push({ branchId: b.id, label: b.label });
      }
      if (alternatives.length > 0 && row.isAvailable !== true) {
        m.set(mk, { branches: alternatives });
      }
    }

    return m;
  }, [
    availabilityConfirmed,
    devices,
    processedDevicesLocalBranch,
    busyDeviceIds,
    otherBranchesBusyIds,
    availabilityPrefs.branchId,
    availabilityRange,
  ]);

  useEffect(() => {
    setCartLines((prev) => {
      const next = prev
        .map((line) => {
          const row = processedDevicesLocalBranch.find(
            (p) => p.modelKey === line.modelKey,
          );
          if (!row) return line;
          const max = getMaxQtyForCartLine(row, availabilityConfirmed);
          const q = Math.min(line.quantity, max);
          if (q <= 0) return null;
          return q === line.quantity ? line : { ...line, quantity: q };
        })
        .filter(Boolean);
      if (next.length === prev.length) {
        const same = next.every(
          (l, i) =>
            l.modelKey === prev[i]?.modelKey &&
            l.quantity === prev[i]?.quantity,
        );
        if (same) return prev;
      }
      return next;
    });
  }, [processedDevicesLocalBranch, availabilityConfirmed]);

  const handleCheckoutFromCart = useCallback(() => {
    setCartCheckoutError("");
    if (cartLines.length === 0) return;
    const expanded = expandCartLinesToPhysicalDevices(
      cartLines,
      processedDevicesLocalBranch,
      devicesInBranch,
      deviceBookingsById,
    );
    if (!expanded.ok) {
      setCartCheckoutError(
        "Không đủ máy trống cho số lượng trong giỏ (có thể vừa có người đặt). Hãy giảm số lượng hoặc đổi khung giờ.",
      );
      return;
    }
    expanded.devices.forEach((d) =>
      trackCatalogBookClick(
        {
          ...d,
          displayName: normalizeDeviceName(d.name),
          modelKey: d.modelKey,
        },
        "quick_multi",
      ),
    );
    setQuickBookBranchOverride(null);
    setQuickBookDevice(null);
    setQuickBookDevices(expanded.devices);
    setShowCartDrawer(false);
    setShowQuickBookModal(true);
  }, [cartLines, processedDevicesLocalBranch, devicesInBranch, deviceBookingsById]);

  const quickBookDevicesRef = React.useRef(quickBookDevices);
  quickBookDevicesRef.current = quickBookDevices;
  const cartLinesRef = React.useRef(cartLines);
  cartLinesRef.current = cartLines;
  const showQuickBookModalRef = React.useRef(showQuickBookModal);
  showQuickBookModalRef.current = showQuickBookModal;

  useEffect(() => {
    if (!wsLastEvent) return;
    if (!["CREATE", "BATCH_CREATE"].includes(wsLastEvent.type)) return;

    const eventDeviceName = wsLastEvent.deviceName || "";
    if (!eventDeviceName) return;

    const isModalOpen = showQuickBookModalRef.current;
    const modalDevices = quickBookDevicesRef.current;
    const lines = cartLinesRef.current;

    if (!isModalOpen && lines.length === 0) return;

    const eventNames = eventDeviceName
      .split(",")
      .map((n) => normalizeDeviceName(n.trim()).toLowerCase())
      .filter(Boolean);

    if (eventNames.length === 0) return;

    const activeDevices = [];
    if (isModalOpen && modalDevices.length > 0) {
      activeDevices.push(...modalDevices);
    }
    if (lines.length > 0) {
      for (const line of lines) {
        const p = processedDevicesLocalBranch.find((x) => x.modelKey === line.modelKey);
        if (!p) continue;
        const normalized = (p.displayName || p.name || "").toLowerCase();
        if (
          !activeDevices.some(
            (a) => (a.displayName || a.name || "").toLowerCase() === normalized,
          )
        ) {
          activeDevices.push(p);
        }
      }
    }

    const conflicted = activeDevices.filter((d) => {
      const display = (d.displayName || d.name || "").toLowerCase();
      const hasRealtimeConflict = eventNames.some((en) => en === display);
      if (!hasRealtimeConflict) return false;

      const modelState = processedDevicesLocalBranch.find(
        (p) =>
          normalizeDeviceName(p.displayName || p.name || "").toLowerCase() ===
          display,
      );
      return modelState?.isAvailable === false;
    });

    if (conflicted.length > 0) {
      setConflictInfo({ devices: conflicted });
    }
  }, [wsLastEvent, devices, processedDevicesLocalBranch, cartLines.length]);

  const handleConflictDismiss = useCallback(() => {
    setConflictInfo(null);
    setShowQuickBookModal(false);
    setQuickBookDevice(null);
    setQuickBookDevices([]);
    setCartLines([]);
    setShowCartDrawer(false);
  }, []);

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

  const catalogPriceFootnote = useMemo(() => {
    return normalizeBookingBranchId(availabilityPrefs.branchId) === "Q9"
      ? "Giảm sốc mừng khai trương"
      : "Giá đã áp dụng ưu đãi trong tuần";
  }, [availabilityPrefs.branchId]);

  const getDevicePricing = useCallback(
    (device, opts = {}) => {
      const skipQ9 = opts.skipQ9BranchPromo === true;
      const branchNorm = normalizeBookingBranchId(availabilityPrefs.branchId);
      const applyQ9ListPrice = (row) => {
        const o = row.original ?? 0;
        if (skipQ9 || branchNorm !== "Q9" || o <= 0) return row;
        const off = computeQ9BranchFlatDiscountVnd(o);
        return { ...row, discounted: Math.max(0, o - off) };
      };

      const sug = device?.availabilitySuggestion;
      if (
        pricingContext.durationType === "ONE_DAY" &&
        sug?.switchToSixHours &&
        Array.isArray(sug.sixHourChoices) &&
        sug.sixHourChoices.length > 0
      ) {
        const rawSix =
          device.priceSixHours ||
          (device.priceOneDay ? Math.round(device.priceOneDay / 2) : 0);
        const baseOriginal = roundDownToThousand(rawSix || 0);
        if (baseOriginal <= 0) {
          return applyQ9ListPrice({
            original: 0,
            discounted: 0,
            durationType: "SIX_HOURS",
            billableDays: 0,
          });
        }
        let bestOriginal = baseOriginal;
        let bestDiscounted = baseOriginal;
        for (const ch of sug.sixHourChoices) {
          const b = computeDiscountBreakdown(
            baseOriginal,
            ch.fromDateTime,
            ch.toDateTime,
          );
          const disc = b?.discounted ?? baseOriginal;
          const orig = b?.original ?? baseOriginal;
          if (disc < bestDiscounted) {
            bestDiscounted = disc;
            bestOriginal = orig;
          }
        }
        return applyQ9ListPrice({
          original: bestOriginal,
          discounted: bestDiscounted,
          durationType: "SIX_HOURS",
          billableDays: 0,
        });
      }

      if (
        pricingContext.durationType === "ONE_DAY" &&
        sug?.switchToSixHours &&
        sug.fromDateTime &&
        sug.toDateTime
      ) {
        const rawSix =
          device.priceSixHours ||
          (device.priceOneDay ? Math.round(device.priceOneDay / 2) : 0);
        const baseOriginal = roundDownToThousand(rawSix || 0);
        if (baseOriginal <= 0) {
          return applyQ9ListPrice({
            original: 0,
            discounted: 0,
            durationType: "SIX_HOURS",
            billableDays: 0,
          });
        }
        const b = computeDiscountBreakdown(
          baseOriginal,
          sug.fromDateTime,
          sug.toDateTime,
        );
        if (!b) {
          return applyQ9ListPrice({
            original: baseOriginal,
            discounted: baseOriginal,
            durationType: "SIX_HOURS",
            billableDays: 0,
          });
        }
        return applyQ9ListPrice({
          original: b.original,
          discounted: b.discounted,
          durationType: "SIX_HOURS",
          billableDays: 0,
        });
      }

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
        return applyQ9ListPrice({
          original: oneDayPrice,
          discounted: oneDayPrice,
          durationType,
          billableDays,
        });
      }

      const b = computeDiscountBreakdown(original, fromDateTime, toDateTime);
      if (!b) {
        return applyQ9ListPrice({
          original,
          discounted: original,
          durationType,
          billableDays,
        });
      }
      return applyQ9ListPrice({
        original: b.original,
        discounted: b.discounted,
        durationType,
        billableDays,
      });
    },
    [pricingContext, availabilityPrefs.branchId],
  );

  // Build merged categories: builtin + API dynamic categories
  const mergedCategories = useMemo(() => {
    const dynamic = apiCategories.map((cat) => {
      const items = cat.items || [];
      // Collect device IDs from category items for matching
      const deviceIds = new Set(
        items.map((item) => categoryItemDeviceId(item)).filter(Boolean),
      );
      const groupKeysFromCategoryItems = categoryGroupKeysFromItemDeviceIds(
        deviceIds,
        deviceByIdGlobal,
      );
      // Build deviceId → orderIndex map
      const deviceIdOrder = new Map(
        items
          .map((item) => {
            const nid = categoryItemDeviceId(item);
            return nid ? [nid, item.orderIndex ?? 0] : null;
          })
          .filter(Boolean),
      );
      return {
        key: `cat_${cat.id}`,
        label: (cat.name || "").toUpperCase(),
        apiCategoryId: cat.id,
        deviceIds,
        groupKeysFromCategoryItems,
        deviceIdOrder,
      };
    });
    return [...BUILTIN_CATEGORIES, ...dynamic];
  }, [apiCategories, deviceByIdGlobal]);

  // Device IDs allowed on tab "Tất cả" / "Máy trống" (category có bật showOnAllPage)
  const allowedOnAllDeviceIds = useMemo(() => {
    const set = new Set();
    for (const cat of apiCategories) {
      if (cat.showOnAllPage === false) continue;
      for (const item of cat.items || []) {
        const nid = categoryItemDeviceId(item);
        if (!nid) continue;
        set.add(nid);
        const rep = deviceByIdGlobal.get(nid);
        if (!rep) continue;
        const keys = new Set();
        addDeviceCategoryGroupKeys(rep, keys);
        for (const device of devices) {
          if (physicalDeviceMatchesCategoryGroupKeys(device, keys)) {
            set.add(String(device.id));
          }
        }
      }
    }
    return set;
  }, [apiCategories, devices, deviceByIdGlobal]);

  useEffect(() => {
    const visibleKeys = new Set(mergedCategories.map((t) => t.key));
    if (!visibleKeys.has(selectedCategory)) {
      setSelectedCategory(mergedCategories[0]?.key ?? "all");
    }
  }, [mergedCategories, selectedCategory]);

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
        const nid = categoryItemDeviceId(item);
        if (!nid) return;
        // Only take the first appearance to define global order
        if (!orderMap.has(nid)) {
          const row = {
            catOrder: cat.orderNumber ?? catIdx,
            itemOrder: item.orderIndex ?? 0,
          };
          orderMap.set(nid, row);
          // Tab Tất cả / Máy trống: groupDeviceIds ở Q9 là id máy Thủ Đức — map CMS
          // thường trỏ id chi nhánh khác → cần map cùng modelKey/tên như allowedOnAllDeviceIds.
          const rep = deviceByIdGlobal.get(String(nid));
          if (rep) {
            const keys = new Set();
            addDeviceCategoryGroupKeys(rep, keys);
            for (const device of devices) {
              if (!physicalDeviceMatchesCategoryGroupKeys(device, keys)) continue;
              const idStr = String(device.id);
              if (!orderMap.has(idStr)) {
                orderMap.set(idStr, row);
              }
            }
          }
        }
      });
    });
    return orderMap;
  }, [apiCategories, devices, deviceByIdGlobal]);

  const catalogFilterOpts = useMemo(
    () => ({
      searchQuery,
      selectedCategory,
      priceRange,
      mergedCategories,
      globalDeviceOrder,
      allowedOnAllDeviceIds,
      apiCategoriesLength: apiCategories.length,
    }),
    [
      searchQuery,
      selectedCategory,
      priceRange,
      mergedCategories,
      globalDeviceOrder,
      allowedOnAllDeviceIds,
      apiCategories.length,
    ],
  );

  const filteredDevices = useMemo(
    () =>
      filterAndSortCatalogRows(processedDevicesLocalBranch, catalogFilterOpts),
    [processedDevicesLocalBranch, catalogFilterOpts],
  );

  const filteredAlternateBranchDevices = useMemo(
    () => filterAndSortCatalogRows(crossBranchOnlyRows, catalogFilterOpts),
    [crossBranchOnlyRows, catalogFilterOpts],
  );

  /** Section chi nhánh khác chỉ hiển thị máy còn trống trong khung giờ đã kiểm tra. */
  const filteredAlternateBranchDevicesAvailable = useMemo(
    () => filteredAlternateBranchDevices.filter((d) => d.isAvailable),
    [filteredAlternateBranchDevices],
  );

  /** Một dòng địa chỉ cho CTA "Xem thêm … máy trống ở chi nhánh …" (khi mọi dòng alternate cùng một chi nhánh). */
  const alternateCatalogCtaBranchPhrase = useMemo(() => {
    const rows = filteredAlternateBranchDevicesAvailable;
    if (!rows.length) return null;
    const ids = [
      ...new Set(rows.map((r) => r.primaryBookBranchId).filter(Boolean)),
    ];
    if (ids.length === 0) return "chi nhánh khác";
    if (ids.length === 1) {
      const b = BRANCHES.find((x) => x.id === ids[0]);
      const raw =
        b?.address ||
        (b?.label || "").replace(/^FAO\s*/i, "").trim();
      if (!raw) return "chi nhánh khác";
      return raw.replace(/^Lầu\s*1,\s*/i, "").trim();
    }
    return null;
  }, [filteredAlternateBranchDevicesAvailable]);

  /** Tiêu đề khối chi nhánh khác: "Chi nhánh … địa chỉ …" hoặc nhiều chi nhánh. */
  const alternateSectionBranchHeading = useMemo(() => {
    const rows = filteredAlternateBranchDevicesAvailable;
    if (!rows.length) return "";
    const ids = [
      ...new Set(rows.map((r) => r.primaryBookBranchId).filter(Boolean)),
    ];
    if (ids.length === 0) return "Chi nhánh khác";
    if (ids.length === 1) {
      const b = BRANCHES.find((x) => x.id === ids[0]);
      const raw =
        b?.address ||
        (b?.label || "").replace(/^FAO\s*/i, "").trim();
      if (!raw) return "Chi nhánh khác";
      return `Chi nhánh ${raw.replace(/^Lầu\s*1,\s*/i, "").trim()}`;
    }
    return "Các chi nhánh khác";
  }, [filteredAlternateBranchDevicesAvailable]);

  const hasCatalogLocalResults = filteredDevices.length > 0;
  const hasAlternateBranchCatalogResults =
    availabilityConfirmed &&
    filteredAlternateBranchDevicesAvailable.length > 0;

  useEffect(() => {
    setShowAlternateBranchOptions(false);
  }, [availabilityPrefs.branchId]);

  /** Có máy trống chi nhánh khác → mở sẵn khối (user vẫn có thể thu gọn). */
  useEffect(() => {
    if (
      availabilityConfirmed &&
      filteredAlternateBranchDevicesAvailable.length > 0
    ) {
      setShowAlternateBranchOptions(true);
    }
  }, [
    availabilityConfirmed,
    availabilityPrefs.branchId,
    filteredAlternateBranchDevicesAvailable.length,
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
          const nid = categoryItemDeviceId(item);
          if (nid && d.groupDeviceIds.has(nid)) {
            return {
              sectionKey: `cat-${cat.id}`,
              sectionTitle: (cat.name || "").trim() || "Danh mục",
            };
          }
        }
        const itemIds = new Set(
          (cat.items || [])
            .map((item) => categoryItemDeviceId(item))
            .filter(Boolean),
        );
        const groupKeys = categoryGroupKeysFromItemDeviceIds(
          itemIds,
          deviceByIdGlobal,
        );
        if (processedRowMatchesCategoryGroupKeys(d, groupKeys)) {
          return {
            sectionKey: `cat-${cat.id}`,
            sectionTitle: (cat.name || "").trim() || "Danh mục",
          };
        }
        const hint = inferBrandHintFromCategoryLabel(cat.name || "");
        if (
          itemIds.size === 0 &&
          hint &&
          inferBrand(d.displayName) === hint
        ) {
          return {
            sectionKey: `cat-${cat.id}`,
            sectionTitle: (cat.name || "").trim() || "Danh mục",
          };
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
  }, [
    filteredDevices,
    selectedCategory,
    apiCategories,
    deviceByIdGlobal,
  ]);

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

    if (
      availabilityPrefs.date &&
      isValid(availabilityPrefs.date)
    ) {
      nextParams.set("date", format(availabilityPrefs.date, "yyyy-MM-dd"));
    } else {
      nextParams.delete("date");
    }

    if (
      availabilityPrefs.endDate &&
      isValid(availabilityPrefs.endDate)
    ) {
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
      fromDate: from && isValid(from) ? format(from, "dd/MM") : "",
      toTime: to
        ? formatTimeVi(to)
        : availabilityPrefs.timeTo
          ? formatTimeViFromString(availabilityPrefs.timeTo)
          : "",
      toDate: to && isValid(to) ? format(to, "dd/MM") : "",
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
    <div
      className={`min-h-screen font-sans relative text-[#333] overflow-x-hidden flex flex-col selection:bg-[#FF9FCA] selection:text-white ${
        cartLines.length > 0
          ? "pb-44 md:pb-48"
          : "pb-32 md:pb-36"
      }`}
    >
      <NoiseOverlay />
      <PageBackground />
      <PinkTapeMarquee />

      <div className="z-20 mx-auto w-full max-w-2xl px-3 pt-16 sm:px-4 lg:max-w-5xl xl:max-w-6xl">
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

        {/* Category Tabs — ẩn tab không có máy; ẩn hàng tab khi chỉ còn một tab */}
        {mergedCategories.length > 1 ? (
          <StylishTabs
            activeTab={selectedCategory}
            setActiveTab={setSelectedCategory}
            categories={mergedCategories}
          />
        ) : null}

        {/* Results Info */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-stretch sm:justify-between sm:gap-4 sm:px-0">
          <div className="min-w-0 flex-1">
            {isLoading ? (
              <p className="text-sm font-medium text-[#999]">
                Đang tải danh sách máy…
              </p>
            ) : hasAlternateBranchCatalogResults &&
              !hasCatalogLocalResults ? null : hasAlternateBranchCatalogResults ? (
              <div className="rounded-2xl border border-black/[0.06] bg-white px-4 py-4 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.08)] sm:px-5 sm:py-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E85C9C] shadow-sm ring-4 ring-[#E85C9C]/10">
                      <MapPin
                        className="h-5 w-5 text-white"
                        strokeWidth={2.25}
                        aria-hidden
                      />
                    </div>
                    <p className="min-w-0 flex flex-wrap items-baseline gap-x-1 gap-y-0.5 text-base font-bold leading-snug text-[#222] sm:text-[17px]">
                      <span className="font-black tabular-nums text-[#E85C9C]">
                        {filteredDevices.length}
                      </span>
                      <span>máy tại {currentBranchCatalogShortLabel}</span>
                      {priceRange !== "all" && (
                        <span className="ml-1 inline-flex items-center rounded-full bg-[#222] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#FF9FCA]">
                          {
                            PRICE_RANGES.find((r) => r.id === priceRange)
                              ?.label
                          }
                        </span>
                      )}
                    </p>
                  </div>
                  {hasCatalogLocalResults ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowAlternateBranchOptions(true);
                        window.requestAnimationFrame(() => {
                          document
                            .getElementById(
                              "catalog-alternate-branch-options",
                            )
                            ?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                        });
                      }}
                      className="group flex w-full items-center justify-between gap-3 rounded-xl border border-sky-300/90 bg-sky-50 px-3.5 py-3 text-left shadow-sm transition hover:border-sky-400 hover:bg-sky-50/90"
                    >
                      <span className="min-w-0 flex-1 text-[13px] font-bold leading-snug text-sky-950">
                        {alternateCatalogCtaBranchPhrase ? (
                          <>
                            Xem thêm{" "}
                            {filteredAlternateBranchDevicesAvailable.length}{" "}
                            máy trống ở chi nhánh{" "}
                            {alternateCatalogCtaBranchPhrase}
                          </>
                        ) : (
                          <>
                            Xem thêm{" "}
                            {filteredAlternateBranchDevicesAvailable.length}{" "}
                            máy trống ở các chi nhánh khác
                          </>
                        )}
                      </span>
                      <ArrowRight
                        className="h-4 w-4 shrink-0 text-sky-600 transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="inline-flex max-w-full flex-col gap-1 rounded-xl border border-black/[0.06] bg-white/70 px-3.5 py-2.5 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:gap-2 sm:py-2 sm:pl-4 sm:pr-3.5">
                <p className="text-sm font-medium text-[#666]">
                  <span className="font-black tabular-nums text-[#E85C9C]">
                    {filteredDevices.length}
                  </span>{" "}
                  máy tại{" "}
                  <span className="font-bold text-[#222]">
                    {currentBranchCatalogShortLabel}
                  </span>
                  {priceRange !== "all" && (
                    <span className="ml-2 inline-flex align-middle text-xs">
                      <span className="rounded-full bg-[#222] px-2 py-0.5 font-bold text-[#FF9FCA]">
                        {
                          PRICE_RANGES.find((r) => r.id === priceRange)?.label
                        }
                      </span>
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>
          <div
            className="flex shrink-0 items-center gap-1.5 self-start sm:self-center"
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
            <div className="grid grid-cols-2 gap-2 sm:gap-2.5 xl:grid-cols-4 xl:gap-3 items-start">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="bg-white rounded-lg overflow-hidden shadow animate-pulse"
                >
                  <div className="aspect-square bg-[#FFE4F0]" />
                  <div className="space-y-1.5 p-2.5 sm:p-3">
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
          ) : !hasCatalogLocalResults && !hasAlternateBranchCatalogResults ? (
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
            <>
              {!hasCatalogLocalResults && hasAlternateBranchCatalogResults ? (
                <div className="mb-5 rounded-xl border border-amber-200/90 bg-gradient-to-r from-amber-50 to-[#fffbf5] px-4 py-3 text-left shadow-sm">
                  <p className="text-sm font-black text-amber-950">
                    Chưa có máy phù hợp tại {currentBranchCatalogShortLabel}
                  </p>
                  <p className="mt-1.5 text-[13px] leading-snug text-[#5c4a32]">
                    {catalogPickupReturnRangeVi ? (
                      <>
                        Trong khoảng{" "}
                        <span className="font-bold text-[#5c4a32]">
                          {catalogPickupReturnRangeVi}
                        </span>
                        , chi nhánh này không có máy phù hợp —{" "}
                        {alternateCatalogCtaBranchPhrase &&
                        alternateCatalogCtaBranchPhrase !==
                          "chi nhánh khác" ? (
                          <>
                            nhưng tại chi nhánh{" "}
                            <span className="font-semibold text-[#5c4a32]">
                              {alternateCatalogCtaBranchPhrase}
                            </span>{" "}
                            vẫn có{" "}
                          </>
                        ) : (
                          <>nhưng các chi nhánh khác vẫn có </>
                        )}
                      </>
                    ) : (
                      <>
                        Trong khung giờ và bộ lọc hiện tại, chi nhánh này không có
                        kết quả —{" "}
                        {alternateCatalogCtaBranchPhrase &&
                        alternateCatalogCtaBranchPhrase !==
                          "chi nhánh khác" ? (
                          <>
                            nhưng tại chi nhánh{" "}
                            <span className="font-semibold text-[#5c4a32]">
                              {alternateCatalogCtaBranchPhrase}
                            </span>{" "}
                            vẫn có{" "}
                          </>
                        ) : (
                          <>nhưng các chi nhánh khác vẫn có </>
                        )}
                      </>
                    )}
                    <span className="font-black text-[#E85C9C]">
                      {filteredAlternateBranchDevicesAvailable.length}
                    </span>{" "}
                    máy trống.
                  </p>
                </div>
              ) : null}
              {hasCatalogLocalResults && catalogSectionsAllOrAvailable ? (
                <motion.div
                  key={selectedCategory}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col gap-5 sm:gap-6"
                >
                  {catalogSectionsAllOrAvailable.map((section) => (
                    <section key={section.key} className="min-w-0">
                      <h3 className="mb-2 px-0.5 text-xs font-black uppercase tracking-[0.2em] text-[#222] border-b border-[#222]/10 pb-1.5 sm:mb-3 sm:pb-2 sm:text-sm">
                        {section.title}
                      </h3>
                      <div className="grid grid-cols-2 gap-2 sm:gap-2.5 xl:grid-cols-4 xl:gap-3 items-start">
                        {section.devices.map((device, idx) => (
                          <ChicCard
                            key={
                              device.modelKey
                                ? `model-${device.modelKey}`
                                : `dev-${device.id}`
                            }
                            device={device}
                            pricing={getDevicePricing(device)}
                            priceFootnote={catalogPriceFootnote}
                            onQuickBook={handleQuickBook}
                            onSuggestedQuickBook={handleSuggestedQuickBook}
                            onNotifyWaitlist={handleNotifyWaitlistClick}
                            isSelected={
                              (cartQtyByModelKey.get(device.modelKey) || 0) > 0
                            }
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
                            crossBranchHint={
                              availabilityConfirmed
                                ? crossBranchHintsByModelKey.get(device.modelKey)
                                : undefined
                            }
                            onSwitchToBranch={
                              availabilityConfirmed
                                ? (branchId) =>
                                    handleAlternateBranchQuickBook(
                                      device,
                                      branchId,
                                    )
                                : undefined
                            }
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </motion.div>
              ) : hasCatalogLocalResults ? (
                <motion.div
                  key={selectedCategory}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-2 gap-2 sm:gap-2.5 xl:grid-cols-4 xl:gap-3 items-start"
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
                      priceFootnote={catalogPriceFootnote}
                      onQuickBook={handleQuickBook}
                      onSuggestedQuickBook={handleSuggestedQuickBook}
                      onNotifyWaitlist={handleNotifyWaitlistClick}
                      isSelected={
                        (cartQtyByModelKey.get(device.modelKey) || 0) > 0
                      }
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
                      crossBranchHint={
                        availabilityConfirmed
                          ? crossBranchHintsByModelKey.get(device.modelKey)
                          : undefined
                      }
                      onSwitchToBranch={
                        availabilityConfirmed
                          ? (branchId) =>
                              handleAlternateBranchQuickBook(device, branchId)
                          : undefined
                      }
                    />
                  ))}
                </motion.div>
              ) : null}
              {hasAlternateBranchCatalogResults ? (
                <div
                  id="catalog-alternate-branch-options"
                  className="mt-8 border-t border-[#222]/12 pt-6"
                >
                  <div className="rounded-xl border-2 border-dashed border-sky-200 bg-gradient-to-r from-sky-50 to-white p-4 shadow-sm ring-1 ring-sky-100/60">
                    <button
                      type="button"
                      onClick={() =>
                        setShowAlternateBranchOptions((open) => !open)
                      }
                      className="flex w-full items-center justify-between gap-3 rounded-lg text-left transition hover:opacity-95"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="text-sm font-bold leading-snug text-sky-950">
                          {alternateSectionBranchHeading}
                        </p>
                        <p className="mt-1 text-xs leading-snug text-[#555]">
                          {filteredAlternateBranchDevicesAvailable.length} máy
                          trống
                          {catalogPickupReturnSummaryVi ? (
                            <>
                              {" "}
                              · {catalogPickupReturnSummaryVi}
                            </>
                          ) : (
                            <> · cùng khung giờ &amp; bộ lọc</>
                          )}
                        </p>
                      </div>
                      <ChevronDown
                        size={22}
                        className={`shrink-0 text-sky-700 transition-transform duration-200 ${
                          showAlternateBranchOptions ? "rotate-180" : ""
                        }`}
                        aria-hidden
                      />
                    </button>
                    {showAlternateBranchOptions ? (
                      <motion.div
                        key="alt-branch-grid"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-4 grid grid-cols-2 gap-2 sm:gap-2.5 xl:grid-cols-4 xl:gap-3 items-start"
                      >
                        {filteredAlternateBranchDevicesAvailable.map(
                          (device, idx) => (
                            <ChicCard
                              key={
                                device.modelKey
                                  ? `alt-${device.modelKey}-${device.primaryBookBranchId || ""}`
                                  : `alt-dev-${device.id}`
                              }
                              device={device}
                              pricing={getDevicePricing(device, {
                                skipQ9BranchPromo: true,
                              })}
                              priceFootnote="Giá đã áp dụng ưu đãi trong tuần"
                              onQuickBook={handleQuickBook}
                              onSuggestedQuickBook={handleSuggestedQuickBook}
                              onNotifyWaitlist={handleNotifyWaitlistClick}
                              isSelected={
                                (cartQtyByModelKey.get(device.modelKey) || 0) >
                                0
                              }
                              onToggleSelect={handleToggleSelect}
                              feedbackHref={buildFeedbackHref(
                                device.displayName,
                                device.modelKey,
                              )}
                              cardAnchorId={`catalog-card-alt-${compactSearchText(device.displayName)}`}
                              isFocused={
                                !!focusModelParam &&
                                compactSearchText(device.displayName) ===
                                  compactSearchText(focusModelParam)
                              }
                              index={idx}
                              crossBranchHint={undefined}
                              onSwitchToBranch={undefined}
                            />
                          ),
                        )}
                      </motion.div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </>
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
        setDate={(incoming) =>
          setAvailabilityPrefs((prev) => {
            const date =
              incoming != null && isValid(incoming) ? incoming : null;
            const nextEndDate =
              prev.durationType === "ONE_DAY"
                ? prev.endDate &&
                    date &&
                    isValid(prev.endDate) &&
                    isValid(date)
                  ? prev.endDate.getTime() >= addDays(date, 1).getTime()
                    ? prev.endDate
                    : addDays(date, 1)
                  : date && isValid(date)
                    ? addDays(date, 1)
                    : addDays(new Date(), 1)
                : date;
            return { ...prev, date, endDate: nextEndDate };
          })
        }
        setEndDate={(incoming) =>
          setAvailabilityPrefs((prev) => ({
            ...prev,
            endDate:
              incoming == null || isValid(incoming) ? incoming : prev.endDate,
          }))
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

      <AnimatePresence>
        {cartLines.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed inset-x-0 z-40 px-3 bottom-[calc(4rem+max(12px,env(safe-area-inset-bottom,0px))+0.75rem)] md:bottom-[calc(5rem+max(12px,env(safe-area-inset-bottom,0px))+0.75rem)]"
          >
            <div className="mx-auto w-full max-w-md md:max-w-5xl">
              <div className="bg-[#222] text-white rounded-2xl md:rounded-3xl shadow-xl border-2 border-[#E85C9C] p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  setCartCheckoutError("");
                  setShowCartDrawer(true);
                }}
                className="flex-1 min-w-0 flex items-center gap-2 sm:gap-3 text-left rounded-lg hover:bg-white/5 transition-colors py-2 px-2 sm:px-3"
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#E85C9C]/30 border border-[#FF9FCA]/40 flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-5 h-5 text-[#FF9FCA]" />
                </div>
                <div className="min-w-0">
                  <div className="font-black text-[#FF9FCA] text-xs uppercase tracking-wider">
                    Giỏ hàng
                  </div>
                  <div className="text-sm font-bold truncate">
                    {cartTotalQty} máy · {cartLines.length} mẫu
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCartLines([]);
                  setShowCartDrawer(false);
                  setCartCheckoutError("");
                }}
                className="shrink-0 rounded-lg border border-[#FF9FCA]/50 text-[#FF9FCA] text-[10px] sm:text-[11px] font-bold uppercase tracking-wide hover:bg-[#FF9FCA]/15 transition-colors py-1.5 px-2.5 sm:py-2 sm:px-3 whitespace-nowrap leading-tight"
              >
                Xóa giỏ
              </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCartDrawer && cartLines.length > 0 && (
          <>
            <motion.button
              type="button"
              aria-label="Đóng giỏ hàng"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/50"
              onClick={() => setShowCartDrawer(false)}
            />
            <motion.div
              role="dialog"
              aria-labelledby="cart-drawer-title"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="fixed top-0 right-0 bottom-0 z-[101] w-full max-w-md bg-[#FFFBF5] shadow-2xl flex flex-col border-l-2 border-[#E85C9C]/30"
            >
              <div className="flex items-center justify-between gap-3 p-4 border-b border-[#222]/10 bg-white/80 backdrop-blur-sm">
                <h2
                  id="cart-drawer-title"
                  className="text-lg font-black text-[#222] uppercase tracking-tight"
                >
                  Giỏ hàng
                </h2>
                <button
                  type="button"
                  onClick={() => setShowCartDrawer(false)}
                  className="p-2 rounded-full hover:bg-[#FFE4F0] transition-colors"
                  aria-label="Đóng"
                >
                  <X size={22} className="text-[#555]" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cartLines.map((line) => {
                  const row = processedByModelKey.get(line.modelKey);
                  const maxQ = row
                    ? getMaxQtyForCartLine(row, availabilityConfirmed)
                    : 0;
                  const pricing = row ? getDevicePricing(row) : null;
                  const unit = pricing?.discounted ?? 0;
                  const lineTotal = unit * line.quantity;
                  const plusDisabled =
                    !row || line.quantity >= maxQ || maxQ <= 0;
                  return (
                    <div
                      key={line.modelKey}
                      className="rounded-xl border-2 border-[#FAD6E8] bg-white p-3 shadow-sm"
                    >
                      <div className="flex gap-3">
                        <img
                          src={row?.img || FALLBACK_IMG}
                          alt=""
                          className="w-16 h-16 rounded-lg object-cover shrink-0 bg-[#FFE4F0]"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-black text-[#222] text-sm uppercase leading-tight line-clamp-2">
                            {row?.displayName || "Mẫu máy"}
                          </div>
                          {!row && (
                            <p className="text-xs text-amber-700 mt-1">
                              Không thấy trong danh sách hiện tại — bạn có thể xóa
                              dòng này.
                            </p>
                          )}
                          <div className="mt-1 text-xs text-[#666]">
                            {unit > 0 ? (
                              <>
                                {formatPriceK(unit)} × {line.quantity} ={" "}
                                <span className="font-bold text-[#E85C9C]">
                                  {formatPriceK(lineTotal)}
                                </span>
                              </>
                            ) : (
                              "Chọn lịch ở bước đặt để xem giá chính xác."
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCartRemoveLine(line.modelKey)}
                          className="shrink-0 p-2 rounded-lg text-[#999] hover:bg-red-50 hover:text-red-600 transition-colors self-start"
                          aria-label="Xóa khỏi giỏ"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase text-[#C94B86] tracking-wider">
                          Số lượng
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={line.quantity <= 1}
                            onClick={() => handleCartDecrement(line.modelKey)}
                            className="w-9 h-9 rounded-lg border-2 border-[#222] flex items-center justify-center font-black text-[#222] hover:bg-[#222]/5 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Minus size={16} strokeWidth={2.5} />
                          </button>
                          <span className="min-w-8 text-center font-black text-[#222]">
                            {line.quantity}
                          </span>
                          <span
                            className="inline-flex rounded-lg"
                            title={
                              plusDisabled
                                ? "Không đủ số lượng máy để thêm"
                                : undefined
                            }
                          >
                            <button
                              type="button"
                              disabled={plusDisabled}
                              onClick={() =>
                                handleCartIncrement(line.modelKey, maxQ)
                              }
                              className={`w-9 h-9 rounded-lg border-2 border-[#222] flex items-center justify-center font-black text-[#222] hover:bg-[#222]/5 disabled:opacity-30 disabled:cursor-not-allowed ${
                                plusDisabled ? "pointer-events-none" : ""
                              }`}
                              aria-label={
                                plusDisabled
                                  ? "Không đủ số lượng máy để thêm"
                                  : "Tăng số lượng"
                              }
                            >
                              <Plus size={16} strokeWidth={2.5} />
                            </button>
                          </span>
                        </div>
                      </div>
                      {availabilityConfirmed && row && maxQ > 0 && (
                        <p className="mt-2 text-[10px] text-[#777] font-medium">
                          Tối đa {maxQ} máy trống cho khung giờ đã chọn.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {cartCheckoutError ? (
                <div className="px-4 pb-2">
                  <p className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {cartCheckoutError}
                  </p>
                </div>
              ) : null}

              <div className="p-4 border-t border-[#222]/10 bg-white space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-[#555] uppercase text-xs tracking-wider">
                    Tạm tính
                  </span>
                  <span className="font-black text-lg text-[#E85C9C]">
                    {formatPriceK(
                      cartLines.reduce((sum, line) => {
                        const r = processedByModelKey.get(line.modelKey);
                        if (!r) return sum;
                        const p = getDevicePricing(r);
                        return sum + (p?.discounted || 0) * line.quantity;
                      }, 0),
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCheckoutFromCart}
                  disabled={cartTotalQty === 0}
                  className="w-full py-3.5 rounded-xl bg-[#222] text-[#FF9FCA] font-black text-sm uppercase tracking-wider hover:bg-[#333] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Tiến hành đặt & thanh toán
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Notify Waitlist Success Modal */}
      <AnimatePresence>
        {notifySuccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setNotifySuccessModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative"
            >
              <div className="absolute top-0 w-full h-2 bg-[#E85C9C]" />
              <button
                onClick={() => setNotifySuccessModal(false)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full transition-all"
              >
                <X size={18} />
              </button>
              <div className="p-8 pb-6 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-[#FFF5FA] rounded-full flex items-center justify-center mb-4 border-2 border-[#FFD3E7] shadow-sm">
                  <span className="text-3xl">📧</span>
                </div>
                <h3 className="text-xl font-black text-[#222] mb-2">Đăng ký thành công</h3>
                <p className="text-[14px] text-gray-600 leading-relaxed font-medium">
                  Shop sẽ gửi mail thông báo cho bạn ngay khi có khách huỷ lịch thiết bị này.
                </p>
                <button
                  onClick={() => setNotifySuccessModal(false)}
                  className="mt-6 w-full py-3 bg-[#E85C9C] text-white font-bold rounded-xl active:scale-[0.98] transition-all"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {/* Loading overlay cho quá trình xử lý Waitlist / Login */}
        {isNotifyLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-white/50 backdrop-blur-md flex items-center justify-center"
          >
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 border-4 border-[#FFD3E7] border-t-[#E85C9C] rounded-full animate-spin"></div>
              <p className="mt-4 text-sm font-bold text-[#E85C9C] uppercase tracking-wider animate-pulse">
                Đang xử lý...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Book Modal - nhảy step 2 khi có prefs, cho back về step 1 */}
      <QuickBookModal
        device={quickBookDevices.length === 1 ? quickBookDevices[0] : null}
        devices={quickBookDevices}
        modelGroupDevices={
          quickBookDevices.length === 1 && quickBookDevices[0]?.groupDeviceIds?.size > 1
            ? buildModelGroupDevicesForModal(
                quickBookDevices[0],
                quickBookDevices[0]?.crossBranchOnly ? devices : devicesInBranch,
                deviceBookingsById,
              )
            : []
        }
        isOpen={showQuickBookModal}
        onClose={handleCloseQuickBook}
        initialPrefs={
          quickBookDevices.length > 0
            ? {
                step: availabilityConfirmed ? 2 : 1,
                branchId:
                  quickBookBranchOverride ?? availabilityPrefs.branchId,
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

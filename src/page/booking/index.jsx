import React, { useMemo, useState, useEffect, useCallback } from "react";
import { format, addDays } from "date-fns";
import { useSearchParams, Link, useNavigate, useMatch } from "react-router-dom";
import vi from "date-fns/locale/vi";

import {
  ArrowLeftIcon,
  CheckCircleIcon,
  DevicePhoneMobileIcon,
  UserIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  PrinterIcon,
} from "@heroicons/react/24/solid";
import api from "../../config/axios";
import FloatingContactButton from "../../components/FloatingContactButton";
import BookingProgress from "../../components/BookingProgress";
import BookingPrefsForm, {
  computeAvailabilityRange,
  getAvailabilityRangeError,
  getSixHourAutoReturnTime,
} from "../../components/BookingPrefsForm";
import {
  saveCustomerInfo,
  loadCustomerInfo,
  saveBookingPrefs,
  loadBookingPrefs,
  loadCustomerSession,
} from "../../utils/storage";
import {
  BRANCHES,
  MORNING_PICKUP_TIME,
  SIX_HOUR_SECOND_PICKUP_TIME,
  SIX_HOUR_RETURN_TIME,
  DEFAULT_EVENING_SLOT,
  EVENING_SLOTS,
  SIX_HOUR_MAX_HOURS,
} from "../../data/bookingConstants";
import { formatTimeVi } from "../../utils/formatTimeVi";
import { filterBookingsOverlappingSlot } from "../../utils/bookingOverlap";
import {
  normalizeDate,
  normalizePhone,
  combineDateWithTime,
  getDurationDays,
  getDefaultBranchId,
  getTimeRange,
  getSlotButtonClasses,
  formatDateForAPIPayload,
  computeDiscountBreakdown,
} from "../../utils/bookingHelpers";
import {
  computeEarnedPoints,
  computeTotalSpentFromBookings,
  memberTierKeyFromTotalSpent,
  pointsPerEarnBlock,
} from "../../utils/loyaltyEarn";
import { trackBookingCheckoutStart } from "../../lib/bookingAnalytics";
import { calculateRentalInfo, roundDownToThousand } from "../../utils/pricing";

/* ========= HẰNG SỐ & DỮ LIỆU ===== */

const TET_BASE_DATE = new Date(2026, 1, 12); // Mùng 1 Tết
const TET_START_OFFSET = -6; // 25 Tết
const TET_END_OFFSET = 9; // Mùng 10

const FIRST_ORDER_VOUCHER_RATE = 0.3;
const FIRST_ORDER_VOUCHER_CAP = 200000;
const POINT_TO_VND = 1000;

/** Một voucher shop mỗi đơn — style chọn giống Shopee */
const BOOKING_VOUCHER_OPTIONS = [
  {
    id: "NONE",
    percentBadge: null,
    title: "Không dùng",
    subtitle: "Tiếp tục không áp mã giảm",
  },
  {
    id: "WEEKDAY20",
    percentBadge: "20%",
    title: "Giảm 20% ngày trong tuần",
    subtitle:
      "Theo từng ngày lịch (T2–T6, trừ lễ); slot tối/sáng như catalog — không phải 20% cả đơn",
  },
  {
    id: "FIRST30",
    percentBadge: "30%",
    title: "Giảm 30% đơn đầu tiên",
    subtitle: "Tối đa 200.000đ • Thành viên, đơn đầu",
  },
];

const FALLBACK_IMG = "https://placehold.co/640x360/fdf2f8/ec4899?text=No+Image";

/* ========= HELPERS ========= */

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

const diffHours = (d1, d2) => (d2.getTime() - d1.getTime()) / (1000 * 60 * 60);

function safeDesc(s) {
  if (!s) return "Thanh toan don hang";
  const t = s.trim().replace(/\s+/g, " ");
  return t.length <= 25 ? t : t.slice(0, 24) + "…";
}

function extractApiErrorMessage(error, fallback) {
  const data = error?.response?.data;
  if (typeof data === "string" && data.trim()) return data;
  if (data?.message) return data.message;
  if (data?.error) return data.error;
  return error?.message || fallback;
}

async function resolveGuestCustomerId(customer) {
  const response = await api.post("/accounts/resolve", {
    fullName: customer.fullName?.trim() || null,
    phone: customer.phone || null,
    ig: customer.ig?.trim() || null,
    fb: customer.fb?.trim() || null,
    email: null,
  });
  const customerId = response?.data?.id;
  if (!customerId) {
    throw new Error("Không lấy được customerId.");
  }
  return customerId;
}

function formatDateTimeLocalForAPI(date) {
  if (!date) return null;
  return format(date, "yyyy-MM-dd'T'HH:mm:ss");
}

function clampNumber(value, min = 0, max = Number.POSITIVE_INFINITY) {
  const n = Number(value) || 0;
  return Math.max(min, Math.min(max, n));
}


function normalizeDeviceName(name = "") {
  return name.replace(/\s*\(\d+\)\s*$/, "").trim();
}

function getModelIdentity(device) {
  const modelKey = String(device?.modelKey || "").trim();
  if (modelKey) return modelKey.toLowerCase();
  const normalizedName = normalizeDeviceName(
    device?.name || device?.displayName || "",
  );
  return normalizedName.toLowerCase();
}

function getTetDayLabel(date) {
  if (!date) return null;
  const d = normalizeDate(date);
  const base = normalizeDate(TET_BASE_DATE);
  const diff = Math.round((d - base) / (1000 * 60 * 60 * 24));
  if (diff < TET_START_OFFSET || diff > TET_END_OFFSET) return null;
  if (diff >= 0) return `Mùng ${diff + 1}`;
  return `${31 + diff} Tết`;
}

function getDayPartLabel(date) {
  const hour = date.getHours();
  if (hour < 12) return "Sáng";
  if (hour < 18) return "Chiều";
  return "Tối";
}

function formatTimeLabel(date) {
  return formatTimeVi(date);
}

function formatWeekdayShort(date) {
  const dow = date.getDay();
  if (dow === 0) return "CN";
  return `Thứ ${dow + 1}`;
}

function formatBookingSummaryDate(date) {
  const tetLabel = getTetDayLabel(date);
  if (!tetLabel) {
    return `${format(date, "dd/MM", { locale: vi })} ${formatTimeVi(date)}`;
  }
  const timeLabel = formatTimeLabel(date);
  const dayPart = getDayPartLabel(date);
  const weekday = formatWeekdayShort(date);
  return `${timeLabel} • ${dayPart} • ${tetLabel} • ${weekday} (${format(
    date,
    "dd/MM"
  )})`;
}


/** Format số tiền VND để in hợp đồng */
function formatVnd(amount) {
  if (amount == null || isNaN(amount)) return "0";
  return Math.round(amount).toLocaleString("vi-VN");
}

function escapeHtmlContract(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Mở cửa sổ in hợp đồng thuê máy với dữ liệu đã điền.
 * @param {{ device: { displayName: string, deposit: number }, total: number, t1: Date, t2: Date }} data
 */
function printContract({ device, total, t1, t2 }) {
  if (!device || !t1 || !t2) return;
  const machineName = escapeHtmlContract(device.displayName || "—");
  const machineValue = escapeHtmlContract(formatVnd(device.deposit)) + " VND";
  const rentalPrice = escapeHtmlContract(formatVnd(total)) + " VND";
  const extensionFeePerHour = "100.000 VND/giờ";
  const fromTime = format(t1, "HH");
  const fromDate = format(t1, "dd/MM/yyyy");
  const toTime = format(t2, "HH");
  const toDate = format(t2, "dd/MM/yyyy");
  const timeRange = `Từ ${fromTime} Giờ, Ngày ${fromDate} Đến ${toTime} Giờ, Ngày ${toDate}`;

  const html = `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><title>Hợp đồng thuê máy</title>
<style>body{font-family:"Times New Roman",Times,serif;font-size:14px;line-height:1.6;padding:24px;max-width:600px;margin:0 auto;}
h2{text-align:center;font-size:18px;margin-bottom:24px;}
.clause{margin:14px 0;}.clause-num{font-weight:bold;}
.fill{text-decoration:underline;text-underline-offset:2px;}
@media print{body{padding:16px;}}</style>
</head>
<body>
<h2>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<br>Độc lập - Tự do - Hạnh phúc</h2>
<h2>HỢP ĐỒNG THUÊ MÁY</h2>
<div class="clause"><span class="clause-num">1.</span> Dòng Máy Tên: <span class="fill">${machineName}</span></div>
<div class="clause"><span class="clause-num">2.</span> Giá Trị Máy: <span class="fill">${machineValue}</span></div>
<div class="clause"><span class="clause-num">3.</span> Giá Thuê: <span class="fill">${rentalPrice}</span></div>
<div class="clause"><span class="clause-num">4.</span> Thời Hạn Thuê: <span class="fill">${timeRange}</span></div>
<div class="clause"><span class="clause-num">5.</span> Cam kết sử dụng đúng mục đích: Bên thuê không được cầm cố, bán, cho thuê lại, chuyển giao hoặc tẩu tán thiết bị dưới bất kỳ hình thức nào khi chưa có văn bản chấp thuận của bên cho thuê.</div>
<div class="clause"><span class="clause-num">6.</span> Chế tài vi phạm mục đích sử dụng: Nếu phát sinh hành vi tại Điều 5, bên thuê chịu bồi thường ngay 100% giá trị máy theo Điều 2, cộng phạt vi phạm 30% giá trị máy và toàn bộ chi phí thu hồi, xác minh, xử lý pháp lý (nếu có).</div>
<div class="clause"><span class="clause-num">7.</span> Trả trễ và gia hạn: Sau thời điểm phải trả ghi tại Điều 4, bên thuê có tối đa 30 phút gia hạn mềm để liên hệ shop. Quá mốc này, mọi thời gian phát sinh được tính phí gia hạn ${extensionFeePerHour}, làm tròn theo từng giờ. Máy chỉ được xem là đã trả khi bên cho thuê xác nhận tình trạng và hoàn tất công nợ.</div>
<div class="clause"><span class="clause-num">8.</span> Bồi thường do ảnh hưởng lịch khách sau: Nếu việc trả trễ làm ảnh hưởng lịch khách kế tiếp, bên thuê đồng ý thanh toán toàn bộ thiệt hại thực tế phát sinh gồm chi phí điều phối, hỗ trợ khách bị dời lịch và phần doanh thu bị mất (nếu có), ngoài phí gia hạn tại Điều 7.</div>
<div class="clause"><span class="clause-num">9.</span> Xác nhận: Việc thanh toán đặt cọc/tiền thuê đồng nghĩa bên thuê đã đọc, hiểu và chấp thuận toàn bộ điều khoản trên, cam kết thanh toán đủ các khoản phát sinh do vi phạm.</div>
<script>window.onload=function(){window.focus();window.print();};window.onafterprint=function(){window.close();};</script>
</body>
</html>`;

  try {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, "_blank", "noopener,noreferrer");
    URL.revokeObjectURL(url);
    if (!w) alert("Vui lòng cho phép popup để in hợp đồng.");
  } catch (e) {
    console.error("In hợp đồng:", e);
  }
}

/* ===== Hook tính giá ===== */
function useBookingPricing(
  device,
  startDate,
  timeFrom,
  endDate,
  timeTo,
  durationId,
  selectedVoucherId,
  firstOrderPromoEligible,
  hasSession,
  pointsToRedeem,
) {
  return useMemo(() => {
    if (!device || !startDate || !endDate || !timeFrom || !timeTo)
      return {
        days: 0,
        subTotal: 0,
        discount: 0,
        voucherDiscount: 0,
        voucherLabel: null,
        voucherHint: null,
        pointDiscount: 0,
        totalAfterVoucher: 0,
        total: 0,
        t1: null,
        t2: null,
        isSixHours: false,
      };

    const t1 = combineDateWithTime(startDate, timeFrom);
    const t2 = combineDateWithTime(endDate, timeTo);

    if (!t1 || !t2 || t2 <= t1) {
      return {
        days: 0,
        subTotal: 0,
        discount: 0,
        voucherDiscount: 0,
        voucherLabel: null,
        voucherHint: null,
        pointDiscount: 0,
        totalAfterVoucher: 0,
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

    if (durationId === "SIX_HOURS") {
      if (hours > 0 && hours <= SIX_HOUR_MAX_HOURS + 0.05) {
        isSixHours = true;
        days = 0.5;
        subTotal = device.priceSixHours || device.priceOneDay || 0;
      }
    } else if (sameDay && hours <= 6.05) {
      isSixHours = true;
      days = 0.5;
      subTotal = device.priceSixHours || device.priceOneDay || 0;
    } else {
      const rental = calculateRentalInfo([t1, t2], device);
      if (rental.price > 0) {
        days = rental.chargeableDays;
        subTotal = roundDownToThousand(rental.price);
      } else {
        const rawDays = Math.ceil(hours / 24);
        days = rawDays <= 0 ? 1 : rawDays;
        if (days === 1) subTotal = device.priceOneDay || 0;
        else if (days === 2) subTotal = device.priceTwoDay || 0;
        else if (days === 3) subTotal = device.priceThreeDay || 0;
        else {
          subTotal =
            (device.priceThreeDay || 0) +
            (days - 3) * (device.priceNextDay || 0);
        }
      }
    }

    /* Tránh subTotal kẹt 0: gói 6h không khớp cửa sổ giờ, hoặc thiếu priceSixHours/priceOneDay trên device. */
    if (subTotal === 0 && device && hours > 0 && t2 > t1) {
      isSixHours = false;
      const rental = calculateRentalInfo([t1, t2], device);
      if (rental.price > 0) {
        days = rental.chargeableDays;
        subTotal = roundDownToThousand(rental.price);
      } else {
        const rawDays = Math.ceil(hours / 24);
        days = rawDays <= 0 ? 1 : rawDays;
        if (days === 1) subTotal = device.priceOneDay || 0;
        else if (days === 2) subTotal = device.priceTwoDay || 0;
        else if (days === 3) subTotal = device.priceThreeDay || 0;
        else {
          subTotal =
            (device.priceThreeDay || 0) +
            (days - 3) * (device.priceNextDay || 0);
        }
      }
    }

    let voucherDiscount = 0;
    let voucherLabel = null;
    let voucherHint = null;

    if (selectedVoucherId === "WEEKDAY20") {
      const breakdown =
        subTotal > 0 ? computeDiscountBreakdown(subTotal, t1, t2) : null;
      if (breakdown && breakdown.discounted < subTotal) {
        voucherDiscount = subTotal - breakdown.discounted;
        voucherLabel =
          breakdown.discountLabel || "Giảm ngày trong tuần (T2–T6, trừ lễ)";
      } else if (subTotal > 0) {
        voucherHint =
          "Không có ngày được giảm trong lịch (T7/CN/ngày lễ hoặc cách tính ngày theo slot tối/sáng) — mã không trừ tiền.";
      }
    } else if (selectedVoucherId === "FIRST30") {
      if (firstOrderPromoEligible) {
        voucherDiscount = Math.min(
          Math.round(subTotal * FIRST_ORDER_VOUCHER_RATE),
          FIRST_ORDER_VOUCHER_CAP,
        );
          voucherLabel = "Giảm 30% đơn đầu (tối đa 200k)";
      } else if (!hasSession) {
        voucherHint =
          "Đăng nhập thành viên — voucher dành cho đơn thuê đầu tiên.";
      } else {
        voucherHint = "Voucher chỉ áp dụng cho đơn thuê đầu tiên của tài khoản.";
      }
    }

    const totalAfterVoucher = Math.max(0, subTotal - voucherDiscount);
    const pointDiscount = Math.min(
      clampNumber(pointsToRedeem, 0) * POINT_TO_VND,
      totalAfterVoucher,
    );
    const total = Math.max(0, totalAfterVoucher - pointDiscount);

    return {
      days,
      subTotal,
      discount: voucherDiscount + pointDiscount,
      voucherDiscount,
      voucherLabel,
      voucherHint,
      pointDiscount,
      totalAfterVoucher,
      total,
      t1,
      t2,
      isSixHours,
    };
  }, [
    device,
    startDate,
    timeFrom,
    endDate,
    timeTo,
    durationId,
    selectedVoucherId,
    firstOrderPromoEligible,
    hasSession,
    pointsToRedeem,
  ]);
}

/* ===================== UI Components ===================== */

function ShopeeVoucherStrip({
  value,
  onChange,
  firstOrderBlocked,
  hasSession,
}) {
  return (
    <div className="rounded-2xl border border-[#ffeee8] bg-white shadow-[0_2px_12px_rgba(238,77,45,0.08)] overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-gradient-to-r from-[#fff5f0] to-white border-b border-[#ffe4d6]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 text-[#ee4d2d] font-black text-xs uppercase tracking-wider">
            Voucher
          </span>
          <span className="text-[11px] text-[#666] truncate font-medium">
            Chọn 1 mã từ Shop
          </span>
        </div>
      </div>
      <div className="flex gap-2.5 overflow-x-auto px-3 py-3 snap-x snap-mandatory scrollbar-thin pb-1">
        {BOOKING_VOUCHER_OPTIONS.map((v) => {
          const active = value === v.id;
          const disabled = v.id === "FIRST30" && firstOrderBlocked;

          return (
            <button
              key={v.id}
              type="button"
              disabled={disabled}
              onClick={() => !disabled && onChange(v.id)}
              className={[
                "snap-start shrink-0 w-[min(78vw,260px)] rounded-lg border-2 text-left transition-all flex overflow-hidden min-h-[88px]",
                disabled
                  ? "opacity-45 border-[#eee] cursor-not-allowed grayscale"
                  : active
                    ? "border-[#ee4d2d] shadow-[0_0_0_1px_rgba(238,77,45,0.25)] ring-2 ring-[#ee4d2d]/20"
                    : "border-[#f0f0f0] hover:border-[#ffc6b3] active:scale-[0.99]",
              ].join(" ")}
            >
              <div
                className={[
                  "w-[30%] min-w-[72px] flex flex-col items-center justify-center px-1 py-2 border-r border-dashed border-[#ffd0bf]",
                  v.id === "NONE"
                    ? "bg-[#fafafa]"
                    : "bg-gradient-to-b from-[#fff3ed] to-[#ffe8dc]",
                ].join(" ")}
              >
                {v.percentBadge ? (
                  <>
                    <span className="text-lg font-black leading-none text-[#ee4d2d]">
                      {v.percentBadge}
                    </span>
                    <span className="text-[9px] font-bold text-[#ee4d2d]/90 uppercase mt-0.5">
                      Giảm
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] font-black text-[#999] uppercase text-center leading-tight px-0.5">
                    Bỏ qua
                  </span>
                )}
              </div>
              <div className="flex-1 flex items-stretch min-w-0">
                <div className="flex-1 py-2 pl-2.5 pr-1 flex flex-col justify-center min-w-0">
                  <p className="text-[12px] font-bold text-[#222] leading-snug line-clamp-2">
                    {v.title}
                  </p>
                  <p className="text-[10px] text-[#888] mt-0.5 line-clamp-2 leading-snug">
                    {v.subtitle}
                  </p>
                  {v.id === "FIRST30" && !hasSession && (
                    <p className="text-[9px] text-[#ee4d2d] font-semibold mt-1">
                      Cần đăng nhập
                    </p>
                  )}
                </div>
                <div className="flex items-center pr-2 shrink-0">
                  <div
                    className={[
                      "h-5 w-5 rounded-full border-2 flex items-center justify-center",
                      active && !disabled
                        ? "border-[#ee4d2d] bg-[#ee4d2d]"
                        : "border-[#ddd]",
                    ].join(" ")}
                  >
                    {active && !disabled ? (
                      <span className="text-[10px] font-black text-white leading-none">
                        ✓
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
  voucherDiscount,
  voucherLabel,
  voucherHint,
  pointDiscount,
  totalAfterVoucher,
  total,
  customer,
  isSixHours,
  hasSession,
  availablePoints,
  maxRedeemablePoints,
  pointsToRedeem,
  setPointsToRedeem,
  isMemberLoading,
  earnedPoints,
  pointsEarnRuleLabel,
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
                {formatBookingSummaryDate(t1)}
              </span>
            </div>
            <div>
              <span className="text-[#888]">Trả:</span>
              <span className="font-black text-white ml-1">
                {formatBookingSummaryDate(t2)}
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
        {voucherDiscount > 0 && voucherLabel && (
          <div className="flex justify-between items-center text-sm mb-2">
            <span className="text-[#ee4d2d] font-bold">🎫 {voucherLabel}</span>
            <span className="font-bold text-[#ee4d2d]">
              -{Math.round(voucherDiscount / 1000)}k
            </span>
          </div>
        )}
        {voucherHint && (
          <div className="text-[11px] text-amber-800 mb-2 bg-amber-50 rounded-lg px-2.5 py-2 border border-amber-100">
            {voucherHint}
          </div>
        )}
        {hasSession && (
          <div className="mb-2 rounded-lg border border-[#F5D9E7] bg-white p-2.5">
            <div className="flex items-center justify-between text-xs text-[#7C5A69]">
              <span className="font-semibold">Điểm thành viên</span>
              <span>
                Có sẵn: <b>{availablePoints}</b> điểm
              </span>
            </div>
            <div className="mt-2">
              <input
                type="range"
                min={0}
                max={maxRedeemablePoints}
                step={1}
                value={pointsToRedeem}
                onChange={(e) =>
                  setPointsToRedeem(
                    clampNumber(e.target.value, 0, maxRedeemablePoints)
                  )
                }
                className="w-full accent-[#E85C9C]"
                disabled={isMemberLoading || totalAfterVoucher <= 0}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs text-[#7C5A69]">
              <span>Đang dùng: {pointsToRedeem} điểm</span>
              <span>Quy đổi: {Math.round((pointsToRedeem * POINT_TO_VND) / 1000)}k</span>
            </div>
          </div>
        )}
        {!hasSession && (
          <div className="mb-2 rounded-lg border border-dashed border-[#F5D9E7] bg-white px-3 py-2 text-xs text-[#7C5A69]">
            Đăng nhập thành viên để dùng điểm và voucher đơn đầu tiên.
          </div>
        )}
        {pointDiscount > 0 && (
          <div className="flex justify-between items-center text-sm mb-2">
            <span className="text-[#D45A92] font-bold">⭐ Trừ điểm thành viên</span>
            <span className="font-bold text-[#D45A92]">
              -{Math.round(pointDiscount / 1000)}k
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
        <div className="mt-2 text-xs text-[#7C5A69]">
          <div>
            Tích điểm sau đơn: <b>{earnedPoints}</b> điểm ({pointsEarnRuleLabel})
          </div>
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
  const isQ9Entry = Boolean(useMatch({ path: "/q9", end: true }));
  const hasSession = !!loadCustomerSession()?.token;

  const initialPrefs = useMemo(() => {
    const prefs = loadBookingPrefs();
    const q9Branch = BRANCHES.find((b) => b.id === "Q9");
    const q9Bookable = Boolean(q9Branch && !q9Branch.disabled);
    let branchId;
    if (isQ9Entry && q9Bookable) {
      branchId = "Q9";
    } else if (BRANCHES.some((b) => b.id === prefs?.branchId)) {
      branchId = prefs.branchId;
    } else {
      branchId = getDefaultBranchId();
    }
    const safeBranchId =
      BRANCHES.find((b) => b.id === branchId && !b.disabled)?.id ||
      getDefaultBranchId();

    return {
      branchId: safeBranchId,
      durationId: prefs?.durationId || "ONE_DAY",
      date: prefs?.date ? normalizeDate(new Date(prefs.date)) : normalizeDate(new Date()),
      endDate: prefs?.endDate ? normalizeDate(new Date(prefs.endDate)) : addDays(normalizeDate(new Date()), 1),
      timeFrom: prefs?.timeFrom || MORNING_PICKUP_TIME,
      timeTo: prefs?.timeTo || SIX_HOUR_RETURN_TIME,
      pickupType: prefs?.pickupType || "MORNING",
      pickupSlot: prefs?.pickupSlot || DEFAULT_EVENING_SLOT,
    };
  }, [isQ9Entry]);

  // Get device from URL params
  const urlDeviceId = searchParams.get("deviceId");
  const urlDeviceName = searchParams.get("deviceName");

  const [allDevices, setAllDevices] = useState([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);
  const [devicesError, setDevicesError] = useState("");

  const [selectedDeviceId, setSelectedDeviceId] = useState(
    urlDeviceId ? parseInt(urlDeviceId) : null
  );

  const [selectedDate, setSelectedDate] = useState(initialPrefs.date);
  const [durationOptionId, setDurationOptionId] = useState(initialPrefs.durationId);
  const [pickupType, setPickupType] = useState(initialPrefs.pickupType);
  const [pickupSlot, setPickupSlot] = useState(initialPrefs.pickupSlot);
  const [sixHourTimeFrom, setSixHourTimeFrom] = useState(initialPrefs.timeFrom);
  const [sixHourTimeTo, setSixHourTimeTo] = useState(initialPrefs.timeTo);
  const [selectedBranchId, setSelectedBranchId] = useState(initialPrefs.branchId);
  const [endDateState, setEndDateState] = useState(initialPrefs.endDate);
  const [availabilityByBranch, setAvailabilityByBranch] = useState({});

  useEffect(() => {
    const q9Branch = BRANCHES.find((b) => b.id === "Q9");
    if (isQ9Entry && q9Branch && !q9Branch.disabled) {
      setSelectedBranchId("Q9");
      return;
    }
    const prefs = loadBookingPrefs();
    const fromPrefs =
      prefs?.branchId && BRANCHES.some((b) => b.id === prefs.branchId)
        ? prefs.branchId
        : getDefaultBranchId();
    const safe =
      BRANCHES.find((b) => b.id === fromPrefs && !b.disabled)?.id ||
      getDefaultBranchId();
    setSelectedBranchId(safe);
  }, [isQ9Entry]);

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
  const [memberAccount, setMemberAccount] = useState(null);
  const [memberBookingsCount, setMemberBookingsCount] = useState(0);
  const [memberTotalSpent, setMemberTotalSpent] = useState(0);
  const [isMemberLoading, setIsMemberLoading] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  /** Mặc định WEEKDAY20 để khớp KM “ngày trong tuần” và lưu noteVoucher khi thanh toán */
  const [selectedVoucherId, setSelectedVoucherId] = useState("WEEKDAY20");

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
    saveBookingPrefs({
      branchId: selectedBranchId,
      durationId: durationOptionId,
      date: selectedDate?.toISOString(),
      endDate: endDateState?.toISOString(),
      timeFrom: sixHourTimeFrom,
      timeTo: sixHourTimeTo,
      pickupType,
      pickupSlot,
    });
  }, [
    selectedBranchId,
    durationOptionId,
    selectedDate,
    endDateState,
    sixHourTimeFrom,
    sixHourTimeTo,
    pickupType,
    pickupSlot,
  ]);

  useEffect(() => {
    if (!hasSession) {
      setMemberAccount(null);
      setMemberBookingsCount(0);
      setMemberTotalSpent(0);
      setIsMemberLoading(false);
      setPointsToRedeem(0);
      return;
    }

    let cancelled = false;
    const fetchMemberData = async () => {
      setIsMemberLoading(true);
      try {
        const [accountRes, bookingsRes] = await Promise.all([
          api.get("/account"),
          api.get("/v1/bookings/me"),
        ]);
        if (cancelled) return;
        const bookings = Array.isArray(bookingsRes?.data) ? bookingsRes.data : [];
        setMemberAccount(accountRes?.data || null);
        setMemberBookingsCount(bookings.length);
        setMemberTotalSpent(computeTotalSpentFromBookings(bookings));
      } catch (err) {
        if (cancelled) return;
        console.warn("Không thể tải thông tin thành viên:", err);
        setMemberAccount(null);
        setMemberBookingsCount(0);
        setMemberTotalSpent(0);
      } finally {
        if (!cancelled) setIsMemberLoading(false);
      }
    };

    fetchMemberData();
    return () => {
      cancelled = true;
    };
  }, [hasSession]);

  useEffect(() => {
    if (durationOptionId === "SIX_HOURS") {
      setSixHourTimeFrom(MORNING_PICKUP_TIME);
      setSixHourTimeTo(getSixHourAutoReturnTime(MORNING_PICKUP_TIME));
    } else {
      setPickupType("MORNING");
      setPickupSlot(DEFAULT_EVENING_SLOT);
      setSixHourTimeFrom(MORNING_PICKUP_TIME);
      setSixHourTimeTo(MORNING_PICKUP_TIME);
      if (!endDateState || endDateState <= selectedDate) {
        setEndDateState(addDays(selectedDate || new Date(), 1));
      }
    }
  }, [durationOptionId]);

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

  // Compute availability range using the same shared logic
  const prefsForRange = useMemo(() => ({
    date: selectedDate,
    endDate: endDateState,
    timeFrom: sixHourTimeFrom,
    timeTo: sixHourTimeTo,
    durationType: durationOptionId,
    pickupType,
    pickupSlot,
  }), [selectedDate, endDateState, sixHourTimeFrom, sixHourTimeTo, durationOptionId, pickupType, pickupSlot]);

  const { fromDateTime: t1, toDateTime: t2 } = useMemo(
    () => computeAvailabilityRange(prefsForRange),
    [prefsForRange],
  );

  const startDate = t1 ? normalizeDate(t1) : null;
  const endDate = t2 ? normalizeDate(t2) : null;
  const timeFrom = t1 ? format(t1, "HH:mm") : null;
  const timeTo = t2 ? format(t2, "HH:mm") : null;

  const timeSelectionError = useMemo(() => {
    return getAvailabilityRangeError(prefsForRange, t1, t2);
  }, [prefsForRange, t1, t2]);

  /* ==== Pricing ==== */
  const isFirstOrderPromoEligible =
    hasSession && !isMemberLoading && memberBookingsCount === 0;
  const availablePoints = Math.max(0, Number(memberAccount?.point || 0));

  const firstOrderVoucherBlocked =
    hasSession && !isMemberLoading && memberBookingsCount > 0;

  useEffect(() => {
    if (selectedVoucherId === "FIRST30" && firstOrderVoucherBlocked) {
      setSelectedVoucherId("WEEKDAY20");
    }
  }, [selectedVoucherId, firstOrderVoucherBlocked]);

  const {
    days,
    subTotal,
    voucherDiscount,
    voucherLabel,
    voucherHint,
    pointDiscount,
    totalAfterVoucher,
    total,
    isSixHours,
  } = useBookingPricing(
    selectedDevice,
    startDate,
    timeFrom,
    endDate,
    timeTo,
    durationOptionId,
    selectedVoucherId,
    isFirstOrderPromoEligible,
    hasSession,
    pointsToRedeem,
  );
  const maxRedeemablePoints = Math.min(
    availablePoints,
    Math.floor(totalAfterVoucher / POINT_TO_VND)
  );
  const { earnedPoints, pointsEarnRuleLabel } = useMemo(() => {
    const tierKey = hasSession
      ? memberTierKeyFromTotalSpent(memberTotalSpent)
      : "member";
    const earned = computeEarnedPoints(total, tierKey);
    const label = hasSession
      ? `mỗi 50.000đ = ${pointsPerEarnBlock(tierKey)} điểm theo hạng của bạn`
      : "mỗi 50.000đ = 3 điểm khi đăng nhập thành viên";
    return { earnedPoints: earned, pointsEarnRuleLabel: label };
  }, [hasSession, memberTotalSpent, total]);

  useEffect(() => {
    setPointsToRedeem((prev) => clampNumber(prev, 0, maxRedeemablePoints));
  }, [maxRedeemablePoints]);

  const durationDays = useMemo(() => {
    if (durationOptionId === "SIX_HOURS") return 0.5;
    return getDurationDays(durationOptionId);
  }, [durationOptionId]);


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

    const fromDateTime = combineDateWithTime(startDate, timeFrom);
    const toDateTime = combineDateWithTime(endDate, timeTo);

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

        const data = (resp.data || []).map((d) => ({
          ...d,
          bookingDtos: filterBookingsOverlappingSlot(
            Array.isArray(d.bookingDtos) ? d.bookingDtos : [],
            fromDateTime,
            toDateTime,
          ),
        }));
        const selectedModelIdentity = getModelIdentity(selectedDevice);
        const isBusy = (d) =>
          Array.isArray(d?.bookingDtos) && d.bookingDtos.length > 0;
        const sameModelDevices = data.filter(
          (d) => getModelIdentity(d) === selectedModelIdentity
        );
        const soldOut =
          sameModelDevices.length > 0
            ? sameModelDevices.every(isBusy)
            : data.some((d) => d.id === selectedDevice.id && isBusy(d));

        setAvailabilityByBranch((prev) => ({
          ...prev,
          [branchId]: { loading: false, error: null, soldOut },
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

    BRANCHES.filter((b) => !b.disabled).forEach((b) => fetchForBranch(b.id));

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
    if (timeSelectionError) return false;
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
    timeSelectionError,
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
      let customerId = null;

      if (hasSession) {
        const currentAccount =
          memberAccount?.id ? memberAccount : (await api.get("/account"))?.data;
        customerId = currentAccount?.id || null;
        if (!customerId) {
          throw new Error("Không lấy được tài khoản thành viên hiện tại.");
        }

        try {
          await api.put("/customer/profile", {
            fullName: customer.fullName?.trim(),
            phone,
            ig: customer.ig?.trim() || null,
            fb: customer.fb?.trim() || null,
            email: currentAccount?.email || null,
          });
        } catch (profileErr) {
          // Profile sync is best-effort; do not block payment flow.
          console.warn("Không thể cập nhật hồ sơ customer, tiếp tục thanh toán.", profileErr);
        }
      } else {
        customerId = await resolveGuestCustomerId({
          ...customer,
          phone,
        });
      }

      if (!customerId) throw new Error("Không lấy được customerId.");

      const branchLabel =
        BRANCHES.find((b) => b.id === selectedBranchId)?.label ||
        selectedBranchId;

      const fmt = (d) => formatDateForAPIPayload(d);
      const note = `Khách ${customer.fullName} ${phone} ${branchLabel}`.slice(0, 80);
      const bookingRequest = {
        customerId,
        deviceId: selectedDevice.id,
        bookingFrom: fmt(t1),
        bookingTo: fmt(t2),
        total,
        note,
        dayOfRent: days,
        originalPrice: subTotal,
        noteVoucher: [
          voucherDiscount > 0 && selectedVoucherId === "WEEKDAY20"
            ? "WEEKDAY_20_PCT"
            : null,
          voucherDiscount > 0 && selectedVoucherId === "FIRST30"
            ? "FIRST_ORDER_30_MAX200K"
            : null,
          pointDiscount > 0 ? `POINT_${pointsToRedeem}` : null,
        ]
          .filter(Boolean)
          .join(" | ") || "NONE",
        ...(selectedBranchId === "Q9" ? { location: "Thủ Đức" } : {}),
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
      const paymentUrl = response.data?.deepLink || response.data?.checkoutUrl;
      if (paymentUrl) {
        trackBookingCheckoutStart(selectedDevice, {
          days,
          branchId: selectedBranchId,
          total,
        });
        window.location.href = paymentUrl;
      } else {
        throw new Error("Không nhận được link thanh toán từ server.");
      }
    } catch (error) {
      console.error("Failed to create payment link:", error);
      const errorMessage = extractApiErrorMessage(
        error,
        "Không thể tạo yêu cầu thanh toán. Vui lòng thử lại.",
      );
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

            {/* Preferences Form (Branch, Duration, Date, Time) */}
            <div className="mx-4 mb-4">
              <div className="rounded-2xl border border-[#FFE4F0] bg-white p-4 shadow-md">
                <BookingPrefsForm
                  branchId={selectedBranchId}
                  date={selectedDate}
                  endDate={endDateState}
                  timeFrom={sixHourTimeFrom}
                  timeTo={sixHourTimeTo}
                  durationType={durationOptionId}
                  pickupType={pickupType}
                  pickupSlot={pickupSlot}
                  setBranchId={setSelectedBranchId}
                  setDate={setSelectedDate}
                  setEndDate={setEndDateState}
                  setTimeFrom={setSixHourTimeFrom}
                  setTimeTo={setSixHourTimeTo}
                  setDurationType={setDurationOptionId}
                  setPickupType={setPickupType}
                  setPickupSlot={setPickupSlot}
                  error={timeSelectionError || (availabilityByBranch[selectedBranchId]?.soldOut ? "⚠️ Máy đã hết trong khung giờ này." : "")}
                />
              </div>
            </div>

            <div className="mx-4 mb-4">
              <ShopeeVoucherStrip
                value={selectedVoucherId}
                onChange={setSelectedVoucherId}
                firstOrderBlocked={firstOrderVoucherBlocked}
                hasSession={hasSession}
              />
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
                    voucherDiscount={voucherDiscount}
                    voucherLabel={voucherLabel}
                    voucherHint={voucherHint}
                    pointDiscount={pointDiscount}
                    totalAfterVoucher={totalAfterVoucher}
                    total={total}
                    customer={customer}
                    isSixHours={isSixHours}
                    hasSession={hasSession}
                    availablePoints={availablePoints}
                    maxRedeemablePoints={maxRedeemablePoints}
                    pointsToRedeem={pointsToRedeem}
                    setPointsToRedeem={setPointsToRedeem}
                    isMemberLoading={isMemberLoading}
                    earnedPoints={earnedPoints}
                    pointsEarnRuleLabel={pointsEarnRuleLabel}
                  />
                  {selectedDevice && t1 && t2 && total > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        printContract({
                          device: selectedDevice,
                          total,
                          t1,
                          t2,
                        })
                      }
                      className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-[#FF9FCA] bg-[#FFF5F8] text-[#222] font-bold uppercase tracking-wider hover:bg-[#FFE4F0] transition-colors"
                    >
                      <PrinterIcon className="h-5 w-5 text-[#E85C9C]" />
                      In hợp đồng
                    </button>
                  )}
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

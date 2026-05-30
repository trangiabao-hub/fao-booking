import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShareIcon,
  ClipboardDocumentIcon,
  LinkIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ChatBubbleLeftRightIcon,
  CalendarDaysIcon,
  MapPinIcon,
  PhoneIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/solid";
import api from "../../config/axios";
import FloatingContactButton from "../../components/FloatingContactButton";
import SlideNav from "../../components/SlideNav";
import OrderSummaryPanel from "../../components/OrderSummaryPanel";
import { MESSENGER_LINK } from "../../data/contactConfig";
import { BRANCH_WORKING_HOURS_LABEL } from "../../data/bookingConstants";
import {
  inferBookingBranchId,
  inferOrderBookingBranchId,
} from "../../utils/deviceBranch";
import {
  buildOrderSummaryText,
  formatOrderDateTime,
  formatDevicesLine,
  getBranchLabelFromId,
  parseCustomerNameFromBookingNote,
  parsePayOsCodeFromNote,
} from "../../utils/orderSummary";
import {
  downloadOrderCalendarIcs,
  getBranchMetaForOrder,
  openGoogleCalendarPickup,
  openGoogleCalendarReturn,
} from "../../utils/orderCalendar";
import OrderPhotoboothSection from "../../features/photobooth/components/OrderPhotoboothSection";

const FALLBACK_IMG = "https://placehold.co/640x360/fdf2f8/ec4899?text=No+Image";

function LoadingState({ message }) {
  return (
    <div className="text-center py-20">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-12 h-12 border-4 border-pink-200 border-t-pink-500 rounded-full mx-auto"
      />
      <p className="text-pink-700 font-medium mt-4">{message}</p>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-pink-50 text-3xl">
        📭
      </div>
      <p className="mt-4 text-slate-600 max-w-sm mx-auto">{message}</p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#222] text-[#FF9FCA] font-bold hover:opacity-95 transition-opacity"
      >
        <ArrowLeftIcon className="w-5 h-5" />
        Về trang chủ
      </Link>
    </div>
  );
}

function ScheduleTimeline({ details, onAddCalendar }) {
  const steps = [
    {
      id: "pickup",
      label: "Nhận máy",
      time: formatOrderDateTime(details.bookingFrom),
      hint: "Chuẩn bị CCCD / VNeID mức 2",
      accent: "border-emerald-200 bg-emerald-50 text-emerald-800",
      dot: "bg-emerald-500",
    },
    {
      id: "return",
      label: "Trả máy",
      time: formatOrderDateTime(details.bookingTo),
      hint: "Trả đúng giờ để tránh phí phát sinh",
      accent: "border-sky-200 bg-sky-50 text-sky-800",
      dot: "bg-sky-500",
    },
  ];

  return (
    <section className="rounded-2xl border border-[#EADCE3] bg-white overflow-hidden">
      <div className="px-4 py-3.5 sm:px-5 border-b border-[#F5E9EF] bg-[#FFFCFD]">
        <h2 className="text-sm font-black text-[#222] tracking-tight">
          Lịch nhận & trả máy
        </h2>
        <p className="text-xs text-[#888] mt-0.5">
          Lưu vào calendar — tự nhắc trước 1 giờ
        </p>
      </div>

      <div className="p-4 sm:p-5 space-y-0">
        {steps.map((step, index) => (
          <div key={step.id} className="flex gap-3 sm:gap-4">
            <div className="flex flex-col items-center shrink-0 pt-1">
              <span
                className={`w-3 h-3 rounded-full ring-4 ring-white ${step.dot}`}
                aria-hidden
              />
              {index < steps.length - 1 && (
                <span className="w-0.5 flex-1 min-h-[2.5rem] bg-[#EADCE3] my-1" />
              )}
            </div>
            <div
              className={`flex-1 rounded-xl border px-3.5 py-3 mb-3 ${step.accent}`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                {step.label}
              </p>
              <p className="text-base sm:text-lg font-black mt-0.5 tabular-nums">
                {step.time}
              </p>
              <p className="text-xs mt-1 opacity-90">{step.hint}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 pb-4 sm:px-5 sm:pb-5 space-y-2">
        <button
          type="button"
          onClick={onAddCalendar}
          className="w-full flex items-center justify-center gap-2 min-h-[48px] px-4 py-3 rounded-xl bg-[#222] text-[#FF9FCA] font-bold text-sm sm:text-base hover:bg-[#333] transition-colors active:scale-[0.99]"
        >
          <CalendarDaysIcon className="w-5 h-5 shrink-0" />
          Lưu lịch nhận & trả (nhắc trước 1 giờ)
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => openGoogleCalendarPickup(details)}
            className="flex items-center justify-center gap-1.5 min-h-[44px] px-3 py-2.5 rounded-xl border border-[#EADCE3] bg-white text-[#444] text-xs sm:text-sm font-bold hover:bg-[#FFFCFD] transition-colors"
          >
            <ArrowDownTrayIcon className="w-4 h-4 shrink-0 text-pink-600" />
            Google — Nhận
          </button>
          <button
            type="button"
            onClick={() => openGoogleCalendarReturn(details)}
            className="flex items-center justify-center gap-1.5 min-h-[44px] px-3 py-2.5 rounded-xl border border-[#EADCE3] bg-white text-[#444] text-xs sm:text-sm font-bold hover:bg-[#FFFCFD] transition-colors"
          >
            <ArrowDownTrayIcon className="w-4 h-4 shrink-0 text-sky-600" />
            Google — Trả
          </button>
        </div>
        <p className="text-[11px] text-[#999] leading-relaxed text-center px-1">
          File .ics hỗ trợ iPhone, Google Calendar, Outlook — mỗi mốc nhắc
          trước 1 giờ. Google Calendar web cần tự đặt nhắc nếu dùng nút bên
          trên.
        </p>
      </div>
    </section>
  );
}

function BranchCard({ branchId }) {
  const branch = getBranchMetaForOrder(branchId);
  const phone = branch.phone || "0901355198";

  return (
    <section className="rounded-2xl border border-[#EADCE3] bg-white p-4 sm:p-5">
      <h2 className="text-sm font-black text-[#222] mb-3">Địa điểm nhận / trả</h2>
      <div className="space-y-2.5 text-sm text-[#444]">
        <p className="font-bold text-[#222]">{branch.label}</p>
        <p className="flex items-start gap-2 leading-relaxed">
          <MapPinIcon className="w-4 h-4 shrink-0 text-pink-600 mt-0.5" />
          <span>
            {branch.pickupSpotLabel || branch.address}
            {" · "}
            <a
              href={branch.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-pink-700 underline underline-offset-2 hover:text-pink-900"
            >
              Chỉ đường
            </a>
          </span>
        </p>
        <p className="flex items-center gap-2">
          <PhoneIcon className="w-4 h-4 shrink-0 text-pink-600" />
          <a
            href={`tel:${String(phone).replace(/\s/g, "")}`}
            className="font-bold text-[#222] hover:text-pink-700"
          >
            {phone}
          </a>
        </p>
        <p className="text-xs text-[#888]">
          Giờ làm việc: {BRANCH_WORKING_HOURS_LABEL}
        </p>
      </div>
    </section>
  );
}

export default function OrderInfoPage() {
  const { orderIdNew, orderCode, bookingId } = useParams();
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shareLinkToast, setShareLinkToast] = useState(false);
  const [copySummaryToast, setCopySummaryToast] = useState(false);
  const [calendarToast, setCalendarToast] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      const byCode = !!orderCode;

      if (bookingId) {
        setLoading(true);
        setError(null);
        try {
          const res = await api.get(`/v1/bookings/detail/${bookingId}`);
          const b = res.data;
          if (!b?.id) {
            setError("Không tìm thấy đơn hàng");
            setOrderDetails(null);
            return;
          }
          let device = {
            name: b.device?.name || "Thiết bị",
            img: FALLBACK_IMG,
          };
          if (b.device?.id) {
            try {
              const devRes = await api.get(`/v1/devices/${b.device.id}`);
              device = {
                name: devRes.data?.name || device.name,
                img: devRes.data?.images?.[0] || FALLBACK_IMG,
              };
            } catch {
              /* keep fallback */
            }
          }
          const oid =
            b.orderIdNew != null && String(b.orderIdNew).trim() !== ""
              ? String(b.orderIdNew).trim()
              : null;
          const payosFromNote = parsePayOsCodeFromNote(b.note);
          const branchId = inferBookingBranchId(b);
          setOrderDetails({
            orderIdNew: oid,
            orderCode: payosFromNote,
            refFallback: !oid && !payosFromNote && b.id ? `Đặt chỗ #${b.id}` : null,
            branchId,
            branchLabel: getBranchLabelFromId(branchId),
            customerName: parseCustomerNameFromBookingNote(b.note),
            bookingFrom: b.bookingFrom,
            bookingTo: b.bookingTo,
            total: b.total ?? 0,
            device,
            devices: null,
          });
        } catch (err) {
          console.error("Failed to fetch booking:", err);
          setError("Không tìm thấy đơn hàng hoặc đơn đã bị hủy");
          setOrderDetails(null);
        } finally {
          setLoading(false);
        }
        return;
      }

      if (!orderIdNew && !orderCode) {
        setError("Thiếu mã đơn hàng");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const url = byCode
          ? `/v1/bookings/order-by-code/${orderCode}`
          : `/v1/bookings/order/${orderIdNew}`;
        const res = await api.get(url);
        const bookings = res.data || [];

        if (bookings.length === 0) {
          setError("Không tìm thấy đơn hàng");
          setLoading(false);
          return;
        }

        const first = bookings[0];
        const totalSum = bookings.reduce((s, b) => s + (b.total || 0), 0);
        const oidFromBooking =
          first?.orderIdNew != null && String(first.orderIdNew).trim() !== ""
            ? String(first.orderIdNew).trim()
            : null;
        const payosFromNote = parsePayOsCodeFromNote(first?.note);
        const payosDisplay = byCode ? String(orderCode) : payosFromNote;

        const devices = await Promise.all(
          bookings.map(async (b) => {
            try {
              const devRes = await api.get(`/v1/devices/${b.device?.id}`);
              return {
                name: devRes.data?.name || b.device?.name || "Thiết bị",
                img: devRes.data?.images?.[0] || FALLBACK_IMG,
              };
            } catch {
              return {
                name: b.device?.name || "Thiết bị",
                img: FALLBACK_IMG,
              };
            }
          }),
        );

        const branchId = inferOrderBookingBranchId(bookings);
        setOrderDetails({
          orderIdNew: oidFromBooking || (!byCode ? orderIdNew : null),
          orderCode: payosDisplay || null,
          refFallback: null,
          branchId,
          branchLabel: getBranchLabelFromId(branchId),
          customerName: parseCustomerNameFromBookingNote(first?.note),
          bookingFrom: first.bookingFrom,
          bookingTo: first.bookingTo,
          total: totalSum,
          device: devices[0],
          devices: devices.length > 1 ? devices : null,
        });
      } catch (err) {
        console.error("Failed to fetch order:", err);
        setError("Không tìm thấy đơn hàng hoặc đơn đã bị hủy");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderIdNew, orderCode, bookingId]);

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const deviceLabel = orderDetails?.devices?.length
    ? orderDetails.devices.map((d) => d.name).join(", ")
    : orderDetails?.device?.name || "";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareLinkToast(true);
      setTimeout(() => setShareLinkToast(false), 2500);
    } catch (err) {
      console.warn("Copy failed:", err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Đơn thuê máy ảnh - Fao Sài Gòn",
          text: `Đơn thuê ${deviceLabel} tại Fao Sài Gòn 📸`,
          url: shareUrl,
        });
      } catch (err) {
        if (err.name !== "AbortError") handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopySummary = async () => {
    if (!orderDetails) return;
    try {
      await navigator.clipboard.writeText(buildOrderSummaryText(orderDetails));
      setCopySummaryToast(true);
      setTimeout(() => setCopySummaryToast(false), 2500);
    } catch (err) {
      console.warn("Copy failed:", err);
    }
  };

  const handleMessengerWithSummary = async () => {
    if (!orderDetails) return;
    try {
      await navigator.clipboard.writeText(buildOrderSummaryText(orderDetails));
    } catch {
      /* ignore */
    }
    window.open(MESSENGER_LINK, "_blank");
  };

  const handleAddCalendar = () => {
    if (!orderDetails) return;
    const ok = downloadOrderCalendarIcs(orderDetails);
    if (ok) {
      setCalendarToast(true);
      setTimeout(() => setCalendarToast(false), 3500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-[radial-gradient(circle_at_top,_#fff8fb_0%,_#fdf2f7_35%,_#f8efe8_100%)] pb-32">
        <SlideNav />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <LoadingState message="Đang tải thông tin đơn hàng..." />
        </div>
        <FloatingContactButton />
      </div>
    );
  }

  if (error || !orderDetails) {
    return (
      <div className="min-h-dvh bg-[radial-gradient(circle_at_top,_#fff8fb_0%,_#fdf2f7_35%,_#f8efe8_100%)] pb-32">
        <SlideNav />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorState message={error} />
        </div>
        <FloatingContactButton />
      </div>
    );
  }

  const deviceLine = formatDevicesLine(orderDetails);
  const displayDevices =
    orderDetails.devices?.length > 1
      ? orderDetails.devices
      : [orderDetails.device];

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top,_#fff8fb_0%,_#fdf2f7_35%,_#f8efe8_100%)] pb-32 md:pb-36">
      <SlideNav />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              to="/my-bookings"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#888] hover:text-pink-700 transition-colors mb-2"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Đơn của tôi
            </Link>
            <h1 className="text-xl sm:text-2xl font-black text-[#222] tracking-tight">
              Chi tiết đơn hàng
            </h1>
            {deviceLine && (
              <p className="text-sm text-[#777] mt-0.5">{deviceLine}</p>
            )}
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
            <CheckCircleIcon className="w-4 h-4" />
            Đã đặt thành công
          </span>
        </header>

        <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-8 space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
            >
              <OrderSummaryPanel
                details={orderDetails}
                subtitle="Tra cứu nhanh hoặc copy gửi shop xác nhận."
                className="border-[#EADCE3] shadow-[0_8px_30px_rgba(20,20,20,0.04)]"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 }}
            >
              <ScheduleTimeline
                details={orderDetails}
                onAddCalendar={handleAddCalendar}
              />
            </motion.div>

            {orderDetails.orderIdNew && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.08 }}
              >
                <OrderPhotoboothSection orderIdNew={orderDetails.orderIdNew} />
              </motion.div>
            )}

            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.1 }}
              className="rounded-2xl border border-[#EADCE3] bg-white p-4 sm:p-5"
            >
              <h2 className="text-sm font-black text-[#222] mb-3">
                Thiết bị thuê
              </h2>
              <div className="space-y-2.5">
                {displayDevices.map((d, i) => (
                  <div
                    key={`${d.name}-${i}`}
                    className="flex items-center gap-4 p-3 rounded-xl border border-[#F5E9EF] bg-[#FFFCFD]"
                  >
                    <img
                      src={d.img}
                      alt={d.name}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-pink-100 shrink-0"
                    />
                    <p className="font-bold text-[#222] text-sm sm:text-base leading-snug">
                      {d.name}
                    </p>
                  </div>
                ))}
              </div>
            </motion.section>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.15 }}
            >
              <BranchCard branchId={orderDetails.branchId} />
            </motion.div>
          </div>

          <aside className="lg:col-span-4 space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-[#EADCE3] bg-white/95 backdrop-blur p-4 sm:p-5 shadow-[0_8px_30px_rgba(20,20,20,0.04)]">
              <h3 className="text-sm font-black text-[#222] mb-1">
                Thao tác nhanh
              </h3>
              <p className="text-xs text-[#888] mb-4">
                Lưu lịch, gửi shop hoặc chia sẻ link đơn
              </p>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleAddCalendar}
                  className="w-full flex items-center justify-center gap-2 min-h-[48px] px-4 py-3 rounded-xl bg-[#222] text-[#FF9FCA] font-bold text-sm hover:bg-[#333] transition-colors active:scale-[0.99]"
                >
                  <CalendarDaysIcon className="w-5 h-5" />
                  Lưu calendar (nhắc −1h)
                </button>
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="w-full flex items-center justify-center gap-2 min-h-[44px] px-4 py-3 rounded-xl bg-slate-800 text-white font-semibold text-sm hover:bg-slate-900 transition-colors"
                >
                  <ClipboardDocumentIcon className="w-5 h-5" />
                  Copy tóm tắt đơn
                </button>
                <button
                  type="button"
                  onClick={handleMessengerWithSummary}
                  className="w-full flex items-center justify-center gap-2 min-h-[44px] px-4 py-3 rounded-xl bg-[#0084FF] text-white font-semibold text-sm hover:bg-[#0066CC] transition-colors"
                >
                  <ChatBubbleLeftRightIcon className="w-5 h-5" />
                  Gửi shop (Messenger)
                </button>
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="w-full flex items-center justify-center gap-2 min-h-[44px] px-4 py-3 rounded-xl border border-[#EADCE3] bg-[#FFFCFD] text-[#444] font-semibold text-sm hover:bg-white transition-colors"
                >
                  <ShareIcon className="w-5 h-5 text-pink-600" />
                  Chia sẻ link
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full flex items-center justify-center gap-2 min-h-[44px] px-4 py-3 rounded-xl border border-[#EADCE3] text-[#666] font-semibold text-sm hover:bg-[#FFFCFD] transition-colors"
                >
                  <LinkIcon className="w-5 h-5" />
                  Copy link
                </button>
              </div>

              {(shareLinkToast || copySummaryToast || calendarToast) && (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-emerald-700 text-sm font-medium mt-3 flex items-start gap-2 bg-emerald-50 rounded-lg px-3 py-2"
                >
                  <CheckCircleIcon className="w-4 h-4 shrink-0 mt-0.5" />
                  {calendarToast
                    ? "Đã tải file lịch — mở để thêm vào Calendar (2 mốc, nhắc trước 1 giờ)."
                    : copySummaryToast
                      ? "Đã copy tóm tắt đơn hàng!"
                      : "Đã copy link vào clipboard!"}
                </motion.p>
              )}
            </div>

            <div className="space-y-2">
              <Link
                to="/catalog"
                className="block w-full text-center py-3.5 rounded-2xl border border-[#EADCE3] bg-white text-[#444] font-bold text-sm hover:bg-[#FFFCFD] transition-colors"
              >
                Thuê thêm thiết bị
              </Link>
              <Link
                to="/my-bookings"
                className="block w-full text-center py-3.5 rounded-2xl bg-[#222] text-[#FF9FCA] font-bold text-sm hover:opacity-95 transition-opacity"
              >
                Xem tất cả đơn
              </Link>
            </div>
          </aside>
        </div>
      </div>

      <FloatingContactButton />
    </div>
  );
}

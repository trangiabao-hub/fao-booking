import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import "dayjs/locale/vi";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("vi");

/** Format datetime theo múi VN - đồng bộ manage */
function formatVNDateTime(dateStr) {
  if (!dateStr) return "";
  return dayjs(dateStr).tz("Asia/Ho_Chi_Minh").format("HH:mm, dddd, DD/MM/YYYY");
}
import { motion } from "framer-motion";
import {
  CheckCircleIcon,
  XCircleIcon,
  CalendarIcon,
  ArrowUturnLeftIcon,
  ShareIcon,
  CameraIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentIcon,
  LinkIcon,
} from "@heroicons/react/24/solid";
import api from "../../config/axios";
import { MESSENGER_LINK } from "../../data/contactConfig";
import FloatingContactButton from "../../components/FloatingContactButton";
import SlideNav from "../../components/SlideNav";
import { saveRecentOrder } from "../../utils/storage";

const FALLBACK_IMG = "https://placehold.co/640x360/fdf2f8/ec4899?text=No+Image";

function SuccessCard({ details }) {
  const [showShare, setShowShare] = useState(false);
  const [showMessengerToast, setShowMessengerToast] = useState(false);
  const [showCopyOrderToast, setShowCopyOrderToast] = useState(false);

  const handleAddToCalendar = () => {
    if (!details) return;

    const formatGCALDate = (dateStr) => {
      return new Date(dateStr).toISOString().replace(/-|:|\.\d+/g, "");
    };

    const deviceLabel = details.devices?.length
      ? details.devices.map((d) => d.name).join(", ")
      : details.device?.name || "";
    const title = `Thuê máy ảnh: ${deviceLabel}`;
    const startTime = formatGCALDate(details.bookingFrom);
    const endTime = formatGCALDate(details.bookingTo);
    const description = `Cảm ơn bạn đã đặt lịch thuê máy ảnh!\n\nMã đơn hàng: ${details.orderCode}\nTổng tiền: ${details.total.toLocaleString("vi-VN")} đ\n\nVui lòng có mặt đúng giờ để nhận máy.\nLiên hệ: 0901355198`;
    const location = "330/22 Đ. Phan Đình Phùng, Phường 1, Phú Nhuận, Hồ Chí Minh, Việt Nam";

    const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startTime}/${endTime}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(location)}`;

    window.open(url, "_blank");
  };

  const handleShare = async () => {
    const deviceLabel = details.devices?.length
      ? details.devices.map((d) => d.name).join(", ")
      : details.device?.name || "";
    const orderUrl = details.orderIdNew
      ? `${window.location.origin}/order/${details.orderIdNew}`
      : details.orderCode
        ? `${window.location.origin}/order/code/${details.orderCode}`
        : window.location.origin;
    const shareText = `Mình vừa đặt thuê ${deviceLabel} tại Fao Sài Gòn! 📸\n${orderUrl}`;
    const shareData = {
      title: "Thuê máy ảnh tại Fao Sài Gòn",
      text: shareText,
      url: orderUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      // Fallback: copy to clipboard (text + link để dán vào Messenger/Zalo)
      navigator.clipboard.writeText(shareText);
      setShowShare(true);
      setTimeout(() => setShowShare(false), 2000);
    }
  };

  const getOrderSummary = () => {
    if (!details) return "";
    const deviceNames = details.devices?.length
      ? details.devices.map((d) => d.name).join(", ")
      : details.device?.name || "";
    return [
      `📋 TÓM TẮT ĐƠN HÀNG`,
      ``,
      `Mã đơn: #${details.orderCode}`,
      `Thiết bị: ${deviceNames}`,
      `Ngày nhận: ${formatVNDateTime(details.bookingFrom)}`,
      `Ngày trả: ${formatVNDateTime(details.bookingTo)}`,
      `Tổng tiền: ${details.total.toLocaleString("vi-VN")} đ`,
      ``,
      `Chào shop, mình vừa đặt đơn trên và đã thanh toán thành công. Mong shop xác nhận ạ!`,
    ].join("\n");
  };

  const handleCopyOrder = async () => {
    if (!details) return;
    const summary = getOrderSummary();
    try {
      await navigator.clipboard.writeText(summary);
      setShowCopyOrderToast(true);
      setTimeout(() => setShowCopyOrderToast(false), 3000);
    } catch (err) {
      console.warn("Clipboard failed:", err);
    }
  };

  const handleMessengerClick = async () => {
    if (!details) return;
    const message = getOrderSummary();
    try {
      await navigator.clipboard.writeText(message);
      window.open(MESSENGER_LINK, "_blank");
      setShowMessengerToast(true);
      setTimeout(() => setShowMessengerToast(false), 3000);
    } catch (err) {
      console.warn("Clipboard failed, opening Messenger only:", err);
      window.open(MESSENGER_LINK, "_blank");
    }
  };

  if (!details) {
    return <LoadingState message="Đang tải chi tiết đơn hàng..." />;
  }

  return (
    <div className="space-y-5 lg:space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="bg-white rounded-2xl lg:rounded-3xl border border-pink-100 shadow-lg shadow-pink-500/10 overflow-hidden"
      >
        {/* —— Focus: thành công + lưu ý + copy / Messenger —— */}
        <div className="p-5 sm:p-6 lg:p-8 xl:p-10 text-center border-b border-pink-100/80 bg-gradient-to-b from-white to-pink-50/40">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 220 }}
          >
            <CheckCircleIcon className="w-14 h-14 sm:w-16 sm:h-16 lg:w-[4.5rem] lg:h-[4.5rem] text-emerald-500 mx-auto" />
          </motion.div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-pink-900 mt-3 lg:mt-4 tracking-tight">
            Thanh toán thành công
          </h1>
          <p className="text-slate-600 text-sm lg:text-base mt-1.5 max-w-md lg:max-w-xl mx-auto leading-relaxed">
            Shop đã nhận thanh toán. Bạn cần thêm một bước để shop xác nhận đơn.
          </p>

          <div className="mt-5 lg:mt-8 lg:grid lg:grid-cols-2 lg:gap-6 lg:items-stretch text-left">
            <div className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3.5 lg:px-5 lg:py-4 h-full flex flex-col justify-center">
              <p className="text-[11px] font-black uppercase tracking-wider text-amber-900/80">
                Lưu ý quan trọng
              </p>
              <p className="text-sm lg:text-[15px] text-amber-950 font-semibold mt-1 leading-snug">
                Vui lòng gửi thông tin đơn hàng cho shop (Facebook / Messenger) để
                hoàn tất và xác nhận lịch.
              </p>
              <p className="text-xs lg:text-sm text-amber-900/75 mt-2 leading-relaxed">
                Copy nội dung đơn → mở chat shop → dán và gửi.
              </p>
            </div>

            <div className="mt-4 lg:mt-0 rounded-xl border border-emerald-200/90 bg-emerald-50/90 px-4 py-3.5 lg:px-5 lg:py-4 w-full space-y-3 h-full">
              <p className="text-sm lg:text-base font-black text-emerald-950 leading-snug">
                Nhận và Hoàn máy trực tiếp tại:
              </p>
              <div className="text-sm lg:text-[15px] text-emerald-950 space-y-2 leading-relaxed">
                <p>
                  <span className="mr-1" aria-hidden>
                    📍
                  </span>
                  Lầu 1, tại 475 Huỳnh Văn Bánh, Q. Phú Nhuận —{" "}
                  <a
                    href="https://maps.app.goo.gl/Lg6KoXzXWrdiurWj9?g_st=ic"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-emerald-800 underline decoration-emerald-400 underline-offset-2 hover:text-emerald-900"
                  >
                    chỉ đường Google Maps
                  </a>
                </p>
                <p>
                  <span className="mr-1" aria-hidden>
                    📞
                  </span>
                  <a
                    href="tel:0901355198"
                    className="font-bold text-emerald-900 hover:underline"
                  >
                    0901355198
                  </a>
                </p>
                <p className="text-emerald-900/90">
                  <span className="font-semibold">Thời gian làm việc:</span>{" "}
                  09h00 - 22h00
                </p>
              </div>
              <p className="text-xs sm:text-sm lg:text-[15px] text-emerald-900/90 leading-relaxed pt-1 border-t border-emerald-200/70">
                <span className="mr-1" aria-hidden>
                  🪪
                </span>
                Khách iu khi đến nhận máy chuẩn bị giúp FAO{" "}
                <strong>CCCD bản gốc</strong> hoặc{" "}
                <strong>VNeID định danh mức 2</strong>. Khi đến shop mình mang dép
                đen trên kệ, lên lầu 1 quẹo phải để nhận máy ạ
                <span aria-hidden>✨</span>
              </p>
            </div>
          </div>

          <div className="mt-5 lg:mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg sm:max-w-none lg:max-w-3xl mx-auto lg:gap-4">
            <button
              type="button"
              onClick={handleCopyOrder}
              className="flex items-center justify-center gap-2 px-4 py-3.5 lg:py-4 rounded-xl bg-slate-800 text-white font-bold text-sm sm:text-base lg:text-lg shadow-md hover:bg-slate-900 transition-all active:scale-[0.98]"
            >
              <ClipboardDocumentIcon className="w-5 h-5 lg:w-6 lg:h-6 shrink-0" />
              Copy đơn hàng
            </button>
            <button
              type="button"
              onClick={handleMessengerClick}
              className="flex items-center justify-center gap-2 px-4 py-3.5 lg:py-4 rounded-xl bg-[#0084FF] text-white font-bold text-sm sm:text-base lg:text-lg shadow-md shadow-blue-500/25 hover:bg-[#006edc] transition-all active:scale-[0.98]"
            >
              <ChatBubbleLeftRightIcon className="w-5 h-5 lg:w-6 lg:h-6 shrink-0" />
              Liên hệ shop (Messenger)
            </button>
          </div>

          {(showMessengerToast || showCopyOrderToast) && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 lg:mt-4 text-sm lg:text-base font-semibold text-emerald-700 bg-emerald-50 rounded-lg py-2.5 px-4 max-w-lg lg:max-w-3xl mx-auto"
            >
              {showMessengerToast
                ? "Đã copy nội dung — dán (Ctrl+V) vào Messenger và gửi shop."
                : "Đã copy tóm tắt đơn hàng."}
            </motion.p>
          )}
        </div>

        {/* —— Phụ: chi tiết + các tùy chọn —— PC: 2 cột —— */}
        <div className="p-4 sm:p-5 lg:p-8 xl:px-10 xl:pb-10 bg-slate-50/80 lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start">
          <div className="lg:col-span-7 space-y-4">
          <p className="text-[10px] lg:text-xs font-bold uppercase tracking-widest text-slate-400 text-center lg:text-left">
            Thêm (tùy chọn)
          </p>

          <details className="group rounded-xl border border-pink-100 bg-white open:shadow-sm lg:shadow-sm">
            <summary className="cursor-pointer list-none flex items-center justify-between gap-2 px-4 py-3 lg:px-5 lg:py-3.5 text-left font-semibold text-pink-900 text-sm lg:text-base [&::-webkit-details-marker]:hidden">
              <span>Xem chi tiết đơn</span>
              <span className="text-slate-400 text-xs font-normal group-open:rotate-180 transition-transform">
                ▼
              </span>
            </summary>
            <div className="px-4 pb-4 lg:px-5 lg:pb-5 pt-0 border-t border-pink-50 text-left space-y-3">
              {details.devices && details.devices.length > 1 ? (
                <div className="space-y-2 pt-3">
                  {details.devices.map((d, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <img
                        src={d.img}
                        alt={d.name}
                        className="w-11 h-11 rounded-lg object-cover border border-pink-100"
                      />
                      <p className="font-semibold text-pink-900 text-sm">{d.name}</p>
                    </div>
                  ))}
                  <p className="text-xs text-slate-500">Mã đơn: {details.orderCode}</p>
                </div>
              ) : (
                <div className="flex items-center gap-3 pt-3">
                  <img
                    src={details.device.img}
                    alt={details.device.name}
                    className="w-14 h-14 rounded-lg object-cover border border-pink-100"
                  />
                  <div>
                    <p className="font-semibold text-pink-900 text-sm">
                      {details.device.name}
                    </p>
                    <p className="text-xs text-slate-500">Mã đơn: {details.orderCode}</p>
                  </div>
                </div>
              )}
              <div className="text-xs sm:text-sm text-slate-700 space-y-1.5 leading-relaxed">
                <p>
                  <span className="text-slate-500">Nhận:</span>{" "}
                  {formatVNDateTime(details.bookingFrom)}
                </p>
                <p>
                  <span className="text-slate-500">Trả:</span>{" "}
                  {formatVNDateTime(details.bookingTo)}
                </p>
                <p>
                  <span className="text-slate-500">Tổng:</span>{" "}
                  <span className="font-bold text-pink-600">
                    {details.total.toLocaleString("vi-VN")} đ
                  </span>
                </p>
              </div>
            </div>
          </details>
          </div>

          <div className="lg:col-span-5 mt-4 lg:mt-0 space-y-3 lg:pl-2 lg:border-l lg:border-slate-200/90">
            <p className="text-[10px] lg:text-xs font-bold uppercase tracking-widest text-slate-400 text-center lg:text-left">
              Thao tác nhanh
            </p>
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2">
            {(details.orderIdNew || details.orderCode) && (
              <Link
                to={
                  details.orderIdNew
                    ? `/order/${details.orderIdNew}`
                    : `/order/code/${details.orderCode}`
                }
                className="inline-flex flex-1 min-h-[44px] min-w-0 items-center justify-center gap-2 px-3 py-2.5 lg:py-3 rounded-xl bg-white text-pink-700 text-sm lg:text-[15px] font-semibold border border-pink-200 hover:bg-pink-50 transition-colors"
              >
                <LinkIcon className="w-4 h-4 shrink-0" />
                Link đơn hàng
              </Link>
            )}
            <button
              type="button"
              onClick={handleAddToCalendar}
              className="inline-flex flex-1 min-h-[44px] min-w-0 items-center justify-center gap-2 px-3 py-2.5 lg:py-3 rounded-xl bg-white text-pink-800 text-sm lg:text-[15px] font-semibold border border-pink-200 hover:bg-pink-50 transition-colors"
            >
              <CalendarIcon className="w-4 h-4 shrink-0" />
              Google Calendar
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex flex-1 min-h-[44px] min-w-0 items-center justify-center gap-2 px-3 py-2.5 lg:py-3 rounded-xl bg-white text-slate-700 text-sm lg:text-[15px] font-semibold border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <ShareIcon className="w-4 h-4 shrink-0" />
              Chia sẻ
            </button>
          </div>

          {showShare && (
            <p className="text-center lg:text-left text-xs font-medium text-emerald-700">
              Đã copy nội dung chia sẻ.
            </p>
          )}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="grid gap-2 sm:grid-cols-2 lg:max-w-2xl lg:mx-auto lg:gap-3"
      >
        <Link
          to="/my-bookings"
          className="flex items-center justify-center gap-2 w-full px-4 py-3 lg:py-3.5 rounded-xl bg-[#222] text-[#FF9FCA] text-sm lg:text-base font-bold border border-[#222] hover:bg-[#333] transition-colors"
        >
          Đơn của tôi
        </Link>
        <Link
          to="/catalog"
          className="flex items-center justify-center gap-2 w-full px-4 py-3 lg:py-3.5 rounded-xl bg-white text-slate-800 text-sm lg:text-base font-bold border border-slate-200 hover:bg-slate-50 transition-colors"
        >
          <CameraIcon className="w-4 h-4 lg:w-5 lg:h-5" />
          Thuê thêm
        </Link>
      </motion.div>
    </div>
  );
}

function FailureCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-2xl border border-pink-100 shadow-lg shadow-pink-500/10 p-6 text-center"
    >
      <XCircleIcon className="w-16 h-16 text-red-500 mx-auto" />
      <h2 className="text-2xl font-bold text-pink-800 mt-4">
        Thanh toán thất bại
      </h2>
      <p className="text-slate-600 mt-2">
        Đã có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại.
      </p>

      <div className="mt-6 space-y-3">
        <Link
          to="/my-bookings"
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#222] text-[#FF9FCA] font-semibold border border-[#222] hover:bg-[#333] transition-all"
        >
          Quản lý đơn của tôi
        </Link>
        <Link
          to="/catalog"
          className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-pink-600 text-white font-semibold shadow-lg shadow-pink-500/30 hover:bg-pink-700 transition-all active:scale-95"
        >
          <ArrowUturnLeftIcon className="w-5 h-5" />
          Thử lại
        </Link>

        <Link
          to="/"
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 text-slate-800 font-semibold border border-slate-200 hover:bg-slate-200 transition-all"
        >
          Về trang chủ
        </Link>
      </div>
    </motion.div>
  );
}

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

export default function PaymentStatusPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("checking");
  const [bookingDetails, setBookingDetails] = useState(null);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      const code = searchParams.get("code");
      const orderCode = searchParams.get("orderCode");
      const paymentStatus = searchParams.get("status");

      if (code === "00" && orderCode && paymentStatus === "PAID") {
        try {
          const pendingRes = await api.get(`/v1/bookings/booking/${orderCode}`);
          const pending = pendingRes.data;

          // Nếu đã xử lý xong (DONE) và có orderIdNew → fetch theo orderIdNew
          if (pending.orderIdNew && pending.status === "DONE") {
            const bookingsRes = await api.get(`/v1/bookings/order/${pending.orderIdNew}`);
            const bookings = bookingsRes.data || [];
            if (bookings.length > 0) {
              const first = bookings[0];
              const totalSum = bookings.reduce((s, b) => s + (b.total || 0), 0);
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
                })
              );
              setBookingDetails({
                orderCode: pending.orderCode,
                orderIdNew: pending.orderIdNew,
                bookingFrom: first.bookingFrom,
                bookingTo: first.bookingTo,
                total: totalSum,
                device: devices[0],
                devices: devices.length > 1 ? devices : null,
              });
              saveRecentOrder({
                orderCode: pending.orderCode,
                orderIdNew: pending.orderIdNew,
              });
              setStatus("success");
              return;
            }
          }

          // Fallback: parse payload (đơn lẻ hoặc webhook chưa chạy)
          const payload = JSON.parse(pending.bookingPayloadJson || "{}");
          const items = Array.isArray(payload) ? payload : [payload];
          const firstItem = items[0];
          if (!firstItem?.deviceId) {
            setStatus("failed");
            return;
          }

          const deviceRes = await api.get(`/v1/devices/${firstItem.deviceId}`);
          const deviceData = deviceRes.data;
          const totalSum = items.reduce((s, i) => s + (i.total || 0), 0);

          setBookingDetails({
            orderCode: pending.orderCode,
            orderIdNew: null,
            bookingFrom: new Date(firstItem.bookingFrom),
            bookingTo: new Date(firstItem.bookingTo),
            total: totalSum,
            device: {
              name: deviceData?.name || "Thiết bị",
              img: deviceData?.images?.[0] || FALLBACK_IMG,
            },
          });
          saveRecentOrder({ orderCode: pending.orderCode, orderIdNew: null });
          setStatus("success");
        } catch (error) {
          console.error("Lỗi khi lấy chi tiết đơn hàng:", error);
          setStatus("failed");
        }
      } else {
        setStatus("failed");
      }
    };

    fetchBookingDetails();
  }, [searchParams]);

  return (
    <div className="min-h-dvh bg-gradient-to-b from-white to-pink-100 pb-32 md:pb-36 lg:pb-24">
      <SlideNav />
      <div className="max-w-5xl lg:max-w-6xl xl:max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-10 lg:py-10 xl:px-12">
        {status === "checking" && (
          <LoadingState message="Đang kiểm tra trạng thái thanh toán..." />
        )}
        {status === "success" && <SuccessCard details={bookingDetails} />}
        {status === "failed" && <FailureCard />}
      </div>

      <FloatingContactButton />
    </div>
  );
}

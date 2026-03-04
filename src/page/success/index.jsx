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
  GiftIcon,
  SparklesIcon,
  BookOpenIcon,
  CameraIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentIcon,
  LinkIcon,
} from "@heroicons/react/24/solid";
import api from "../../config/axios";
import { MESSENGER_LINK } from "../../data/contactConfig";
import FloatingContactButton from "../../components/FloatingContactButton";

const FALLBACK_IMG = "https://placehold.co/640x360/fdf2f8/ec4899?text=No+Image";

// Cross-sell accessories data
const ACCESSORIES = [
  { id: 1, name: "Pin dự phòng", price: 50000, img: "🔋" },
  { id: 2, name: "Thẻ nhớ 64GB", price: 30000, img: "💾" },
  { id: 3, name: "Túi máy ảnh", price: 40000, img: "👜" },
];

// Camera usage tips
const USAGE_TIPS = [
  "Giữ máy bằng 2 tay để ảnh không bị rung",
  "Chụp ngoài trời nên để ISO thấp (100-400)",
  "Ánh sáng tự nhiên luôn là đẹp nhất",
  "Thử chế độ Film Simulation với máy Fuji",
];

function SuccessCard({ details }) {
  const [showShare, setShowShare] = useState(false);
  const [showMessengerToast, setShowMessengerToast] = useState(false);
  const [showCopyOrderToast, setShowCopyOrderToast] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);

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
    const shareData = {
      title: "Thuê máy ảnh tại Fao Sài Gòn",
      text: `Mình vừa đặt thuê ${deviceLabel} tại Fao Sài Gòn! 📸`,
      url: window.location.origin,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
      setShowShare(true);
      setTimeout(() => setShowShare(false), 2000);
    }
  };

  const handleEmailSubmit = (e) => {
    e.preventDefault();
    if (email && email.includes("@")) {
      setEmailSubmitted(true);
      // In real app, send to backend
      console.log("Email submitted:", email);
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
    <div className="space-y-4">
      {/* Main Success Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="bg-white rounded-2xl border border-pink-100 shadow-lg shadow-pink-500/10 p-6 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto" />
        </motion.div>
        <h2 className="text-2xl font-bold text-pink-800 mt-4">
          Thanh toán thành công! 🎉
        </h2>
        <p className="text-slate-600 mt-2">
          Cảm ơn bạn đã tin tưởng. Tụi mình đã nhận được lịch đặt của bạn.
        </p>

        {/* Lưu ý hoàn tất đơn - ưu tiên đầu */}
        <div className="mt-6 p-5 bg-blue-50 rounded-xl border border-blue-200 text-left">
          <h3 className="font-bold text-blue-800 text-lg mb-3 flex items-center gap-2">
            <ChatBubbleLeftRightIcon className="w-6 h-6 text-blue-600" />
            Lưu ý: Nhắn cho page để hoàn tất đơn hàng
          </h3>
          <p className="text-base text-blue-700 mb-3">
            Để shop xác nhận đơn, vui lòng gửi thông tin đơn cho page Facebook:
          </p>
          <ol className="text-base text-blue-800 space-y-2 list-decimal list-inside">
            <li>Ấn <strong>"Copy đơn hàng"</strong> để copy thông tin</li>
            <li>Ấn <strong>"Nhắn shop qua Messenger"</strong></li>
            <li>Dán nội dung (Ctrl+V hoặc giữ → Dán) vào ô chat và gửi</li>
          </ol>
        </div>

        <div className="text-left bg-pink-50 rounded-xl p-4 mt-6 space-y-3">
          <h3 className="font-semibold text-pink-900 border-b border-pink-200 pb-2 mb-2">
            Chi tiết đơn hàng
          </h3>
          {details.devices && details.devices.length > 1 ? (
            <div className="space-y-2">
              {details.devices.map((d, i) => (
                <div key={i} className="flex items-center gap-4">
                  <img src={d.img} alt={d.name} className="w-12 h-12 rounded-lg object-cover" />
                  <p className="font-semibold text-pink-800">{d.name}</p>
                </div>
              ))}
              <p className="text-sm text-slate-500 pt-1">Mã đơn: {details.orderCode}</p>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <img
                src={details.device.img}
                alt={details.device.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
              <div>
                <p className="font-semibold text-pink-800">{details.device.name}</p>
                <p className="text-sm text-slate-500">Mã đơn: {details.orderCode}</p>
              </div>
            </div>
          )}
          <div className="text-sm space-y-1 pt-2">
            <p>
              <b>Nhận máy:</b>{" "}
              {formatVNDateTime(details.bookingFrom)}
            </p>
            <p>
              <b>Trả máy:</b>{" "}
              {formatVNDateTime(details.bookingTo)}
            </p>
            <p>
              <b>Tổng tiền:</b>{" "}
              <span className="font-bold text-pink-600">
                {details.total.toLocaleString("vi-VN")} đ
              </span>
            </p>
          </div>
          <div className="mt-3 space-y-2">
            <button
              onClick={handleCopyOrder}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-semibold border border-slate-200 hover:bg-slate-200 transition-all active:scale-95"
            >
              <ClipboardDocumentIcon className="w-5 h-5" />
              Copy đơn hàng
            </button>
            {details.orderIdNew && (
              <Link
                to={`/order/${details.orderIdNew}`}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-pink-100 text-pink-700 font-semibold border border-pink-200 hover:bg-pink-200 transition-all active:scale-95"
              >
                <LinkIcon className="w-5 h-5" />
                Xem / Chia sẻ link đơn hàng
              </Link>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 space-y-3">
          <button
            onClick={handleAddToCalendar}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-pink-600 text-white font-semibold shadow-lg shadow-pink-500/30 hover:bg-pink-700 transition-all active:scale-95"
          >
            <CalendarIcon className="w-5 h-5" />
            Thêm vào Lịch Google
          </button>

          <button
            onClick={handleMessengerClick}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-[#0084FF] text-white font-semibold shadow-lg shadow-blue-500/30 hover:bg-[#0066CC] transition-all active:scale-95"
          >
            <ChatBubbleLeftRightIcon className="w-5 h-5" />
            Nhắn shop qua Messenger
          </button>

          <button
            onClick={handleShare}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold shadow-lg shadow-purple-500/30 hover:opacity-90 transition-all active:scale-95"
          >
            <ShareIcon className="w-5 h-5" />
            Chia sẻ với bạn bè
          </button>

          {showShare && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-green-600 bg-green-50 rounded-lg py-2"
            >
              ✓ Đã copy link!
            </motion.div>
          )}

          {showMessengerToast && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-green-600 bg-green-50 rounded-lg py-2"
            >
              Đã copy tin nhắn! Mở Messenger và dán (Ctrl+V) để gửi nhé.
            </motion.div>
          )}

          {showCopyOrderToast && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-green-600 bg-green-50 rounded-lg py-2"
            >
              ✓ Đã copy tóm tắt đơn hàng!
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Usage Tips Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <BookOpenIcon className="w-5 h-5 text-amber-600" />
          <h3 className="font-semibold text-amber-800">Mẹo chụp ảnh đẹp</h3>
        </div>
        <ul className="space-y-2">
          {USAGE_TIPS.map((tip, index) => (
            <li key={index} className="text-sm text-amber-700 flex items-start gap-2">
              <span className="text-amber-500">•</span>
              {tip}
            </li>
          ))}
        </ul>
      </motion.div>

      {/* Cross-sell Accessories */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="bg-white rounded-2xl border border-pink-100 shadow-md p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <SparklesIcon className="w-5 h-5 text-pink-500" />
          <h3 className="font-semibold text-pink-800">Thuê thêm phụ kiện?</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {ACCESSORIES.map((acc) => (
            <div
              key={acc.id}
              className="text-center bg-pink-50 rounded-xl p-3 hover:bg-pink-100 transition-colors cursor-pointer"
            >
              <div className="text-2xl mb-1">{acc.img}</div>
              <div className="text-xs font-medium text-slate-700">{acc.name}</div>
              <div className="text-xs text-pink-600 font-semibold">
                +{acc.price.toLocaleString("vi-VN")}đ
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 text-center mt-3">
          Liên hệ shop để thêm phụ kiện vào đơn hàng
        </p>
      </motion.div>

      {/* Voucher for Next Time */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-5 text-white"
      >
        <div className="flex items-center gap-2 mb-2">
          <GiftIcon className="w-5 h-5" />
          <h3 className="font-bold">Voucher -10% cho lần sau!</h3>
        </div>
        {!emailSubmitted ? (
          <>
            <p className="text-sm text-green-100 mb-3">
              Nhập email để nhận mã giảm giá 10% cho lần thuê tiếp theo
            </p>
            <form onSubmit={handleEmailSubmit} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="flex-1 px-4 py-2.5 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-white text-green-600 font-semibold rounded-xl hover:bg-green-50 transition-colors"
              >
                Nhận
              </button>
            </form>
          </>
        ) : (
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <CheckCircleIcon className="w-8 h-8 mx-auto mb-1" />
            <p className="font-semibold">Đã gửi voucher đến email của bạn!</p>
          </div>
        )}
      </motion.div>

      {/* Book Again CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <Link
          to="/catalog"
          className="flex items-center justify-center gap-2 w-full px-4 py-3.5 rounded-xl bg-slate-100 text-slate-800 font-semibold border border-slate-200 hover:bg-slate-200 transition-all active:scale-95"
        >
          <CameraIcon className="w-5 h-5" />
          Thuê thêm máy khác
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
            bookingFrom: new Date(firstItem.bookingFrom),
            bookingTo: new Date(firstItem.bookingTo),
            total: totalSum,
            device: {
              name: deviceData?.name || "Thiết bị",
              img: deviceData?.images?.[0] || FALLBACK_IMG,
            },
          });
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
    <div className="min-h-dvh bg-gradient-to-b from-white to-pink-100">
      <div className="max-w-md mx-auto px-4 py-8">
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

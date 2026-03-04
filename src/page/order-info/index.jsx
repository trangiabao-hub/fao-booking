import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import "dayjs/locale/vi";
import { motion } from "framer-motion";
import {
  ShareIcon,
  ClipboardDocumentIcon,
  LinkIcon,
  CameraIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/solid";
import api from "../../config/axios";
import FloatingContactButton from "../../components/FloatingContactButton";
import { MESSENGER_LINK } from "../../data/contactConfig";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("vi");

const FALLBACK_IMG = "https://placehold.co/640x360/fdf2f8/ec4899?text=No+Image";

function formatVNDateTime(dateStr) {
  if (!dateStr) return "";
  return dayjs(dateStr).tz("Asia/Ho_Chi_Minh").format("HH:mm, dddd, DD/MM/YYYY");
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

function ErrorState({ message, onRetry }) {
  return (
    <div className="text-center py-16">
      <p className="text-slate-600 mb-6">{message}</p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-pink-600 text-white font-semibold hover:bg-pink-700 transition-colors"
      >
        <ArrowLeftIcon className="w-5 h-5" />
        Về trang chủ
      </Link>
    </div>
  );
}

export default function OrderInfoPage() {
  const { orderIdNew } = useParams();
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shareLinkToast, setShareLinkToast] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderIdNew) {
        setError("Thiếu mã đơn hàng");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/v1/bookings/order/${orderIdNew}`);
        const bookings = res.data || [];

        if (bookings.length === 0) {
          setError("Không tìm thấy đơn hàng");
          setLoading(false);
          return;
        }

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

        setOrderDetails({
          orderIdNew,
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
  }, [orderIdNew]);

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

  if (loading) {
    return (
      <div className="min-h-dvh bg-gradient-to-b from-white to-pink-100">
        <div className="max-w-md mx-auto px-4 py-8">
          <LoadingState message="Đang tải thông tin đơn hàng..." />
        </div>
        <FloatingContactButton />
      </div>
    );
  }

  if (error || !orderDetails) {
    return (
      <div className="min-h-dvh bg-gradient-to-b from-white to-pink-100">
        <div className="max-w-md mx-auto px-4 py-8">
          <ErrorState message={error} />
        </div>
        <FloatingContactButton />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-white to-pink-100">
      <div className="max-w-md mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/"
            className="flex items-center gap-2 text-slate-600 hover:text-pink-600 font-medium transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Trang chủ
          </Link>
        </div>

        {/* Order Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-2xl border border-pink-100 shadow-lg shadow-pink-500/10 overflow-hidden"
        >
          {/* Brand header */}
          <div className="bg-gradient-to-r from-pink-500 to-rose-500 px-6 py-5 text-center">
            <CameraIcon className="w-12 h-12 text-white/90 mx-auto mb-2" />
            <h1 className="text-xl font-bold text-white">
              Thông tin đơn hàng
            </h1>
            <p className="text-white/90 text-sm mt-1">Fao Sài Gòn - Thuê máy ảnh</p>
          </div>

          <div className="p-6 space-y-5">
            {/* Devices */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                Thiết bị
              </h3>
              {orderDetails.devices && orderDetails.devices.length > 1 ? (
                <div className="space-y-3">
                  {orderDetails.devices.map((d, i) => (
                    <div key={i} className="flex items-center gap-4 p-3 bg-pink-50 rounded-xl">
                      <img src={d.img} alt={d.name} className="w-14 h-14 rounded-lg object-cover" />
                      <p className="font-semibold text-pink-900">{d.name}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-4 p-4 bg-pink-50 rounded-xl">
                  <img
                    src={orderDetails.device.img}
                    alt={orderDetails.device.name}
                    className="w-16 h-16 rounded-xl object-cover"
                  />
                  <p className="font-bold text-pink-900 text-lg">{orderDetails.device.name}</p>
                </div>
              )}
            </div>

            {/* Date & time */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Thời gian
              </h3>
              <div className="p-4 bg-slate-50 rounded-xl space-y-2">
                <p>
                  <span className="text-slate-500 text-sm">Nhận máy:</span>
                  <br />
                  <span className="font-semibold text-slate-800">
                    {formatVNDateTime(orderDetails.bookingFrom)}
                  </span>
                </p>
                <p>
                  <span className="text-slate-500 text-sm">Trả máy:</span>
                  <br />
                  <span className="font-semibold text-slate-800">
                    {formatVNDateTime(orderDetails.bookingTo)}
                  </span>
                </p>
              </div>
            </div>

            {/* Total */}
            <div className="p-4 bg-pink-100 rounded-xl border border-pink-200">
              <p className="text-sm text-pink-800 font-medium">Tổng tiền</p>
              <p className="text-2xl font-black text-pink-600">
                {orderDetails.total?.toLocaleString("vi-VN")} đ
              </p>
            </div>

            {/* Share section */}
            <div className="pt-4 border-t border-pink-100">
              <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <ShareIcon className="w-5 h-5 text-pink-500" />
                Chia sẻ với bạn bè
              </h3>
              <p className="text-slate-600 text-sm mb-4">
                Gửi link này cho bạn bè để họ xem đơn hàng của bạn.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleNativeShare}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold hover:opacity-90 transition-opacity active:scale-[0.98]"
                >
                  <ShareIcon className="w-5 h-5" />
                  Chia sẻ
                </button>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 text-slate-700 font-semibold border border-slate-200 hover:bg-slate-200 transition-colors active:scale-[0.98]"
                  title="Copy link"
                >
                  <ClipboardDocumentIcon className="w-5 h-5" />
                  Copy link
                </button>
              </div>
              {shareLinkToast && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-green-600 text-sm font-medium mt-3 flex items-center gap-2"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  Đã copy link vào clipboard!
                </motion.p>
              )}
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <div className="mt-6 space-y-3">
          <Link
            to="/catalog"
            className="block w-full text-center py-3.5 rounded-xl bg-slate-100 text-slate-800 font-semibold border border-slate-200 hover:bg-slate-200 transition-colors"
          >
            Thuê thêm máy khác
          </Link>
          <a
            href={MESSENGER_LINK}
            target="_blank"
            rel="noreferrer"
            className="block w-full text-center py-3.5 rounded-xl bg-[#0084FF] text-white font-semibold hover:bg-[#0066CC] transition-colors"
          >
            Liên hệ shop qua Messenger
          </a>
        </div>
      </div>

      <FloatingContactButton />
    </div>
  );
}
